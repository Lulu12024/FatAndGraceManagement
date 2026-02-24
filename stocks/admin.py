from django.contrib import admin
from .models import (
    Produit, Unite, Stock, MouvementStock, TypeMouvement,
    StatutMouvement, DemandeProduit, StatutDemande
)


@admin.register(Unite)
class UniteAdmin(admin.ModelAdmin):
    list_display = ['nom']
    search_fields = ['nom']


@admin.register(Produit)
class ProduitAdmin(admin.ModelAdmin):
    list_display = ['nom', 'categorie', 'unite', 'seuil_alerte']
    list_filter = ['categorie', 'unite']
    search_fields = ['nom', 'description']


@admin.register(Stock)
class StockAdmin(admin.ModelAdmin):
    list_display = ['produit', 'quantite_dispo', 'date_time', 'est_en_alerte']
    list_filter = ['date_time']
    search_fields = ['produit__nom']

    def est_en_alerte(self, obj):
        return obj.est_en_alerte
    est_en_alerte.boolean = True
    est_en_alerte.short_description = 'En alerte'


@admin.register(TypeMouvement)
class TypeMouvementAdmin(admin.ModelAdmin):
    list_display = ['nom']


@admin.register(StatutMouvement)
class StatutMouvementAdmin(admin.ModelAdmin):
    list_display = ['nom']


@admin.register(MouvementStock)
class MouvementStockAdmin(admin.ModelAdmin):
    list_display = ['id', 'type_mouvement', 'produit', 'quantite', 'statut', 'demandeur', 'date']
    list_filter = ['type_mouvement', 'statut', 'date']
    search_fields = ['produit__nom', 'justification']


@admin.register(StatutDemande)
class StatutDemandeAdmin(admin.ModelAdmin):
    list_display = ['nom']


@admin.register(DemandeProduit)
class DemandeProduitAdmin(admin.ModelAdmin):
    list_display = ['id', 'produit', 'quantite', 'statut', 'demandeur', 'date_demande']
    list_filter = ['statut', 'date_demande']
    search_fields = ['produit__nom', 'justification']
