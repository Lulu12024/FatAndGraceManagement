# 🎯 Guide de démarrage rapide - API Django Gestion des Stocks

## ✅ État du projet

Votre API Django est maintenant **100% fonctionnelle** et prête à être utilisée.

---

## 🚀 Pour démarrer le projet

### 1. Activer l'environnement virtuel
```bash
# Windows
env\Scripts\activate

# Linux/Mac
source env/bin/activate
```

### 2. Lancer les migrations (déjà appliquées)
```bash
python manage.py migrate
```

### 3. Initialiser les données de base (déjà effectué)
```bash
python manage.py init_data.py
```

### 4. Lancer le serveur Django
```bash
python manage.py runserver
```

L'API sera accessible à: **http://localhost:8000**

---

## 🔑 Authentification

### Obtenir un token JWT
```bash
POST /api/auth/login/
Content-Type: application/json

{
  "login": "admin1",
  "password": "password123"
}
```

**Réponse:**
```json
{
  "user": { ... },
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "message": "Connexion réussie."
}
```

### Utiliser le token
Ajoutez le header à chaque requête:
```
Authorization: Bearer <votre_access_token>
```

---

## 📚 Endpoints principaux

### Utilisateurs
- `GET/POST /api/users/users/` - Gestion des utilisateurs
- `POST /api/users/login/` - Authentification
- `POST /api/users/refresh/` - Rafraîchir le token

### Commandes
- `GET/POST /api/commandes/commandes/` - Gestion des commandes
- `POST /api/commandes/commandes/{id}/accepter/` - Accepter une commande
- `POST /api/commandes/commandes/{id}/livrer/` - Livrer une commande
- `POST /api/commandes/commandes/{id}/annuler/` - Annuler une commande

### Stocks
- `GET/POST /api/stocks/produits/` - Gestion des produits
- `GET /api/stocks/stocks/` - Consulter les stocks
- `GET /api/stocks/stocks/alertes/` - Voir les stocks en alerte
- `GET/POST /api/stocks/mouvements/` - Mouvements de stock

---

## 🔒 Rôles disponibles

1. **Serveur** - Prend les commandes, les livre
2. **Cuisinier** - Accepte/rejette les commandes
3. **Gérant** - Valide les mouvements, paiements
4. **Gestionnaire de stock** - Gère les stocks
5. **Manager** - Valide les opérations, KPI
6. **Auditeur** - Consulte les logs
7. **Administrateur** - Gestion complète

---

## 📊 Données d'initialisation

Le projet est livré avec:
- ✅ 6 statuts de commande
- ✅ 3 types de mouvement de stock
- ✅ 7 rôles utilisateurs
- ✅ 10 unités de mesure (kg, L, etc.)
- ✅ 10 tables du restaurant (T01-T10)

---

## 🔧 Variables d'environnement

Créez un fichier `.env` à la racine:

```env
# Django
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Base de données PostgreSQL
DB_NAME=stock_db
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432

# Redis (pour Celery et Channels)
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_ACCESS_TOKEN_LIFETIME=60
JWT_REFRESH_TOKEN_LIFETIME=1440

# Admin
ADMIN_USERNAME=admin1
ADMIN_PASSWORD=password123
ADMIN_EMAIL=admin@restaurant.com
ADMIN_FIRSTNAME=Admin
ADMIN_LASTNAME=System
```

---

## 📝 Cas d'usage typiques

### Créer une commande
```python
POST /api/commandes/commandes/
{
  "table": 1,
  "serveur": 1,
  "statut": 1,
  "plats": [
    {"plat_id": 1, "quantite": 2},
    {"plat_id": 3, "quantite": 1}
  ]
}
```

### Accepter une commande (Cuisinier)
```python
POST /api/commandes/commandes/1/accepter/
```

### Demander un produit (Cuisinier)
```python
POST /api/stocks/demandes/
{
  "produit": 1,
  "quantite": 5,
  "justification": "Pour la préparation"
}
```

### Valider un mouvement de stock (Manager)
```python
POST /api/stocks/mouvements/1/valider/
```

---

## 🧪 Tests

### Avec Postman/Insomnia
Importez la collection OpenAPI:
```bash
python manage.py spectacular --file schema.yml
```

### Avec curl
```bash
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/stocks/stocks/
```

### Avec Python requests
```python
import requests

headers = {"Authorization": f"Bearer {token}"}
response = requests.get("http://localhost:8000/api/stocks/stocks/", headers=headers)
print(response.json())
```

---

## 📋 Documentation

- **API Guide**: `API_GUIDE.md`
- **Corrections appliquées**: `CORRECTIONS_APPLIED.md`
- **Changelog**: `CHANGELOG.md`

---

## ⚠️ Important

1. **Configuration PostgreSQL** - Le projet est configuré pour PostgreSQL
   ```bash
   # Installer PostgreSQL si nécessaire
   # Créer une BD: createdb stock_db
   ```

2. **Redis** - Requis pour Celery et Channels
   ```bash
   # Lancer Redis
   redis-cli  # ou redis-server sur Windows
   ```

3. **Variable d'environnement** - Charger le fichier `.env`:
   ```bash
   # Windows PowerShell
   Get-Content .env | ForEach-Object { if ($_ -notmatch '^\s*$|^\s*#') { $null = $_ -match '^([^=]+)=(.*)$'; [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "User") } }
   
   # Linux/Mac
   export $(cat .env | xargs)
   ```

---

## 🐛 Dépannage

### Erreur: "Role matching query does not exist"
```bash
# Réappliquer les migrations
python manage.py migrate --fake
python manage.py migrate
python init_data.py
```

### Erreur de connexion PostgreSQL
```bash
# Vérifier que PostgreSQL est lancé et la BD existe
psql -U postgres -d stock_db -c "SELECT 1"
```

### Erreur Redis
```bash
# S'assurer que Redis est lancé
redis-cli ping  # devrait retourner PONG
```

---

## ✅ Checklist de vérification

- [x] `python manage.py check` - ✅ Aucune erreur
- [x] `python manage.py migrate` - ✅ Migrations appliquées
- [x] `python init_data.py` - ✅ Données initialisées
- [x] `python manage.py runserver` - ✅ Serveur démarre
- [x] JWT fonctionnel - ✅ Authentification opérationnelle
- [x] Tous les endpoints testés - ✅ Prêts

---

## 📞 Support

Pour plus d'informations, consultez:
- `CORRECTIONS_APPLIED.md` - Détail de toutes les corrections
- `API_GUIDE.md` - Guide complet de l'API
- `CHANGELOG.md` - Historique des modifications

---

**Dernière vérification:** 10 février 2026 ✅
**Statut:** Prêt pour la développement et les tests
