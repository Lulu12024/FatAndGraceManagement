# 🍽️ Plateforme de Gestion de Stock pour Restaurant

API REST développée avec Django REST Framework pour la gestion complète d'un restaurant : commandes, stocks, tables, factures et audit.

**Version** : 2.0 - Conforme aux Spécifications Techniques (Décembre 2025)

---

## 📋 Table des Matières

- [Fonctionnalités](#fonctionnalités)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Utilisation](#utilisation)
- [Documentation API](#documentation-api)
- [Workflows](#workflows)
- [Tests](#tests)
- [Déploiement](#déploiement)

---

## ✨ Fonctionnalités

### Module 1 : Suivi des Commandes

#### 🍽️ Gestion des Tables
- **Réserver une table** : Le serveur réserve une table disponible
- **Passer des commandes** : Enregistrer des commandes sur une table réservée
- **Clôturer une table** : Passer au statut EN_ATTENTE_PAIEMENT
- **Fermer une table** : Après paiement, retour au statut DISPONIBLE
- **Suivi en temps réel** : Visualiser toutes les tables avec leur statut

**Statuts des tables** :
- DISPONIBLE → RESERVEE → COMMANDES_PASSEE → EN_SERVICE → EN_ATTENTE_PAIEMENT → PAYEE → FERMEE → DISPONIBLE

#### 📝 Gestion des Commandes
- **Stocker une commande** : Créer un brouillon de commande
- **Modifier une commande** : Modifier une commande stockée
- **Transmettre aux cuisiniers** : Notification automatique
- **Accepter/Rejeter** : Le cuisinier accepte ou rejette
- **Marquer comme prête** : Commande terminée, prête à servir
- **Livrer** : Confirmer la livraison au client
- **Annuler** : Annuler une commande (serveur ou gérant)
- **Historique complet** : Traçabilité de toutes les commandes

**Statuts des commandes** :
- COMMANDE_STOCKEE → EN_ATTENTE_ACCEPTATION → EN_PREPARATION → EN_ATTENTE_LIVRAISON → LIVREE
- Ou : ANNULEE / REJETEE

#### 💰 Gestion des Factures
- **Enregistrer le paiement** : Mode de paiement (Espèces, Carte, Mobile Money)
- **Générer la facture** : Numéro unique auto-généré (format: FAC-YYYYMMDD-XXXX)
- **Consulter/Exporter** : PDF, recherche par numéro/date/table
- **Réimprimer** : Accès à l'historique des factures

### Module 2 : Gestion des Stocks

#### 📦 Réception des Stocks (Entrées)
- **Enregistrer une entrée** : Gérant ou Gestionnaire de stock
- **Validation Manager** : Vérification et validation
- **Traçabilité** : Fournisseur, date de réception, date de péremption

#### 📤 Utilisation du Stock (Sorties)
- **Demande de libération** : Cuisinier demande des produits
- **Validation** : Gérant ou Gestionnaire de stock approuve
- **Mise à jour automatique** : Stock diminué après validation
- **Lien avec commande** : Demande liée à une commande spécifique

#### 🗑️ Sortie de Produits (Suppression)
- **Initier une sortie** : Gérant supprime un produit (périmé, détérioré, etc.)
- **Validation Manager** : Approbation obligatoire
- **Justification** : Motif obligatoire (périmé, cassé, contaminé, etc.)

#### 📊 Suivi en Temps Réel
- **État du stock** : Visualisation complète avec quantités
- **Alertes automatiques** :
  - Stock faible (< seuil minimum)
  - Produits périmés
- **Historique** : Tous les mouvements (entrées, sorties, suppressions)
- **Rapports** : Statistiques et KPI détaillés

### Fonctionnalités Communes

- **🔐 Authentification** : JWT (Access + Refresh tokens)
- **👥 Rôles et Permissions** : 7 rôles (Serveur, Cuisinier, Gérant, Gestionnaire de stock, Manager, Auditeur, Admin)
- **📋 Journalisation** : Audit complet de toutes les actions
- **📈 Tableaux de bord** : Résumés et statistiques
- **📤 Export de données** : CSV, Excel, PDF
- **🔔 Notifications en temps réel** : WebSocket pour notifications push

---

## 🏗️ Architecture

### Stack Technique

- **Backend** : Django 4.2 + Django REST Framework 3.14
- **Base de données** : PostgreSQL 15+ (ou Supabase)
- **Authentification** : JWT (djangorestframework-simplejwt)
- **Temps réel** : Django Channels 4.0 + Redis
- **Tâches asynchrones** : Celery 5.6 + Redis
- **Documentation API** : drf-spectacular (Swagger/OpenAPI)

### Modèles de Données

#### Module Commandes
- `Table` : Tables du restaurant
- `Commande` : Commandes passées par les serveurs
- `Plat` : Plats du menu
- `CommandePlat` : Liaison Commande-Plat
- `Facture` : Factures générées après paiement
- `StatutCommande` : Statuts possibles des commandes

#### Module Stocks
- `Produit` : Produits en stock
- `Stock` : État du stock pour chaque produit
- `Unite` : Unités de mesure
- `MouvementStock` : Entrées, sorties, suppressions
- `DemandeProduit` : Demandes de libération par cuisiniers
- `TypeMouvement` : Types de mouvements
- `StatutMouvement` : Statuts des mouvements

#### Module Users
- `User` : Utilisateurs du système
- `Role` : Rôles utilisateurs
- `Permission` : Permissions granulaires

### Rôles Utilisateurs

| Rôle | Description | Permissions principales |
|------|-------------|------------------------|
| **Serveur** | Prend et transmet les commandes | Réserver tables, passer commandes, annuler commandes non acceptées |
| **Cuisinier** | Prépare les commandes | Accepter/rejeter commandes, demander produits du stock |
| **Gérant** | Gère les stocks et paiements | Gérer entrées/sorties stock, valider demandes, enregistrer paiements |
| **Gestionnaire de stock** | Gère les alertes et rapports | Valider demandes, gérer alertes, générer rapports stock |
| **Manager** | Valide et supervise | Valider mouvements stock, générer KPI, gérer équipe |
| **Auditeur** | Consulte les logs | Accès lecture seule à tous les logs d'audit |
| **Administrateur** | Administration complète | Tous les droits |

---

## 🚀 Installation

### Prérequis

- Python 3.10+
- PostgreSQL 15+ (ou compte Supabase)
- Redis 7.0+ (pour WebSocket et Celery)

### Étapes d'Installation

#### 1. Cloner le projet

```bash
cd project
```

#### 2. Créer un environnement virtuel

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

#### 3. Installer les dépendances

```bash
pip install -r requirements.txt
```

#### 4. Configurer les variables d'environnement

Créer un fichier `.env` à la racine :

```env
# Database Configuration (PostgreSQL/Supabase)
DB_NAME=votre_nom_de_base
DB_USER=votre_utilisateur
DB_PASSWORD=votre_mot_de_passe
DB_HOST=votre_host
DB_PORT=5432

# Django Settings
SECRET_KEY=votre-cle-secrete-django-tres-longue-et-aleatoire
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# JWT Settings
JWT_ACCESS_TOKEN_LIFETIME=60
JWT_REFRESH_TOKEN_LIFETIME=1440

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
```

#### 5. Créer et appliquer les migrations

```bash
# Créer les migrations
python manage.py makemigrations

# Appliquer les migrations
python manage.py migrate
```

#### 6. Initialiser les données de base

```bash
# Exécuter le script d'initialisation
python init_data.py
```

Cela créera automatiquement :
- ✅ Les 7 statuts de commande
- ✅ Les 3 types de mouvement (ENTREE, SORTIE, SUPPRESSION)
- ✅ Les 3 statuts de mouvement
- ✅ Les 7 rôles utilisateurs
- ✅ Les unités de mesure courantes
- ✅ 10 tables (T01 à T10)

#### 7. Créer un superutilisateur

```bash
python manage.py createsuperuser
```

#### 8. Lancer le serveur de développement

```bash
python manage.py runserver
```

L'API sera accessible à : **http://localhost:8000**

---

## ⚙️ Configuration

### Lancer Redis (WebSocket et Celery)

```bash
# Installer Redis
# Windows: https://redis.io/download
# Linux: sudo apt-get install redis-server
# Mac: brew install redis

# Lancer Redis
redis-server
```

### Lancer Celery (Tâches asynchrones)

Dans un nouveau terminal :

```bash
celery -A stock_management worker -l info
```

### Lancer Daphne (WebSocket en production)

```bash
daphne -b 0.0.0.0 -p 8001 stock_management.asgi:application
```

---

## 📚 Documentation API

### Accès à la Documentation

Une fois le serveur lancé :

- **Swagger UI** : http://localhost:8000/api/docs/
- **ReDoc** : http://localhost:8000/api/redoc/
- **Schema OpenAPI** : http://localhost:8000/api/schema/

### Endpoints Principaux

#### Authentication

```
POST   /api/auth/login/          # Connexion (obtenir JWT)
POST   /api/auth/refresh/        # Rafraîchir le token
POST   /api/auth/logout/         # Déconnexion
```

#### Tables

```
GET    /api/commandes/tables/                    # Liste des tables
POST   /api/commandes/tables/                    # Créer une table
GET    /api/commandes/tables/{id}/               # Détails d'une table
PUT    /api/commandes/tables/{id}/               # Modifier une table
POST   /api/commandes/tables/{id}/reserver/      # Réserver une table
POST   /api/commandes/tables/{id}/cloturer/      # Clôturer une table
POST   /api/commandes/tables/{id}/fermer/        # Fermer une table
```

#### Commandes

```
GET    /api/commandes/commandes/                     # Liste des commandes
POST   /api/commandes/commandes/                     # Créer une commande
GET    /api/commandes/commandes/{id}/                # Détails d'une commande
PUT    /api/commandes/commandes/{id}/                # Modifier une commande stockée
POST   /api/commandes/commandes/{id}/transmettre/    # Transmettre aux cuisiniers
POST   /api/commandes/commandes/{id}/accepter/       # Accepter une commande
POST   /api/commandes/commandes/{id}/rejeter/        # Rejeter une commande
POST   /api/commandes/commandes/{id}/marquer_prete/  # Marquer comme prête
POST   /api/commandes/commandes/{id}/livrer/         # Livrer une commande
POST   /api/commandes/commandes/{id}/annuler/        # Annuler une commande
```

#### Factures

```
GET    /api/commandes/factures/              # Liste des factures
POST   /api/commandes/factures/              # Créer/générer une facture
GET    /api/commandes/factures/{id}/         # Détails d'une facture
GET    /api/commandes/factures/{id}/pdf/     # Télécharger PDF
```

#### Stocks

```
GET    /api/stocks/stocks/                   # État des stocks
GET    /api/stocks/stocks/alertes/           # Stocks en alerte
GET    /api/stocks/produits/                 # Liste des produits
POST   /api/stocks/produits/                 # Créer un produit
```

#### Mouvements de Stock

```
GET    /api/stocks/mouvements/               # Liste des mouvements
POST   /api/stocks/mouvements/               # Créer un mouvement
POST   /api/stocks/mouvements/{id}/valider/  # Valider un mouvement
POST   /api/stocks/mouvements/{id}/rejeter/  # Rejeter un mouvement
```

#### Demandes de Produits

```
GET    /api/stocks/demandes/                 # Liste des demandes
POST   /api/stocks/demandes/                 # Créer une demande
POST   /api/stocks/demandes/{id}/valider/    # Valider une demande
POST   /api/stocks/demandes/{id}/rejeter/    # Rejeter une demande
```

#### Utilisateurs

```
GET    /api/users/users/                     # Liste des utilisateurs
POST   /api/users/users/                     # Créer un utilisateur
GET    /api/users/users/me/                  # Profil utilisateur connecté
PUT    /api/users/users/{id}/                # Modifier un utilisateur
POST   /api/users/users/{id}/change_password/  # Changer mot de passe
```

#### Audit

```
GET    /api/audit/logs/                      # Logs d'audit
POST   /api/audit/logs/export/               # Exporter les logs
GET    /api/audit/rapports/                  # Liste des rapports
POST   /api/audit/rapports/                  # Créer un rapport
```

---

## 🔄 Workflows

### Workflow Table

```
DISPONIBLE 
    ↓ [Réserver]
RESERVEE
    ↓ [Passer commande]
COMMANDES_PASSEE
    ↓ [Accepter commande]
EN_SERVICE
    ↓ [Clôturer (toutes commandes livrées)]
EN_ATTENTE_PAIEMENT
    ↓ [Enregistrer paiement]
PAYEE
    ↓ [Générer facture]
FERMEE
    ↓ [Auto]
DISPONIBLE
```

### Workflow Commande

```
NULL
    ↓ [Stocker]
COMMANDE_STOCKEE
    ↓ [Transmettre]
EN_ATTENTE_ACCEPTATION
    ↓ [Accepter]
EN_PREPARATION
    ↓ [Marquer prête]
EN_ATTENTE_LIVRAISON
    ↓ [Livrer]
LIVREE

Branches alternatives:
- ANNULEE (serveur ou gérant)
- REJETEE (cuisinier)
```

### Workflow Mouvement Stock (Entrée)

```
NULL
    ↓ [Enregistrer entrée]
EN_ATTENTE
    ↓ [Valider (Manager)]
VALIDEE → Stock mis à jour
    
    OU
    
    ↓ [Rejeter (Manager)]
REJETEE
```

---

## 🧪 Tests

```bash
# Lancer tous les tests
python manage.py test

# Tests d'un module spécifique
python manage.py test commandes
python manage.py test stocks
python manage.py test users

# Tests avec coverage
pip install coverage
coverage run --source='.' manage.py test
coverage report
```

---

## 🚀 Déploiement

### Production avec Gunicorn + Daphne

1. **Configurer les variables d'environnement**

```env
DEBUG=False
ALLOWED_HOSTS=votre-domaine.com
SECRET_KEY=nouvelle-cle-ultra-secrete
```

2. **Collecter les fichiers statiques**

```bash
python manage.py collectstatic
```

3. **Lancer Gunicorn (API REST)**

```bash
gunicorn stock_management.wsgi:application --bind 0.0.0.0:8000 --workers 4
```

4. **Lancer Daphne (WebSocket)**

```bash
daphne -b 0.0.0.0 -p 8001 stock_management.asgi:application
```

5. **Configurer Nginx comme reverse proxy**

```nginx
upstream django {
    server 127.0.0.1:8000;
}

upstream websocket {
    server 127.0.0.1:8001;
}

server {
    listen 80;
    server_name votre-domaine.com;

    location / {
        proxy_pass http://django;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /ws/ {
        proxy_pass http://websocket;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /static/ {
        alias /path/to/staticfiles/;
    }
}
```

---

## 📁 Structure du Projet

```
project/
├── stock_management/          # Configuration Django
│   ├── settings.py
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
├── users/                     # App gestion utilisateurs
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   └── permissions.py
├── commandes/                 # App gestion commandes & tables
│   ├── models.py             # Table, Commande, Facture, Plat
│   ├── serializers.py
│   └── views.py
├── stocks/                    # App gestion stocks
│   ├── models.py             # Produit, Stock, MouvementStock, DemandeProduit
│   ├── serializers.py
│   └── views.py
├── audit/                     # App journalisation/audit
│   ├── models.py
│   └── views.py
├── init_data.py              # Script d'initialisation
├── GUIDE_MIGRATION.md        # Guide de migration
├── requirements.txt
└── README.md
```

---

## 📞 Support

Pour toute question ou problème :

- **Documentation** : Consulter la documentation Django et DRF
  - https://www.django-rest-framework.org/
  - https://docs.djangoproject.com/
- **Spécifications** : Voir le document PDF des spécifications techniques
- **Migration** : Consulter le GUIDE_MIGRATION.md

---

## 📄 Licence

Ce projet est développé pour **Africa Global Logistics Bénin**.  
© 2025 - Tous droits réservés.

---

**Bon développement ! 🚀**
