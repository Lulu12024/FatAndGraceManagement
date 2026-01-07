from rest_framework import permissions


class IsAdministrateur(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and \
               request.user.role.nom == 'Administrateur'


class IsManager(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and \
               request.user.role.nom == 'Manager'


class IsGerant(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and \
               request.user.role.nom == 'Gérant'


class IsCuisinier(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and \
               request.user.role.nom == 'Cuisinier'


class IsServeur(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and \
               request.user.role.nom == 'Serveur'


class IsAuditeur(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and \
               request.user.role.nom == 'Auditeur'


class IsAdminOrManager(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and \
               request.user.role.nom in ['Administrateur', 'Manager']


class IsManagerOrGerant(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and \
               request.user.role.nom in ['Manager', 'Gérant']


class IsOwnerOrAdmin(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.role.nom == 'Administrateur':
            return True
        return obj == request.user


class CanManageUsers(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.method in permissions.SAFE_METHODS:
            return True

        return request.user.role.nom in ['Administrateur', 'Manager']
