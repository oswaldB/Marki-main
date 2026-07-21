# Workflow : Sauvegarder l'édition (PouchDB)

## Écran
`relances-calendrier.html`

## Élément déclencheur
Bouton avec `@click="saveEdit()"`

## Action
Enregistrer les modifications de la relance avec synchronisation PouchDB → CouchDB

## Description
- Valide les modifications (RÈGLE #8)
- Met à jour la relance dans PouchDB local (RÈGLE #6)
- Synchronise vers CouchDB (RÈGLE #3)
- Gère les conflits de réplication (RÈGLE #4)
- Rafraîchit le calendrier avec les données locales
- Fonctionne en mode offline avec sync différée (RÈGLE #7)

## Data Model
**Page Function:** `relancesSaveEditManager()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `relances` - Toutes les relances (PouchDB local)
- `relancesProgrammees` - Relances futures filtrées
- `currentDate` - Date courante du calendrier
- `viewMode` - Mode d'affichage (month/week/day)
- `selectedDate` - Date sélectionnée
- `relancesDuJour` - Relances pour le jour sélectionné

**États UI:**
- `loading` - Chargement en cours
- `saving` - Sauvegarde en cours
- `error` - Message d'erreur
- `syncStatus` - État de synchronisation (RÈGLE #9)
- `isOnline` - État de la connexion (RÈGLE #7)

## State Changes

**Modifications:**
- `saving` → true pendant la sauvegarde
- `syncStatus` → 'syncing' puis 'complete' ou 'paused'
- `lastSync` → timestamp de dernière synchronisation
- `relances` → mise à jour locale immédiate
- `error` ← message si échec ou conflit (RÈGLE #4)

## PouchDB Operations (RÈGLE #2)

**Lecture:**
```javascript
// Avant modification: récupérer avec _rev (RÈGLE #10)
const doc = await this.localDB.get(id, { conflicts: true });
```

**Écriture:**
```javascript
// Mise à jour locale (RÈGLE #6)
const result = await this.localDB.put({
  ...doc,
  ...updates,
  _rev: doc._rev,  // RÈGLE #10
  updated_at: new Date().toISOString()
});
```

**Synchronisation:**
```javascript
// Sync vers CouchDB (RÈGLE #3)
await this.localDB.replicate.to(this.remoteDB);
```

## Replication Events (RÈGLE #7)

| Event | syncStatus | Action |
|-------|------------|--------|
| `active` | 'syncing' | Sync en cours |
| `paused` | 'paused' | En attente (offline ou à jour) |
| `change` (pull) | - | Recharger données si changements serveur |
| `error` | 'error' | Gérer erreur réseau |

## Conflict Handling (RÈGLE #4)

**Détection:**
```javascript
const doc = await this.localDB.get(id, { conflicts: true });
if (doc._conflicts && doc._conflicts.length > 0) {
  // Conflits détectés
}
```

**Résolution:**
- Stratégie: fusion avec priorité aux données locales
- Suppression des révisions conflictuelles
- Notification utilisateur si conflit manuel nécessaire

## Organisation des fichiers

```
frontend/
└── app/
    └── relances-calendrier/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            ├── save-edit-pouchdb.js    ← Workflow adapté
            └── pouchdb-config.js         ← Config partagée
```

### Fichier principal
- **HTML** : `frontend/app/relances-calendrier/index.html`
- **Point d'entrée** : Initialise `relancesSaveEditManager()`

### Fichier workflow
- **JS** : `workflows/frontend/relances-calendrier/save-edit-pouchdb.js`
- **Export** : Fonction utilisable avec `x-data="relancesSaveEditManager()"`

## Implementation PouchDB

```javascript
// Import ou global
const manager = relancesSaveEditManager();

// Dans Alpine.js x-data
function relancesCalendrierPage() {
  return {
    ...manager,
    
    // Méthodes spécifiques à la page
    async saveEdit() {
      await this.saveEdit.call(this);
    }
  };
}
```

### Full Implementation

```javascript
async saveEdit() {
  // @checkpoint wf-save-edit-init
  if (!this.validateForm()) return;
  
  this.saving = true;
  this.loading = true;
  this.error = null;
  
  try {
    // @checkpoint wf-save-edit-local-update
    const id = this.editingItem._id || this.editingItem.id;
    const doc = await this.localDB.get(id, { conflicts: true });
    
    // Gestion conflits (RÈGLE #4)
    if (doc._conflicts?.length > 0) {
      await this.handleConflict(id, this.editingItem);
    }
    
    // Mise à jour avec _rev (RÈGLE #10)
    const updatedDoc = {
      ...doc,
      ...this.editingItem,
      _id: doc._id,
      _rev: doc._rev,
      updated_at: new Date().toISOString()
    };
    
    delete updatedDoc.id;
    delete updatedDoc.hasConflicts;
    
    const result = await this.localDB.put(updatedDoc);
    
    // @checkpoint wf-save-edit-sync-remote
    if (this.isOnline) {
      await this.localDB.replicate.to(this.remoteDB);
    }
    
    // @checkpoint wf-save-edit-calendar-refresh
    this.refreshCalendar();
    this.selectedRelance = false;
    this.editingItem = null;
    
    Alpine.store('ui').addToast('Modifications sauvegardées', 'success');
    
    // @checkpoint wf-save-edit-complete
    
  } catch (error) {
    // @checkpoint wf-save-edit-error
    if (error.status === 409) {
      // @checkpoint wf-save-edit-conflict
      await this.handleConflictAndReload(id);
    }
    this.error = error.message;
    Alpine.store('ui').addToast(error.message, 'error');
  } finally {
    this.saving = false;
    this.loading = false;
  }
}
```

## Checkpoints

| Checkpoint | Description |
|------------|-------------|
| `wf-save-edit-init` | Début de la sauvegarde |
| `wf-save-edit-validation` | Validation du formulaire |
| `wf-save-edit-pouchdb-ready` | PouchDB initialisé |
| `wf-save-edit-local-update` | Mise à jour PouchDB local |
| `wf-save-edit-sync-remote` | Sync vers CouchDB |
| `wf-save-edit-calendar-refresh` | Rafraîchissement calendrier |
| `wf-save-edit-complete` | Sauvegarde terminée |
| `wf-save-edit-error` | Erreur lors de la sauvegarde |
| `wf-save-edit-conflict` | Conflit de réplication détecté |

## Configuration CouchDB

```javascript
const COUCHDB_CONFIG = {
  url: 'https://admin:admin@dev.markidiags.com/data',
  dbName: 'marki_relances',
  options: {
    live: true,
    retry: true
  }
};
```

## Dépendances

- **PouchDB** : `https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.min.js`
- **Template PouchDB** : `workflows/frontend/shared/pouchdb-workflow-template.js`
