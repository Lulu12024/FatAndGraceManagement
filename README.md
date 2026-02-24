# API de Gestion des Stocks pour Restaurant

API REST développée avec Django REST Framework pour la gestion des stocks d'une chaîne de restaurants.

## Fonctionnalités

### Module 1: Suivi des commandes
- Prise de commandes par les serveurs
- Transmission automatique aux cuisiniers
- Acceptation/Rejet des commandes par les cuisiniers
- Suivi du statut des commandes
- Livraison et archivage
- Annulation des commandes

### Module 2: Gestion des stocks
- Enregistrement des entrées de stock
- Demandes de sortie de stock
- Validation/Rejet des demandes par les managers et gérants
- Suivi en temps réel des stocks
- Alertes de stock faible
- Historique des mouvements

### Fonctionnalités communes
- Authentification JWT
- Système de rôles et permissions
- Journalisation complète (audit)
- Tableaux de bord
- Export de données (CSV, Excel)
- Notifications en temps réel (WebSocket)

## Architecture

- **Backend**: Django 4.2 + Django REST Framework
- **Base de données**: PostgreSQL (Supabase)
- **Authentication**: JWT
- **Temps réel**: Django Channels + Redis
- **Tâches asynchrones**: Celery + Redis

## Rôles utilisateurs

- **Serveur**: Prendre et transmettre les commandes
- **Cuisinier**: Accepter/rejeter commandes, demander des produits
- **Gérant**: Gérer les entrées/sorties de stock, valider les demandes
- **Manager**: Valider les mouvements de stock, générer des rapports
- **Auditeur**: Consulter les logs d'audit
- **Administrateur**: Gestion complète du système

## Installation

### Prérequis

- Python 3.10+
- PostgreSQL (ou compte Supabase)
- Redis (pour WebSocket et Celery)

### Étapes d'installation

1. **Cloner le projet**

```bash
cd project
```

2. **Créer un environnement virtuel**

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

3. **Installer les dépendances**

```bash
pip install -r requirements.txt
```

4. **Configurer les variables d'environnement**

Copier `.env.example` vers `.env` et remplir les valeurs:

```bash
cp .env.example .env
```

Éditer le fichier `.env`:

```env
# Database Configuration (Supabase PostgreSQL)
DB_NAME=votre_nom_de_base
DB_USER=votre_utilisateur
DB_PASSWORD=votre_mot_de_passe
DB_HOST=votre_host_supabase
DB_PORT=5432

# Django Settings
SECRET_KEY=votre-cle-secrete-django
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# JWT Settings
JWT_ACCESS_TOKEN_LIFETIME=60
JWT_REFRESH_TOKEN_LIFETIME=1440

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
```

5. **Créer les migrations**

```bash
python manage.py makemigrations
```

6. **Appliquer les migrations**

```bash
python manage.py migrate
```

7. **Créer les données de base (statuts, types, etc.)**

```bash
python manage.py shell
```

Puis dans le shell Python:

```python
from commandes.models import StatutCommande
from stocks.models import TypeMouvement, StatutMouvement, StatutDemande
from users.models import Role

# Créer les statuts de commande
StatutCommande.objects.create(nom='EN_ATTENTE')
StatutCommande.objects.create(nom='VALIDEE')
StatutCommande.objects.create(nom='REJETEE')
StatutCommande.objects.create(nom='CONFIRMEE')

# Créer les types de mouvement
TypeMouvement.objects.create(nom='ENTREE')
TypeMouvement.objects.create(nom='SORTIE')
TypeMouvement.objects.create(nom='SUPPRESSION')

# Créer les statuts de mouvement
StatutMouvement.objects.create(nom='EN_ATTENTE')
StatutMouvement.objects.create(nom='VALIDEE')
StatutMouvement.objects.create(nom='REJETEE')

# Créer les statuts de demande
StatutDemande.objects.create(nom='EN_ATTENTE')
StatutDemande.objects.create(nom='VALIDEE')
StatutDemande.objects.create(nom='REJETEE')

# Créer les rôles
Role.objects.create(nom='Serveur', description='Serveur du restaurant')
Role.objects.create(nom='Cuisinier', description='Cuisinier')
Role.objects.create(nom='Gérant', description='Gérant')
Role.objects.create(nom='Manager', description='Manager')
Role.objects.create(nom='Auditeur', description='Auditeur')
Role.objects.create(nom='Administrateur', description='Administrateur système')

exit()
```

8. **Créer un superutilisateur**

```bash
python manage.py createsuperuser
```

9. **Lancer le serveur de développement**

```bash
python manage.py runserver
```

L'API sera accessible à: `http://localhost:8000`

## Documentation API

Une fois le serveur lancé, la documentation interactive Swagger est disponible à:

```
http://localhost:8000/api/docs/
```

## Endpoints principaux

### Authentication
- `POST /api/auth/login/` - Connexion (obtenir token JWT)
- `POST /api/auth/refresh/` - Rafraîchir le token

### Utilisateurs
- `GET /api/users/users/` - Liste des utilisateurs
- `POST /api/users/users/` - Créer un utilisateur
- `GET /api/users/users/{id}/` - Détails d'un utilisateur
- `PUT /api/users/users/{id}/` - Modifier un utilisateur
- `DELETE /api/users/users/{id}/` - Supprimer un utilisateur
- `GET /api/users/users/me/` - Profil de l'utilisateur connecté
- `POST /api/users/users/{id}/change_password/` - Changer le mot de passe

### Commandes
- `GET /api/commandes/commandes/` - Liste des commandes
- `POST /api/commandes/commandes/` - Créer une commande
- `GET /api/commandes/commandes/{id}/` - Détails d'une commande
- `POST /api/commandes/commandes/{id}/accepter/` - Accepter une commande
- `POST /api/commandes/commandes/{id}/rejeter/` - Rejeter une commande
- `POST /api/commandes/commandes/{id}/marquer_prete/` - Marquer comme prête
- `POST /api/commandes/commandes/{id}/livrer/` - Livrer une commande
- `POST /api/commandes/commandes/{id}/annuler/` - Annuler une commande

### Stocks
- `GET /api/stocks/stocks/` - État des stocks
- `GET /api/stocks/stocks/alertes/` - Stocks en alerte
- `GET /api/stocks/produits/` - Liste des produits
- `POST /api/stocks/produits/` - Créer un produit

### Mouvements de stock
- `GET /api/stocks/mouvements/` - Liste des mouvements
- `POST /api/stocks/mouvements/` - Créer un mouvement
- `POST /api/stocks/mouvements/{id}/valider/` - Valider un mouvement
- `POST /api/stocks/mouvements/{id}/rejeter/` - Rejeter un mouvement

### Demandes de produits
- `GET /api/stocks/demandes/` - Liste des demandes
- `POST /api/stocks/demandes/` - Créer une demande
- `POST /api/stocks/demandes/{id}/valider/` - Valider une demande
- `POST /api/stocks/demandes/{id}/rejeter/` - Rejeter une demande

### Audit
- `GET /api/audit/logs/` - Logs d'audit
- `POST /api/audit/logs/export/` - Exporter les logs
- `GET /api/audit/rapports/` - Liste des rapports
- `POST /api/audit/rapports/` - Créer un rapport

## WebSocket pour notifications en temps réel

Pour recevoir des notifications en temps réel:

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/notifications/');

ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    console.log('Notification:', data.message);
};
```

## Lancer Redis (pour WebSocket et Celery)

```bash
# Installer Redis
# Windows: Télécharger depuis https://redis.io/download
# Linux: sudo apt-get install redis-server
# Mac: brew install redis

# Lancer Redis
redis-server
```

## Lancer Celery (pour tâches asynchrones)

Dans un nouveau terminal:

```bash
celery -A stock_management worker -l info
```

## Structure du projet

```
project/
├── stock_management/       # Configuration Django
├── users/                  # App gestion utilisateurs
├── commandes/             # App gestion commandes
├── stocks/                # App gestion stocks
├── audit/                 # App journalisation/audit
├── manage.py
├── requirements.txt
└── README.md
```

## Tests

Pour lancer les tests:

```bash
python manage.py test
```

## Production

Pour le déploiement en production:

1. Définir `DEBUG=False` dans `.env`
2. Configurer `ALLOWED_HOSTS` avec votre domaine
3. Générer une nouvelle `SECRET_KEY` sécurisée
4. Utiliser un serveur WSGI comme Gunicorn:

```bash
pip install gunicorn
gunicorn stock_management.wsgi:application --bind 0.0.0.0:8000
```

5. Utiliser Daphne pour WebSocket:

```bash
daphne -b 0.0.0.0 -p 8001 stock_management.asgi:application
```

6. Configurer un reverse proxy (Nginx) devant Gunicorn et Daphne

## Support

Pour toute question ou problème, consultez la documentation Django REST Framework:
- https://www.django-rest-framework.org/
- https://docs.djangoproject.com/

## Licence

Ce projet est développé pour Africa Global Logistics Bénin.
