from rest_framework import permissions


class IsAdministrateur(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and \
               request.user.role and request.user.role.nom == 'Administrateur'


class IsManager(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and \
               request.user.role.nom == 'Manager'


class IsGerant(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and \
               request.user.role.nom == 'Gerant'


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


class IsGestionnaire(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and \
               request.user.role.nom == 'Gestionnaire de stock'


class IsAdminOrManager(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and \
               request.user.role.nom in ['Administrateur', 'Manager']


class IsManagerOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and \
               request.user.role.nom in ['Manager', 'Administrateur']


class IsManagerOrGerant(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and \
               request.user.role.nom in ['Manager', 'Gerant']


class IsGerantOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and \
               request.user.role.nom in ['Gerant', 'Administrateur']


class IsServeurOrGerantOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and \
               request.user.role.nom in ['Serveur', 'Gerant', 'Administrateur']


class IsCuisinierOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and \
               request.user.role.nom in ['Cuisinier', 'Administrateur']


class IsGestionnaireOrGerantOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and \
               request.user.role.nom in ['Gestionnaire de stock', 'Gerant', 'Administrateur']


class IsOwnerOrAdmin(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.role.nom == 'Administrateur':
            return True
        return obj == request.user


class CanManageUsers(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role.nom in ['Administrateur', 'Manager']


class CanViewStock(permissions.BasePermission):
    """Cuisinier, Gestionnaire, Gerant, Manager, Auditeur, Admin"""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and \
               request.user.role.nom in [
                   'Cuisinier', 'Gestionnaire de stock', 'Gerant',
                   'Manager', 'Auditeur', 'Administrateur'
               ]


class CanViewMovements(permissions.BasePermission):
    """Gestionnaire, Gerant, Manager, Auditeur, Admin"""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and \
               request.user.role.nom in [
                   'Gestionnaire de stock', 'Gerant',
                   'Manager', 'Auditeur', 'Administrateur'
               ]


class CanViewInvoices(permissions.BasePermission):
    """Gerant, Manager, Auditeur, Admin"""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and \
               request.user.role.nom in [
                   'Gerant', 'Manager', 'Auditeur', 'Administrateur'
               ]


class CanViewReports(permissions.BasePermission):
    """Gerant, Manager, Admin"""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and \
               request.user.role.nom in ['Gerant', 'Manager', 'Administrateur']


class CanViewAuditLogs(permissions.BasePermission):
    """Manager, Auditeur, Admin"""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and \
               request.user.role.nom in ['Manager', 'Auditeur', 'Administrateur']
