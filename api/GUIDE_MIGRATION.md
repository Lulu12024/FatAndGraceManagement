# Guide de Migration vers la Version Conforme aux Spécifications

## ⚠️ IMPORTANT - SAUVEGARDE

**Avant de commencer la migration, sauvegardez votre base de données !**

```bash
# PostgreSQL
pg_dump -U username -d database_name > backup_$(date +%Y%m%d_%H%M%S).sql

# Ou via manage.py
python manage.py dumpdata > backup_$(date +%Y%m%d_%H%M%S).json
```

---

## 📋 Résumé des Changements Majeurs

### Module Commandes
- ✅ **NOUVEAU** : Modèle `Table` avec cycle de vie complet
- ✅ **NOUVEAU** : Modèle `Facture` pour la gestion des paiements
- ✅ **MODIFIÉ** : Statuts de commande alignés sur workflow spec
- ✅ **MODIFIÉ** : Champ `table` devient ForeignKey (au lieu de CharField)
- ✅ **AJOUTÉ** : Champs `observations`, `motif_rejet`, `motif_annulation`
- ✅ **AJOUTÉ** : Champs de dates de transition (`date_acceptation`, `date_preparation`, `date_livraison`)

### Module Stocks
- ✅ **AJOUTÉ** : Champ `date_peremption` sur Produit
- ✅ **AJOUTÉ** : Champs `fournisseur` et `date_reception` sur MouvementStock
- ✅ **AJOUTÉ** : Champ `motif_rejet` sur MouvementStock et DemandeProduit

### Module Utilisateurs
- ✅ **AJOUTÉ** : Rôle "Gestionnaire de stock"

---

## 🚀 Étapes de Migration

### Étape 1 : Supprimer l'ancienne base de données (développement uniquement)

**⚠️ Uniquement en environnement de développement !**

```bash
# Supprimer les migrations existantes
rm -rf commandes/migrations/0*.py
rm -rf stocks/migrations/0*.py
rm -rf users/migrations/0*.py
rm -rf audit/migrations/0*.py

# Garder uniquement les fichiers __init__.py
```

### Étape 2 : Réinitialiser la base de données (développement)

```bash
# Supprimer la base de données PostgreSQL
dropdb your_database_name
createdb your_database_name
```

### Étape 3 : Créer les nouvelles migrations

```bash
# Créer les migrations pour tous les modules
python manage.py makemigrations users
python manage.py makemigrations commandes
python manage.py makemigrations stocks
python manage.py makemigrations audit
```

### Étape 4 : Appliquer les migrations

```bash
python manage.py migrate
```

### Étape 5 : Initialiser les données de base

```bash
# Exécuter le script d'initialisation
python init_data.py

# OU via le shell Django
python manage.py shell < init_data.py
```

Cela créera automatiquement :
- Les statuts de commande
- Les types et statuts de mouvement
- Les statuts de demande
- Les rôles utilisateurs (y compris Gestionnaire de stock)
- Les unités de mesure
- 10 tables par défaut (T01 à T10)

### Étape 6 : Créer un superutilisateur

```bash
python manage.py createsuperuser
```

### Étape 7 : Vérifier l'installation

```bash
# Lancer le serveur
python manage.py runserver

# Accéder à l'admin Django
# http://localhost:8000/admin

# Vérifier que tout est en place :
# - Tables (10 tables T01-T10)
# - Statuts de commande (7 statuts)
# - Rôles (7 rôles dont Gestionnaire de stock)
```

---

## 📊 Migration des Données Existantes (Production)

Si vous avez des données existantes en production, voici comment migrer :

### Option 1 : Migration automatique avec script

```python
# migration_script.py
from commandes.models import Commande, Table, StatutCommande
from django.db import transaction

@transaction.atomic
def migrate_commandes():
    """
    Migre les anciennes commandes avec table en CharField vers le nouveau système
    """
    # Créer une table par défaut pour les anciennes commandes
    table_default, _ = Table.objects.get_or_create(
        numero='T99',
        defaults={'capacite': 4}
    )
    
    # Obtenir le statut par défaut
    statut_default = StatutCommande.objects.get(nom='COMMANDE_STOCKEE')
    
    # Migrer les commandes
    for commande in Commande.objects.filter(table__isnull=True):
        # L'ancien champ table était un CharField
        # Il faudra adapter selon votre logique métier
        commande.statut = statut_default
        commande.save()
    
    print("Migration terminée !")

if __name__ == '__main__':
    migrate_commandes()
```

### Option 2 : Export/Import manuel

```bash
# 1. Exporter les données avant migration
python manage.py dumpdata commandes --output=commandes_backup.json
python manage.py dumpdata stocks --output=stocks_backup.json

# 2. Appliquer les migrations

# 3. Réimporter en adaptant la structure
# (nécessite un script personnalisé selon vos données)
```

---

## 🔍 Vérification Post-Migration

### Checklist de vérification

- [ ] Les 7 statuts de commande existent
- [ ] Les 10 tables (T01-T10) sont créées
- [ ] Le rôle "Gestionnaire de stock" existe
- [ ] Les unités de mesure sont présentes
- [ ] Les types de mouvement (ENTREE, SORTIE, SUPPRESSION) existent
- [ ] L'admin Django fonctionne correctement
- [ ] Les endpoints API répondent

### Tests de base

```bash
# Test 1 : Lister les tables
curl http://localhost:8000/api/commandes/tables/

# Test 2 : Lister les statuts de commande
curl http://localhost:8000/api/commandes/statuts/

# Test 3 : Lister les rôles
curl http://localhost:8000/api/users/roles/
```

---

## ⚙️ Configuration Post-Migration

### 1. Créer des utilisateurs de test (optionnel)

```python
# Dans le shell Django
from users.models import User, Role
from datetime import date

# Créer un serveur
role_serveur = Role.objects.get(nom='Serveur')
User.objects.create_user(
    login='serveur1',
    password='password123',
    first_name='Jean',
    last_name='Dupont',
    date_de_naissance=date(1990, 1, 1),
    sexe='M',
    role=role_serveur
)

# Créer un cuisinier
role_cuisinier = Role.objects.get(nom='Cuisinier')
User.objects.create_user(
    login='cuisinier1',
    password='password123',
    first_name='Marie',
    last_name='Martin',
    date_de_naissance=date(1992, 3, 15),
    sexe='F',
    role=role_cuisinier
)

# Créer un gérant
role_gerant = Role.objects.get(nom='Gérant')
User.objects.create_user(
    login='gerant1',
    password='password123',
    first_name='Pierre',
    last_name='Bernard',
    date_de_naissance=date(1985, 6, 20),
    sexe='M',
    role=role_gerant
)
```

### 2. Créer des plats de test (optionnel)

```python
from commandes.models import Plat

plats_test = [
    {'nom': 'Pizza Margherita', 'prix': 8.50, 'categorie': 'Pizza'},
    {'nom': 'Salade César', 'prix': 6.90, 'categorie': 'Salade'},
    {'nom': 'Burger Classique', 'prix': 10.00, 'categorie': 'Burger'},
]

for plat in plats_test:
    Plat.objects.create(**plat)
```

### 3. Créer des produits de test (optionnel)

```python
from stocks.models import Produit, Unite, Stock
from decimal import Decimal

# Créer quelques produits
unite_kg = Unite.objects.get(nom='kg')
unite_l = Unite.objects.get(nom='L')

produits_test = [
    {
        'nom': 'Farine',
        'categorie': 'Épicerie',
        'seuil_alerte': Decimal('5.00'),
        'unite': unite_kg
    },
    {
        'nom': 'Huile d\'olive',
        'categorie': 'Condiments',
        'seuil_alerte': Decimal('2.00'),
        'unite': unite_l
    },
]

for prod_data in produits_test:
    produit = Produit.objects.create(**prod_data)
    # Créer le stock associé
    Stock.objects.create(
        produit=produit,
        quantite_dispo=Decimal('20.00')
    )
```

---

## 📚 Ressources Complémentaires

- **Documentation API** : http://localhost:8000/api/docs/
- **Admin Django** : http://localhost:8000/admin
- **README** : Consulter le README.md mis à jour
- **Spécifications techniques** : Document PDF fourni

---

## ❓ Problèmes Courants

### Erreur : "No such column: commandes_commande.table_id"

**Solution** : Vous devez supprimer et recréer les migrations
```bash
rm commandes/migrations/0*.py
python manage.py makemigrations commandes
python manage.py migrate
```

### Erreur : "Role matching query does not exist"

**Solution** : Exécuter le script d'initialisation
```bash
python init_data.py
```

### Erreur : "UNIQUE constraint failed"

**Solution** : Les données de base existent déjà, c'est normal

---

## 🎯 Prochaines Étapes

1. ✅ Migration terminée
2. 📝 Tester les endpoints API
3. 🎨 Développer le frontend si nécessaire
4. 📊 Configurer les rapports et dashboards
5. 🚀 Déploiement en production

---

**Bon courage avec la migration ! 🚀**
