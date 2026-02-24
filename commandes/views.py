from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Q

from .models import Commande, Plat, StatutCommande
from .serializers import (
    CommandeSerializer, CommandeCreateSerializer, CommandeListSerializer,
    CommandeUpdateStatusSerializer, PlatSerializer, StatutCommandeSerializer
)
from users.permissions import IsServeur, IsCuisinier, IsGerant, IsAdministrateur
from audit.utils import log_action


class PlatViewSet(viewsets.ModelViewSet):
    queryset = Plat.objects.all()
    serializer_class = PlatSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['disponible']
    search_fields = ['nom', 'description']
    ordering_fields = ['nom', 'prix']
    ordering = ['nom']


class StatutCommandeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StatutCommande.objects.all()
    serializer_class = StatutCommandeSerializer
    permission_classes = [IsAuthenticated]


class CommandeViewSet(viewsets.ModelViewSet):
    queryset = Commande.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['statut', 'serveur', 'cuisinier', 'table']
    search_fields = ['table', 'description']
    ordering_fields = ['date_commande', 'heure_commande']
    ordering = ['-date_commande', '-heure_commande']

    def get_serializer_class(self):
        if self.action == 'create':
            return CommandeCreateSerializer
        elif self.action == 'list':
            return CommandeListSerializer
        return CommandeSerializer

    def get_queryset(self):
        user = self.request.user
        role = user.role.nom

        if role == 'Serveur':
            return Commande.objects.filter(serveur=user)
        elif role == 'Cuisinier':
            return Commande.objects.filter(
                Q(cuisinier=user) | Q(cuisinier__isnull=True)
            )
        elif role in ['Gérant', 'Manager', 'Administrateur']:
            return Commande.objects.all()

        return Commande.objects.none()

    def perform_create(self, serializer):
        commande = serializer.save()
        log_action(
            user=self.request.user,
            action='CREATE',
            type_action='Création commande',
            description=f"Nouvelle commande #{commande.id} - Table {commande.table}",
            table_name='commande',
            record_id=commande.id,
            request=self.request
        )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def accepter(self, request, pk=None):
        commande = self.get_object()
        user = request.user

        if user.role.nom != 'Cuisinier':
            return Response(
                {'error': 'Seuls les cuisiniers peuvent accepter les commandes.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if commande.statut.nom != 'EN_ATTENTE':
            return Response(
                {'error': 'Cette commande ne peut pas être acceptée.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        statut_validee = StatutCommande.objects.get(nom='VALIDEE')
        commande.statut = statut_validee
        commande.cuisinier = user
        commande.save()

        log_action(
            user=request.user,
            action='APPROVE',
            type_action='Acceptation commande',
            description=f"Commande #{commande.id} acceptée par {user.get_full_name()}",
            table_name='commande',
            record_id=commande.id,
            request=request
        )

        return Response({'message': 'Commande acceptée avec succès.'})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def rejeter(self, request, pk=None):
        commande = self.get_object()
        user = request.user
        motif = request.data.get('motif', '')

        if not motif:
            return Response(
                {'error': 'Le motif de rejet est obligatoire.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if user.role.nom != 'Cuisinier':
            return Response(
                {'error': 'Seuls les cuisiniers peuvent rejeter les commandes.'},
                status=status.HTTP_403_FORBIDDEN
            )

        statut_rejetee = StatutCommande.objects.get(nom='REJETEE')
        commande.statut = statut_rejetee
        commande.cuisinier = user
        commande.save()

        log_action(
            user=request.user,
            action='REJECT',
            type_action='Rejet commande',
            description=f"Commande #{commande.id} rejetée - Motif: {motif}",
            table_name='commande',
            record_id=commande.id,
            request=request
        )

        return Response({'message': 'Commande rejetée.'})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def marquer_prete(self, request, pk=None):
        commande = self.get_object()
        user = request.user

        if user.role.nom != 'Cuisinier' or commande.cuisinier != user:
            return Response(
                {'error': 'Vous ne pouvez marquer comme prête que vos propres commandes.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if commande.statut.nom != 'VALIDEE':
            return Response(
                {'error': 'Cette commande ne peut pas être marquée comme prête.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        statut_confirmee = StatutCommande.objects.get(nom='CONFIRMEE')
        commande.statut = statut_confirmee
        commande.save()

        log_action(
            user=request.user,
            action='UPDATE',
            type_action='Commande prête',
            description=f"Commande #{commande.id} marquée comme prête",
            table_name='commande',
            record_id=commande.id,
            request=request
        )

        return Response({'message': 'Commande marquée comme prête.'})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def livrer(self, request, pk=None):
        commande = self.get_object()
        user = request.user

        if user.role.nom != 'Serveur' or commande.serveur != user:
            return Response(
                {'error': 'Seul le serveur de la commande peut la livrer.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if commande.statut.nom != 'CONFIRMEE':
            return Response(
                {'error': 'Cette commande ne peut pas être livrée.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        commande.save()

        log_action(
            user=request.user,
            action='UPDATE',
            type_action='Livraison commande',
            description=f"Commande #{commande.id} livrée",
            table_name='commande',
            record_id=commande.id,
            request=request
        )

        return Response({'message': 'Commande livrée avec succès.'})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def annuler(self, request, pk=None):
        commande = self.get_object()
        user = request.user
        motif = request.data.get('motif', '')

        if not motif:
            return Response(
                {'error': "Le motif d'annulation est obligatoire."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if user.role.nom == 'Serveur':
            if commande.serveur != user:
                return Response(
                    {'error': 'Vous ne pouvez annuler que vos propres commandes.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            if commande.statut.nom != 'EN_ATTENTE':
                return Response(
                    {'error': 'Vous ne pouvez annuler que les commandes non acceptées.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        elif user.role.nom == 'Gérant':
            pass
        else:
            return Response(
                {'error': "Vous n'avez pas les permissions pour annuler cette commande."},
                status=status.HTTP_403_FORBIDDEN
            )

        commande.delete()

        log_action(
            user=request.user,
            action='CANCEL',
            type_action='Annulation commande',
            description=f"Commande #{commande.id} annulée - Motif: {motif}",
            table_name='commande',
            record_id=commande.id,
            request=request
        )

        return Response({'message': 'Commande annulée avec succès.'})
