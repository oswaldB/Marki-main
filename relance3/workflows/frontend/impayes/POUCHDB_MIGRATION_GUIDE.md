# Guide de Migration PouchDB - Workflow Impayés

Ce document explique comment le workflow `impayes-initial-load` a été adapté pour utiliser PouchDB avec réplication live vers CouchDB.

## Récapitulatif des Règles Implémentées

| Règle | Description | Implémentation |
|-------|-------------|----------------|
| **#1** | PouchDB côté frontend avec réplication live | `this.localDB = new PouchDB(dbName)` + `db.sync()` avec `live: true` |
| **#2** | Remplacer les appels API par PouchDB | `db.query()`, `db.get()`, `db.put()`, `db.find()` au lieu de `fetch()` |
| **#3** | Synchronisation bidirectionnelle | `this.localDB.sync(this.remoteDB, { live: true, retry: true })` |
| **#4** | Gestion des conflits | `{ conflicts: true }` dans toutes les requêtes + propriété `this.conflicts` |
| **#5** | _design documents pour vues Mango | `DESIGN_DOCS` avec vues `by_*` pour indexation et requêtes |
| **#6** | Pattern local-first | Lecture depuis `localDB`, écriture vers `localDB` (qui réplique automatiquement) |
| **#7** | États offline/online | Events `online`/`offline` + handlers `paused`/`active` de la sync |
| **#8** | Structure Alpine.js conservée | `return { ... }` avec méthodes et propriétés calculées |
| **#9** | Propriété `syncStatus` | `'initial' \| 'syncing' \| 'paused' \| 'error' \| 'complete'` avec UI |
| **#10** | IDs et révisions CouchDB | Utilisation de `_id` et `_rev` partout, pas d'`id` artificiel |

---

## Comparaison : Avant / Après

### Chargement des données

**AVANT (API REST)**
```javascript
// GET /api/impayes?facture_soldee=0
const response = await fetch('/api/impayes?facture_soldee=0');
const data = await response.json();
this.impayes = data.impayes;
```

**APRÈS (PouchDB)**
```javascript
// RÈGLE #2: db.query avec vue Mango
// RÈGLE #4: include_docs et conflicts pour détecter les conflits
const result = await this.localDB.query('impayes/by_soldee', {
  key: 0,
  include_docs: true,
  conflicts: true
});

// RÈGLE #10: Mapper avec _id et _rev CouchDB
this.impayes = result.rows.map(row => ({
  ...row.doc,
  id: row.doc._id,
  rev: row.doc._rev,
  hasConflicts: !!(row.doc._conflicts && row.doc._conflicts.length > 0)
}));
```

### Écriture de données

**AVANT (API REST)**
```javascript
// POST /api/impayes/:id
await fetch(`/api/impayes/${id}`, {
  method: 'POST',
  body: JSON.stringify(data)
});
```

**APRÈS (PouchDB)**
```javascript
// RÈGLE #2: db.put pour créer/mettre à jour
// RÈGLE #6: Écriture vers PouchDB local (réplication automatique)
// RÈGLE #10: Gestion de _rev pour éviter les conflits
const result = await this.localDB.put({
  ...data,
  _id: data.id,  // ID CouchDB
  type: 'impaye',
  updated_at: new Date().toISOString()
});
// Résultat: { ok: true, id: '...', rev: '...' }
```

---

## Architecture des Design Documents (RÈGLE #5)

```javascript
const DESIGN_DOCS = [
  {
    _id: '_design/impayes',
    views: {
      // Index par solde (pour filtre principal)
      by_soldee: { map: "function(doc) {...}" },
      
      // Index par statut
      by_statut: { map: "function(doc) {...}" },
      
      // Index par payeur (pour recherche)
      by_payeur: { map: "function(doc) {...}" },
      
      // Index par date (pour tri)
      by_date_echeance: { map: "function(doc) {...}" },
      
      // Index par dossier (pour tri)
      by_dossier: { map: "function(doc) {...}" },
      
      // Index par montant restant (pour tri)
      by_reste: { map: "function(doc) {...}" },
      
      // Index par numéro (pour tri)
      by_numero: { map: "function(doc) {...}" },
      
      // Vue de tous les impayés
      all: { map: "function(doc) {...}" }
    }
  },
  {
    _id: '_design/impayes_stats',
    views: {
      stats: {
        map: "function(doc) {...}",
        reduce: '_sum'  // Pour calculs agrégés
      }
    }
  }
];
```

---

## Cycle de Synchronisation (RÈGLE #3, #7, #9)

```
INITIAL → SYNCING → PAUSED/COMPLETE
              ↓
            ERROR (si problème réseau)
              ↓
         RETRY automatique (si retry: true)
```

### Événements de synchronisation

| Événement | Déclencheur | Action |
|-----------|-------------|--------|
| `change` | Données modifiées | Mettre à jour `pendingChanges`, reload si `pull` |
| `paused` | Sync en pause | Mettre `syncStatus = 'paused'`, mettre à jour `lastSync` |
| `active` | Sync reprend | Mettre `syncStatus = 'syncing'`, `isOnline = true` |
| `denied` | Doc rejeté | Mettre `syncStatus = 'error'` |
| `complete` | Sync annulée | Mettre `syncStatus = 'complete'` |
| `error` | Erreur réseau | Mettre `syncStatus = 'error'`, `isOnline = false` |

---

## Gestion des Conflits (RÈGLE #4)

### Détection
```javascript
const result = await this.localDB.query('impayes/by_soldee', {
  include_docs: true,
  conflicts: true  // ⚠️ Important !
});

// Détecter les conflits
const conflicts = result.rows
  .filter(row => row.doc._conflicts && row.doc._conflicts.length > 0)
  .map(row => ({
    id: row.doc._id,
    rev: row.doc._rev,
    conflictRevs: row.doc._conflicts
  }));
```

### Résolution
```javascript
async resolveConflict(id, winningRev, losingRevs) {
  // Récupérer la version gagnante
  const winningDoc = await this.localDB.get(id, { rev: winningRev });
  
  // Supprimer les versions perdantes
  for (const rev of losingRevs) {
    await this.localDB.remove(id, rev);  // RÈGLE #10: _rev nécessaire
  }
  
  // La version gagnante reste
  await this.localDB.put(winningDoc);
}
```

---

## Pattern Local-First (RÈGLE #6)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   UI Alpine.js  │◄────│  PouchDB Local  │────►│   CouchDB       │
│                 │     │                 │     │   (Serveur)       │
│  - Lectures     │     │  - Données      │     │  - Réplication    │
│  - Affichage    │     │    locales      │     │    bi-directionnelle│
│  - Interactions │────►│  - Sync live    │◄────│  - Backup         │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Principe :**
1. Toujours lire depuis `localDB` (même si offline)
2. Toujours écrire vers `localDB` (réplication automatique)
3. La réplication se charge de synchroniser avec CouchDB

---

## État de Synchronisation UI (RÈGLE #9)

```html
<!-- Indicateur visuel de sync -->
<div class="flex items-center gap-2 px-3 py-1 rounded-full text-sm text-white"
     :class="syncStatusClass">
  <span class="w-2 h-2 rounded-full bg-white"
        :class="{ 'animate-pulse': syncStatus === 'syncing' }"></span>
  <span x-text="syncStatusLabel"></span>
</div>
```

### Classes CSS par statut

| Statut | Classe | Description visuelle |
|--------|--------|-------------------|
| `initial` | `bg-gray-400` | Gris |
| `syncing` | `bg-blue-500 animate-pulse` | Bleu pulsant |
| `paused` (online) | `bg-green-500` | Vert |
| `paused` (offline) | `bg-yellow-500` | Jaune |
| `error` | `bg-red-500` | Rouge |
| `complete` | `bg-green-500` | Vert |

---

## Checkpoints Validés

- [x] `wf-impayes-init` - Initialisation
- [x] `wf-impayes-pouchdb-ready` - PouchDB initialisé
- [x] `wf-impayes-design-docs-created` - Vues Mango créées
- [x] `wf-impayes-sync-started` - Réplication démarrée
- [x] `wf-impayes-data-fetched` - Données chargées
- [x] `wf-impayes-stats-calculated` - Stats calculées
- [x] `wf-impayes-pagination-updated` - Pagination à jour
- [x] `wf-impayes-table-rendered` - Tableau affiché
- [x] `wf-impayes-complete` - Workflow complet
- [x] `wf-impayes-error` - Gestion d'erreurs

---

## Fichiers Créés

```
workflows/frontend/impayes/
├── code/
│   ├── index-pouchdb.js          # Workflow complet PouchDB
│   └── impayes-pouchdb-example.html  # Exemple d'intégration UI
└── POUCHDB_MIGRATION_GUIDE.md    # Ce document
```

---

## Dépendances

```html
<!-- PouchDB core -->
<script src="https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.min.js"></script>

<!-- Plugin PouchDB Find pour requêtes Mango -->
<script src="https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.find.min.js"></script>
```

---

## Notes Importantes

1. **RÈGLE #10**: Toujours utiliser `_id` (pas `id`) et `_rev` pour les opérations PouchDB/CouchDB
2. **RÈGLE #6**: Jamais d'appels directs à CouchDB - toujours passer par `localDB`
3. **RÈGLE #4**: Toujours inclure `{ conflicts: true }` dans les requêtes pour détecter les conflits
4. **RÈGLE #3**: Ne pas oublier `retry: true` pour la reconnexion automatique
5. **RÈGLE #5**: Créer les design documents au `init()` pour s'assurer que les vues existent
