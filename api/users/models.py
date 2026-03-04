from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone


class Role(models.Model):
    """Rôle utilisateur (Serveur, Cuisinier, Gérant, etc.)"""
    nom = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        db_table = 'role'
        verbose_name = 'Rôle'
        verbose_name_plural = 'Rôles'

    def __str__(self):
        return self.nom


class Permission(models.Model):
    """Permission spécifique pour un rôle ou utilisateur"""
    nom = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        db_table = 'permission'
        verbose_name = 'Permission'
        verbose_name_plural = 'Permissions'

    def __str__(self):
        return self.nom


class UserManager(BaseUserManager):
    """Manager personnalisé pour le modèle User"""
    def create_user(self, login, password=None, **extra_fields):
        if not login:
            raise ValueError('Le login est obligatoire')
        user = self.model(login=login, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, login, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_activite', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Le superuser doit avoir is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Le superuser doit avoir is_superuser=True.')

        return self.create_user(login, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Modèle utilisateur personnalisé avec rôles et permissions.
    Rôles disponibles : Serveur, Cuisinier, Gérant, Gestionnaire de stock, Manager, Auditeur, Admin
    """
    TYPE_CHOICES = [
        ('SERVEUR', 'Serveur'),
        ('CUISINIER', 'Cuisinier'),
        ('GERANT', 'Gérant'),
        ('GESTIONNAIRE_STOCK', 'Gestionnaire de stock'),
        ('MANAGER', 'Manager'),
        ('AUDITEUR', 'Auditeur'),
        ('ADMIN', 'Administrateur'),
    ]

    SEXE_CHOICES = [
        ('M', 'Masculin'),
        ('F', 'Féminin'),
    ]

    first_name = models.CharField(max_length=150, verbose_name='Prénom')
    last_name = models.CharField(max_length=150, verbose_name='Nom')
    date_de_naissance = models.DateField(null=True, blank=True, verbose_name='Date de naissance')
    sexe = models.CharField(max_length=1, choices=SEXE_CHOICES, verbose_name='Sexe')
    email = models.EmailField(blank=True, verbose_name='Email')
    date_embauche = models.DateField(default=timezone.now, verbose_name="Date d'embauche")
    login = models.CharField(max_length=150, unique=True)
    password = models.CharField(max_length=255)
    is_deleted = models.BooleanField(default=False, verbose_name='Supprimé')
    is_activite = models.BooleanField(default=True, verbose_name='Actif')
    telephone = models.CharField(max_length=20, blank=True, verbose_name='Téléphone')
    role = models.ForeignKey(Role, on_delete=models.PROTECT, related_name='users')
    permissions = models.ManyToManyField(Permission, related_name='users_permissions', blank=True)

    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)

    date_joined = models.DateTimeField(default=timezone.now)
    last_login = models.DateTimeField(null=True, blank=True)

    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name='groups',
        blank=True,
        help_text='The groups this user belongs to.',
        related_name='custom_user_set',
        related_query_name='custom_user',
    )
    
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name='user permissions',
        blank=True,
        help_text='Specific permissions for this user.',
        related_name='custom_user_permissions_set',
        related_query_name='custom_user',
    )

    objects = UserManager()

    USERNAME_FIELD = 'login'
    REQUIRED_FIELDS = ['first_name', 'last_name', 'role']

    class Meta:
        db_table = 'user'
        verbose_name = 'Utilisateur'
        verbose_name_plural = 'Utilisateurs'
        ordering = ['-date_joined']

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.login})"

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"

    def get_short_name(self):
        return self.first_name

    def has_permission(self, permission_name):
        return self.permissions.filter(nom=permission_name).exists() or self.is_superuser
