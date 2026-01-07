from rest_framework import serializers
from .models import Commande, Plat, StatutCommande, CommandePlat
from users.serializers import UserListSerializer


class StatutCommandeSerializer(serializers.ModelSerializer):
    class Meta:
        model = StatutCommande
        fields = ['id', 'nom']


class PlatSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plat
        fields = ['id', 'nom', 'ingredients', 'prix', 'disponible', 'description']


class CommandePlatSerializer(serializers.ModelSerializer):
    plat_details = PlatSerializer(source='plat', read_only=True)
    prix_total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = CommandePlat
        fields = ['id', 'plat', 'plat_details', 'quantite', 'prix_unitaire', 'prix_total']


class CommandeSerializer(serializers.ModelSerializer):
    serveur_details = UserListSerializer(source='serveur', read_only=True)
    cuisinier_details = UserListSerializer(source='cuisinier', read_only=True)
    gerant_details = UserListSerializer(source='gerant', read_only=True)
    statut_details = StatutCommandeSerializer(source='statut', read_only=True)
    plats_details = CommandePlatSerializer(source='commandeplat_set', many=True, read_only=True)

    class Meta:
        model = Commande
        fields = [
            'id', 'date_commande', 'heure_commande', 'table', 'prix_total',
            'description', 'serveur', 'serveur_details', 'cuisinier',
            'cuisinier_details', 'gerant', 'gerant_details', 'statut',
            'statut_details', 'plats_details'
        ]
        read_only_fields = ['id', 'date_commande', 'heure_commande']


class CommandeCreateSerializer(serializers.ModelSerializer):
    plats = serializers.ListField(
        child=serializers.DictField(),
        write_only=True
    )

    class Meta:
        model = Commande
        fields = ['table', 'description', 'serveur', 'plats']

    def validate_plats(self, value):
        if not value:
            raise serializers.ValidationError("Au moins un plat doit être commandé.")
        for plat_data in value:
            if 'plat_id' not in plat_data or 'quantite' not in plat_data:
                raise serializers.ValidationError(
                    "Chaque plat doit avoir un plat_id et une quantite."
                )
        return value

    def create(self, validated_data):
        plats_data = validated_data.pop('plats')

        prix_total = 0
        for plat_data in plats_data:
            plat = Plat.objects.get(id=plat_data['plat_id'])
            prix_total += plat.prix * plat_data['quantite']

        commande = Commande.objects.create(
            prix_total=prix_total,
            **validated_data
        )

        for plat_data in plats_data:
            plat = Plat.objects.get(id=plat_data['plat_id'])
            CommandePlat.objects.create(
                commande=commande,
                plat=plat,
                quantite=plat_data['quantite'],
                prix_unitaire=plat.prix
            )

        return commande


class CommandeUpdateStatusSerializer(serializers.ModelSerializer):
    motif = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = Commande
        fields = ['statut', 'motif', 'cuisinier', 'gerant']


class CommandeListSerializer(serializers.ModelSerializer):
    serveur_nom = serializers.CharField(source='serveur.get_full_name', read_only=True)
    cuisinier_nom = serializers.CharField(source='cuisinier.get_full_name', read_only=True)
    statut_nom = serializers.CharField(source='statut.get_nom_display', read_only=True)

    class Meta:
        model = Commande
        fields = [
            'id', 'date_commande', 'heure_commande', 'table', 'prix_total',
            'serveur_nom', 'cuisinier_nom', 'statut_nom'
        ]
