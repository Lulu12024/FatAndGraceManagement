from django.db import models
from django.conf import settings
from django.utils import timezone


class StatutCommande(models.Model):
    STATUT_CHOICES = [
        ('EN_ATTENTE', 'En attente'),
        ('VALIDEE', 'Validée'),
        ('REJETEE', 'Rejetée'),
        ('CONFIRMEE', 'Confirmée'),
    ]

    nom = models.CharField(max_length=50, choices=STATUT_CHOICES, unique=True)

    class Meta:
        db_table = 'statut_commande'
        verbose_name = 'Statut de commande'
        verbose_name_plural = 'Statuts de commande'

    def __str__(self):
        return self.get_nom_display()


class Plat(models.Model):
    nom = models.CharField(max_length=200)
    ingredients = models.TextField(verbose_name='Ingrédients')
    prix = models.DecimalField(max_digits=10, decimal_places=2)
    disponible = models.BooleanField(default=True)
    description = models.TextField(blank=True)

    class Meta:
        db_table = 'plat'
        verbose_name = 'Plat'
        verbose_name_plural = 'Plats'

    def __str__(self):
        return self.nom


class Commande(models.Model):
    date_commande = models.DateTimeField(default=timezone.now)
    heure_commande = models.TimeField(auto_now_add=True)
    table = models.CharField(max_length=50)
    prix_total = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(blank=True)

    serveur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='commandes_serveur',
        limit_choices_to={'role__nom': 'Serveur'}
    )
    cuisinier = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='commandes_cuisinier',
        limit_choices_to={'role__nom': 'Cuisinier'}
    )
    gerant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='commandes_gerant',
        limit_choices_to={'role__nom': 'Gérant'}
    )
    statut = models.ForeignKey(
        StatutCommande,
        on_delete=models.PROTECT,
        related_name='commandes'
    )
    plats = models.ManyToManyField(Plat, through='CommandePlat', related_name='commandes')

    class Meta:
        db_table = 'commande'
        verbose_name = 'Commande'
        verbose_name_plural = 'Commandes'
        ordering = ['-date_commande', '-heure_commande']

    def __str__(self):
        return f"Commande #{self.id} - Table {self.table} - {self.date_commande}"


class CommandePlat(models.Model):
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

