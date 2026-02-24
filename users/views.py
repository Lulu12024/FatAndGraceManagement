from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import User, Role, Permission
from .serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    ChangePasswordSerializer, UserListSerializer, RoleSerializer,
    PermissionSerializer
)
from .permissions import IsAdministrateur, CanManageUsers, IsOwnerOrAdmin
from audit.utils import log_action


class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated, IsAdministrateur]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['nom', 'description']
    ordering_fields = ['nom']
    ordering = ['nom']


class PermissionViewSet(viewsets.ModelViewSet):
    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    permission_classes = [IsAuthenticated, IsAdministrateur]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['nom', 'description']
    ordering_fields = ['nom']
    ordering = ['nom']


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.filter(is_deleted=False)
    permission_classes = [IsAuthenticated, CanManageUsers]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['role', 'is_activite', 'sexe']
    search_fields = ['login', 'first_name', 'last_name', 'email']
    ordering_fields = ['date_joined', 'last_name']
    ordering = ['-date_joined']

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        elif self.action == 'list':
            return UserListSerializer
        return UserSerializer

    def perform_create(self, serializer):
        user = serializer.save()
        log_action(
            user=self.request.user,
            action='CREATE',
            type_action='Création utilisateur',
            description=f"Création de l'utilisateur {user.get_full_name()}",
            table_name='user',
            record_id=user.id,
            request=self.request
        )

    def perform_update(self, serializer):
        old_data = UserSerializer(self.get_object()).data
        user = serializer.save()
        log_action(
            user=self.request.user,
            action='UPDATE',
            type_action='Modification utilisateur',
            description=f"Modification de l'utilisateur {user.get_full_name()}",
            table_name='user',
            record_id=user.id,
            old_values=old_data,
            new_values=UserSerializer(user).data,
            request=self.request
        )

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save()
        log_action(
            user=self.request.user,
            action='DELETE',
            type_action='Suppression utilisateur',
            description=f"Suppression de l'utilisateur {instance.get_full_name()}",
            table_name='user',
            record_id=instance.id,
            request=self.request
        )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsOwnerOrAdmin])
    def change_password(self, request, pk=None):
        user = self.get_object()
        serializer = ChangePasswordSerializer(data=request.data)

        if serializer.is_valid():
            if not user.check_password(serializer.data.get('old_password')):
                return Response(
                    {'old_password': 'Mot de passe incorrect.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            user.set_password(serializer.data.get('new_password'))
            user.save()

            log_action(
                user=request.user,
                action='UPDATE',
                type_action='Changement de mot de passe',
                description=f"Changement de mot de passe pour {user.get_full_name()}",
                table_name='user',
                record_id=user.id,
                request=request
            )

            return Response({'message': 'Mot de passe modifié avec succès.'})

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdministrateur])
    def activate(self, request, pk=None):
        user = self.get_object()
        user.is_activite = True
        user.save()

        log_action(
            user=request.user,
            action='UPDATE',
            type_action='Activation utilisateur',
            description=f"Activation de l'utilisateur {user.get_full_name()}",
            table_name='user',
            record_id=user.id,
            request=request
        )

        return Response({'message': 'Utilisateur activé avec succès.'})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdministrateur])
    def deactivate(self, request, pk=None):
        user = self.get_object()
        user.is_activite = False
        user.save()

        log_action(
            user=request.user,
            action='UPDATE',
            type_action='Désactivation utilisateur',
            description=f"Désactivation de l'utilisateur {user.get_full_name()}",
            table_name='user',
            record_id=user.id,
            request=request
        )

        return Response({'message': 'Utilisateur désactivé avec succès.'})
