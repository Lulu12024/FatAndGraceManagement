from django.contrib import admin
from .models import LogAudit, Rapport, FormatExport


@admin.register(LogAudit)
class LogAuditAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'action', 'type_action', 'date_action', 'heure_action']
    list_filter = ['action', 'date_action']
    search_fields = ['user__login', 'description', 'type_action']
    readonly_fields = ['user', 'action', 'type_action', 'date_action', 'heure_action',
                      'description', 'ip_address', 'user_agent', 'table_name',
                      'record_id', 'old_values', 'new_values']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(Rapport)
class RapportAdmin(admin.ModelAdmin):
    list_display = ['id', 'type', 'periode', 'genere_par', 'date_generation']
    list_filter = ['type', 'date_generation']
    search_fields = ['periode', 'contenu']


@admin.register(FormatExport)
class FormatExportAdmin(admin.ModelAdmin):
    list_display = ['nom']
