# TODO : Ajouter la collection `events` et un serveur HTTP minimal

## Architecture actuelle

Le backend est une **librairie CLI** sans serveur HTTP :
- `flat-file-db.js` : CRUD sur fichiers YAML + LokiJS
- Aucun serveur Express - les workflows sont des scripts Node.js

## Problème

Les workflows frontend utilisent `fetch('/api/events')` mais **il n'y a pas de serveur HTTP** pour répondre à ces requêtes.

## Solution : Ajouter un serveur Express minimaliste

Créer un serveur HTTP léger qui expose les méthodes de `flat-file-db.js` via REST API.

### Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `backend/server.js` | **NOUVEAU** - Serveur Express minimal (~50 lignes) |
| `backend/routes/crud.js` | **NOUVEAU** - Route générique CRUD pour toutes les collections |
| `backend/lib/flat-file-db.js` | Modifier : ajouter `events` dans `initCollections()` |

### Architecture cible

```
Frontend (Alpine.js)          Backend
     |                              |
 fetch('/api/events')  ─────▶  server.js (Express)
     |                              |
     |                         routes/crud.js
     |                              |
     |                         lib/flat-file-db.js
     |                              |
     |                          data/events/*.yml
```

### server.js (exemple minimal)

```javascript
const express = require('express');
const FlatFileDB = require('./lib/flat-file-db');

const app = express();
app.use(express.json());

// Init DB
const db = new FlatFileDB('./data');
await db.loadAll();

// Route CRUD générique
app.get('/api/:collection', async (req, res) => {
  const { collection } = req.params;
  const results = await db.search(collection, req.query);
  res.json({ success: true, data: results });
});

app.post('/api/:collection', async (req, res) => {
  const { collection } = req.params;
  const data = await db.create(collection, req.body);
  res.json({ success: true, data });
});

app.patch('/api/:collection/:id', async (req, res) => {
  const { collection, id } = req.params;
  const data = await db.update(collection, id, req.body);
  res.json({ success: true, data });
});

app.listen(3000, () => console.log('Server on port 3000'));
```

## Collection events à ajouter

### flat-file-db.js - Ajouter dans initCollections()

```javascript
this.collections.events = this.db.addCollection('events', {
  indices: ['id', 'type', 'created_at', 'user_id', 'read'],
  unique: ['id']
});
```

### Schéma YAML events

```yaml
# data/events/event_001.yml
id: "event_001"
type: "event"

user_id: "user_123"
event_type: "sync"  # sync | payment | relance | alert | import

# Contenu
title: "Synchronisation effectuée"
description: "3 nouvelles factures importées depuis ADTI"
icon: "fa-sync-alt"

# Contexte additionnel
metadata:
  imported_count: 3
  source: "ADTI"
  facture_ids:
    - "imp_001"
    - "imp_002"

# Statut
read: false

# Timestamps
created_at: "2026-07-10T09:45:00Z"
```

## Routes API pour events

Une fois le serveur Express ajouté, ces routes fonctionneront :

| Route | Méthode | Description |
|---------|---------|-------------|
| `/api/events?limit=10` | GET | Liste des events (filtre auto par user_id côté serveur) |
| `/api/events?read=false` | GET | Events non lus uniquement |
| `/api/events` | POST | Créer un event |
| `/api/events/:id` | PATCH | Modifier un event (ex: marquer comme lu) |
| `/api/events/mark-read` | POST | Marquer tous les events comme lus |

## Workflows frontend impactés

Ces workflows attendent un serveur HTTP (à vérifier après ajout du serveur) :

| Workflow | Route utilisée |
|----------|---------------|
| `dashboard/initial-load.md` | `GET /api/events?limit=10` |
| `dashboard/clear-events.md` | `POST /api/events/mark-read` |
| `evenements/initial-load.md` | `GET /api/events?limit=50` |
| `evenements/mark-as-read.md` | `PATCH /api/events/:id` |
| `evenements/mark-all-read.md` | `POST /api/events/mark-read` |
| `evenements/filter-unread.md` | `GET /api/events?read=false` |

## Gestion par utilisateur (isolation)

**user_id :** Chaque event est lié à un utilisateur
**read :** Statut lu/non lu persistant

**Isolation dans les routes :**
```javascript
// Middleware qui ajoute user_id aux filtres
app.use((req, res, next) => {
  req.query.user_id = req.user.id; // depuis JWT
  next();
});
```

## Alternative (sans serveur)

Si ajouter Express n'est pas souhaitable :
- Utiliser `localStorage` pour les events (perdu au refresh)
- Ou créer un fichier JSON simple que le frontend lit directement (limité)

## Dépendances à ajouter

```json
{
  "dependencies": {
    "express": "^4.18.0"
  }
}
```

## Priorité

**HIGH** - Sans serveur HTTP, les workflows frontend ne peuvent pas fonctionner.
