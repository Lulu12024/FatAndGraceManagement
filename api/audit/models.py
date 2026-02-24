from django.db import models
from django.conf import settings
from django.utils import timezone


class LogAudit(models.Model):
    ACTION_CHOICES = [
        ('CREATE', 'Création'),
        ('UPDATE', 'Modification'),
        ('DELETE', 'Suppression'),
        ('LOGIN', 'Connexion'),
        ('LOGOUT', 'Déconnexion'),
        ('VALIDATE', 'Validation'),
        ('REJECT', 'Rejet'),
        ('APPROVE', 'Approbation'),
        ('CANCEL', 'Annulation'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='logs',
        verbose_name='Utilisateur'
    )
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    type_action = models.CharField(max_length=100, verbose_name="Type d'action")
    date_action = models.DateField(default=timezone.now)
    heure_action = models.TimeField(auto_now_add=True)
    description = models.TextField(verbose_name='Description détaillée')
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name='Adresse IP')
    user_agent = models.TextField(blank=True, verbose_name='User Agent')

    table_name = models.CharField(max_length=100, blank=True, verbose_name='Table concernée')
    record_id = models.PositiveIntegerField(null=True, blank=True, verbose_name="ID de l'enregistrement")
    old_values = models.JSONField(null=True, blank=True, verbose_name='Anciennes valeurs')
    new_values = models.JSONField(null=True, blank=True, verbose_name='Nouvelles valeurs')

    class Meta:
        db_table = 'log_audit'
        verbose_name = 'Log d\'audit'
        verbose_name_plural = 'Logs d\'audit'
        ordering = ['-date_action', '-heure_action']
        indexes = [
            models.Index(fields=['user', 'date_action']),
            models.Index(fields=['action', 'date_action']),
            models.Index(fields=['table_name', 'record_id']),
        ]

    def __str__(self):
        user_name = self.user.get_full_name() if self.user else 'Système'
        return f"{user_name} - {self.get_action_display()} - {self.date_action}"


class Rapport(models.Model):
    TYPE_CHOICES = [
        ('COMMANDES', 'Commandes'),
        ('STOCKS', 'Stocks'),
        ('UTILISATEURS', 'Utilisateurs'),
        ('AUDIT', 'Audit'),
        ('KPI', 'KPI'),
    ]

    type = models.CharField(max_length=50, choices=TYPE_CHOICES)
    periode = models.CharField(max_length=100, verbose_name='Période')
    contenu = models.TextField()
    date_generation = models.DateTimeField(default=timezone.now)

    genere_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='rapports_generes',
        verbose_name='Généré par'
    )

    class Meta:
        db_table = 'rapport'
        verbose_name = 'Rapport'
        verbose_name_plural = 'Rapports'
        ordering = ['-date_generation']

    def __str__(self):
        return f"Rapport {self.get_type_display()} - {self.periode}"


class FormatExport(models.Model):
    FORMAT_CHOICES = [
        ('CSV', 'CSV'),
        ('EXCEL', 'Excel'),
        ('PDF', 'PDF'),
    ]

    nom = models.CharField(max_length=20, choices=FORMAT_CHOICES, unique=True)

    class Meta:
        db_table = 'format_export'
        verbose_name = 'Format d\'export'
        verbose_name_plural = 'Formats d\'export'

    def __str__(self):
        return self.get_nom_display()
