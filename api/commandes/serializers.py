from rest_framework import serializers
from .models import Commande, Plat, CommandePlat, Table, Facture, Notification
from decimal import Decimal


# ==================== SERIALIZERS TABLE ====================

class TableSerializer(serializers.ModelSerializer):
    """Serializer pour la liste des tables"""
    num = serializers.CharField(source='numero', read_only=True)
    status = serializers.CharField(source='statut', read_only=True)
    montant = serializers.DecimalField(source='montant_total', max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Table
        fields = ['id', 'num', 'capacite', 'status', 'montant', 'description']
        read_only_fields = ['id']


class OrderItemSerializer(serializers.Serializer):
    """Serializer pour les items d'une commande dans le détail de table"""
    plat_id = serializers.IntegerField(source='plat.id')
    nom = serializers.CharField(source='plat.nom')
    qte = serializers.IntegerField(source='quantite')
    prix = serializers.DecimalField(source='prix_unitaire', max_digits=10, decimal_places=2)


class OrderInTableSerializer(serializers.ModelSerializer):
    """Serializer allégé pour commandes dans le détail de table"""
    id = serializers.CharField(source='order_id', read_only=True)
    table_id = serializers.IntegerField(source='table.id', read_only=True)
    table_num = serializers.CharField(source='table.numero', read_only=True)
    serveur = serializers.CharField(source='serveur.get_full_name', read_only=True)
    cuisinier = serializers.SerializerMethodField()
    items = serializers.SerializerMethodField()
    status = serializers.CharField(source='statut', read_only=True)
    montant = serializers.DecimalField(source='prix_total', max_digits=10, decimal_places=2, read_only=True)
    obs = serializers.CharField(source='observations', read_only=True)
    motif = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(source='date_commande', read_only=True)

    class Meta:
        model = Commande
        fields = [
            'id', 'table_id', 'table_num', 'serveur', 'cuisinier',
            'items', 'status', 'montant', 'obs', 'motif', 'created_at'
        ]

    def get_cuisinier(self, obj):
        return obj.cuisinier.get_full_name() if obj.cuisinier else ""

    def get_items(self, obj):
        return OrderItemSerializer(obj.commandeplat_set.all(), many=True).data

    def get_motif(self, obj):
        return obj.motif_rejet or obj.motif_annulation or ""


class TableDetailSerializer(serializers.ModelSerializer):
    """Serializer pour le détail d'une table avec ses commandes actives"""
    num = serializers.CharField(source='numero', read_only=True)
    status = serializers.CharField(source='statut', read_only=True)
    montant = serializers.DecimalField(source='montant_total', max_digits=10, decimal_places=2, read_only=True)
    orders = serializers.SerializerMethodField()

    class Meta:
        model = Table
        fields = ['id', 'num', 'capacite', 'status', 'montant', 'description', 'orders']

    def get_orders(self, obj):
        active_orders = obj.commandes.exclude(
            statut__in=['ANNULEE', 'REFUSEE']
        )
        return OrderInTableSerializer(active_orders, many=True).data


# ==================== SERIALIZERS PLAT ====================

class PlatSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plat
        fields = ['id', 'nom', 'prix', 'categorie', 'disponible', 'description', 'image_url']


# ==================== SERIALIZERS COMMANDE (ORDER) ====================

class OrderItemInputSerializer(serializers.Serializer):
    """Serializer pour les items en entrée lors de la création d'une commande"""
    plat_id = serializers.IntegerField()
    qte = serializers.IntegerField(min_value=1)


class OrderCreateSerializer(serializers.Serializer):
    """Serializer pour créer une commande"""
    table_id = serializers.IntegerField()
    items = OrderItemInputSerializer(many=True)
    obs = serializers.CharField(required=False, default='', allow_blank=True)

    def validate_table_id(self, value):
        try:
            table = Table.objects.get(id=value)
        except Table.DoesNotExist:
            raise serializers.ValidationError("Table introuvable")
        if table.statut not in ['DISPONIBLE', 'RESERVEE', 'COMMANDES_PASSEE', 'EN_SERVICE']:
            raise serializers.ValidationError(
                "La table n'est pas dans un état valide pour prendre une commande"
            )
        return value

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("La commande doit contenir au moins un plat")
        for item in value:
            try:
                plat = Plat.objects.get(id=item['plat_id'])
                if not plat.disponible:
                    raise serializers.ValidationError(
                        f"Le plat '{plat.nom}' n'est pas disponible"
                    )
            except Plat.DoesNotExist:
                raise serializers.ValidationError(
                    f"Plat avec l'ID {item['plat_id']} introuvable"
                )
        return value


class OrderSerializer(serializers.ModelSerializer):
    """Serializer complet pour une commande"""
    id = serializers.CharField(source='order_id', read_only=True)
    table_id = serializers.IntegerField(source='table.id', read_only=True)
    table_num = serializers.CharField(source='table.numero', read_only=True)
    serveur = serializers.CharField(source='serveur.get_full_name', read_only=True)
    cuisinier = serializers.SerializerMethodField()
    items = serializers.SerializerMethodField()
    status = serializers.CharField(source='statut', read_only=True)
    montant = serializers.DecimalField(source='prix_total', max_digits=10, decimal_places=2, read_only=True)
    obs = serializers.CharField(source='observations', read_only=True)
    motif = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(source='date_commande', read_only=True)
    updated_at = serializers.SerializerMethodField()

    class Meta:
        model = Commande
        fields = [
            'id', 'table_id', 'table_num', 'serveur', 'cuisinier',
            'items', 'status', 'montant', 'obs', 'motif',
            'created_at', 'updated_at'
        ]

    def get_cuisinier(self, obj):
        return obj.cuisinier.get_full_name() if obj.cuisinier else ""

    def get_items(self, obj):
        return OrderItemSerializer(obj.commandeplat_set.all(), many=True).data

    def get_motif(self, obj):
        return obj.motif_rejet or obj.motif_annulation or ""

    def get_updated_at(self, obj):
        # Return the most recent transition date
        dates = [d for d in [obj.date_livraison, obj.date_preparation, obj.date_acceptation, obj.date_commande] if d]
        return max(dates).isoformat() if dates else obj.date_commande.isoformat()


# ==================== SERIALIZERS FACTURE (INVOICE) ====================

class InvoiceItemSerializer(serializers.Serializer):
    """Serializer pour les items d'une facture"""
    nom = serializers.CharField()
    qte = serializers.IntegerField()
    prix = serializers.DecimalField(max_digits=10, decimal_places=2)


class InvoiceSerializer(serializers.ModelSerializer):
    """Serializer complet pour une facture"""
    mode_paiement = serializers.CharField(
        source='get_mode_paiement_display', read_only=True
    )
    id = serializers.CharField(source='numero_facture', read_only=True)
    table_id = serializers.IntegerField(source='table.id', read_only=True)
    table_num = serializers.CharField(source='table.numero', read_only=True)
    montant = serializers.DecimalField(source='montant_total', max_digits=10, decimal_places=2, read_only=True)
    date = serializers.DateTimeField(source='date_generation', read_only=True)
    items = serializers.SerializerMethodField()
    serveur = serializers.SerializerMethodField()
    validee_par = serializers.CharField(source='gerant.get_full_name', read_only=True)

    class Meta:
        model = Facture
        fields = [
            'id', 'table_id', 'table_num', 'montant', 'pourboire',
            'mode_paiement', 'date', 'items', 'serveur', 'validee_par'
        ]

    def get_items(self, obj):
        """Reconstruit les items à partir des commandes livrées de la table"""
        items = []
        # Get all delivered orders for this table that were part of this invoice
        commandes = Commande.objects.filter(
            table=obj.table,
            statut='LIVREE',
            date_commande__lte=obj.date_generation
        )
        for commande in commandes:
            for cp in commande.commandeplat_set.all():
                items.append({
                    'nom': cp.plat.nom,
                    'qte': cp.quantite,
                    'prix': cp.prix_unitaire,
                })
        return items

    def get_serveur(self, obj):
        if obj.serveur:
            return obj.serveur.get_full_name()
        return ""


class PaymentSerializer(serializers.Serializer):
    """Serializer pour le paiement d'une table"""
    mode_paiement = serializers.ChoiceField(
        choices=['Espèces', 'Carte bancaire', 'Mobile Money', 'Autre']
    )
    montant = serializers.DecimalField(max_digits=10, decimal_places=2)
    pourboire = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=Decimal('0.00'))

    def validate_montant(self, value):
        if value <= 0:
            raise serializers.ValidationError("Le montant doit être supérieur à 0")
        return value


# ==================== SERIALIZERS NOTIFICATION ====================

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'type', 'message', 'is_read', 'created_at']
        read_only_fields = ['id', 'type', 'message', 'created_at']
