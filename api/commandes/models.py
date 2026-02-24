from django.db import models
from django.conf import settings
from django.utils import timezone
from decimal import Decimal


class Table(models.Model):
    
    STATUT_CHOICES = [
        ('DISPONIBLE', 'Disponible'),
        ('RESERVEE', 'Réservée'),
        ('COMMANDES_PASSEE', 'Commandes passées'),
        ('EN_SERVICE', 'En service'),
        ('EN_ATTENTE_PAIEMENT', 'En attente de paiement'),
        ('PAYEE', 'Payée'),
        ('FERMEE', 'Fermée'),
    ]

    numero = models.CharField(max_length=20, unique=True, verbose_name='Numéro de table')
    capacite = models.PositiveIntegerField(verbose_name='Capacité (nombre de places)')
    statut = models.CharField(max_length=30, choices=STATUT_CHOICES, default='DISPONIBLE')
    montant_total = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=Decimal('0.00'),
        verbose_name='Montant total des commandes'
    )
    description = models.TextField(blank=True, default='', verbose_name='Description')
    date_ouverture = models.DateTimeField(null=True, blank=True, verbose_name='Date d\'ouverture')
    date_cloture = models.DateTimeField(null=True, blank=True, verbose_name='Date de clôture')

    class Meta:
        db_table = 'table'
        verbose_name = 'Table'
        verbose_name_plural = 'Tables'
        ordering = ['numero']

    def __str__(self):
        return f"Table {self.numero} - {self.get_statut_display()}"

    def calculer_montant_total(self):
        """Calcule le montant total de toutes les commandes livrées de cette table"""
        total = self.commandes.filter(
            statut='LIVREE'
        ).aggregate(
            total=models.Sum('prix_total')
        )['total'] or Decimal('0.00')
        self.montant_total = total
        self.save()
        return total


class Plat(models.Model):
    """Modèle représentant un plat/article du menu"""
    nom = models.CharField(max_length=200)
    ingredients = models.TextField(verbose_name='Ingrédients', blank=True)
    prix = models.DecimalField(max_digits=10, decimal_places=2)
    disponible = models.BooleanField(default=True)
    description = models.TextField(blank=True)
    categorie = models.CharField(max_length=100, blank=True, verbose_name='Catégorie')
    image_url = models.URLField(blank=True, null=True, verbose_name='URL de l\'image')

    class Meta:
        db_table = 'plat'
        verbose_name = 'Plat'
        verbose_name_plural = 'Plats'

    def __str__(self):
        return self.nom


class Commande(models.Model):
    """
    Modèle représentant une commande passée par un serveur pour une table.
    Une table peut avoir plusieurs commandes.
    """
    STATUT_CHOICES = [
        ('STOCKEE', 'Stockée'),
        ('EN_ATTENTE_ACCEPTATION', 'En attente d\'acceptation'),
        ('EN_PREPARATION', 'En préparation'),
        ('EN_ATTENTE_LIVRAISON', 'En attente de livraison'),
        ('LIVREE', 'Livrée'),
        ('ANNULEE', 'Annulée'),
        ('REFUSEE', 'Refusée'),
    ]

    date_commande = models.DateTimeField(default=timezone.now)
    heure_commande = models.TimeField(auto_now_add=True)
    prix_total = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    observations = models.TextField(blank=True, verbose_name='Observations/Notes spéciales')
    statut = models.CharField(max_length=30, choices=STATUT_CHOICES, default='EN_ATTENTE_ACCEPTATION')
    
    # Dates de transition de statut
    date_acceptation = models.DateTimeField(null=True, blank=True)
    date_preparation = models.DateTimeField(null=True, blank=True)
    date_livraison = models.DateTimeField(null=True, blank=True)
    
    # Motifs d'annulation/rejet
    motif_rejet = models.TextField(blank=True, verbose_name='Motif de rejet')
    motif_annulation = models.TextField(blank=True, verbose_name='Motif d\'annulation')

    # Relations
    table = models.ForeignKey(
        Table,
        on_delete=models.PROTECT,
        related_name='commandes',
        verbose_name='Table'
    )
    serveur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='commandes_serveur',
    )
    cuisinier = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='commandes_cuisinier',
    )
    plats = models.ManyToManyField(Plat, through='CommandePlat', related_name='commandes')

    class Meta:
        db_table = 'commande'
        verbose_name = 'Commande'
        verbose_name_plural = 'Commandes'
        ordering = ['-date_commande', '-heure_commande']

    def __str__(self):
        return f"Commande #{self.id} - Table {self.table.numero} - {self.date_commande}"

    @property
    def order_id(self):
        """Retourne l'ID formaté de la commande (CMD-XXX)"""
        return f"CMD-{self.id:03d}"

    def calculer_prix_total(self):
        """Calcule le prix total de la commande à partir des plats"""
        total = self.commandeplat_set.aggregate(
            total=models.Sum(
                models.F('prix_unitaire') * models.F('quantite'),
                output_field=models.DecimalField()
            )
        )['total'] or Decimal('0.00')
        self.prix_total = total
        self.save()
        return total


class CommandePlat(models.Model):
    """Table de liaison entre Commande et Plat avec quantité et prix"""
    commande = models.ForeignKey(Commande, on_delete=models.CASCADE)
    plat = models.ForeignKey(Plat, on_delete=models.PROTECT)
    quantite = models.PositiveIntegerField(default=1)
    prix_unitaire = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = 'commande_plat'
        verbose_name = 'Commande Plat'
        verbose_name_plural = 'Commandes Plats'
        unique_together = [['commande', 'plat']]

    def __str__(self):
        return f"{self.plat.nom} x{self.quantite}"

    @property
    def prix_total(self):
        return self.prix_unitaire * self.quantite


class Facture(models.Model):
    """
    Modèle représentant une facture générée pour une table après paiement.
    """
    MODE_PAIEMENT_CHOICES = [
        ('ESPECES', 'Espèces'),
        ('CARTE', 'Carte bancaire'),
        ('MOBILE_MONEY', 'Mobile Money'),
        ('AUTRE', 'Autre'),
    ]

    numero_facture = models.CharField(
        max_length=50, 
        unique=True, 
        verbose_name='Numéro de facture'
    )
    date_generation = models.DateTimeField(default=timezone.now)
    montant_total = models.DecimalField(max_digits=10, decimal_places=2)
    montant_paye = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        verbose_name='Montant payé'
    )
    pourboire = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=Decimal('0.00')
    )
    mode_paiement = models.CharField(max_length=20, choices=MODE_PAIEMENT_CHOICES)
    
    # Relations
    table = models.ForeignKey(
        Table,
        on_delete=models.PROTECT,
        related_name='factures',
        verbose_name='Table'
    )
    gerant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='factures_gerant',
        verbose_name='Utilisateur ayant validé le paiement'
    )
    serveur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='factures_serveur',
        verbose_name='Serveur'
    )

    class Meta:
        db_table = 'facture'
        verbose_name = 'Facture'
        verbose_name_plural = 'Factures'
        ordering = ['-date_generation']

    def __str__(self):
        return f"Facture {self.numero_facture} - Table {self.table.numero}"

    @property
    def invoice_id(self):
        """Retourne l'ID formaté de la facture (FAC-YYYY-XXXX)"""
        return self.numero_facture

    def save(self, *args, **kwargs):
        """Génère automatiquement un numéro de facture si absent"""
        if not self.numero_facture:
            from datetime import datetime
            year = datetime.now().strftime('%Y')
            last_facture = Facture.objects.filter(
                numero_facture__startswith=f'FAC-{year}'
            ).order_by('-numero_facture').first()
            
            if last_facture:
                last_num = int(last_facture.numero_facture.split('-')[-1])
                new_num = last_num + 1
            else:
                new_num = 1
            
            self.numero_facture = f'FAC-{year}-{new_num:04d}'
        
        super().save(*args, **kwargs)


class Notification(models.Model):
    """Modèle de notification pour les utilisateurs"""
    TYPE_CHOICES = [
        ('new_order', 'Nouvelle commande'),
        ('order_ready', 'Commande prête'),
        ('order_accepted', 'Commande acceptée'),
        ('order_rejected', 'Commande refusée'),
        ('order_cancelled', 'Commande annulée'),
        ('order_delivered', 'Commande livrée'),
        ('stock_alert', 'Alerte stock'),
        ('peremption_alert', 'Alerte péremption'),
        ('mvt_validated', 'Mouvement validé'),
        ('mvt_rejected', 'Mouvement rejeté'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name='Utilisateur'
    )
    type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    message = models.TextField()
    is_read = models.BooleanField(default=False, verbose_name='Lu')
    data = models.JSONField(null=True, blank=True, verbose_name='Données supplémentaires')
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'notification'
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification {self.id} - {self.type} - {self.user}"
