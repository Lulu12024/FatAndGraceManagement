from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from decimal import Decimal
import unicodedata

from .models import (
    Produit, Unite, Stock, MouvementStock, DemandeProduit,
    TypeMouvement, StatutMouvement,
)
from .serializers import (
    ProductSerializer, ProductCreateSerializer,
    UniteSerializer, StockSerializer,
    MovementSerializer, MovementCreateSerializer,
    DemandeProduitSerializer,
)
from users.permissions import (
    IsGestionnaireOrGerantOrAdmin, IsManagerOrAdmin, CanViewStock, CanViewMovements,
    IsGerantOrAdmin, IsCuisinier,
)
from audit.utils import log_action


# ==================== UNITE ====================

class UniteViewSet(viewsets.ModelViewSet):
    queryset = Unite.objects.all()
    serializer_class = UniteSerializer
    permission_classes = [IsAuthenticated]


# ==================== PRODUCT (PRODUIT) ====================

class ProductViewSet(viewsets.ModelViewSet):
    """
    GET    /api/products/               → liste des produits
    GET    /api/products/categories/    → catégories distinctes
    POST   /api/products/               → créer un produit
    PUT    /api/products/{id}/          → modifier un produit
    DELETE /api/products/{id}/          → supprimer (si qte=0)
    """
    queryset = Produit.objects.select_related('unite').all()
    permission_classes = [IsAuthenticated, CanViewStock]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['categorie']
    search_fields = ['nom', 'description', 'categorie']
    ordering_fields = ['nom', 'categorie']
    ordering = ['nom']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ProductCreateSerializer
        return ProductSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsGestionnaireOrGerantOrAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()

        alerte = self.request.query_params.get('alerte')
        if alerte == 'true':
            # Get products where stock is at or below alert threshold
            # Also include products that have no Stock entry at all
            from django.db.models import F
            qs = qs.filter(
                Q(stock__quantite_dispo__lte=F('seuil_alerte')) |
                Q(stock__isnull=True)
            )

        perime = self.request.query_params.get('perime')
        if perime == 'true':
            qs = qs.filter(date_peremption__lt=timezone.now().date())

        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        unite = Unite.objects.get(id=data.pop('unite_id'))
        qte_initiale = data.pop('qte_initiale', Decimal('0.00'))

        produit = Produit.objects.create(unite=unite, **data)

        # Create stock entry
        Stock.objects.create(
            produit=produit,
            quantite_dispo=qte_initiale,
        )

        log_action(
            user=request.user, action='CREATE',
            type_action='Création produit',
            description=f"Produit {produit.nom} créé avec stock initial de {qte_initiale}",
            table_name='produit', record_id=produit.id, request=request
        )

        return Response(
            ProductSerializer(produit).data,
            status=status.HTTP_201_CREATED
        )

    def destroy(self, request, *args, **kwargs):
        produit = self.get_object()
        try:
            stock = produit.stock
            if stock.quantite_dispo > 0:
                return Response(
                    {'detail': f"Impossible de supprimer : stock restant ({stock.quantite_dispo})"},
                    status=status.HTTP_422_UNPROCESSABLE_ENTITY
                )
        except Stock.DoesNotExist:
            pass

        log_action(
            user=request.user, action='DELETE',
            type_action='Suppression produit',
            description=f"Produit {produit.nom} supprimé",
            table_name='produit', record_id=produit.id, request=request
        )

        produit.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'])
    def categories(self, request):
        """GET /api/products/categories/ → catégories distinctes"""
        cats = Produit.objects.values_list('categorie', flat=True).distinct().order_by('categorie')
        return Response(list(cats))


# ==================== STOCK ====================

class StockViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Stock.objects.select_related('produit', 'produit__unite').all()
    serializer_class = StockSerializer
    permission_classes = [IsAuthenticated, CanViewStock]


# ==================== MOVEMENT (MOUVEMENT STOCK) ====================

class MovementViewSet(viewsets.ModelViewSet):
    """
    GET  /api/movements/               → liste des mouvements
    POST /api/movements/               → créer un mouvement
    POST /api/movements/{id}/validate/ → valider un mouvement
    POST /api/movements/{id}/reject/   → rejeter un mouvement
    """
    queryset = MouvementStock.objects.select_related(
        'type_mouvement', 'statut', 'produit', 'demandeur', 'valideur'
    ).all()
    permission_classes = [IsAuthenticated, CanViewMovements]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    ordering_fields = ['date', 'heure']
    ordering = ['-date', '-heure']

    def get_serializer_class(self):
        if self.action == 'create':
            return MovementCreateSerializer
        return MovementSerializer

    def get_queryset(self):
        qs = super().get_queryset()

        type_filter = self.request.query_params.get('type')
        if type_filter:
            # Normaliser les accents (ex: ENTRÉE → ENTREE) pour matcher la base
            type_filter = unicodedata.normalize('NFD', type_filter)
            type_filter = ''.join(c for c in type_filter if unicodedata.category(c) != 'Mn')
            qs = qs.filter(type_mouvement__nom=type_filter)

        statut_filter = self.request.query_params.get('statut')
        if statut_filter:
            qs = qs.filter(statut__nom=statut_filter)

        produit_id = self.request.query_params.get('produit_id')
        if produit_id:
            qs = qs.filter(produit_id=produit_id)

        date_from = self.request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(date__gte=date_from)

        date_to = self.request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(date__lte=date_to)

        return qs

    def create(self, request, *args, **kwargs):
        serializer = MovementCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)   

        data = serializer.validated_data
        produit = Produit.objects.get(id=data['produit_id'])

        # Get or create type and statut
        type_mouvement, _ = TypeMouvement.objects.get_or_create(nom=data['type'])
        statut_en_attente, _ = StatutMouvement.objects.get_or_create(nom='EN_ATTENTE')

        mouvement = MouvementStock.objects.create(
            type_mouvement=type_mouvement,
            quantite=data['quantite'],
            justification=data.get('justification', ''),
            statut=statut_en_attente,
            produit=produit,
            demandeur=request.user,
        )

        log_action(
            user=request.user, action='CREATE',
            type_action='Création mouvement stock',
            description=f"Mouvement {data['type']} — {produit.nom} — qté: {data['quantite']}",
            table_name='mouvement_stock', record_id=mouvement.id, request=request
        )

        # Notify stock managers
        from commandes.models import Notification
        from users.models import User
        gestionnaires = User.objects.filter(
            role__nom__in=['Gestionnaire de stock', 'Gérant'],
            is_activite=True
        )
        for gest in gestionnaires:
            Notification.objects.create(
                user=gest,
                type='stock_alert',
                message=f"Nouveau mouvement: {data['type']} — {produit.nom} — {data['quantite']}",
            )

        return Response(
            MovementSerializer(mouvement).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsManagerOrAdmin])
    def validate(self, request, pk=None):
        mouvement = self.get_object()
        if mouvement.statut.nom != 'EN_ATTENTE':
            return Response(
                {'detail': "Ce mouvement n'est pas en attente de validation"},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY
            )

        with transaction.atomic():
            statut_validee, _ = StatutMouvement.objects.get_or_create(nom='VALIDEE')
            mouvement.statut = statut_validee
            mouvement.valideur = request.user
            mouvement.save()

            # Update stock
            try:
                stock = mouvement.produit.stock
            except Stock.DoesNotExist:
                stock = Stock.objects.create(produit=mouvement.produit, quantite_dispo=Decimal('0.00'))

            if mouvement.type_mouvement.nom == 'ENTREE':
                stock.quantite_dispo += mouvement.quantite
            elif mouvement.type_mouvement.nom in ['SORTIE', 'SUPPRESSION']:
                stock.quantite_dispo -= mouvement.quantite
                if stock.quantite_dispo < 0:
                    stock.quantite_dispo = Decimal('0.00')
            stock.date_time = timezone.now()
            stock.save()

        log_action(
            user=request.user, action='VALIDATE',
            type_action='Validation mouvement stock',
            description=f"Mouvement MVT-{mouvement.id:03d} validé — {mouvement.produit.nom}",
            table_name='mouvement_stock', record_id=mouvement.id, request=request
        )

        # Check stock alerts after validation
        if stock.est_en_alerte:
            from commandes.models import Notification
            from users.models import User
            managers = User.objects.filter(
                role__nom__in=['Gestionnaire de stock', 'Gérant', 'Manager'],
                is_activite=True
            )
            for mgr in managers:
                Notification.objects.create(
                    user=mgr,
                    type='stock_alert',
                    message=f"⚠ Stock critique : {mouvement.produit.nom} — {stock.quantite_dispo} {mouvement.produit.unite.nom}",
                    data={'produit_id': mouvement.produit.id, 'qte': float(stock.quantite_dispo)}
                )

        # Notify demandeur
        from commandes.models import Notification
        Notification.objects.create(
            user=mouvement.demandeur,
            type='mvt_validated',
            message=f"Mouvement MVT-{mouvement.id:03d} validé",
        )

        return Response(MovementSerializer(mouvement).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsManagerOrAdmin])
    def reject(self, request, pk=None):
        mouvement = self.get_object()
        motif = request.data.get('motif', '')

        if not motif:
            return Response(
                {'detail': "Le motif de rejet est obligatoire"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if mouvement.statut.nom != 'EN_ATTENTE':
            return Response(
                {'detail': "Ce mouvement n'est pas en attente de validation"},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY
            )

        statut_rejetee, _ = StatutMouvement.objects.get_or_create(nom='REJETEE')
        mouvement.statut = statut_rejetee
        mouvement.motif_rejet = motif
        mouvement.valideur = request.user
        mouvement.save()

        log_action(
            user=request.user, action='REJECT',
            type_action='Rejet mouvement stock',
            description=f"Mouvement MVT-{mouvement.id:03d} rejeté — Motif: {motif}",
            table_name='mouvement_stock', record_id=mouvement.id, request=request
        )

        # Notify demandeur
        from commandes.models import Notification
        Notification.objects.create(
            user=mouvement.demandeur,
            type='mvt_rejected',
            message=f"Mouvement MVT-{mouvement.id:03d} rejeté — {motif}",
        )

        return Response(MovementSerializer(mouvement).data)


# ==================== DEMANDE PRODUIT ====================

class DemandeProduitViewSet(viewsets.ModelViewSet):
    queryset = DemandeProduit.objects.select_related('produit', 'demandeur', 'valideur').all()
    serializer_class = DemandeProduitSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        role = user.role.nom

        if role == 'Cuisinier':
            return DemandeProduit.objects.filter(demandeur=user)
        elif role in ['Gestionnaire de stock', 'Gérant', 'Manager', 'Administrateur']:
            return DemandeProduit.objects.all()
        return DemandeProduit.objects.none()

    def perform_create(self, serializer):
        serializer.save(demandeur=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsGestionnaireOrGerantOrAdmin])
    def validate(self, request, pk=None):
        demande = self.get_object()
        if demande.statut != 'EN_ATTENTE':
            return Response(
                {'detail': "Cette demande n'est pas en attente"},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY
            )

        demande.statut = 'VALIDEE'
        demande.valideur = request.user
        demande.save()

        # Create a stock exit movement
        type_sortie, _ = TypeMouvement.objects.get_or_create(nom='SORTIE')
        statut_validee, _ = StatutMouvement.objects.get_or_create(nom='VALIDEE')

        mouvement = MouvementStock.objects.create(
            type_mouvement=type_sortie,
            quantite=demande.quantite,
            justification=f"Demande #{demande.id} — {demande.justification}",
            statut=statut_validee,
            produit=demande.produit,
            demandeur=demande.demandeur,
            valideur=request.user,
        )

        # Update stock
        try:
            stock = demande.produit.stock
            stock.quantite_dispo -= demande.quantite
            if stock.quantite_dispo < 0:
                stock.quantite_dispo = Decimal('0.00')
            stock.date_time = timezone.now()
            stock.save()
        except Stock.DoesNotExist:
            pass

        return Response(DemandeProduitSerializer(demande).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsGestionnaireOrGerantOrAdmin])
    def reject(self, request, pk=None):
        demande = self.get_object()
        motif = request.data.get('motif', '')

        if demande.statut != 'EN_ATTENTE':
            return Response(
                {'detail': "Cette demande n'est pas en attente"},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY
            )

        demande.statut = 'REJETEE'
        demande.motif_rejet = motif
        demande.valideur = request.user
        demande.save()

        return Response(DemandeProduitSerializer(demande).data)
