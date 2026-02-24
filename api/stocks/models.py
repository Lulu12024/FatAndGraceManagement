from django.db import models
from django.conf import settings
from django.utils import timezone
from decimal import Decimal


class Unite(models.Model):
    """Unité de mesure pour les produits (kg, L, unité, etc.)"""
    nom = models.CharField(max_length=50, unique=True)

    class Meta:
        db_table = 'unite'
        verbose_name = 'Unité'
        verbose_name_plural = 'Unités'

    def __str__(self):
        return self.nom


class Produit(models.Model):
    """Produit en stock avec informations de base et seuil d'alerte"""
    nom = models.CharField(max_length=200)
    categorie = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    seuil_alerte = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name='Seuil minimum'
    )
    date_peremption = models.DateField(
        null=True, 
        blank=True,
        verbose_name='Date de péremption'
    )

    unite = models.ForeignKey(Unite, on_delete=models.PROTECT, related_name='produits')

    class Meta:
        db_table = 'produit'
        verbose_name = 'Produit'
        verbose_name_plural = 'Produits'

    def __str__(self):
        return f"{self.nom} ({self.unite.nom})"

    @property
    def est_perime(self):
        """Vérifie si le produit est périmé"""
        if self.date_peremption:
            return self.date_peremption < timezone.now().date()
        return False


class Stock(models.Model):
    """État du stock pour un produit donné"""
    quantite_dispo = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name='Quantité disponible'
    )
    date_time = models.DateTimeField(default=timezone.now)

    produit = models.OneToOneField(
        Produit,
        on_delete=models.PROTECT,
        related_name='stock'
    )

    class Meta:
        db_table = 'stock'
        verbose_name = 'Stock'
        verbose_name_plural = 'Stocks'

    def __str__(self):
        return f"Stock de {self.produit.nom}: {self.quantite_dispo} {self.produit.unite.nom}"

    @property
    def est_en_alerte(self):
        """Vérifie si le stock est en dessous du seuil d'alerte"""
        return self.quantite_dispo <= self.produit.seuil_alerte


class TypeMouvement(models.Model):
    """Type de mouvement de stock : Entrée, Sortie ou Suppression"""
    TYPE_CHOICES = [
        ('ENTREE', 'Entrée'),
        ('SORTIE', 'Sortie'),
        ('SUPPRESSION', 'Suppression'),
    ]

    nom = models.CharField(max_length=50, choices=TYPE_CHOICES, unique=True)

    class Meta:
        db_table = 'type_mouvement'
        verbose_name = 'Type de mouvement'
        verbose_name_plural = 'Types de mouvement'

    def __str__(self):
        return self.get_nom_display()


class StatutMouvement(models.Model):
    """Statut d'un mouvement : En attente, Validé ou Rejeté"""
    STATUT_CHOICES = [
        ('EN_ATTENTE', 'En attente'),
        ('VALIDEE', 'Validée'),
        ('REJETEE', 'Rejetée'),
    ]

    nom = models.CharField(max_length=50, choices=STATUT_CHOICES, unique=True)

    class Meta:
        db_table = 'statut_mouvement'
        verbose_name = 'Statut de mouvement'
        verbose_name_plural = 'Statuts de mouvement'

    def __str__(self):
        return self.get_nom_display()


class MouvementStock(models.Model):
    """
    Mouvement de stock (Entrée, Sortie ou Suppression).
    Workflow : EN_ATTENTE → VALIDEE ou REJETEE
    """
    type_mouvement = models.ForeignKey(
        TypeMouvement,
        on_delete=models.PROTECT,
        related_name='mouvements'
    )
    quantite = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField(default=timezone.now)
    heure = models.TimeField(auto_now_add=True)
    justification = models.TextField(blank=True, verbose_name='Justification/Motif')
    motif_rejet = models.TextField(blank=True, verbose_name='Motif de rejet')
    
    # Champs spécifiques aux ENTREES
    fournisseur = models.CharField(
        max_length=200, 
        blank=True,
        verbose_name='Fournisseur (pour les entrées)'
    )
    date_reception = models.DateField(
        null=True, 
        blank=True,
        verbose_name='Date de réception (pour les entrées)'
    )
    
    statut = models.ForeignKey(
        StatutMouvement,
        on_delete=models.PROTECT,
        related_name='mouvements'
    )

    produit = models.ForeignKey(
        Produit,
        on_delete=models.PROTECT,
        related_name='mouvements'
    )
    demandeur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='mouvements_demandes',
        verbose_name='Demandeur'
    )
    valideur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='mouvements_valides',
        verbose_name='Valideur'
    )

    class Meta:
        db_table = 'mouvement_stock'
        verbose_name = 'Mouvement de stock'
        verbose_name_plural = 'Mouvements de stock'
        ordering = ['-date', '-heure']

    def __str__(self):
        return f"{self.type_mouvement.get_nom_display()} - {self.produit.nom} - {self.quantite}"


class DemandeProduit(models.Model):
    """
    Demande de libération de produits du stock (par cuisinier).
    Workflow : EN_ATTENTE → VALIDEE ou REJETEE
    """
    STATUT_CHOICES = [
        ('EN_ATTENTE', 'En attente'),
        ('VALIDEE', 'Validée'),
        ('REJETEE', 'Rejetée'),
    ]

    justification = models.TextField(verbose_name='Justification')
    quantite = models.DecimalField(max_digits=10, decimal_places=2)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='EN_ATTENTE')
    date_demande = models.DateTimeField(default=timezone.now)
    motif_rejet = models.TextField(blank=True, verbose_name='Motif de rejet')

    produit = models.ForeignKey(
        Produit,
        on_delete=models.PROTECT,
        related_name='demandes'
    )
    demandeur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='demandes_produits',
        verbose_name='Demandeur (Cuisinier)'
    )
    valideur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='demandes_validees',
        verbose_name='Valideur (Gérant ou Gestionnaire de stock)'
    )
    commande = models.ForeignKey(
        'commandes.Commande',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='demandes_produits',
        verbose_name='Commande liée'
    )

    class Meta:
        db_table = 'demande_produit'
        verbose_name = 'Demande de produit'
        verbose_name_plural = 'Demandes de produit'
        ordering = ['-date_demande']

    def __str__(self):
        return f"Demande {self.id} - {self.produit.nom} - {self.quantite}"


class StatutDemande(models.Model):
    """Statuts possibles pour une demande de produit"""
    STATUT_CHOICES = [
        ('EN_ATTENTE', 'En attente'),
        ('VALIDEE', 'Validée'),
        ('REJETEE', 'Rejetée'),
    ]

    nom = models.CharField(max_length=50, choices=STATUT_CHOICES, unique=True)

    class Meta:
        db_table = 'statut_demande'
        verbose_name = 'Statut de demande'
        verbose_name_plural = 'Statuts de demande'

    def __str__(self):
        return self.get_nom_display()
