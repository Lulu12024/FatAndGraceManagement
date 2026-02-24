from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Avg, Q, F
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from commandes.models import Commande, Table, Facture
from stocks.models import Produit, Stock, MouvementStock
from users.permissions import CanViewReports


class ReportsViewSet(viewsets.ViewSet):
    """
    GET /api/reports/dashboard/ -> KPIs du tableau de bord
    GET /api/reports/orders/    -> statistiques commandes
    GET /api/reports/stock/     -> statistiques stock
    GET /api/reports/kpi/       -> KPIs de gestion
    GET /api/reports/export/    -> export CSV, Excel, PDF
    """
    permission_classes = [IsAuthenticated, CanViewReports]

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        # ... (keep existing dashboard code)
        today = timezone.now().date()
        
        # Tables
        tables_total = Table.objects.count()
        tables_occupees = Table.objects.exclude(statut='DISPONIBLE').count()
        
        # Commandes du jour
        commandes_jour = Commande.objects.filter(date_commande__date=today)
        nb_commandes_jour = commandes_jour.count()
        nb_en_attente = commandes_jour.filter(statut='EN_ATTENTE_ACCEPTATION').count()
        nb_en_preparation = commandes_jour.filter(statut='EN_PREPARATION').count()
        nb_livrees = commandes_jour.filter(statut='LIVREE').count()
        
        # CA du jour
        ca_jour = commandes_jour.filter(statut='LIVREE').aggregate(
            total=Sum('prix_total')
        )['total'] or Decimal('0.00')
        
        # Stock en alerte
        stock_alertes = Stock.objects.filter(
            quantite_dispo__lte=F('produit__seuil_alerte')
        ).count()
        
        return Response({
            'tables': {
                'total': tables_total,
                'occupees': tables_occupees,
                'disponibles': tables_total - tables_occupees,
            },
            'commandes_jour': {
                'total': nb_commandes_jour,
                'en_attente': nb_en_attente,
                'en_preparation': nb_en_preparation,
                'livrees': nb_livrees,
            },
            'ca_jour': float(ca_jour),
            'stock_alertes': stock_alertes,
        })

    @action(detail=False, methods=['get'])
    def orders(self, request):
        """Statistiques détaillées des commandes"""
        period = request.query_params.get('period', '7')
        try:
            days = int(period)
        except ValueError:
            days = 7

        date_start = timezone.now() - timedelta(days=days)
        commandes = Commande.objects.filter(date_commande__gte=date_start)

        total = commandes.count()
        livrees = commandes.filter(statut='LIVREE').count()
        annulees = commandes.filter(statut='ANNULEE').count()
        refusees = commandes.filter(statut='REFUSEE').count()

        ca = commandes.filter(statut='LIVREE').aggregate(
            total=Sum('prix_total')
        )['total'] or Decimal('0.00')

        # Top plats
        from commandes.models import CommandePlat
        top_plats = CommandePlat.objects.filter(
            commande__date_commande__gte=date_start,
            commande__statut='LIVREE'
        ).values('plat__nom').annotate(
            total_qte=Sum('quantite'),
            total_ca=Sum(F('quantite') * F('prix_unitaire'))
        ).order_by('-total_qte')[:10]

        taux_annulation = round((annulees / total * 100), 1) if total > 0 else 0

        return Response({
            'period_days': days,
            'total': total,
            'livrees': livrees,
            'annulees': annulees,
            'refusees': refusees,
            'ca': float(ca),
            'taux_annulation': taux_annulation,
            'top_plats': list(top_plats),
        })

    @action(detail=False, methods=['get'])
    def stock(self, request):
        """Statistiques stock"""
        today = timezone.now().date()
        month_start = today.replace(day=1)

        # Produits en alerte
        en_alerte = Produit.objects.filter(
            stock__quantite_dispo__lte=F('seuil_alerte')
        ).values('id', 'nom', 'categorie').annotate(
            qte=F('stock__quantite_dispo'),
            seuil=F('seuil_alerte'),
        )

        # Produits périmés
        perimes = Produit.objects.filter(
            date_peremption__lt=today
        ).values('id', 'nom', 'date_peremption').count()

        # Mouvements du mois
        mouvements_mois = MouvementStock.objects.filter(
            date__gte=month_start, statut__nom='VALIDEE'
        )
        entrees = mouvements_mois.filter(type_mouvement__nom='ENTREE').aggregate(
            total=Sum('quantite')
        )['total'] or Decimal('0.00')
        sorties = mouvements_mois.filter(type_mouvement__nom='SORTIE').aggregate(
            total=Sum('quantite')
        )['total'] or Decimal('0.00')

        total_produits = Produit.objects.count()

        return Response({
            'total_produits': total_produits,
            'en_alerte': list(en_alerte),
            'nb_en_alerte': en_alerte.count(),
            'nb_perimes': perimes,
            'mouvements_mois': {
                'entrees': float(entrees),
                'sorties': float(sorties),
            },
        })

    @action(detail=False, methods=['get'])
    def kpi(self, request):
        """KPIs de gestion"""
        period = request.query_params.get('period', '30')
        try:
            days = int(period)
        except ValueError:
            days = 30

        date_start = timezone.now() - timedelta(days=days)

        # CA
        ca = Commande.objects.filter(
            date_commande__gte=date_start, statut='LIVREE'
        ).aggregate(total=Sum('prix_total'))['total'] or Decimal('0.00')

        # Ticket moyen
        nb_factures = Facture.objects.filter(date_generation__gte=date_start).count()
        ticket_moyen = float(ca / nb_factures) if nb_factures > 0 else 0

        # Couverts (approximation basée sur le nombre de tables servies)
        nb_tables_servies = Table.objects.filter(
            commandes__date_commande__gte=date_start,
            commandes__statut='LIVREE'
        ).distinct().count()

        # Taux d'occupation des tables
        total_tables = Table.objects.count()
        taux_occupation = round((nb_tables_servies / total_tables * 100) / days, 1) if total_tables > 0 else 0

        return Response({
            'period_days': days,
            'ca_total': float(ca),
            'ca_moyen_jour': float(ca / days) if days > 0 else 0,
            'ticket_moyen': round(ticket_moyen, 2),
            'nb_factures': nb_factures,
            'nb_tables_servies': nb_tables_servies,
            'taux_occupation': min(taux_occupation, 100),
        })

    @action(detail=False, methods=['get'])
    def export(self, request):
        """
        GET /api/reports/export/?type=...&format=...
        """
        from django.http import HttpResponse
        import csv
        import io
        
        export_type = request.query_params.get('type')
        export_format = request.query_params.get('format', 'csv').lower()
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        if not export_type:
            return Response({'detail': "Le paramètre 'type' est obligatoire (orders, stock, invoices, movements, kpi)"}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Collect Data
        headers = []
        data = []
        filename = f"rapport_{export_type}_{timezone.now().strftime('%Y%m%d')}"

        if export_type == 'orders':
            qs = Commande.objects.all()
            if date_from: qs = qs.filter(date_commande__gte=date_from)
            if date_to: qs = qs.filter(date_commande__lte=date_to)
            qs = qs.select_related('table', 'serveur').order_by('-date_commande')
            headers = ['ID', 'Date', 'Table', 'Serveur', 'Statut', 'Total']
            for cmd in qs:
                data.append([
                    cmd.order_id,
                    cmd.date_commande.strftime('%Y-%m-%d %H:%M'),
                    cmd.table.numero,
                    cmd.serveur.get_full_name() if cmd.serveur else 'N/A',
                    cmd.statut,
                    float(cmd.prix_total)
                ])

        elif export_type == 'stock':
            qs = Stock.objects.select_related('produit', 'produit__unite').all()
            headers = ['Produit', 'Categorie', 'Qté Dispo', 'Unités', 'Seuil Alerte', 'En Alerte']
            for s in qs:
                data.append([
                    s.produit.nom,
                    s.produit.categorie,
                    float(s.quantite_dispo),
                    s.produit.unite.nom,
                    float(s.produit.seuil_alerte),
                    "OUI" if s.est_en_alerte else "NON"
                ])

        elif export_type == 'invoices':
            qs = Facture.objects.all()
            if date_from: qs = qs.filter(date_generation__gte=date_from)
            if date_to: qs = qs.filter(date_generation__lte=date_to)
            qs = qs.select_related('table', 'serveur').order_by('-date_generation')
            headers = ['Facture #', 'Date', 'Table', 'Serveur', 'Montant', 'Mode']
            for f in qs:
                data.append([
                    f.numero_facture,
                    f.date_generation.strftime('%Y-%m-%d %H:%M'),
                    f.table.numero,
                    f.serveur.get_full_name() if f.serveur else 'N/A',
                    float(f.montant_total),
                    f.mode_paiement
                ])

        elif export_type == 'movements':
            qs = MouvementStock.objects.all()
            if date_from: qs = qs.filter(date__gte=date_from)
            if date_to: qs = qs.filter(date__lte=date_to)
            qs = qs.select_related('produit', 'type_mouvement', 'statut').order_by('-date', '-heure')
            headers = ['Date', 'Heure', 'Produit', 'Type', 'Qté', 'Statut', 'Justification']
            for m in qs:
                data.append([
                    m.date.strftime('%Y-%m-%d') if m.date else 'N/A',
                    m.heure.strftime('%H:%M') if m.heure else 'N/A',
                    m.produit.nom,
                    m.type_mouvement.nom,
                    float(m.quantite),
                    m.statut.nom,
                    m.justification
                ])

        elif export_type == 'kpi':
            kpi_data = self.kpi(request).data
            headers = ['Indicateur', 'Valeur']
            data = [
                ['Période (jours)', kpi_data.get('period_days')],
                ['Chiffre d\'Affaires Total', kpi_data.get('ca_total')],
                ['Ticket Moyen', kpi_data.get('ticket_moyen')],
                ['Nombre de Factures', kpi_data.get('nb_factures')],
                ['Tables Servies', kpi_data.get('nb_tables_servies')],
                ['Taux d\'Occupation (%)', kpi_data.get('taux_occupation')],
            ]
        else:
            return Response({'detail': "Type d'export invalide"}, status=status.HTTP_400_BAD_REQUEST)

        # 2. Generate File
        if export_format == 'csv':
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(headers)
            writer.writerows(data)
            response = HttpResponse(output.getvalue(), content_type='text/csv; charset=utf-8-sig')
            response['Content-Disposition'] = f'attachment; filename="{filename}.csv"'
            return response

        elif export_format == 'excel':
            try:
                import openpyxl
                wb = openpyxl.Workbook()
                ws = wb.active
                ws.title = "Rapport"
                ws.append(headers)
                for row in data:
                    ws.append(row)
                output = io.BytesIO()
                wb.save(output)
                response = HttpResponse(output.getvalue(), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                response['Content-Disposition'] = f'attachment; filename="{filename}.xlsx"'
                return response
            except ImportError:
                return Response({'detail': "La librairie 'openpyxl' n'est pas installée"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        elif export_format == 'pdf':
            try:
                from reportlab.lib.pagesizes import letter, landscape
                from reportlab.platypus import SimpleDocTemplate, Table as RLTable, TableStyle, Paragraph
                from reportlab.lib.styles import getSampleStyleSheet
                from reportlab.lib import colors

                output = io.BytesIO()
                doc = SimpleDocTemplate(output, pagesize=landscape(letter))
                elements = []
                styles = getSampleStyleSheet()

                elements.append(Paragraph(f"Rapport: {export_type.upper()}", styles['Title']))
                elements.append(Paragraph(f"Genere le: {timezone.now().strftime('%Y-%m-%d %H:%M')}", styles['Normal']))
                
                # ReportLab Table
                rl_data = [headers] + data
                t = RLTable(rl_data)
                t.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black)
                ]))
                elements.append(t)
                doc.build(elements)
                
                response = HttpResponse(output.getvalue(), content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="{filename}.pdf"'
                return response
            except ImportError:
                return Response({'detail': "La librairie 'reportlab' n'est pas installée"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({'detail': "Format d'export invalide"}, status=status.HTTP_400_BAD_REQUEST)
