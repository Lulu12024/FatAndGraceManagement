from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Q, Sum
from django.utils import timezone
from django.http import HttpResponse
from decimal import Decimal
from rest_framework.decorators import action, api_view, permission_classes
import io
from .push_utils import send_push_to_role, send_push_to_user
from users.models import User
from .models import Commande, Plat, CommandePlat, Table, Facture, Notification
from .serializers import (
    TableSerializer, TableDetailSerializer,
    PlatSerializer,
    OrderSerializer, OrderCreateSerializer,
    InvoiceSerializer, PaymentSerializer,
    NotificationSerializer,
)
from users.permissions import (
    IsServeur, IsCuisinier, IsGerant, IsAdministrateur,
    IsServeurOrGerantOrAdmin, IsGerantOrAdmin, IsCuisinierOrAdmin,
    CanViewInvoices,
)
from audit.utils import log_action


# ==================== TABLE ====================

class TableViewSet(viewsets.ModelViewSet):
    """
    GET  /api/tables/           → liste toutes les tables
    GET  /api/tables/{id}/      → détail d'une table avec commandes actives
    POST /api/tables/{id}/reserve/
    POST /api/tables/{id}/cancel/
    POST /api/tables/{id}/close/
    POST /api/tables/{id}/pay/
    """
    queryset = Table.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['statut']
    ordering = ['numero']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return TableDetailSerializer
        return TableSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        # Support status query param matching spec
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(statut=status_filter)
        serializer = TableSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsServeurOrGerantOrAdmin])
    def reserve(self, request, pk=None):
        table = self.get_object()
        if table.statut != 'DISPONIBLE':
            return Response(
                {'detail': "La table n'est pas disponible"},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY
            )
        table.statut = 'RESERVEE'
        table.date_ouverture = timezone.now()
        table.save()

        log_action(
            user=request.user, action='UPDATE',
            type_action='Réservation table',
            description=f"Table {table.numero} réservée",
            table_name='table', record_id=table.id, request=request
        )
        return Response(TableSerializer(table).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsServeurOrGerantOrAdmin])
    def cancel(self, request, pk=None):
        table = self.get_object()
        if table.statut != 'RESERVEE':
            return Response(
                {'detail': "La table n'est pas en statut RÉSERVÉE"},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY
            )
        table.statut = 'DISPONIBLE'
        table.date_ouverture = None
        table.montant_total = Decimal('0.00')
        table.save()

        log_action(
            user=request.user, action='UPDATE',
            type_action='Annulation réservation',
            description=f"Réservation table {table.numero} annulée",
            table_name='table', record_id=table.id, request=request
        )
        return Response(TableSerializer(table).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsServeurOrGerantOrAdmin])
    def close(self, request, pk=None):
        table = self.get_object()
        if table.statut != 'EN_SERVICE':
            return Response(
                {'detail': "La table n'est pas en service"},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY
            )
        # Filter orders from the current session only
        session_orders = table.commandes.all()
        if table.date_ouverture:
            session_orders = session_orders.filter(date_commande__gte=table.date_ouverture)

        # Check all session orders are in a closable state
        non_closed = session_orders.exclude(
            statut__in=['EN_ATTENTE_PAIEMENT', 'PAYEE', 'ANNULEE', 'REFUSEE']
        ).exists()
        if non_closed:
            return Response(
                {'detail': "Des commandes ne sont pas encore livrées ou payées"},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY
            )
        # Calculate total from unpaid session orders only
        total = session_orders.filter(statut='EN_ATTENTE_PAIEMENT').aggregate(
            total=Sum('prix_total')
        )['total'] or Decimal('0.00')

        table.statut = 'EN_ATTENTE_PAIEMENT'
        table.montant_total = total
        table.date_cloture = timezone.now()
        table.save()

        gerants = User.objects.filter(
            role__nom__in=['Gérant', 'Manager', 'Administrateur'],
            is_activite=True
        )
        for gerant in gerants:
            Notification.objects.create(
                user=gerant,
                type='table_closed',
                message=f"Table {table.numero} clôturée — {total} FCFA à encaisser",
                data={
                    'table_id': table.id,
                    'table_num': table.numero,
                    'montant': float(total),
                }
            )
        log_action(
            user=request.user, action='UPDATE',
            type_action='Clôture table',
            description=f"Table {table.numero} clôturée — montant: {total}",
            table_name='table', record_id=table.id, request=request
        )
        return Response(TableSerializer(table).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsGerantOrAdmin])
    def pay(self, request, pk=None):
        table = self.get_object()
        if table.statut != 'EN_ATTENTE_PAIEMENT':
            return Response(
                {'detail': "La table n'est pas en attente de paiement"},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY
            )

        # Build items snapshot from unpaid orders of current session only
        session_orders = table.commandes.filter(statut='EN_ATTENTE_PAIEMENT')
        if table.date_ouverture:
            session_orders = session_orders.filter(date_commande__gte=table.date_ouverture)

        items_snapshot = []
        for commande in session_orders:
            for cp in commande.commandeplat_set.all():
                items_snapshot.append({
                    'nom': cp.plat.nom,
                    'qte': cp.quantite,
                    'prix': float(cp.prix_unitaire),
                    'commande_id': commande.order_id,
                })

        serializer = PaymentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        mode_map = {
            'Espèces': 'ESPECES',
            'Carte bancaire': 'CARTE',
            'Mobile Money': 'MOBILE_MONEY',
            'Autre': 'AUTRE',
        }

        # Find the serveur from the first unpaid order
        first_order = session_orders.first()
        serveur = first_order.serveur if first_order else None

        # Create invoice
        facture = Facture.objects.create(
            table=table,
            montant_total=table.montant_total,
            montant_paye=data['montant'],
            pourboire=data.get('pourboire', Decimal('0.00')),
            mode_paiement=mode_map.get(data['mode_paiement'], 'AUTRE'),
            gerant=request.user,
            serveur=serveur,
            items_snapshot=items_snapshot,
        )

        # Mark all remaining unpaid session orders as PAYEE
        session_orders.update(
            statut='PAYEE', is_paid=True, date_paiement=timezone.now()
        )

        # Reset table
        table.statut = 'DISPONIBLE'
        table.montant_total = Decimal('0.00')
        table.date_ouverture = None
        table.date_cloture = None
        table.save()

        log_action(
            user=request.user, action='CREATE',
            type_action='Enregistrement paiement',
            description=f"Paiement table {table.numero} — {data['mode_paiement']} — {data['montant']}",
            table_name='facture', record_id=facture.id, request=request
        )

        return Response({
            'table': TableSerializer(table).data,
            'invoice': {
                'id': facture.numero_facture,
                'table_id': table.id,
                'table_num': table.numero,
                'montant': float(facture.montant_total),
                'pourboire': float(facture.pourboire),
                'mode_paiement': data['mode_paiement'],
                'date': facture.date_generation.isoformat(),
                'items': items_snapshot,
            }
        })


# ==================== PLAT ====================

class PlatViewSet(viewsets.ModelViewSet):
    """
    GET    /api/plats/          → liste tous les plats
    POST   /api/plats/          → ajouter un plat (Gérant, Admin)
    PUT    /api/plats/{id}/     → modifier un plat (Gérant, Admin)
    DELETE /api/plats/{id}/     → supprimer un plat (Admin)
    """
    queryset = Plat.objects.all()
    serializer_class = PlatSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['disponible', 'categorie']
    search_fields = ['nom', 'description']
    ordering_fields = ['nom', 'prix']
    ordering = ['nom']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update']:
            return [IsAuthenticated(), IsGerantOrAdmin()]
        elif self.action == 'destroy':
            return [IsAuthenticated(), IsAdministrateur()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        plat = serializer.save()

        log_action(
            user=request.user, action='CREATE',
            type_action='Création plat',
            description=f"Plat {plat.nom} créé — {plat.prix} FCFA",
            table_name='plat', record_id=plat.id, request=request
        )

        return Response(PlatSerializer(plat).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        plat = serializer.save()

        log_action(
            user=request.user, action='UPDATE',
            type_action='Modification plat',
            description=f"Plat {plat.nom} modifié",
            table_name='plat', record_id=plat.id, request=request
        )

        return Response(PlatSerializer(plat).data)

    def destroy(self, request, *args, **kwargs):
        plat = self.get_object()
        active_statuts = ['STOCKEE', 'EN_ATTENTE_ACCEPTATION', 'EN_PREPARATION', 'EN_ATTENTE_LIVRAISON']
        has_active = CommandePlat.objects.filter(
            plat=plat, commande__statut__in=active_statuts
        ).exists()
        if has_active:
            return Response(
                {'detail': "Impossible de supprimer ce plat : il est utilisé dans des commandes actives"},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY
            )

        plat_nom = plat.nom
        plat_id = plat.id

        log_action(
            user=request.user, action='DELETE',
            type_action='Suppression plat',
            description=f"Plat {plat_nom} supprimé",
            table_name='plat', record_id=plat_id, request=request
        )

        plat.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ==================== ORDER (COMMANDE) ====================

class OrderViewSet(viewsets.ModelViewSet):
    """
    GET  /api/orders/               → liste des commandes
    POST /api/orders/               → créer une commande
    GET  /api/orders/{id}/          → détail d'une commande
    POST /api/orders/{id}/accept/
    POST /api/orders/{id}/reject/
    POST /api/orders/{id}/ready/
    POST /api/orders/{id}/deliver/
    POST /api/orders/{id}/cancel/
    """
    queryset = Commande.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    ordering_fields = ['date_commande']
    ordering = ['-date_commande']

    def get_serializer_class(self):
        if self.action == 'create':
            return OrderCreateSerializer
        return OrderSerializer

    def get_queryset(self):
        qs = Commande.objects.select_related('table', 'serveur', 'cuisinier').all()

        # Apply filters from query params
        table_id = self.request.query_params.get('table_id')
        if table_id:
            qs = qs.filter(table_id=table_id)

        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(statut=status_filter)

        cuisinier_id = self.request.query_params.get('cuisinier_id')
        if cuisinier_id:
            qs = qs.filter(cuisinier_id=cuisinier_id)

        date_from = self.request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(date_commande__date__gte=date_from)

        date_to = self.request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(date_commande__date__lte=date_to)

        return qs

    def create(self, request, *args, **kwargs):
        serializer = OrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        table = Table.objects.get(id=data['table_id'])

        # Create the order
        commande = Commande.objects.create(
            table=table,
            serveur=request.user,
            observations=data.get('obs', ''),
            statut='EN_ATTENTE_ACCEPTATION',
        )

        # Add items
        total = Decimal('0.00')
        for item in data['items']:
            plat = Plat.objects.get(id=item['plat_id'])
            CommandePlat.objects.create(
                commande=commande,
                plat=plat,
                quantite=item['qte'],
                prix_unitaire=plat.prix,
            )
            total += plat.prix * item['qte']

        commande.prix_total = total
        commande.save()

        # Update table status
        if table.statut in ['DISPONIBLE', 'RESERVEE']:
            table.statut = 'EN_SERVICE'
            table.date_ouverture = table.date_ouverture or timezone.now()
            table.save()

        log_action(
            user=request.user, action='CREATE',
            type_action='Nouvelle commande',
            description=f"Nouvelle commande {commande.order_id} — Table {table.numero}",
            table_name='commande', record_id=commande.id, request=request
        )

        # Notify all cooks
        from users.models import User
        cuisiniers = User.objects.filter(role__nom='Cuisinier', is_activite=True)
        items_text = ", ".join([
            f"{item['qte']}× {Plat.objects.get(id=item['plat_id']).nom}"
            for item in data['items']
        ])
        for cuisinier in cuisiniers:
            Notification.objects.create(
                user=cuisinier,
                type='new_order',
                message=f"Nouvelle commande : Table {table.numero} — {items_text}",
                data={
                    'order_id': commande.order_id,
                    'table_id': table.id,
                    'table_num': table.numero,
                    'items': items_text,
                    'montant': float(total),
                }
            )

            # Push notification sur le téléphone du cuisinier ← ajouter ça
            send_push_to_user(
                cuisinier,
                title="🍽️ Nouvelle commande",
                body=f"Table {table.numero} — {items_text}",
                url="/",
                tag="new_order"
            )

        return Response(
            OrderSerializer(commande).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsCuisinierOrAdmin])
    def accept(self, request, pk=None):
        commande = self.get_object()
        if commande.statut != 'EN_ATTENTE_ACCEPTATION':
            return Response(
                {'detail': "La commande n'est pas en attente d'acceptation"},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY
            )

        cuisinier_id = request.data.get('cuisinier_id')
        if cuisinier_id:
            from users.models import User
            try:
                cuisinier = User.objects.get(id=cuisinier_id)
            except User.DoesNotExist:
                return Response(
                    {'detail': "Cuisinier introuvable"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            cuisinier = request.user

        commande.statut = 'EN_PREPARATION'
        commande.cuisinier = cuisinier
        commande.date_acceptation = timezone.now()
        commande.save()

        log_action(
            user=request.user, action='APPROVE',
            type_action='Acceptation commande',
            description=f"Commande {commande.order_id} acceptée par {cuisinier.get_full_name()}",
            table_name='commande', record_id=commande.id, request=request
        )

        # Notify serveur
        if commande.serveur:
            Notification.objects.create(
                user=commande.serveur,
                type='order_accepted',
                message=f"Commande {commande.order_id} acceptée par {cuisinier.get_full_name()}",
                data={'order_id': commande.order_id, 'table_id': commande.table.id, 'table_num': commande.table.numero}
            )

            send_push_to_user(
                commande.serveur,
                title="✅ Commande acceptée",
                body=f"Table {commande.table.numero} — en préparation",
                tag="order_accepted"
            )
            

        return Response(OrderSerializer(commande).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsCuisinierOrAdmin])
    def reject(self, request, pk=None):
        commande = self.get_object()
        motif = request.data.get('motif', '')

        if not motif:
            return Response(
                {'detail': "Le motif est obligatoire pour refuser une commande"},
                status=status.HTTP_400_BAD_REQUEST
            )
        if commande.statut != 'EN_ATTENTE_ACCEPTATION':
            return Response(
                {'detail': "La commande n'est pas en attente d'acceptation"},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY
            )

        commande.statut = 'REFUSEE'
        commande.motif_rejet = motif
        commande.cuisinier = request.user
        commande.save()

        log_action(
            user=request.user, action='REJECT',
            type_action='Rejet commande',
            description=f"Commande {commande.order_id} refusée — Motif: {motif}",
            table_name='commande', record_id=commande.id, request=request
        )

        if commande.serveur:
            Notification.objects.create(
                user=commande.serveur,
                type='order_rejected',
                message=f"Commande {commande.order_id} refusée — {motif}",
                data={'order_id': commande.order_id, 'table_id': commande.table.id, 'table_num': commande.table.numero, 'motif': motif}
            )
            send_push_to_user(
                commande.serveur,
                title=" Commande rejetée",
                body=f"Table {commande.table.numero} — {motif}",
                tag="order_rejected "
            )

        return Response(OrderSerializer(commande).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsCuisinierOrAdmin])
    def ready(self, request, pk=None):
        commande = self.get_object()
        if commande.statut != 'EN_PREPARATION':
            return Response(
                {'detail': "La commande n'est pas en cours de préparation"},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY
            )

        commande.statut = 'EN_ATTENTE_LIVRAISON'
        commande.date_preparation = timezone.now()
        commande.save()

        log_action(
            user=request.user, action='UPDATE',
            type_action='Commande prête',
            description=f"Commande {commande.order_id} prête pour livraison",
            table_name='commande', record_id=commande.id, request=request
        )

        if commande.serveur:
            Notification.objects.create(
                user=commande.serveur,
                type='order_ready',
                message=f"Commande prête : Table {commande.table.numero}",
                data={'order_id': commande.order_id, 'table_id': commande.table.id, 'table_num': commande.table.numero}
            )
            send_push_to_user(
                commande.serveur,
                title="🍽️ Commande prête",
                body=f"Table {commande.table.numero} — {commande.order_id}",
                url="/",
                tag="order_ready"
            )

        return Response(OrderSerializer(commande).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsServeurOrGerantOrAdmin])
    def deliver(self, request, pk=None):
        commande = self.get_object()
        if commande.statut != 'EN_ATTENTE_LIVRAISON':
            return Response(
                {'detail': "La commande n'est pas en attente de livraison"},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY
            )

        commande.statut = 'EN_ATTENTE_PAIEMENT'
        commande.date_livraison = timezone.now()
        commande.save()

        log_action(
            user=request.user, action='UPDATE',
            type_action='Livraison commande',
            description=f"Commande {commande.order_id} livrée — en attente de paiement",
            table_name='commande', record_id=commande.id, request=request
        )

        gerants = User.objects.filter(
            role__nom__in=['Gérant', 'Manager', 'Administrateur'],
            is_activite=True
        )
        for gerant in gerants:
            Notification.objects.create(
                user=gerant,
                type='order_delivered',
                message=f"Commande {commande.order_id} livrée — Table {commande.table.numero} prête pour paiement",
                data={
                    'table_id': commande.table.id,
                    'table_num': commande.table.numero,
                    'order_id': commande.order_id,
                    'montant': float(commande.prix_total),
                }
            )
        return Response(OrderSerializer(commande).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsGerantOrAdmin])
    def pay(self, request, pk=None):
        """
        POST /api/orders/{id}/pay/
        Paye une commande individuellement. Crée une facture pour cette commande uniquement.
        La commande reste sur la table mais n'est plus comptée pour le paiement de la table.
        """
        commande = self.get_object()
        if commande.statut != 'EN_ATTENTE_PAIEMENT':
            return Response(
                {'detail': "La commande n'est pas en attente de paiement"},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY
            )

        serializer = PaymentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        mode_map = {
            'Espèces': 'ESPECES',
            'Carte bancaire': 'CARTE',
            'Mobile Money': 'MOBILE_MONEY',
            'Autre': 'AUTRE',
        }

        # Build items snapshot for this order only
        items_snapshot = []
        for cp in commande.commandeplat_set.all():
            items_snapshot.append({
                'nom': cp.plat.nom,
                'qte': cp.quantite,
                'prix': float(cp.prix_unitaire),
                'commande_id': commande.order_id,
            })

        # Create invoice linked to this specific order
        facture = Facture.objects.create(
            table=commande.table,
            commande=commande,
            montant_total=commande.prix_total,
            montant_paye=data['montant'],
            pourboire=data.get('pourboire', Decimal('0.00')),
            mode_paiement=mode_map.get(data['mode_paiement'], 'AUTRE'),
            gerant=request.user,
            serveur=commande.serveur,
            items_snapshot=items_snapshot,
        )

        # Mark order as paid
        commande.statut = 'PAYEE'
        commande.is_paid = True
        commande.date_paiement = timezone.now()
        commande.save()

        # Check if this was the last unpaid order of the current session
        table = commande.table
        done = table.commandes.exclude(statut='PAYEE')
        if table.date_ouverture:
            done = done.filter(date_commande__gte=table.date_ouverture)

        table_closed = not done.exists()
        if table_closed:
            # No more unpaid orders — reset the table as if closed normally
            table.statut = 'DISPONIBLE'
            table.montant_total = Decimal('0.00')
            table.date_ouverture = None
            table.date_cloture = None
            table.save()

        log_action(
            user=request.user, action='CREATE',
            type_action='Paiement commande individuelle',
            description=f"Commande {commande.order_id} payée — {data['mode_paiement']} — {data['montant']}" + (" (table libérée)" if table_closed else ""),
            table_name='facture', record_id=facture.id, request=request
        )

        return Response({
            'order': OrderSerializer(commande).data,
            'table_closed': table_closed,
            'invoice': {
                'id': facture.numero_facture,
                'commande_id': commande.order_id,
                'table_id': table.id,
                'table_num': table.numero,
                'montant': float(facture.montant_total),
                'pourboire': float(facture.pourboire),
                'mode_paiement': data['mode_paiement'],
                'date': facture.date_generation.isoformat(),
                'items': items_snapshot,
            }
        })

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def cancel(self, request, pk=None):
        commande = self.get_object()
        user = request.user
        motif = request.data.get('motif', '')

        if not motif:
            return Response(
                {'detail': "Le motif est obligatoire pour annuler une commande"},
                status=status.HTTP_400_BAD_REQUEST
            )

        role = user.role.nom
        # Permission logic
        if role == 'Serveur':
            if commande.statut not in ['STOCKEE', 'EN_ATTENTE_ACCEPTATION']:
                return Response(
                    {'detail': "Vous n'avez pas la permission d'annuler cette commande dans son état actuel"},
                    status=status.HTTP_403_FORBIDDEN
                )
        elif role in ['Gérant', 'Manager', 'Administrateur']:
            if commande.statut not in ['STOCKEE', 'EN_ATTENTE_ACCEPTATION', 'EN_PREPARATION', 'EN_ATTENTE_LIVRAISON', 'EN_ATTENTE_PAIEMENT']:
                return Response(
                    {'detail': "Vous n'avez pas la permission d'annuler cette commande dans son état actuel"},
                    status=status.HTTP_403_FORBIDDEN
                )
        else:
            return Response(
                {'detail': "Vous n'avez pas la permission d'annuler cette commande dans son état actuel"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Notify cuisinier if assigned
        if commande.cuisinier:
            Notification.objects.create(
                user=commande.cuisinier,
                type='order_cancelled',
                message=f"Commande {commande.order_id} annulée — {motif}",
                data={
                    'order_id': commande.order_id,
                    'table_id': commande.table.id,
                    'table_num': commande.table.numero,
                    'motif': motif,
                }
            )

        commande.statut = 'ANNULEE'
        commande.motif_annulation = motif
        commande.save()

        log_action(
            user=request.user, action='CANCEL',
            type_action='Annulation commande',
            description=f"Commande {commande.order_id} annulée — Motif: {motif}",
            table_name='commande', record_id=commande.id, request=request
        )

        return Response(OrderSerializer(commande).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsServeurOrGerantOrAdmin])
    def store(self, request, pk=None):
        """
        POST /api/orders/{id}/store/
        Passe la commande au statut STOCKEE (mise en attente côté cuisine).
        Autorisé uniquement si statut actuel == EN_ATTENTE_ACCEPTATION.
        """
        commande = self.get_object()
    
        if commande.statut != 'EN_ATTENTE_ACCEPTATION':
            return Response(
                {'detail': "La commande ne peut pas être stockée dans son état actuel"},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY
            )
    
        commande.statut = 'STOCKEE'
        commande.save()
    
        log_action(
            user=request.user, action='UPDATE',
            type_action='Stockage commande',
            description=f"Commande {commande.order_id} mise en attente (STOCKEE)",
            table_name='commande', record_id=commande.id, request=request
        )
    
        # Notify cuisinier if assigned
        if commande.cuisinier:
            Notification.objects.create(
                user=commande.cuisinier,
                type='order_stored',
                message=f"Commande {commande.order_id} — Table {commande.table.numero} mise en attente",
                data={
                    'order_id': commande.order_id,
                    'table_id': commande.table.id,
                    'table_num': commande.table.numero,
                }
            )
    
        return Response(OrderSerializer(commande).data)


# ==================== INVOICE (FACTURE) ====================

class InvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET  /api/invoices/             → liste des factures
    GET  /api/invoices/{id}/        → détail d'une facture
    GET  /api/invoices/{id}/pdf/    → télécharger PDF
    POST /api/invoices/{id}/reprint/→ marquer réimpression
    """
    queryset = Facture.objects.select_related('table', 'gerant', 'serveur').all()
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated, CanViewInvoices]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['numero_facture']
    ordering_fields = ['date_generation']
    ordering = ['-date_generation']

    def get_queryset(self):
        qs = super().get_queryset()

        table_num = self.request.query_params.get('table_num')
        if table_num:
            qs = qs.filter(table__numero=table_num)

        mode_paiement = self.request.query_params.get('mode_paiement')
        if mode_paiement:
            mode_map = {
                'Espèces': 'ESPECES',
                'Carte bancaire': 'CARTE',
                'Mobile Money': 'MOBILE_MONEY',
            }
            qs = qs.filter(mode_paiement=mode_map.get(mode_paiement, mode_paiement))

        date_from = self.request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(date_generation__date__gte=date_from)

        date_to = self.request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(date_generation__date__lte=date_to)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(numero_facture__icontains=search)

        return qs

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        """
        Génère un ticket thermique 80mm compact style caisse.
        """
        facture = self.get_object()
        items = facture.items_snapshot or []

        try:
            from reportlab.pdfgen import canvas
            from reportlab.lib.units import mm
            import os
            from django.conf import settings

            logo_path = os.path.join(settings.BASE_DIR, 'stock_management', 'static', 'logo1.png')

            # ── Dimensions ──────────────────────────────────────
            TICKET_WIDTH = 80 * mm
            MARGIN       = 4 * mm
            LH           = 4 * mm

            nb_lines = 20 + len(items) * 2 + (1 if facture.pourboire > 0 else 0)
            height   = max(nb_lines * LH + 50 * mm, 120 * mm)

            buffer = io.BytesIO()
            p = canvas.Canvas(buffer, pagesize=(TICKET_WIDTH, height))
            y = height - 6 * mm

            # ── Helpers ─────────────────────────────────────────
            def center(text, size=7, bold=False):
                nonlocal y
                p.setFont("Helvetica-Bold" if bold else "Helvetica", size)
                p.drawCentredString(TICKET_WIDTH / 2, y, text)
                y -= LH

            def row(left, right, size=7, bold=False):
                nonlocal y
                p.setFont("Helvetica-Bold" if bold else "Helvetica", size)
                p.drawString(MARGIN, y, left)
                p.drawRightString(TICKET_WIDTH - MARGIN, y, right)
                y -= LH

            def sep():
                nonlocal y
                p.setFont("Helvetica", 6)
                p.drawCentredString(TICKET_WIDTH / 2, y, "- " * 22)
                y -= LH

            def gap(factor=0.5):
                nonlocal y
                y -= LH * factor

            # ── LOGO ────────────────────────────────────────────
            try:
                logo_size = 16 * mm
                p.drawImage(
                    logo_path,
                    TICKET_WIDTH / 2 - logo_size / 2, y - logo_size,
                    width=logo_size, height=logo_size,
                    preserveAspectRatio=True, mask='auto'
                )
                y -= logo_size + 1 * mm
            except Exception:
                pass

            # ── EN-TÊTE ─────────────────────────────────────────
            center("FATE AND GRACE", size=10, bold=True)
            center("BOulangerie · Pâtisserie · Restaurant", size=6)
            gap()
            sep()
            center("IFU N° 0202327061497", size=6)
            center("RCCM N° RB/ABC/25 A 129300", size=6)
            sep()
            gap(0.3)

            # ── INFOS TICKET ────────────────────────────────────
            center("REÇU DE VENTE", size=8, bold=True)
            gap(0.3)
            row("Ticket :", facture.numero_facture, size=7)
            row("Table  :", facture.table.numero, size=7)
            row("Date   :", facture.date_generation.strftime('%d/%m/%Y  %H:%M'), size=7)
            if facture.serveur:
                row("Serveur:", facture.serveur.get_full_name(), size=7)
            gap(0.3)
            sep()

            # ── ENTÊTE COLONNES ──────────────────────────────────
            row("Qté  Article", "Prix", size=7, bold=True)
            sep()

            # ── ARTICLES ────────────────────────────────────────
            for item in items:
                nom   = item['nom'][:24]
                qte   = item['qte']
                prix  = float(item['prix'])
                total = qte * prix

                row(nom, f"{total:,.0f} FCFA", size=7)
                p.setFont("Helvetica", 6)
                p.drawString(MARGIN + 1 * mm, y, f"{qte}x {prix:,.0f} FCFA")
                y -= LH * 0.9

            gap(0.3)
            sep()

            # ── TOTAUX ──────────────────────────────────────────
            row("Sous-total :", f"{facture.montant_total:,.0f} FCFA", size=7)

            if facture.pourboire > 0:
                row("Pourboire  :", f"{facture.pourboire:,.0f} FCFA", size=7)

            sep()
            row("TOTAL :", f"{facture.montant_paye:,.0f} FCFA", size=9, bold=True)
            sep()
            row("Paiement :", facture.get_mode_paiement_display(), size=7)
            sep()

            # ── PIED ────────────────────────────────────────────
            gap(0.5)
            center("MERCI DE VOTRE VISITE !", size=7, bold=True)
            center("À bientôt !", size=6)
            gap()

            p.showPage()
            p.save()

            buffer.seek(0)
            response = HttpResponse(buffer, content_type='application/pdf')
            response['Content-Disposition'] = f'inline; filename="{facture.numero_facture}.pdf"'
            return response

        except ImportError:
            lines = []
            lines.append(f"{'FATE AND GRACE':^42}")
            lines.append(f"{'Patisserie - Restaurant':^42}")
            lines.append(f"{'- ' * 21:^42}")
            lines.append(f"{'IFU N 0202327061497':^42}")
            lines.append(f"{'RCCM N RB/ABC/25 A 129300':^42}")
            lines.append(f"{'- ' * 21:^42}")
            lines.append(f"{'RECU DE VENTE':^42}")
            lines.append(f"Ticket : {facture.numero_facture}")
            lines.append(f"Table  : {facture.table.numero}")
            lines.append(f"Date   : {facture.date_generation.strftime('%d/%m/%Y %H:%M')}")
            if facture.serveur:
                lines.append(f"Serveur: {facture.serveur.get_full_name()}")
            lines.append(f"{'- ' * 21:^42}")
            lines.append(f"{'Qte  Article':<30} {'Prix':>12}")
            lines.append(f"{'- ' * 21:^42}")
            for item in items:
                total = item['qte'] * float(item['prix'])
                lines.append(f"{item['nom'][:24]:<24} {total:>10,.0f} FCFA")
                lines.append(f"  {item['qte']}x {float(item['prix']):,.0f} FCFA")
            lines.append(f"{'- ' * 21:^42}")
            lines.append(f"{'Sous-total :':<24} {facture.montant_total:>10,.0f} FCFA")
            if facture.pourboire > 0:
                lines.append(f"{'Pourboire  :':<24} {facture.pourboire:>10,.0f} FCFA")
            lines.append(f"{'- ' * 21:^42}")
            lines.append(f"{'TOTAL :':<24} {facture.montant_paye:>10,.0f} FCFA")
            lines.append(f"{'- ' * 21:^42}")
            lines.append(f"Paiement : {facture.get_mode_paiement_display()}")
            lines.append(f"{'- ' * 21:^42}")
            lines.append(f"{'MERCI DE VOTRE VISITE !':^42}")
            content = "\n".join(lines)
            response = HttpResponse(content, content_type='text/plain')
            response['Content-Disposition'] = f'attachment; filename="{facture.numero_facture}.txt"'
            return responseSonnet 
        

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsGerantOrAdmin])
    def reprint(self, request, pk=None):
        facture = self.get_object()

        log_action(
            user=request.user, action='UPDATE',
            type_action='Réimpression facture',
            description=f"Facture {facture.numero_facture} réimprimée",
            table_name='facture', record_id=facture.id, request=request
        )

        return Response({
            'detail': 'Réimpression enregistrée',
            'invoice_id': facture.numero_facture
        })


# ==================== NOTIFICATION ====================

class NotificationViewSet(viewsets.GenericViewSet):
    """
    GET  /api/notifications/           → notifications non lues
    POST /api/notifications/{id}/read/ → marquer comme lue
    POST /api/notifications/read-all/  → marquer toutes comme lues
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    def list(self, request):
        notifications = self.get_queryset().filter(is_read=False)
        serializer = NotificationSerializer(notifications, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def read(self, request, pk=None):
        try:
            notification = self.get_queryset().get(pk=pk)
        except Notification.DoesNotExist:
            return Response(
                {'detail': 'Notification introuvable'},
                status=status.HTTP_404_NOT_FOUND
            )
        notification.is_read = True
        notification.save()
        return Response({'id': notification.id, 'is_read': True})

    @action(detail=False, methods=['post'], url_path='read-all')
    def read_all(self, request):
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({'detail': 'Toutes les notifications marquées comme lues'})



@api_view(["POST"])
@permission_classes([IsAuthenticated])
def push_subscribe(request):
    """
    POST /api/notifications/push-subscribe/
    Body: { endpoint, p256dh, auth }
    Enregistre ou met à jour l'abonnement push de l'utilisateur courant.
    """
    from users.models import PushSubscription  # adapter l'import
    endpoint = request.data.get("endpoint")
    p256dh   = request.data.get("p256dh")
    auth     = request.data.get("auth")
 
    if not all([endpoint, p256dh, auth]):
        return Response(
            {"detail": "endpoint, p256dh et auth sont requis"},
            status=status.HTTP_400_BAD_REQUEST
        )
 
    # Upsert : créer ou mettre à jour si l'endpoint existe déjà
    PushSubscription.objects.update_or_create(
        endpoint=endpoint,
        defaults={
            "user":   request.user,
            "p256dh": p256dh,
            "auth":   auth,
        }
    )
    return Response({"status": "subscribed"}, status=status.HTTP_201_CREATED)
 
 