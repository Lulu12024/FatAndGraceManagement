# 🍽️ FATE & GRÂCE — Plateforme de Gestion Restaurant
> *"Faire de sa passion, un métier"* · Bakery · Restaurant · Bar

Application PWA React complète pour la gestion des commandes et des stocks.  
**Tous les écrans sont branchés sur l'API Django avec fallback automatique en mode hors-ligne.**

---

## 🚀 Démarrage rapide

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer l'URL du backend
cp .env.example .env
# Éditer .env → REACT_APP_API_URL=http://votre-serveur/api

# 3. Lancer en développement
npm start
# → http://localhost:3000

# 4. Build de production
npm run build
```

---

## ⚙️ Variables d'environnement

```bash
# .env
REACT_APP_API_URL=http://localhost:8000/api   # URL de base de l'API Django
REACT_APP_WS_URL=ws://localhost:8000/ws       # URL WebSocket Django Channels
```

---

## 🔌 Endpoints API Django attendus

### Authentification
| Méthode | Endpoint                          | Body                              | Réponse              |
|---------|-----------------------------------|-----------------------------------|----------------------|
| POST    | `/api/auth/login/`                | `{ login, password }`             | `{ token, user }`    |
| POST    | `/api/auth/logout/`               | —                                 | 200                  |
| GET     | `/api/auth/me/`                   | —                                 | `User`               |
| POST    | `/api/auth/change-password/`      | `{ old_password, new_password }`  | 200                  |

### Tables
| Méthode | Endpoint                          | Body                                               | Réponse              |
|---------|-----------------------------------|----------------------------------------------------|----------------------|
| GET     | `/api/tables/`                    | —                                                  | `Table[]`            |
| GET     | `/api/tables/{id}/`               | —                                                  | `Table`              |
| POST    | `/api/tables/{id}/reserve/`       | —                                                  | `Table`              |
| POST    | `/api/tables/{id}/cancel/`        | —                                                  | `Table`              |
| POST    | `/api/tables/{id}/close/`         | —                                                  | `Table`              |
| POST    | `/api/tables/{id}/pay/`           | `{ mode_paiement, montant, pourboire }`            | `{ table, invoice }` |

**Serializer Table :**
```json
{ "id": 1, "num": "01", "capacite": 4, "status": "DISPONIBLE", "montant": 0 }
```
**Status values :** `DISPONIBLE | RÉSERVÉE | COMMANDES_PASSÉE | EN_SERVICE | EN_ATTENTE_PAIEMENT | PAYÉE`

### Commandes
| Méthode | Endpoint                          | Body                          | Réponse     |
|---------|-----------------------------------|-------------------------------|-------------|
| GET     | `/api/orders/?table_id=&status=`  | —                             | `Order[]`   |
| POST    | `/api/orders/`                    | `{ table_id, items, obs }`    | `Order`     |
| GET     | `/api/orders/{id}/`               | —                             | `Order`     |
| POST    | `/api/orders/{id}/accept/`        | `{ cuisinier_id }`            | `Order`     |
| POST    | `/api/orders/{id}/reject/`        | `{ motif }`                   | `Order`     |
| POST    | `/api/orders/{id}/ready/`         | —                             | `Order`     |
| POST    | `/api/orders/{id}/deliver/`       | —                             | `Order`     |
| POST    | `/api/orders/{id}/cancel/`        | `{ motif }`                   | `Order`     |

**Serializer Order :**
```json
{
  "id": "CMD-001", "table_id": 3, "table_num": "03",
  "serveur": "Aimé Dossou", "cuisinier": "Marco Houénou",
  "items": [{ "plat_id": 1, "nom": "Brochettes", "qte": 2, "prix": 4500 }],
  "status": "EN_ATTENTE_ACCEPTATION",
  "montant": 9000, "obs": "", "motif": "",
  "created_at": "2025-12-18T20:10:00Z"
}
```
**Status values :** `STOCKÉE | EN_ATTENTE_ACCEPTATION | EN_PRÉPARATION | EN_ATTENTE_LIVRAISON | LIVRÉE | ANNULÉE | REFUSÉE`

### Produits (Stock)
| Méthode | Endpoint                          | Body                                                       | Réponse      |
|---------|-----------------------------------|------------------------------------------------------------|--------------|
| GET     | `/api/products/?categorie=&search=` | —                                                        | `Product[]`  |
| POST    | `/api/products/`                  | `{ nom, categorie, qte, unite, seuil, peremption }`        | `Product`    |
| PUT     | `/api/products/{id}/`             | (mêmes champs)                                             | `Product`    |
| DELETE  | `/api/products/{id}/`             | —                                                          | 204          |
| GET     | `/api/products/categories/`       | —                                                          | `string[]`   |

### Mouvements de stock
| Méthode | Endpoint                              | Body                                           | Réponse     |
|---------|---------------------------------------|------------------------------------------------|-------------|
| GET     | `/api/movements/?type=&statut=`       | —                                              | `Movement[]`|
| POST    | `/api/movements/`                     | `{ produit_id, type, qte, justification }`     | `Movement`  |
| POST    | `/api/movements/{id}/validate/`       | —                                              | `Movement`  |
| POST    | `/api/movements/{id}/reject/`         | `{ motif }`                                    | `Movement`  |

**type :** `ENTRÉE | SORTIE | SUPPRESSION`  
**statut :** `EN_ATTENTE | VALIDÉE | REJETÉE`

### Factures
| Méthode | Endpoint                      | Réponse          |
|---------|-------------------------------|------------------|
| GET     | `/api/invoices/`              | `Invoice[]`      |
| GET     | `/api/invoices/{id}/`         | `Invoice`        |
| GET     | `/api/invoices/{id}/pdf/`     | Fichier PDF      |

### Utilisateurs
| Méthode | Endpoint                          | Body                                          | Réponse   |
|---------|-----------------------------------|-----------------------------------------------|-----------|
| GET     | `/api/users/`                     | —                                             | `User[]`  |
| POST    | `/api/users/`                     | `{ first_name, last_name, login, role }`      | `User`    |
| PUT     | `/api/users/{id}/`                | (mêmes champs)                                | `User`    |
| DELETE  | `/api/users/{id}/`                | —                                             | 204       |
| POST    | `/api/users/{id}/toggle/`         | —                                             | `User`    |
| POST    | `/api/users/{id}/reset-password/` | `{ new_password }`                            | 200       |

### Audit
| Méthode | Endpoint                              | Réponse     |
|---------|---------------------------------------|-------------|
| GET     | `/api/audit-logs/`                    | `Log[]`     |
| GET     | `/api/audit-logs/export/?format=csv`  | Fichier     |

### Rapports
| Méthode | Endpoint                          | Réponse          |
|---------|-----------------------------------|------------------|
| GET     | `/api/reports/dashboard/`         | Stats globales   |
| GET     | `/api/reports/orders/?period=day` | Stats commandes  |
| GET     | `/api/reports/stock/`             | Stats stock      |
| GET     | `/api/reports/kpi/?period=month`  | KPI              |
| GET     | `/api/reports/export/?type=orders&format=pdf` | Fichier |

### WebSocket (Django Channels)
```
ws://localhost:8000/ws/notifications/
```
**Messages attendus :**
```json
{ "type": "new_order",     "data": { "order_id": "CMD-001", "table_num": "03" } }
{ "type": "order_ready",   "data": { "order_id": "CMD-001" } }
{ "type": "stock_alert",   "data": { "message": "Crevettes: stock faible" } }
{ "type": "mvt_validated", "data": { "mvt_id": "MVT-001" } }
```

---

## 🔐 Authentification

Le token JWT est envoyé dans le header `Authorization: Bearer {token}`.  
En cas de 401, le token est effacé et l'utilisateur est redirigé vers la page de connexion.

---

## 📁 Structure du projet

```
src/
├── api/
│   ├── client.js       ← Fetch wrapper + gestion token + classes d'erreur
│   ├── auth.js         ← Authentification
│   ├── tables.js       ← Tables
│   ├── orders.js       ← Commandes
│   ├── stock.js        ← Produits & Mouvements
│   └── services.js     ← Factures, Utilisateurs, Audit, Rapports, Notifications
├── hooks/
│   └── index.js        ← useToast, useApi, useOfflineDetect, handleApiError
├── mock/
│   └── index.js        ← Données de démo (fallback hors-ligne)
├── styles/
│   └── tokens.js       ← Design tokens, couleurs, helpers, CSS global
├── App.jsx             ← Toute l'UI (Login, Dashboard, Tables, Cuisine, Stock, etc.)
└── index.js            ← Point d'entrée React + Service Worker
```

---

## 🎨 Design System

| Élément | Valeur |
|---------|--------|
| Fond principal | `#07060A` (Nuit profonde) |
| Or principal | `#C9A84C` |
| Or clair | `#E2C478` |
| Texte | `#EDE4D0` (Crème) |
| Typographie titre | Playfair Display |
| Typographie corps | Raleway |

---

## 🔐 Rôles et accès

| Rôle | Accès |
|------|-------|
| Serveur | Tables, commandes (prise et livraison) |
| Cuisinier | Vue cuisine, demande de stock |
| Gérant | Tables, commandes, facturation, stock |
| Gestionnaire Stock | Stock, entrées, sorties, rapports |
| Manager | Validation stock, KPI, audit, équipe |
| Auditeur | Lecture seule sur tout |
| Administrateur | Accès total |

---

## 📱 PWA & Mode hors-ligne

- **Mode hors-ligne** : Toutes les actions tombent sur les données mock si le serveur est inaccessible.
- **Service Worker** : Cache les assets statiques, ne met PAS en cache les appels `/api/`.
- **WebSocket** : Tentative de connexion, fail silencieux si indisponible.
- **Détection** : Bannière orange affichée quand `navigator.onLine === false`.

---

## 🛠️ Stack recommandée (Backend Django)

```
Django 4.2+ · Django REST Framework · PostgreSQL 15+ 
Django Channels (WebSocket) · Simple JWT · django-cors-headers
```

---

*FATE & GRÂCE · DSI Africa Global Logistics Bénin · Décembre 2025*
