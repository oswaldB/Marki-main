# Guide d'adaptation PouchDB/CouchDB

## Résumé des changements

Ce document explique comment le workflow `initial-load` a été adapté pour utiliser **PouchDB** avec réplication live vers **CouchDB**.

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Alpine.js     │────▶│   PouchDB       │◄───▶│   CouchDB       │
│   (Frontend)    │     │   (IndexedDB)   │     │   (Serveur)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │ Sync Live            │
         │                       │ (bidirectionnelle)   │
         │                       │                      │
    Read/Write              Conflict              API
    (Local-first)          Resolution           Externe
```

---

## Règles appliquées

### 1. ✅ Pattern Local-First
- **Avant** : `fetch('/api/impayes')` → Attente réponse serveur
- **Après** : `db.query('impayes/by_suspension')` → Lecture instantanée depuis IndexedDB

### 2. ✅ Réplication Live Bidirectionnelle
```javascript
const sync = localDB.sync(remoteDB, {
  live: true,
  retry: true,
  conflicts: true  // Gestion des conflits activée
});
```

### 3. ✅ Gestion des Conflits
```javascript
// Lecture avec flag conflicts: true
const doc = await db.get(id, { conflicts: true });

// Résolution automatique
if (doc._conflicts) {
  await resolveConflict(db, id);
}
```

### 4. ✅ Design Documents (Vues Mango)
```javascript
// _design/impayes
{
  views: {
    by_suspension: {
      map: function(doc) {
        if (doc.type === 'impaye' && doc.is_suspended) {
          emit(doc.blacklist_motif, doc);
        }
      }
    }
  }
}
```

### 5. ✅ IDs CouchDB et Révisions
- `_id` : Identifiant unique (ex: `impaye_123456789`)
- `_rev` : Révision pour le contrôle de concurrence (ex: `1-abc123`)

### 6. ✅ État de Synchronisation
- `syncStatus` : `initializing` | `online` | `offline` | `syncing` | `error`
- Événements : `active`, `paused`, `denied`, `complete`, `error`

### 7. ✅ Gestion Offline/Online
```javascript
.on('paused', (err) => {
  // Paused = soit à jour, soit offline
  syncState.status = navigator.onLine ? 'online' : 'offline';
})
```

---

## Comparaison Code

### Avant (API REST)
```javascript
// Charger les données
async loadData() {
  const response = await fetch('/api/impayes?statut=impaye');
  this.factures = await response.json();
}

// Modifier
async update(id, data) {
  const response = await fetch(`/api/impayes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  return response.json();
}
```

### Après (PouchDB)
```javascript
// Charger les données (local-first)
async loadData() {
  const result = await this.db.query('impayes/by_statut', {
    key: 'impaye',
    include_docs: true
  });
  this.factures = result.rows.map(r => r.doc);
}

// Modifier (local, puis réplication auto)
async update(id, updates) {
  const doc = await this.db.get(id);
  const response = await this.db.put({ ...doc, ...updates });
  return response; // { ok: true, id, rev }
}
```

---

## Installation Dépendances

```bash
# Via CDN (développement)
<script src="https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.min.js"></script>

# Via npm (production)
npm install pouchdb
npm install pouchdb-find  # Pour Mango queries
```

---

## Configuration CouchDB

### 1. Activer CORS
```bash
curl -X PUT http://admin:password@localhost:5984/_config/httpd/enable_cors -d '"true"'
curl -X PUT http://admin:password@localhost:5984/_config/cors/origins -d '"*"'
```

### 2. Créer la base
```bash
curl -X PUT http://admin:password@localhost:5984/adti_impayes
```

---

## Points d'attention

### ⚠️ Conflits de révision (409)
Toujours gérer les erreurs 409 (Document update conflict):
```javascript
try {
  await db.put(doc);
} catch (err) {
  if (err.status === 409) {
    // Récupérer la dernière révision et réessayer
    const latest = await db.get(doc._id);
    doc._rev = latest._rev;
    await db.put(doc);
  }
}
```

### ⚠️ Taille de la base locale
- Utiliser `db.compact()` régulièrement
- Configurer `revs_limit` pour limiter l'historique
- Utiliser `attachments: false` dans les requêtes si pas besoin

### ⚠️ Permissions
- CouchDB nécessite une authentification
- Utiliser des tokens JWT ou auth basic
- Configurer `_security` document pour les droits d'accès

---

## Fichiers créés

| Fichier | Description |
|---------|-------------|
| `initial-load-pouchdb.js` | Workflow complet avec PouchDB |
| `README-pouchdb.md` | Ce document |

---

## Ressources

- [PouchDB Documentation](https://pouchdb.com/guides/)
- [CouchDB Replication](https://docs.couchdb.org/en/stable/replication/intro.html)
- [Conflict Resolution](https://pouchdb.com/guides/conflicts.html)
