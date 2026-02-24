from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.http import HttpResponse
import csv
import io

from .models import LogAudit, Rapport, FormatExport
from .serializers import AuditLogSerializer, RapportSerializer, FormatExportSerializer
from users.permissions import CanViewAuditLogs


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/audit-logs/         → liste des logs d'audit
    GET /api/audit-logs/export/  → export CSV/Excel
    """
    queryset = LogAudit.objects.select_related('user').all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, CanViewAuditLogs]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['description', 'type_action']
    ordering_fields = ['date_action', 'heure_action']
    ordering = ['-date_action', '-heure_action']

    def get_queryset(self):
        qs = super().get_queryset()

        # Filters
        action_filter = self.request.query_params.get('action')
        if action_filter:
            qs = qs.filter(action=action_filter)

        user_id = self.request.query_params.get('user_id')
        if user_id:
            qs = qs.filter(user_id=user_id)

        date_from = self.request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(date_action__gte=date_from)

        date_to = self.request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(date_action__lte=date_to)

        table_name = self.request.query_params.get('table_name')
        if table_name:
            qs = qs.filter(table_name=table_name)

        return qs

    @action(detail=False, methods=['get'])
    def export(self, request):
        """GET /api/audit-logs/export/ → exporter les logs en CSV"""
        format_type = request.query_params.get('format', 'csv')
        qs = self.get_queryset()

        if format_type == 'csv':
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="audit_logs.csv"'
            
            writer = csv.writer(response)
            writer.writerow(['ID', 'Utilisateur', 'Action', 'Type', 'Date', 'Heure', 'Description', 'Table', 'IP'])

            for log in qs:
                writer.writerow([
                    log.id,
                    log.user.get_full_name() if log.user else '',
                    log.action,
                    log.type_action,
                    log.date_action,
                    log.heure_action,
                    log.description,
                    log.table_name,
                    log.ip_address or '',
                ])

            return response

        elif format_type == 'excel':
            try:
                import openpyxl
                wb = openpyxl.Workbook()
                ws = wb.active
                ws.title = "Audit Logs"

                headers = ['ID', 'Utilisateur', 'Action', 'Type', 'Date', 'Heure', 'Description', 'Table', 'IP']
                ws.append(headers)

                for log in qs:
                    ws.append([
                        log.id,
                        log.user.get_full_name() if log.user else '',
                        log.action,
                        log.type_action,
                        str(log.date_action),
                        str(log.heure_action),
                        log.description,
                        log.table_name,
                        log.ip_address or '',
                    ])

                buffer = io.BytesIO()
                wb.save(buffer)
                buffer.seek(0)

                response = HttpResponse(
                    buffer,
                    content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                )
                response['Content-Disposition'] = 'attachment; filename="audit_logs.xlsx"'
                return response

            except ImportError:
                return Response(
                    {'detail': 'Le module openpyxl n\'est pas installé'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        return Response(
            {'detail': 'Format non supporté. Utilisez csv ou excel.'},
            status=status.HTTP_400_BAD_REQUEST
        )


class RapportViewSet(viewsets.ModelViewSet):
    queryset = Rapport.objects.all()
    serializer_class = RapportSerializer
    permission_classes = [IsAuthenticated]


class FormatExportViewSet(viewsets.ModelViewSet):
    queryset = FormatExport.objects.all()
    serializer_class = FormatExportSerializer
    permission_classes = [IsAuthenticated]
