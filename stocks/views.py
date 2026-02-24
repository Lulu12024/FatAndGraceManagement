from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db import transaction
from django.db import models

from .models import (
    Produit, Unite, Stock, MouvementStock, TypeMouvement,
    StatutMouvement, DemandeProduit, StatutDemande
)
from .serializers import (
    ProduitSerializer, UniteSerializer, StockSerializer,
    MouvementStockSerializer, MouvementStockCreateSerializer,
    MouvementStockValidationSerializer, DemandeProduitSerializer,
    DemandeProduitCreateSerializer, DemandeProduitValidationSerializer,
    StockAlertSerializer
)
from users.permissions import IsGerant, IsManager, IsCuisinier, IsManagerOrGerant
from audit.utils import log_action


class UniteViewSet(viewsets.ModelViewSet):
    queryset = Unite.objects.all()
    serializer_class = UniteSerializer
    permission_classes = [IsAuthenticated]


class ProduitViewSet(viewsets.ModelViewSet):
    queryset = Produit.objects.all()
    serializer_class = ProduitSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['categorie', 'unite']
    search_fields = ['nom', 'description', 'categorie']
    ordering_fields = ['nom', 'categorie']
    ordering = ['nom']


class StockViewSet(viewsets.ModelViewSet):
    queryset = Stock.objects.all()
    serializer_class = StockSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['produit']
    search_fields = ['produit__nom']
    ordering_fields = ['quantite_dispo', 'date_time']
    ordering = ['produit__nom']

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def alertes(self, request):
        stocks_en_alerte = Stock.objects.filter(
            quantite_dispo__lte=models.F('produit__seuil_alerte')
        )
        serializer = StockAlertSerializer(stocks_en_alerte, many=True)
        return Response(serializer.data)


class MouvementStockViewSet(viewsets.ModelViewSet):
    queryset = MouvementStock.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['type_mouvement', 'statut', 'produit', 'demandeur']
    search_fields = ['justification', 'produit__nom']
    ordering_fields = ['date', 'heure']
    ordering = ['-date', '-heure']

    def get_serializer_class(self):
        if self.action == 'create':
            return MouvementStockCreateSerializer
        return MouvementStockSerializer

    def get_queryset(self):
        user = self.request.user
        role = user.role.nom

        if role == 'Gérant':
            return MouvementStock.objects.filter(demandeur=user)
        elif role in ['Manager', 'Administrateur']:
            return MouvementStock.objects.all()

        return MouvementStock.objects.none()

    @transaction.atomic
    def perform_create(self, serializer):
        statut_en_attente = StatutMouvement.objects.get(nom='EN_ATTENTE')
        mouvement = serializer.save(statut=statut_en_attente)

        log_action(
            user=self.request.user,
            action='CREATE',
            type_action=f'Demande {mouvement.type_mouvement.get_nom_display()}',
            description=f"Demande de {mouvement.type_mouvement.get_nom_display()} - {mouvement.produit.nom} - {mouvement.quantite}",
            table_name='mouvement_stock',
            record_id=mouvement.id,
            request=self.request
        )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def valider(self, request, pk=None):
        mouvement = self.get_object()
        user = request.user

        if user.role.nom != 'Manager':
            return Response(
                {'error': 'Seuls les managers peuvent valider les mouvements.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if mouvement.statut.nom != 'EN_ATTENTE':
            return Response(
                {'error': 'Ce mouvement ne peut pas être validé.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            statut_validee = StatutMouvement.objects.get(nom='VALIDEE')
            mouvement.statut = statut_validee
            mouvement.valideur = user
            mouvement.save()

            stock, created = Stock.objects.get_or_create(
                produit=mouvement.produit,
                defaults={'quantite_dispo': 0}
            )

            if mouvement.type_mouvement.nom == 'ENTREE':
                stock.quantite_dispo += mouvement.quantite
            elif mouvement.type_mouvement.nom in ['SORTIE', 'SUPPRESSION']:
                stock.quantite_dispo -= mouvement.quantite

            stock.save()

            log_action(
                user=request.user,
                action='VALIDATE',
                type_action='Validation mouvement stock',
                description=f"Mouvement #{mouvement.id} validé - {mouvement.type_mouvement.get_nom_display()}",
                table_name='mouvement_stock',
                record_id=mouvement.id,
                request=request
            )

        return Response({'message': 'Mouvement validé avec succès.'})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def rejeter(self, request, pk=None):
        mouvement = self.get_object()
        user = request.user
        motif_rejet = request.data.get('motif_rejet', '')

        if not motif_rejet:
            return Response(
                {'error': 'Le motif de rejet est obligatoire.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if user.role.nom != 'Manager':
            return Response(
                {'error': 'Seuls les managers peuvent rejeter les mouvements.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if mouvement.statut.nom != 'EN_ATTENTE':
            return Response(
                {'error': 'Ce mouvement ne peut pas être rejeté.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        statut_rejetee = StatutMouvement.objects.get(nom='REJETEE')
        mouvement.statut = statut_rejetee
        mouvement.valideur = user
        mouvement.save()

        log_action(
            user=request.user,
            action='REJECT',
            type_action='Rejet mouvement stock',
            description=f"Mouvement #{mouvement.id} rejeté - Motif: {motif_rejet}",
            table_name='mouvement_stock',
            record_id=mouvement.id,
            request=request
        )

        return Response({'message': 'Mouvement rejeté.'})


class DemandeProduitViewSet(viewsets.ModelViewSet):
    queryset = DemandeProduit.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['statut', 'produit', 'demandeur', 'commande']
    search_fields = ['justification', 'produit__nom']
    ordering_fields = ['date_demande']
    ordering = ['-date_demande']

    def get_serializer_class(self):
        if self.action == 'create':
            return DemandeProduitCreateSerializer
        return DemandeProduitSerializer

    def get_queryset(self):
        user = self.request.user
        role = user.role.nom

        if role == 'Cuisinier':
            return DemandeProduit.objects.filter(demandeur=user)
        elif role in ['Gérant', 'Manager', 'Administrateur']:
            return DemandeProduit.objects.all()

        return DemandeProduit.objects.none()

    def perform_create(self, serializer):
        demande = serializer.save()

        log_action(
            user=self.request.user,
            action='CREATE',
            type_action='Demande de produit',
            description=f"Demande de produit #{demande.id} - {demande.produit.nom} - {demande.quantite}",
            table_name='demande_produit',
            record_id=demande.id,
            request=self.request
        )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def valider(self, request, pk=None):
        demande = self.get_object()
        user = request.user

        if user.role.nom != 'Gérant':
            return Response(
                {'error': 'Seuls les gérants peuvent valider les demandes.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if demande.statut != 'EN_ATTENTE':
            return Response(
                {'error': 'Cette demande ne peut pas être validée.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            stock = Stock.objects.get(produit=demande.produit)
        except Stock.DoesNotExist:
            return Response(
                {'error': 'Ce produit n\'est pas en stock.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if stock.quantite_dispo < demande.quantite:
            return Response(
                {'error': 'Stock insuffisant.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            demande.statut = 'VALIDEE'
            demande.valideur = user
            demande.save()

            stock.quantite_dispo -= demande.quantite
            stock.save()

            log_action(
                user=request.user,
                action='APPROVE',
                type_action='Validation demande produit',
                description=f"Demande #{demande.id} validée - {demande.produit.nom}",
                table_name='demande_produit',
                record_id=demande.id,
                request=request
            )

        return Response({'message': 'Demande validée avec succès.'})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def rejeter(self, request, pk=None):
        demande = self.get_object()
        user = request.user
        motif_rejet = request.data.get('motif_rejet', '')

        if not motif_rejet:
            return Response(
                {'error': 'Le motif de rejet est obligatoire.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if user.role.nom != 'Gérant':
            return Response(
                {'error': 'Seuls les gérants peuvent rejeter les demandes.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if demande.statut != 'EN_ATTENTE':
            return Response(
                {'error': 'Cette demande ne peut pas être rejetée.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        demande.statut = 'REJETEE'
        demande.valideur = user
        demande.save()

        log_action(
            user=request.user,
            action='REJECT',
            type_action='Rejet demande produit',
            description=f"Demande #{demande.id} rejetée - Motif: {motif_rejet}",
            table_name='demande_produit',
            record_id=demande.id,
            request=request
        )

        return Response({'message': 'Demande rejetée.'})
