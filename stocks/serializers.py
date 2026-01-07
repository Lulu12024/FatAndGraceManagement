from rest_framework import serializers
from .models import (
    Produit, Unite, Stock, MouvementStock, TypeMouvement,
    StatutMouvement, DemandeProduit, StatutDemande
)
from users.serializers import UserListSerializer


class UniteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unite
        fields = ['id', 'nom']


class ProduitSerializer(serializers.ModelSerializer):
    unite_details = UniteSerializer(source='unite', read_only=True)

    class Meta:
        model = Produit
        fields = ['id', 'nom', 'categorie', 'description', 'seuil_alerte', 'unite', 'unite_details']


class StockSerializer(serializers.ModelSerializer):
    produit_details = ProduitSerializer(source='produit', read_only=True)
    est_en_alerte = serializers.BooleanField(read_only=True)

    class Meta:
        model = Stock
        fields = ['id', 'quantite_dispo', 'date_time', 'produit', 'produit_details', 'est_en_alerte']
        read_only_fields = ['date_time']


class TypeMouvementSerializer(serializers.ModelSerializer):
    class Meta:
        model = TypeMouvement
        fields = ['id', 'nom']


class StatutMouvementSerializer(serializers.ModelSerializer):
    class Meta:
        model = StatutMouvement
        fields = ['id', 'nom']


class MouvementStockSerializer(serializers.ModelSerializer):
    type_mouvement_details = TypeMouvementSerializer(source='type_mouvement', read_only=True)
    statut_details = StatutMouvementSerializer(source='statut', read_only=True)
    produit_details = ProduitSerializer(source='produit', read_only=True)
    demandeur_details = UserListSerializer(source='demandeur', read_only=True)
    valideur_details = UserListSerializer(source='valideur', read_only=True)

    class Meta:
        model = MouvementStock
        fields = [
            'id', 'type_mouvement', 'type_mouvement_details', 'quantite',
            'date', 'heure', 'justification', 'statut', 'statut_details',
            'produit', 'produit_details', 'demandeur', 'demandeur_details',
            'valideur', 'valideur_details'
        ]
        read_only_fields = ['date', 'heure']


class MouvementStockCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MouvementStock
        fields = [
            'type_mouvement', 'quantite', 'justification',
            'produit', 'demandeur'
        ]

    def validate(self, attrs):
        type_mouvement = attrs.get('type_mouvement')
        if type_mouvement.nom == 'SORTIE' and not attrs.get('justification'):
            raise serializers.ValidationError({
                'justification': 'La justification est obligatoire pour une sortie.'
            })
        return attrs


class MouvementStockValidationSerializer(serializers.ModelSerializer):
    motif_rejet = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = MouvementStock
        fields = ['statut', 'valideur', 'motif_rejet']


class StatutDemandeSerializer(serializers.ModelSerializer):
    class Meta:
        model = StatutDemande
        fields = ['id', 'nom']


class DemandeProduitSerializer(serializers.ModelSerializer):
    produit_details = ProduitSerializer(source='produit', read_only=True)
    demandeur_details = UserListSerializer(source='demandeur', read_only=True)
    valideur_details = UserListSerializer(source='valideur', read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)

    class Meta:
        model = DemandeProduit
        fields = [
            'id', 'justification', 'quantite', 'statut', 'statut_display',
            'date_demande', 'produit', 'produit_details', 'demandeur',
            'demandeur_details', 'valideur', 'valideur_details', 'commande'
        ]
        read_only_fields = ['date_demande']


class DemandeProduitCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemandeProduit
        fields = ['justification', 'quantite', 'produit', 'demandeur', 'commande']

    def validate_quantite(self, value):
        if value <= 0:
            raise serializers.ValidationError("La quantité doit être supérieure à 0.")
        return value


class DemandeProduitValidationSerializer(serializers.ModelSerializer):
    motif_rejet = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = DemandeProduit
        fields = ['statut', 'valideur', 'motif_rejet']


class StockAlertSerializer(serializers.ModelSerializer):
    produit_nom = serializers.CharField(source='produit.nom', read_only=True)
    produit_categorie = serializers.CharField(source='produit.categorie', read_only=True)
    seuil_alerte = serializers.DecimalField(
        source='produit.seuil_alerte',
        max_digits=10,
        decimal_places=2,
        read_only=True
    )

    class Meta:
        model = Stock
        fields = [
            'id', 'produit_nom', 'produit_categorie',
            'quantite_dispo', 'seuil_alerte', 'date_time'
        ]
