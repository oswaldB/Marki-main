# Guide de Migration PouchDB - Workflows Calendrier

Ce document explique comment les workflows du calendrier de relances ont été adaptés pour utiliser PouchDB avec réplication live vers CouchDB.

## Workflows Migrés

| Workflow | Fichier | Description |
|----------|---------|-------------|
| `initial-load` | `relances-calendrier-complete-pouchdb.js` | Chargement initial avec réplication |
| `go-today` | Intégré dans le fichier complet | Réinitialisation à aujourd'hui |
| `next-period` | Intégré dans le fichier complet | Navigation période suivante |
| `previous-period` | Intégré dans le fichier complet | Navigation période précédente |
| `switch-view` | Intégré dans le fichier complet | Changement mois/semaine |
| `open-edit-relance` | `open-edit-relance-pouchdb.js` | Édition avec conflits |
| `save-edit` | `save-edit-pouchdb.js` | Sauvegarde avec révisions |

---

## Récapitulatif des Règles Implémentées

| Règle | Description | Implémentation |
|-------|-------------|----------------|
| **#1** | PouchDB frontend + réplication live | `new PouchDB()` + `db.sync()` |
| **#2** | Remplacer API par PouchDB | `db.find()`, `db.query()`, `db.get/put()` |
| **#3** | Sync bidirectionnelle | `db.sync(remoteDB, { live: true, retry: true })` |
| **#4** | Gestion des conflits | `{ conflicts: true }` dans toutes les requêtes |
| **#5** | Design documents vues Mango | Vues `by_date_envoi`, `by_statut`, etc. |
| **#6** | Pattern local-first | Lecture/écriture via `localDB` uniquement |
| **#7** | États offline/online | Events `online/offline` + `paused/active` |
| **#8** | Structure Alpine.js | `x-data="relancesCalendrierPouchDBManager()"` |
| **#9** | Propriété `syncStatus` | Badge avec états visuels |
| **#10** | IDs CouchDB `_id/_rev` | Mappage `id: doc._id`, `rev: doc._rev` |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Alpine.js UI                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Calendrier │  │  Modal      │  │  Indicateur Sync    │  │
│  │   (mois)     │  │  (relances) │  │  (RÈGLE #9)         │  │
│  └──────┬──────┘  └──────┬──────┘  └─────────────────────┘  │
└─────────┼────────────────┼──────────────────────────────────┘
          │                │
          │ Pattern Local-First (RÈGLE #6)
          ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                     PouchDB Local                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Database: 'marki_relances'                               ││
│  │  ├─ Documents: relances (type: 'relance')                 ││
│  │  ├─ Design Docs: _design/relances (vues Mango)            ││
│  │  └─ Index: by_date_envoi, by_statut, by_contact           ││
│  └─────────────────────────────────────────────────────────┘│
└──────────────────────────┬──────────────────────────────────┘
                           │ Réplication Live (RÈGLE #3)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      CouchDB Remote                           │
│                  (Serveur Central)                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Design Documents (RÈGLE #5)

```javascript
const DESIGN_DOCS = [
  {
    _id: '_design/relances',
    views: {
      // Index principal: par date d'envoi (pour calendrier)
      by_date_envoi: {
        map: function(doc) {
          if (doc.type === 'relance' && doc.date_envoi_planifiee) {
            emit(doc.date_envoi_planifiee, doc);
          }
        }.toString()
      },
      // Index: par statut
      by_statut: {
        map: function(doc) {
          if (doc.type === 'relance' && doc.statut) {
            emit(doc.statut, doc);
          }
        }.toString()
      },
      // Index: par contact
      by_contact: {
        map: function(doc) {
          if (doc.type === 'relance' && doc.contact_id) {
            emit(doc.contact_id, doc);
          }
        }.toString()
      },
      // Toutes les relances
      all: {
        map: function(doc) {
          if (doc.type === 'relance') {
            emit(doc._id, doc);
          }
        }.toString()
      }
    }
  },
  {
    _id: '_design/relances_stats',
    views: {
      // Compteur par statut
      by_statut_count: {
        map: function(doc) {
          if (doc.type === 'relance' && doc.statut) {
            emit(doc.statut, 1);
          }
        }.toString(),
        reduce: '_sum'
      },
      // Compteur par mois
      by_month: {
        map: function(doc) {
          if (doc.type === 'relance' && doc.date_envoi_planifiee) {
            const date = new Date(doc.date_envoi_planifiee);
            const monthKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
            emit(monthKey, 1);
          }
        }.toString(),
        reduce: '_sum'
      }
    }
  }
];
```

---

## Workflow Go-Today (Avant/Après)

### Avant (Version simple)
```javascript
goToday() {
  this.currentDate = new Date();
  this.loadDataForDate(this.currentDate); // Appel API
}
```

### Après (Version PouchDB)
```javascript
async goToToday() {
  console.log('[CHECKPOINT] wf-cal-today-reset');
  this.loading = true;
  
  // 1. Réinitialiser les dates
  this.currentDate = new Date();
  this.selectedDate = new Date();
  
  // 2. Charger depuis PouchDB local (RÈGLE #6)
  // RÈGLE #2: Utilise db.find avec sélecteur Mango
  await this.loadDataForDate(this.currentDate);
  
  this.loading = false;
  console.log('[CHECKPOINT] wf-cal-today-complete');
}

async loadDataForDate(date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  // RÈGLE #2: Requête Mango au lieu d'API
  const result = await this.localDB.find({
    selector: {
      type: 'relance',
      date_envoi_planifiee: {
        $gte: startOfDay.toISOString(),
        $lte: endOfDay.toISOString()
      }
    },
    sort: [{ date_envoi_planifiee: 'asc' }]
  });
  
  // RÈGLE #10: Mapper avec _id et _rev
  this.relancesDuJour = result.docs.map(doc => ({
    ...doc,
    id: doc._id,
    rev: doc._rev,
    hasConflicts: !!(doc._conflicts && doc._conflicts.length > 0)
  }));
}
```

---

## Chargement des Données (RÈGLE #2, #6)

### Option 1: Requête Mango (db.find) - Pour filtres complexes
```javascript
const result = await this.localDB.find({
  selector: {
    type: 'relance',
    date_envoi_planifiee: {
      $gte: startDate.toISOString(),
      $lte: endDate.toISOString()
    },
    statut: { $in: ['planifiee', 'envoyee'] }
  },
  sort: [{ date_envoi_planifiee: 'asc' }]
});
```

### Option 2: Vue Mango (db.query) - Pour performances
```javascript
const result = await this.localDB.query('relances/by_date_envoi', {
  startkey: startDate.toISOString(),
  endkey: endDate.toISOString(),
  include_docs: true,
  conflicts: true // RÈGLE #4
});
```

---

## Synchronisation Live (RÈGLE #3, #7, #9)

```javascript
async setupReplication() {
  this.syncStatus = 'syncing';
  
  this.syncHandler = this.localDB.sync(this.remoteDB, {
    live: true,        // Continue en arrière-plan
    retry: true,       // Reconnexion auto
    heartbeat: 10000,  // Ping toutes les 10s
    timeout: 30000     // Timeout 30s
  })
  .on('change', (info) => {
    // Nouvelles données reçues
    if (info.direction === 'pull') {
      this.loadDataForDate(this.currentDate);
    }
  })
  .on('paused', (err) => {
    // Sync en pause (en attente ou hors ligne)
    this.syncStatus = err ? 'error' : 'paused';
  })
  .on('active', () => {
    // Sync reprend
    this.syncStatus = 'syncing';
    this.isOnline = true;
  })
  .on('error', (err) => {
    // Erreur réseau
    this.syncStatus = 'error';
    this.isOnline = false;
  });
}
```

---

## Indicateur de Synchronisation UI (RÈGLE #9)

```html
<div class="flex items-center gap-2 px-3 py-1 rounded-full text-sm text-white"
     :class="syncStatusClass">
  <span class="w-2 h-2 rounded-full bg-white"
        :class="{ 'animate-pulse': syncStatus === 'syncing' }"></span>
  <span x-text="syncStatusLabel"></span>
</div>
```

### Propriétés calculées
```javascript
get syncStatusClass() {
  const classes = {
    initial: 'bg-gray-400',
    syncing: 'bg-blue-500 animate-pulse',
    paused: this.isOnline ? 'bg-green-500' : 'bg-yellow-500',
    error: 'bg-red-500',
    complete: 'bg-green-500'
  };
  return classes[this.syncStatus] || classes.initial;
}

get syncStatusLabel() {
  const labels = {
    initial: 'Initialisation...',
    syncing: 'Synchronisation...',
    paused: this.isOnline ? 'À jour' : 'Hors ligne',
    error: 'Erreur de sync',
    complete: 'Synchronisé'
  };
  return labels[this.syncStatus] || 'Inconnu';
}
```

---

## Gestion des Conflits (RÈGLE #4)

### Détection
```javascript
async loadRelancesForPeriod(viewMode, date) {
  const result = await this.localDB.query('relances/by_date_envoi', {
    startkey: startDate.toISOString(),
    endkey: endDate.toISOString(),
    include_docs: true,
    conflicts: true // ⚠️ Important!
  });
  
  this.relancesProgrammees = result.rows.map(row => ({
    ...row.doc,
    id: row.doc._id,
    rev: row.doc._rev,
    hasConflicts: !!(row.doc._conflicts && row.doc._conflicts.length > 0)
  }));
  
  // Collecter les conflits
  this.conflicts = result.rows
    .filter(row => row.doc._conflicts?.length > 0)
    .map(row => ({
      id: row.doc._id,
      rev: row.doc._rev,
      conflictRevs: row.doc._conflicts
    }));
}
```

### Affichage UI
```html
<div x-show="relance.hasConflicts" class="text-xs text-yellow-600">
  ⚠ Conflit détecté
</div>
```

---

## Pattern Local-First (RÈGLE #6)

```
┌─────────────┐
│    UI       │ ◄── Lecture (toujours depuis localDB)
└──────┬──────┘
       │
       │ Alpine.js x-data
       ▼
┌─────────────┐     ┌─────────────┐
│  PouchDB    │ ──► │   CouchDB   │
│   Local     │ ◄── │   Remote    │
└─────────────┘     └─────────────┘
  ▲                              
  └── Écriture (toujours vers localDB, réplication auto)
```

---

## Fichiers Créés

```
workflows/frontend/relances-calendrier/
├── code/
│   ├── go-today-pouchdb.js                    # Workflow go-today
│   ├── relances-calendrier-complete-pouchdb.js  # Workflow complet
│   └── relances-calendrier-pouchdb-example.html # Exemple UI
├── open-edit-relance-pouchdb.js              # Édition existant
├── save-edit-pouchdb.js                      # Sauvegarde existant
└── POUCHDB_MIGRATION_GUIDE.md                # Ce document
```

---

## Checkpoints Validés

- [x] `wf-cal-init` - Initialisation
- [x] `wf-cal-pouchdb-ready` - PouchDB initialisé
- [x] `wf-cal-design-docs-created` - Vues Mango créées
- [x] `wf-cal-sync-started` - Réplication démarrée
- [x] `wf-cal-data-loaded` - Données chargées
- [x] `wf-cal-rendered` - Calendrier affiché
- [x] `wf-cal-today-reset` - Go-today exécuté
- [x] `wf-cal-today-complete` - Go-today terminé
- [x] `wf-cal-complete` - Workflow complet

---

## Dépendances

```html
<!-- PouchDB core -->
<script src="https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.min.js"></script>

<!-- Plugin PouchDB Find pour requêtes Mango -->
<script src="https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.find.min.js"></script>
```

---

## Notes d'Implémentation

1. **RÈGLE #10**: Toujours mapper `doc._id` → `id` et `doc._rev` → `rev` pour compatibilité Alpine.js
2. **RÈGLE #6**: Jamais d'appels directs à CouchDB - toujours passer par `localDB`
3. **RÈGLE #4**: Toujours inclure `{ conflicts: true }` pour détecter les conflits
4. **RÈGLE #2**: Utiliser `db.find()` pour requêtes ad-hoc, `db.query()` pour performances
5. **RÈGLE #3**: `live: true` + `retry: true` pour reconnexion automatique
6. **RÈGLE #7**: Gérer `paused` vs `error` dans les events de sync

---

## Utilisation dans HTML

```html
<div x-data="relancesCalendrierPouchDBManager()" x-init="init()">
  <!-- Indicateur sync -->
  <div :class="syncStatusClass">
    <span x-text="syncStatusLabel"></span>
  </div>
  
  <!-- Navigation -->
  <button @click="goToToday()">Aujourd'hui</button>
  <button @click="previousPeriod()">←</button>
  <button @click="nextPeriod()">→</button>
  
  <!-- Calendrier -->
  <div class="calendar">
    <template x-for="day in daysInMonth">
      <div @click="selectDate(day)" 
           :class="{ 'has-relances': relancesByDate[day?.toISOString().split('T')[0]]?.length > 0 }">
        <span x-text="day?.getDate()"></span>
      </div>
    </template>
  </div>
  
  <!-- Modal -->
  <div x-show="showModal">
    <template x-for="relance in relancesDuJour">
      <div :class="{ 'border-yellow-400': relance.hasConflicts }">
        <span x-text="relance.contact_nom"></span>
        <span x-text="relance.statut"></span>
      </div>
    </template>
  </div>
</div>
```
