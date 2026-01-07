from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.http import HttpResponse
from datetime import datetime
import csv
import openpyxl
from io import BytesIO

from .models import LogAudit, Rapport, FormatExport
from .serializers import (
    LogAuditSerializer, RapportSerializer, RapportCreateSerializer,
    FormatExportSerializer, ExportRequestSerializer
)
from users.permissions import IsAdministrateur, IsAuditeur, IsManagerOrGerant


class LogAuditViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LogAudit.objects.all()
    serializer_class = LogAuditSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['user', 'action', 'table_name', 'date_action']
    search_fields = ['description', 'type_action']
    ordering_fields = ['date_action', 'heure_action']
    ordering = ['-date_action', '-heure_action']

    def get_queryset(self):
        user = self.request.user
        role = user.role.nom

        if role in ['Administrateur', 'Auditeur']:
            return LogAudit.objects.all()
        elif role == 'Manager':
            return LogAudit.objects.all()
        elif role == 'Gérant':
            return LogAudit.objects.filter(user=user)

        return LogAudit.objects.none()

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def export(self, request):
        serializer = ExportRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        format_export = serializer.validated_data['format']
        date_debut = serializer.validated_data.get('date_debut')
        date_fin = serializer.validated_data.get('date_fin')

        queryset = self.get_queryset()

        if date_debut:
            queryset = queryset.filter(date_action__gte=date_debut)
        if date_fin:
            queryset = queryset.filter(date_action__lte=date_fin)

        if format_export == 'CSV':
            return self._export_csv(queryset)
        elif format_export == 'EXCEL':
            return self._export_excel(queryset)

        return Response({'error': 'Format non supporté.'}, status=status.HTTP_400_BAD_REQUEST)

    def _export_csv(self, queryset):
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="logs_audit_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv"'

        writer = csv.writer(response)
        writer.writerow(['ID', 'Utilisateur', 'Action', 'Type Action', 'Date', 'Heure', 'Description'])

        for log in queryset:
            writer.writerow([
                log.id,
                log.user.get_full_name() if log.user else 'Système',
                log.get_action_display(),
                log.type_action,
                log.date_action,
                log.heure_action,
                log.description
            ])

        return response

    def _export_excel(self, queryset):
        workbook = openpyxl.Workbook()
        worksheet = workbook.active
        worksheet.title = 'Logs Audit'

        headers = ['ID', 'Utilisateur', 'Action', 'Type Action', 'Date', 'Heure', 'Description']
        worksheet.append(headers)

        for log in queryset:
            worksheet.append([
                log.id,
                log.user.get_full_name() if log.user else 'Système',
                log.get_action_display(),
                log.type_action,
                log.date_action.strftime('%Y-%m-%d'),
                log.heure_action.strftime('%H:%M:%S'),
                log.description
            ])

        buffer = BytesIO()
        workbook.save(buffer)
        buffer.seek(0)

        response = HttpResponse(
            buffer.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="logs_audit_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx"'

        return response


class RapportViewSet(viewsets.ModelViewSet):
    queryset = Rapport.objects.all()
    permission_classes = [IsAuthenticated, IsManagerOrGerant]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['type', 'genere_par']
    search_fields = ['periode', 'contenu']
    ordering_fields = ['date_generation']
    ordering = ['-date_generation']

    def get_serializer_class(self):
        if self.action == 'create':
            return RapportCreateSerializer
        return RapportSerializer


class FormatExportViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = FormatExport.objects.all()
    serializer_class = FormatExportSerializer
    permission_classes = [IsAuthenticated]
