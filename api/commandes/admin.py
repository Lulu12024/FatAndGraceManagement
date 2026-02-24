from django.contrib import admin
from .models import Commande, Plat, CommandePlat


@admin.register(Plat)
class PlatAdmin(admin.ModelAdmin):
    list_display = ['nom', 'prix', 'disponible']
    list_filter = ['disponible']
    search_fields = ['nom', 'description']


class CommandePlatInline(admin.TabularInline):
    model = CommandePlat
    extra = 1


@admin.register(Commande)
class CommandeAdmin(admin.ModelAdmin):
    list_display = ['id', 'table', 'serveur', 'cuisinier', 'statut', 'date_commande', 'prix_total']
    list_filter = ['statut', 'date_commande']
    search_fields = ['table', 'description']
    inlines = [CommandePlatInline]
