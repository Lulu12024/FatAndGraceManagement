from rest_framework import serializers
from .models import LogAudit, Rapport, FormatExport
from users.serializers import UserListSerializer


class LogAuditSerializer(serializers.ModelSerializer):
    user_details = UserListSerializer(source='user', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = LogAudit
        fields = [
            'id', 'user', 'user_details', 'action', 'action_display',
            'type_action', 'date_action', 'heure_action', 'description',
            'ip_address', 'user_agent', 'table_name', 'record_id',
            'old_values', 'new_values'
        ]
        read_only_fields = ['date_action', 'heure_action']


class LogAuditCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = LogAudit
        fields = [
            'user', 'action', 'type_action', 'description',
            'ip_address', 'user_agent', 'table_name', 'record_id',
            'old_values', 'new_values'
        ]


class RapportSerializer(serializers.ModelSerializer):
    genere_par_details = UserListSerializer(source='genere_par', read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model = Rapport
        fields = [
            'id', 'type', 'type_display', 'periode', 'contenu',
            'date_generation', 'genere_par', 'genere_par_details'
        ]
        read_only_fields = ['date_generation']


class RapportCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rapport
        fields = ['type', 'periode', 'contenu', 'genere_par']


class FormatExportSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormatExport
        fields = ['id', 'nom']


class ExportRequestSerializer(serializers.Serializer):
    format = serializers.ChoiceField(choices=['CSV', 'EXCEL', 'PDF'])
    date_debut = serializers.DateField(required=False)
    date_fin = serializers.DateField(required=False)
    filters = serializers.JSONField(required=False)

    def validate(self, attrs):
        date_debut = attrs.get('date_debut')
        date_fin = attrs.get('date_fin')

        if date_debut and date_fin and date_debut > date_fin:
            raise serializers.ValidationError({
                'date_fin': 'La date de fin doit être postérieure à la date de début.'
            })

        return attrs
