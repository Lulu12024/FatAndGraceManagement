from rest_framework import serializers
from .models import LogAudit, Rapport, FormatExport


class AuditLogSerializer(serializers.ModelSerializer):
    user = serializers.CharField(source='user.get_full_name', read_only=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    date = serializers.DateField(source='date_action', read_only=True)
    heure = serializers.TimeField(source='heure_action', read_only=True)
    details = serializers.CharField(source='description', read_only=True)
    timestamp = serializers.SerializerMethodField()

    class Meta:
        model = LogAudit
        fields = [
            'id', 'user', 'user_id', 'action', 'type_action',
            'date', 'heure', 'timestamp', 'details', 'description',
            'ip_address', 'table_name', 'record_id',
            'old_values', 'new_values'
        ]

    def get_timestamp(self, obj):
        from datetime import datetime
        dt = datetime.combine(obj.date_action, obj.heure_action)
        return dt.isoformat()


class RapportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rapport
        fields = '__all__'


class FormatExportSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormatExport
        fields = '__all__'
