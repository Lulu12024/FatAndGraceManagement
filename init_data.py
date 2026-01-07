import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'stock_management.settings')
django.setup()

from commandes.models import StatutCommande
from stocks.models import TypeMouvement, StatutMouvement, StatutDemande
from users.models import Role
from audit.models import FormatExport


def init_data():
    print("Initialisation des données de base...")

    print("\n1. Création des rôles...")
    roles_data = [
        {'nom': 'Serveur', 'description': 'Serveur du restaurant'},
        {'nom': 'Cuisinier', 'description': 'Cuisinier'},
        {'nom': 'Gérant', 'description': 'Gérant'},
        {'nom': 'Manager', 'description': 'Manager'},
        {'nom': 'Auditeur', 'description': 'Auditeur'},
        {'nom': 'Administrateur', 'description': 'Administrateur système'},
    ]

    for role_data in roles_data:
        role, created = Role.objects.get_or_create(
            nom=role_data['nom'],
            defaults={'description': role_data['description']}
        )
        if created:
            print(f"  ✓ Rôle '{role.nom}' créé")
        else:
            print(f"  - Rôle '{role.nom}' existe déjà")

    print("\n2. Création des statuts de commande...")
    statuts_commande = [
        'EN_ATTENTE',
        'VALIDEE',
        'REJETEE',
        'CONFIRMEE',
    ]

    for statut_nom in statuts_commande:
        statut, created = StatutCommande.objects.get_or_create(nom=statut_nom)
        if created:
            print(f"  ✓ Statut '{statut.get_nom_display()}' créé")
        else:
            print(f"  - Statut '{statut.get_nom_display()}' existe déjà")

    print("\n3. Création des types de mouvement...")
    types_mouvement = [
        'ENTREE',
        'SORTIE',
        'SUPPRESSION',
    ]

    for type_nom in types_mouvement:
        type_mvt, created = TypeMouvement.objects.get_or_create(nom=type_nom)
        if created:
            print(f"  ✓ Type '{type_mvt.get_nom_display()}' créé")
        else:
            print(f"  - Type '{type_mvt.get_nom_display()}' existe déjà")

    print("\n4. Création des statuts de mouvement...")
    statuts_mouvement = [
        'EN_ATTENTE',
        'VALIDEE',
        'REJETEE',
    ]

    for statut_nom in statuts_mouvement:
        statut, created = StatutMouvement.objects.get_or_create(nom=statut_nom)
        if created:
            print(f"  ✓ Statut '{statut.get_nom_display()}' créé")
        else:
            print(f"  - Statut '{statut.get_nom_display()}' existe déjà")

    print("\n5. Création des statuts de demande...")
    statuts_demande = [
        'EN_ATTENTE',
        'VALIDEE',
        'REJETEE',
    ]

    for statut_nom in statuts_demande:
        statut, created = StatutDemande.objects.get_or_create(nom=statut_nom)
        if created:
            print(f"  ✓ Statut '{statut.get_nom_display()}' créé")
        else:
            print(f"  - Statut '{statut.get_nom_display()}' existe déjà")

    print("\n6. Création des formats d'export...")
    formats_export = [
        'CSV',
        'EXCEL',
        'PDF',
    ]

    for format_nom in formats_export:
        format_exp, created = FormatExport.objects.get_or_create(nom=format_nom)
        if created:
            print(f"  ✓ Format '{format_exp.get_nom_display()}' créé")
        else:
            print(f"  - Format '{format_exp.get_nom_display()}' existe déjà")

    print("\n✅ Initialisation terminée avec succès!")
    print("\nVous pouvez maintenant créer un superutilisateur avec:")
    print("  python manage.py createsuperuser")


if __name__ == '__main__':
    init_data()
