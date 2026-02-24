from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import User, Role, Permission
from .serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    RoleSerializer, PermissionSerializer,
    MeSerializer, ChangePasswordSerializer, LoginSerializer,
)
from .permissions import CanManageUsers, IsAdministrateur, IsAdminOrManager
from audit.utils import log_action


# ==================== AUTH VIEWS ====================

@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """POST /api/auth/login/ → authentifier un utilisateur et retourner les tokens JWT"""
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    login_val = serializer.validated_data['login']
    password = serializer.validated_data['password']

    try:
        user = User.objects.get(login=login_val)
    except User.DoesNotExist:
        return Response(
            {'detail': 'Identifiants invalides'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    if not user.check_password(password):
        return Response(
            {'detail': 'Identifiants invalides'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    if not user.is_activite:
        return Response(
            {'detail': 'Compte désactivé. Contactez un administrateur.'},
            status=status.HTTP_403_FORBIDDEN
        )

    if hasattr(user, 'is_deleted') and user.is_deleted:
        return Response(
            {'detail': 'Identifiants invalides'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    # Generate JWT tokens
    refresh = RefreshToken.for_user(user)

    # Get permissions
    permissions_list = [p.nom for p in user.permissions.all()]

    log_action(
        user=user, action='LOGIN',
        type_action='Connexion',
        description=f"Connexion de {user.get_full_name()}",
        request=request
    )

    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': {
            'id': user.id,
            'login': user.login,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': user.role.nom.lower() if user.role else '',
            'permissions': permissions_list,
        }
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """POST /api/auth/logout/ → invalider le token refresh"""
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()

        log_action(
            user=request.user, action='LOGOUT',
            type_action='Déconnexion',
            description=f"Déconnexion de {request.user.get_full_name()}",
            request=request
        )

        return Response({'detail': 'Déconnexion réussie'})
    except Exception:
        return Response({'detail': 'Déconnexion réussie'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    """GET /api/auth/me/ → retourner le profil de l'utilisateur connecté"""
    serializer = MeSerializer(request.user)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """POST /api/auth/change-password/ → changer le mot de passe"""
    serializer = ChangePasswordSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    user = request.user
    if not user.check_password(serializer.validated_data['old_password']):
        return Response(
            {'detail': "L'ancien mot de passe est incorrect"},
            status=status.HTTP_400_BAD_REQUEST
        )

    user.set_password(serializer.validated_data['new_password'])
    user.save()

    log_action(
        user=user, action='UPDATE',
        type_action='Changement mot de passe',
        description=f"Mot de passe modifié par {user.get_full_name()}",
        request=request
    )

    return Response({'detail': 'Mot de passe modifié avec succès'})


# ==================== USER MANAGEMENT ====================

class UserViewSet(viewsets.ModelViewSet):
    """
    GET    /api/users/                      → liste des utilisateurs
    POST   /api/users/                      → créer un utilisateur
    GET    /api/users/{id}/                 → détail d'un utilisateur
    PUT    /api/users/{id}/                 → modifier un utilisateur
    DELETE /api/users/{id}/                 → supprimer un utilisateur
    POST   /api/users/{id}/toggle/          → activer/désactiver un utilisateur
    POST   /api/users/{id}/reset-password/  → réinitialiser le mot de passe
    """
    permission_classes = [IsAuthenticated, CanManageUsers]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['first_name', 'last_name', 'login', 'email']
    ordering_fields = ['date_joined', 'last_name', 'first_name']
    ordering = ['-date_joined']

    def get_queryset(self):
        qs = User.objects.select_related('role').all()
        if hasattr(User, 'is_deleted'):
            qs = qs.filter(is_deleted=False)

        # Filters
        role = self.request.query_params.get('role')
        if role:
            qs = qs.filter(role__nom__iexact=role)

        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_activite=is_active.lower() == 'true')

        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        log_action(
            user=request.user, action='CREATE',
            type_action='Création utilisateur',
            description=f"Utilisateur {user.login} créé",
            table_name='user', record_id=user.id, request=request
        )

        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        log_action(
            user=request.user, action='UPDATE',
            type_action='Modification utilisateur',
            description=f"Utilisateur {user.login} modifié",
            table_name='user', record_id=user.id, request=request
        )

        return Response(UserSerializer(user).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance == request.user:
            return Response(
                {'detail': "Vous ne pouvez pas supprimer votre propre compte"},
                status=status.HTTP_400_BAD_REQUEST
            )

        user_login = instance.login

        log_action(
            user=request.user, action='DELETE',
            type_action='Suppression utilisateur',
            description=f"Utilisateur {user_login} supprimé",
            table_name='user', record_id=instance.id, request=request
        )

        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdminOrManager])
    def toggle(self, request, pk=None):
        """Active ou désactive un utilisateur"""
        user = self.get_object()
        if user == request.user:
            return Response(
                {'detail': "Vous ne pouvez pas vous désactiver"},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.is_activite = not user.is_activite
        user.save()

        action_word = 'activé' if user.is_activite else 'désactivé'

        log_action(
            user=request.user, action='UPDATE',
            type_action=f'{action_word.capitalize()} utilisateur',
            description=f"Utilisateur {user.login} {action_word}",
            table_name='user', record_id=user.id, request=request
        )

        return Response({
            'id': user.id,
            'login': user.login,
            'is_active': user.is_activite,
            'detail': f"Utilisateur {action_word}"
        })

    @action(detail=True, methods=['post'], url_path='reset-password',
            permission_classes=[IsAuthenticated, IsAdminOrManager])
    def reset_password(self, request, pk=None):
        """Réinitialise le mot de passe d'un utilisateur"""
        user = self.get_object()
        new_password = request.data.get('new_password')

        if not new_password or len(new_password) < 6:
            return Response(
                {'detail': 'Le nouveau mot de passe doit contenir au moins 6 caractères'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password)
        user.save()

        log_action(
            user=request.user, action='UPDATE',
            type_action='Réinitialisation mot de passe',
            description=f"Mot de passe de {user.login} réinitialisé par {request.user.login}",
            table_name='user', record_id=user.id, request=request
        )

        return Response({'detail': f"Mot de passe de {user.login} réinitialisé"})


# ==================== ROLES & PERMISSIONS ====================

class RoleViewSet(viewsets.ModelViewSet):
    """
    GET    /api/roles/      → liste des rôles
    POST   /api/roles/      → créer un rôle (Admin uniquement)
    PUT    /api/roles/{id}/ → modifier un rôle (Admin uniquement)
    DELETE /api/roles/{id}/ → supprimer un rôle (Admin uniquement)
    """
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated, IsAdministrateur]


class PermissionViewSet(viewsets.ModelViewSet):
    """
    GET    /api/permissions/      → liste des permissions
    POST   /api/permissions/      → créer (Admin uniquement)
    PUT    /api/permissions/{id}/ → modifier (Admin uniquement)
    DELETE /api/permissions/{id}/ → supprimer (Admin uniquement)
    """
    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    permission_classes = [IsAuthenticated, IsAdministrateur]
