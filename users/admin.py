from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Role, Permission


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ['nom', 'description']
    search_fields = ['nom']


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ['nom', 'description']
    search_fields = ['nom']


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['login', 'first_name', 'last_name', 'email', 'role', 'is_activite', 'date_joined']
    list_filter = ['role', 'is_activite', 'is_deleted', 'date_joined']
    search_fields = ['login', 'first_name', 'last_name', 'email']
    ordering = ['-date_joined']

    fieldsets = (
        ('Informations de connexion', {
            'fields': ('login', 'password')
        }),
        ('Informations personnelles', {
            'fields': ('first_name', 'last_name', 'date_de_naissance', 'sexe', 'email', 'date_embauche')
        }),
        ('Permissions', {
            'fields': ('role', 'permissions', 'is_activite', 'is_deleted', 'is_staff', 'is_superuser')
        }),
        ('Dates importantes', {
            'fields': ('last_login', 'date_joined')
        }),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('login', 'password1', 'password2', 'first_name', 'last_name',
                      'date_de_naissance', 'sexe', 'role'),
        }),
    )

    readonly_fields = ['date_joined', 'last_login']
