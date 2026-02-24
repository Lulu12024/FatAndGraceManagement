# Guide d'utilisation de l'API

## Authentification

### Obtenir un token JWT

**Endpoint**: `POST /api/auth/login/`

**Payload**:
```json
{
  "login": "votre_login",
  "password": "votre_mot_de_passe"
}
```

**Réponse**:
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### Utiliser le token

Pour toutes les requêtes suivantes, incluez le header:
```
Authorization: Bearer <votre_access_token>
```

### Rafraîchir le token

**Endpoint**: `POST /api/auth/refresh/`

**Payload**:
```json
{
  "refresh": "votre_refresh_token"
}
```

## Exemples d'utilisation

### 1. Créer un utilisateur (Admin uniquement)

**Endpoint**: `POST /api/users/users/`

```json
{
  "login": "serveur1",
  "password": "password123",
  "password_confirm": "password123",
  "first_name": "Jean",
  "last_name": "Dupont",
  "date_de_naissance": "1990-05-15",
  "sexe": "M",
  "email": "jean.dupont@restaurant.com",
  "date_embauche": "2024-01-10",
  "role": 1,
  "permissions": []
}
```

### 2. Créer une commande (Serveur)

**Endpoint**: `POST /api/commandes/commandes/`

```json
{
  "table": "Table 5",
  "description": "Commande pour 4 personnes",
  "serveur": 2,
  "plats": [
    {
      "plat_id": 1,
      "quantite": 2
    },
    {
      "plat_id": 3,
      "quantite": 1
    }
  ]
}
```

### 3. Accepter une commande (Cuisinier)

**Endpoint**: `POST /api/commandes/commandes/{id}/accepter/`

Pas de payload nécessaire.

### 4. Rejeter une commande (Cuisinier)

**Endpoint**: `POST /api/commandes/commandes/{id}/rejeter/`

```json
{
  "motif": "Ingrédients manquants pour ce plat"
}
```

### 5. Marquer une commande comme prête (Cuisinier)

**Endpoint**: `POST /api/commandes/commandes/{id}/marquer_prete/`

Pas de payload nécessaire.

### 6. Livrer une commande (Serveur)

**Endpoint**: `POST /api/commandes/commandes/{id}/livrer/`

Pas de payload nécessaire.

### 7. Créer un produit

**Endpoint**: `POST /api/stocks/produits/`

```json
{
  "nom": "Tomates",
  "categorie": "Légumes",
  "description": "Tomates fraîches",
  "seuil_alerte": 10,
  "unite": 1
}
```

### 8. Créer un mouvement d'entrée de stock (Gérant)

**Endpoint**: `POST /api/stocks/mouvements/`

```json
{
  "type_mouvement": 1,
  "quantite": 50,
  "justification": "Livraison fournisseur XYZ",
  "produit": 1,
  "demandeur": 3
}
```

### 9. Valider un mouvement de stock (Manager)

**Endpoint**: `POST /api/stocks/mouvements/{id}/valider/`

Pas de payload nécessaire.

### 10. Rejeter un mouvement de stock (Manager)

**Endpoint**: `POST /api/stocks/mouvements/{id}/rejeter/`

```json
{
  "motif_rejet": "Quantité incorrecte, vérifier avec le fournisseur"
}
```

### 11. Créer une demande de produit (Cuisinier)

**Endpoint**: `POST /api/stocks/demandes/`

```json
{
  "justification": "Préparation du plat du jour",
  "quantite": 5,
  "produit": 1,
  "demandeur": 4,
  "commande": 10
}
```

### 12. Valider une demande de produit (Gérant)

**Endpoint**: `POST /api/stocks/demandes/{id}/valider/`

Pas de payload nécessaire.

### 13. Consulter les stocks en alerte

**Endpoint**: `GET /api/stocks/stocks/alertes/`

### 14. Exporter les logs d'audit

**Endpoint**: `POST /api/audit/logs/export/`

```json
{
  "format": "CSV",
  "date_debut": "2024-01-01",
  "date_fin": "2024-12-31"
}
```

## Filtres disponibles

### Commandes
- Filtrer par statut: `?statut=1`
- Filtrer par serveur: `?serveur=2`
- Filtrer par cuisinier: `?cuisinier=3`
- Filtrer par table: `?table=Table 5`
- Recherche: `?search=pizza`

### Stocks
- Filtrer par produit: `?produit=1`
- Recherche: `?search=tomate`

### Mouvements de stock
- Filtrer par type: `?type_mouvement=1`
- Filtrer par statut: `?statut=2`
- Filtrer par produit: `?produit=1`
- Filtrer par demandeur: `?demandeur=3`

### Logs d'audit
- Filtrer par utilisateur: `?user=1`
- Filtrer par action: `?action=CREATE`
- Filtrer par date: `?date_action=2024-01-15`
- Recherche: `?search=commande`

## Pagination

Toutes les listes sont paginées avec 20 éléments par page par défaut.

**Paramètres**:
- `?page=2` - Page suivante
- `?page_size=50` - Modifier la taille de la page

**Réponse paginée**:
```json
{
  "count": 100,
  "next": "http://localhost:8000/api/commandes/commandes/?page=2",
  "previous": null,
  "results": [...]
}
```

## Codes de statut HTTP

- `200 OK` - Requête réussie
- `201 Created` - Ressource créée avec succès
- `400 Bad Request` - Erreur de validation
- `401 Unauthorized` - Token manquant ou invalide
- `403 Forbidden` - Permissions insuffisantes
- `404 Not Found` - Ressource non trouvée
- `500 Internal Server Error` - Erreur serveur

## WebSocket - Notifications en temps réel

### Connexion

```javascript
const token = 'votre_access_token';
const ws = new WebSocket(`ws://localhost:8000/ws/notifications/?token=${token}`);

ws.onopen = function() {
    console.log('Connecté aux notifications');
};

ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    console.log('Notification reçue:', data.message);
    // Afficher une notification à l'utilisateur
};

ws.onclose = function() {
    console.log('Déconnecté');
};

ws.onerror = function(error) {
    console.error('Erreur WebSocket:', error);
};
```

### Types de notifications

- Nouvelle commande pour les cuisiniers
- Commande prête pour les serveurs
- Nouvelle demande d'entrée/sortie pour les managers
- Demande de produit pour les gérants
- Alertes de stock faible

## Bonnes pratiques

1. **Toujours utiliser HTTPS en production**
2. **Stocker les tokens de manière sécurisée** (pas en localStorage)
3. **Rafraîchir le token avant expiration**
4. **Gérer les erreurs 401** et rediriger vers login
5. **Implémenter un mécanisme de retry** pour les requêtes échouées
6. **Logger les erreurs côté client** pour debugging

## Exemples avec différents langages

### Python (requests)

```python
import requests

BASE_URL = 'http://localhost:8000/api'

# Login
response = requests.post(f'{BASE_URL}/auth/login/', json={
    'login': 'admin',
    'password': 'password123'
})
token = response.json()['access']

# Créer une commande
headers = {'Authorization': f'Bearer {token}'}
response = requests.post(f'{BASE_URL}/commandes/commandes/',
    headers=headers,
    json={
        'table': 'Table 1',
        'serveur': 1,
        'plats': [{'plat_id': 1, 'quantite': 2}]
    }
)
```

### JavaScript (Fetch API)

```javascript
const BASE_URL = 'http://localhost:8000/api';

// Login
const login = async (username, password) => {
    const response = await fetch(`${BASE_URL}/auth/login/`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({login: username, password: password})
    });
    const data = await response.json();
    return data.access;
};

// Créer une commande
const createCommande = async (token, commandeData) => {
    const response = await fetch(`${BASE_URL}/commandes/commandes/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(commandeData)
    });
    return await response.json();
};
```

### cURL

```bash
# Login
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"login":"admin","password":"password123"}'

# Créer une commande
curl -X POST http://localhost:8000/api/commandes/commandes/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "table": "Table 1",
    "serveur": 1,
    "plats": [{"plat_id": 1, "quantite": 2}]
  }'
```
