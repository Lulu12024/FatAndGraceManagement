from rest_framework import serializers
from .models import Produit, Unite, Stock, MouvementStock, DemandeProduit


class UniteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unite
        fields = ['id', 'nom', ]


class ProductSerializer(serializers.ModelSerializer):
    """Serializer pour les produits (spec: qte, unite, seuil, peremption)"""
    qte = serializers.SerializerMethodField()
    unite = serializers.CharField(source='unite.nom', read_only=True)
    seuil = serializers.DecimalField(source='seuil_alerte', max_digits=10, decimal_places=2, read_only=True)
    peremption = serializers.DateField(source='date_peremption', read_only=True)
    alerte = serializers.SerializerMethodField()

    class Meta:
        model = Produit
        fields = [
            'id', 'nom', 'categorie', 'description',
            'qte', 'unite', 'seuil', 'peremption', 'alerte'
        ]

    def get_qte(self, obj):
        try:
            return float(obj.stock.quantite_dispo)
        except Stock.DoesNotExist:
            return 0

    def get_alerte(self, obj):
        try:
            return obj.stock.quantite_dispo <= obj.seuil_alerte
        except Stock.DoesNotExist:
            return True


class ProductCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer/modifier un produit"""
    unite_id = serializers.IntegerField(write_only=True)
    qte_initiale = serializers.DecimalField(
        max_digits=10, decimal_places=2,
        required=False, write_only=True
    )

    class Meta:
        model = Produit
        fields = [
            'nom', 'categorie', 'description',
            'seuil_alerte', 'date_peremption', 'unite_id',
            'qte_initiale'
        ]

    def validate_unite_id(self, value):
        try:
            Unite.objects.get(id=value)
        except Unite.DoesNotExist:
            raise serializers.ValidationError("Unité introuvable")
        return value


class MovementSerializer(serializers.ModelSerializer):
    """Serializer pour les mouvements de stock"""
    id = serializers.SerializerMethodField()
    num_id = serializers.IntegerField(source='id', read_only=True)
    type = serializers.CharField(source='type_mouvement.nom', read_only=True)
    produit_id = serializers.IntegerField(source='produit.id', read_only=True)
    produit_nom = serializers.CharField(source='produit.nom', read_only=True)
    statut = serializers.CharField(source='statut.nom', read_only=True)
    demandeur = serializers.CharField(source='demandeur.get_full_name', read_only=True)
    valideur = serializers.SerializerMethodField()

    class Meta:
        model = MouvementStock
        fields = [
            'id', 'type', 'num_id', 'quantite', 'date', 'heure',
            'justification', 'statut', 'produit_id', 'produit_nom',
            'demandeur', 'valideur'
        ]

    def get_id(self, obj):
        return f"MVT-{obj.id:03d}"

    def get_valideur(self, obj):
        return obj.valideur.get_full_name() if obj.valideur else ""


class MovementCreateSerializer(serializers.Serializer):
    """Serializer pour créer un mouvement de stock"""
    type = serializers.CharField()
    produit_id = serializers.IntegerField()
    quantite = serializers.DecimalField(max_digits=10, decimal_places=2)
    justification = serializers.CharField(required=False, default='', allow_blank=True)

    def validate_produit_id(self, value):
        try:
            Produit.objects.get(id=value)
        except Produit.DoesNotExist:
            raise serializers.ValidationError("Produit introuvable")
        return value


class StockSerializer(serializers.ModelSerializer):
    produit = serializers.CharField(source='produit.nom', read_only=True)
    unite = serializers.CharField(source='produit.unite.nom', read_only=True)
    alerte = serializers.SerializerMethodField()

    class Meta:
        model = Stock
        fields = ['id', 'produit', 'quantite_dispo', 'unite', 'date_time', 'alerte']

    def get_alerte(self, obj):
        return obj.quantite_dispo <= obj.produit.seuil_alerte


class DemandeProduitSerializer(serializers.ModelSerializer):
    demandeur = serializers.CharField(source='demandeur.get_full_name', read_only=True)
    produit_nom = serializers.CharField(source='produit.nom', read_only=True)

    class Meta:
        model = DemandeProduit
        fields = [
            'id', 'produit', 'produit_nom', 'quantite', 'justification',
            'statut', 'demandeur', 'date_demande', 'commande'
        ]
        read_only_fields = ['id', 'statut', 'demandeur', 'date_demande']
