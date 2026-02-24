"""
Script d'initialisation des données de base pour la plateforme de gestion de stock.
À exécuter avec : python manage.py shell < init_data.py
ou : python init_data.py
"""

import os
import django

# Configuration Django (si exécuté directement)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'stock_management.settings')
django.setup()

from commandes.models import StatutCommande, Table
from stocks.models import TypeMouvement, StatutMouvement, StatutDemande, Unite
from users.models import Role


def init_statuts_commande():
    """Initialise les statuts de commande selon la spec"""
    print("📋 Initialisation des statuts de commande...")
    statuts = [
        'EN_ATTENTE',
        'VALIDEE',
        'REJETEE',
        'CONFIRMEE',
        'LIVREE',
        'ANNULEE',
    ]
    
    created = 0
    for statut in statuts:
        obj, created_flag = StatutCommande.objects.get_or_create(nom=statut)
        if created_flag:
            created += 1
            print(f"  ✓ Créé : {obj.get_nom_display()}")
        else:
            print(f"  ⊙ Existe : {obj.get_nom_display()}")
    
    print(f"✅ {created} statuts de commande créés, {len(statuts) - created} existants\n")


def init_types_mouvement():
    """Initialise les types de mouvement de stock"""
    print("📦 Initialisation des types de mouvement...")
    types = ['ENTREE', 'SORTIE', 'SUPPRESSION']
    
    created = 0
    for type_mv in types:
        obj, created_flag = TypeMouvement.objects.get_or_create(nom=type_mv)
        if created_flag:
            created += 1
            print(f"  ✓ Créé : {obj.get_nom_display()}")
        else:
            print(f"  ⊙ Existe : {obj.get_nom_display()}")
    
    print(f"✅ {created} types de mouvement créés, {len(types) - created} existants\n")


def init_statuts_mouvement():
    """Initialise les statuts de mouvement"""
    print("🔄 Initialisation des statuts de mouvement...")
    statuts = ['EN_ATTENTE', 'VALIDEE', 'REJETEE']
    
    created = 0
    for statut in statuts:
        obj, created_flag = StatutMouvement.objects.get_or_create(nom=statut)
        if created_flag:
            created += 1
            print(f"  ✓ Créé : {obj.get_nom_display()}")
        else:
            print(f"  ⊙ Existe : {obj.get_nom_display()}")
    
    print(f"✅ {created} statuts de mouvement créés, {len(statuts) - created} existants\n")


def init_statuts_demande():
    """Initialise les statuts de demande"""
    print("📝 Initialisation des statuts de demande...")
    statuts = ['EN_ATTENTE', 'VALIDEE', 'REJETEE']
    
    created = 0
    for statut in statuts:
        obj, created_flag = StatutDemande.objects.get_or_create(nom=statut)
        if created_flag:
            created += 1
            print(f"  ✓ Créé : {obj.get_nom_display()}")
        else:
            print(f"  ⊙ Existe : {obj.get_nom_display()}")
    
    print(f"✅ {created} statuts de demande créés, {len(statuts) - created} existants\n")


def init_roles():
    """Initialise les rôles utilisateurs selon la spec"""
    print("👥 Initialisation des rôles...")
    roles_data = [
        ('Serveur', 'Serveur du restaurant - Prend et transmet les commandes'),
        ('Cuisinier', 'Cuisinier - Accepte/rejette commandes, demande des produits'),
        ('Gérant', 'Gérant - Gère les entrées/sorties de stock, valide les demandes'),
        ('Gestionnaire de stock', 'Gestionnaire de stock - Gère les alertes et rapports de stock'),
        ('Manager', 'Manager - Valide les mouvements de stock, génère des rapports KPI'),
        ('Auditeur', 'Auditeur - Consulte les logs d\'audit'),
        ('Administrateur', 'Administrateur système - Gestion complète'),
    ]
    
    created = 0
    for nom, description in roles_data:
        obj, created_flag = Role.objects.get_or_create(
            nom=nom,
            defaults={'description': description}
        )
        if created_flag:
            created += 1
            print(f"  ✓ Créé : {nom}")
        else:
            print(f"  ⊙ Existe : {nom}")
    
    print(f"✅ {created} rôles créés, {len(roles_data) - created} existants\n")


def init_unites():
    """Initialise les unités de mesure courantes"""
    print("⚖️  Initialisation des unités de mesure...")
    unites = [
        'kg', 'g', 'L', 'mL', 'unité', 'pièce', 'boîte', 'sachet', 'bouteille', 'paquet'
    ]
    
    created = 0
    for unite in unites:
        obj, created_flag = Unite.objects.get_or_create(nom=unite)
        if created_flag:
            created += 1
            print(f"  ✓ Créé : {unite}")
        else:
            print(f"  ⊙ Existe : {unite}")
    
    print(f"✅ {created} unités créées, {len(unites) - created} existantes\n")


def init_tables():
    """Initialise quelques tables exemple"""
    print("🍽️  Initialisation des tables...")
    
    # Créer 10 tables par défaut
    created = 0
    for i in range(1, 11):
        numero = f"T{i:02d}"
        capacite = 4 if i <= 6 else (6 if i <= 8 else 8)
        
        obj, created_flag = Table.objects.get_or_create(
            numero=numero,
            defaults={'capacite': capacite}
        )
        if created_flag:
            created += 1
            print(f"  ✓ Créé : Table {numero} ({capacite} places)")
        else:
            print(f"  ⊙ Existe : Table {numero}")
    
    print(f"✅ {created} tables créées, {10 - created} existantes\n")


def run_all():
    """Exécute toutes les initialisations"""
    print("=" * 60)
    print("🚀 INITIALISATION DES DONNÉES DE BASE")
    print("=" * 60)
    print()
    
    try:
        init_statuts_commande()
        init_types_mouvement()
        init_statuts_mouvement()
        init_statuts_demande()
        init_roles()
        init_unites()
        init_tables()
        
        print("=" * 60)
        print("✅ INITIALISATION TERMINÉE AVEC SUCCÈS!")
        print("=" * 60)
        print()
        print("📌 Prochaines étapes :")
        print("  1. Créer un superutilisateur : python manage.py createsuperuser")
        print("  2. Lancer les migrations : python manage.py migrate")
        print("  3. Lancer le serveur : python manage.py runserver")
        print()
        
    except Exception as e:
        print(f"\n❌ ERREUR lors de l'initialisation : {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    run_all()
