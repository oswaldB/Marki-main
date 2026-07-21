# Guide d'adaptation des Workflows pour PouchDB + CouchDB

## Vue d'ensemble

Ce guide explique comment adapter n'importe quel workflow frontend pour utiliser **PouchDB** avec réplication live vers **CouchDB**, en suivant le pattern **local-first**.

## Règles importantes (résumé)

| # | Règle | Implémentation |
|---|-------|----------------|
| 1 | PouchDB local + réplication live | `db.sync(remoteDB, {live: true, retry: true})` |
| 2 | Remplacer API par PouchDB | `db.get()`, `db.put()`, `db.query()` |
| 3 | Sync bidirectionnelle | `db.sync()` ou `db.replicate.to/from()` |
| 4 | Gestion des conflits | `{conflicts: true}` + résolution manuelle |
| 5 | Design documents | `_design/` pour vues Mango |
| 6 | Pattern local-first | Lecture locale, écriture locale → réplication |
| 7 | Offline/online | Events `paused`/`active` + `navigator.onLine` |
| 8 | Structure Alpine.js | `x-data`, méthodes, propriétés calculées |
| 9 | Propriété `syncStatus` | `'initial'`, `'syncing'`, `'paused'`, `'error'`, `'complete'` |
| 10 | IDs et révisions CouchDB | `_id`, `_rev` sur tous les documents |

---

## Fichiers fournis

```
workflows/frontend/shared/
├── pouchdb-workflow-template.js      # Template générique complet
├── pouchdb-example-usage.html        # Exemple concret (impayés)
└── POUCHDB-WORKFLOW-GUIDE.md         # Ce guide
```

---

## Utilisation rapide

### 1. Copier le template

```javascript
// Votre workflow adapté
function monWorkflowPouchDB() {
  // Hériter du template
  const base = pouchDBWorkflowManager();
  
  return {
    ...base,
    
    // Personnaliser la config
    init() {
      COUCHDB_CONFIG.dbName = 'ma_collection';
      return base.init.call(this);
    },
    
    // Ajouter vos méthodes spécifiques
    mesMethodes() {
      // ...
    }
  };
}
```

### 2. Adapter le HTML

```html
<div x-data="monWorkflowPouchDB()" x-init="init()">
  <!-- Indicateur de sync (RÈGLE #9) -->
  <div :class="syncStatusClass" :title="syncStatusLabel"></div>
  
  <!-- Votre contenu -->
</div>
```

---

## Détails techniques

### Configuration CouchDB

```javascript
const COUCHDB_CONFIG = {
  url: 'https://admin:admin@monserveur.com/data',
  dbName: 'ma_base',           // ← Adapter
  options: {
    live: true,                // Réplication continue
    retry: true,               // Reconnexion auto
    heartbeat: 10000,        // Ping toutes les 10s
    timeout: 30000           // Timeout 30s
  }
};
```

### Design Documents (Vues Mango)

```javascript
const DESIGN_DOCS = [
  {
    _id: '_design/mavue',
    views: {
      by_type: {
        map: function(doc) {
          if (doc.type === 'montype') {
            emit(doc._id, doc);
          }
        }.toString()
      },
      stats: {
        map: function(doc) { emit('total', 1); }.toString(),
        reduce: '_count'
      }
    }
  }
];
```

### Opérations CRUD (RÈGLE #2)

#### Lecture (local-first - RÈGLE #6)

```javascript
// Depuis PouchDB local (pas d'appel réseau)
const doc = await this.localDB.get(id, { conflicts: true });

// Depuis une vue Mango
const result = await this.localDB.query('mavue/by_type', {
  include_docs: true,
  conflicts: true  // Détecter les conflits
});
```

#### Écriture (local-first - RÈGLE #6)

```javascript
// Toujours écrire en local d'abord
const result = await this.localDB.put({
  _id: 'doc_' + Date.now(),  // ID CouchDB (RÈGLE #10)
  type: 'montype',
  ...data,
  updatedAt: new Date().toISOString()
});
// La réplication live envoie vers CouchDB automatiquement
```

#### Mise à jour (avec révision - RÈGLE #10)

```javascript
const doc = await this.localDB.get(id);
await this.localDB.put({
  ...doc,
  ...updates,
  _rev: doc._rev  // Révision obligatoire (RÈGLE #10)
});
```

### Gestion des conflits (RÈGLE #4)

```javascript
async handleConflict(docId, localUpdates) {
  const doc = await this.localDB.get(docId, { conflicts: true });
  const conflictRevs = doc._conflicts || [];
  
  // Récupérer les versions en conflit
  const conflictingDocs = await Promise.all(
    conflictRevs.map(rev => this.localDB.get(docId, { rev }))
  );
  
  // Fusionner (stratégie personnalisée)
  const merged = this.mergeConflicts(doc, conflictingDocs, localUpdates);
  
  // Supprimer les anciennes révisions
  for (const rev of conflictRevs) {
    await this.localDB.remove(docId, rev);
  }
  
  // Sauvegarder la version fusionnée
  await this.localDB.put({ ...merged, _rev: doc._rev });
}
```

### États de synchronisation (RÈGLE #9)

```javascript
this.syncStatus = 'initial'  // Initialisation
this.syncStatus = 'syncing'  // Sync en cours
this.syncStatus = 'paused'   // En pause (offline ou à jour)
this.syncStatus = 'error'    // Erreur
this.syncStatus = 'complete' // Sync terminée (si live: false)
```

### Indicateur visuel de sync

```html
<div 
  class="w-3 h-3 rounded-full"
  :class="syncStatusClass"
  :title="syncStatusLabel"
></div>
<span x-text="syncStatusLabel"></span>
<span x-text="isOnline ? '🟢 En ligne' : '🔴 Hors ligne'"></span>
```

---

## Exemple complet

Voir `pouchdb-example-usage.html` pour un exemple fonctionnel avec :

- Tableau de données avec tri et filtrage
- Modal création/édition
- Indicateur de sync en temps réel
- Gestion des conflits
- Mode hors ligne

---

## Migration d'un workflow existant

### Avant (API REST)

```javascript
async loadData() {
  const response = await fetch('/api/items');
  this.items = await response.json();
}

async saveItem(data) {
  const response = await fetch('/api/items', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return await response.json();
}
```

### Après (PouchDB local-first)

```javascript
async loadData() {
  // Lecture depuis PouchDB local (RÈGLE #6)
  const result = await this.localDB.query('myview/all', {
    include_docs: true
  });
  this.items = result.rows.map(row => row.doc);
}

async saveItem(data) {
  // Écriture locale d'abord (RÈGLE #6)
  const result = await this.localDB.put({
    _id: this.generateId(),
    ...data,
    createdAt: new Date().toISOString()
  });
  // La réplication live sync vers CouchDB automatiquement
  return result;
}
```

---

## Bonnes pratiques

1. **Toujours utiliser `conflicts: true`** dans les requêtes pour détecter les conflits
2. **Générer des IDs uniques** avec préfixe (ex: `impaye_${timestamp}_${random}`)
3. **Ne jamais modifier `_rev`** manuellement, toujours récupérer le document d'abord
4. **Gérer les erreurs 409** (conflit de révision) explicitement
5. **Mettre à jour l'UI après chaque opération** car la sync est asynchrone
6. **Utiliser `type` sur tous les documents** pour filtrer dans les vues

---

## Ressources

- [Documentation PouchDB](https://pouchdb.com/guides/)
- [Replication CouchDB](https://docs.couchdb.org/en/stable/replication/intro.html)
- [Conflicts CouchDB](https://docs.couchdb.org/en/stable/conflicts.html)
