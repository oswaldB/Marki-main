# Workflow : Éditer une relance calendrier - PouchDB + CouchDB

## Écran
`relances-calendrier.html`

## Élément déclencheur
Bouton avec `@click="openEditRelance(relance)"`

## Action
Ouvrir l'édition d'une relance depuis le calendrier avec PouchDB local-first

## Description
- Initialise PouchDB local et la connexion à CouchDB
- Configure la réplication bidirectionnelle live
- Charge la relance depuis PouchDB local (`db.get`)
- Ouvre le modal d'édition avec les données locales
- Sauvegarde les modifications dans PouchDB local (`db.put`)
- La synchronisation vers CouchDB se fait automatiquement

## Data Model
**Page Function:** `openEditRelanceWorkflow()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `relance` : Document relance en cours d'édition (avec _id, _rev CouchDB)
- `relanceOriginal` : Copie pour annulation
- `formData` : Données du formulaire (dateProgrammee, contenu, statut)

**États UI:**
- `loading` : Chargement de la relance
- `error` : Message d'erreur
- `successMessage` : Message de succès
- `showModal` : Affichage du modal

**États Sync (RÈGLE #9):**
- `syncStatus` : 'initial' | 'syncing' | 'paused' | 'error' | 'complete'
- `isOnline` : État de la connexion
- `lastSync` : Timestamp dernière sync
- `pendingChanges` : Changements en attente
- `conflicts` : Documents en conflit

## State Changes

**Initialisation:**
- `syncStatus` → 'initial' → 'syncing' → 'paused'/'complete'
- `localDB` / `remoteDB` → Instances PouchDB initialisées

**Ouverture édition:**
- `loading` → true
- `relance` ← Document depuis PouchDB (db.get)
- `formData` ← Valeurs de la relance
- `showModal` → true

**Sauvegarde:**
- `loading` → true
- Sauvegarde dans PouchDB local (db.put avec _id, _rev)
- `syncStatus` → 'syncing' (si online)
- `showModal` → false

## PouchDB Operations (RÈGLE #2)

### Lecture (RÈGLE #6)
```javascript
// Charger une relance par ID
doc = await localDB.get(relanceId, { conflicts: true });
```

### Écriture (RÈGLE #6)
```javascript
// Sauvegarder les modifications
const result = await localDB.put({
  _id: doc._id,           // ID CouchDB conservé
  _rev: doc._rev,         // Révision CouchDB
  ...updates,
  updatedAt: new Date().toISOString()
});
// Retourne: { id, rev, ok: true }
```

### Réplication (RÈGLE #3)
```javascript
// Sync bidirectionnelle live
syncHandler = localDB.sync(remoteDB, {
  live: true,
  retry: true
});
```

## Design Documents (RÈGLE #5)

```javascript
{
  _id: '_design/relances',
  views: {
    by_type: {
      map: function(doc) {
        if (doc.type === 'relance') emit(doc._id, doc);
      }.toString()
    },
    by_date_programmee: {
      map: function(doc) {
        if (doc.type === 'relance' && doc.dateProgrammee) {
          emit(doc.dateProgrammee, doc);
        }
      }.toString()
    },
    by_statut: {
      map: function(doc) {
        if (doc.type === 'relance' && doc.statut) {
          emit(doc.statut, doc);
        }
      }.toString()
    },
    by_contact: {
      map: function(doc) {
        if (doc.type === 'relance' && doc.contactId) {
          emit(doc.contactId, doc);
        }
      }.toString()
    }
  }
}
```

## Gestion des Conflits (RÈGLE #4)

```javascript
// Détection lors du chargement
const doc = await localDB.get(id, { conflicts: true });
if (doc._conflicts && doc._conflicts.length > 0) {
  // Récupérer les révisions en conflit
  const conflictingDocs = await Promise.all(
    doc._conflicts.map(rev => localDB.get(id, { rev }))
  );
  // Fusionner et résoudre
}
```

## Offline/Online (RÈGLE #7)

```javascript
// Events de réplication
syncHandler
  .on('paused', () => { syncStatus = 'paused'; })
  .on('active', () => { syncStatus = 'syncing'; isOnline = true; })
  .on('error', () => { syncStatus = 'error'; isOnline = false; });

// Events navigateur
window.addEventListener('online', () => { isOnline = true; });
window.addEventListener('offline', () => { isOnline = false; });
```

## Organisation des fichiers

```
frontend/
└── app/
    └── relances-calendrier/
        ├── index.html
        ├── js/
        │   ├── open-edit-relance-pouchdb.js    # Workflow PouchDB
        │   └── pouchdb-service.js              # Service partagé (optionnel)
        └── components/
            └── sync-indicator.html             # Composant indicateur sync
```

### Fichiers principaux
- **HTML** : `frontend/app/relances-calendrier/index.html`
- **Workflow** : `frontend/app/relances-calendrier/js/open-edit-relance-pouchdb.js`

## Implementation Alpine.js (RÈGLE #8)

```javascript
// Integration dans le HTML
div x-data="openEditRelanceWorkflow()" x-init="init()"
  
  // Indicateur de sync
  div :class="syncStatusClass"
    span x-text="syncStatusIcon"
    span x-text="syncStatusLabel"
  
  // Bouton d'édition
  button @click="openEditRelance(relance)"
    | Éditer
  
  // Modal
  div x-show="showModal"
    form @submit.prevent="saveRelance()"
      input x-model="formData.dateProgrammee"
      textarea x-model="formData.contenu"
      select x-model="formData.statut"
      
      button @click="cancelEdit()" | Annuler
      button type="submit" :disabled="!canSave" | Sauvegarder
```

## Points Clés

| Règle | Implémentation |
|-------|----------------|
| RÈGLE #1 | `localDB = new PouchDB('marki_database')` |
| RÈGLE #2 | `db.get()`, `db.put()`, `db.sync()` |
| RÈGLE #3 | `localDB.sync(remoteDB, { live: true, retry: true })` |
| RÈGLE #4 | `{ conflicts: true }` sur toutes les lectures |
| RÈGLE #5 | `_design/relances` avec vues Mango |
| RÈGLE #6 | Lecture depuis PouchDB local, écriture PouchDB → sync auto |
| RÈGLE #7 | Events `paused`, `active`, `window.online/offline` |
| RÈGLE #8 | Structure `x-data`, `x-model`, `x-show` conservée |
| RÈGLE #9 | `syncStatus`, `isOnline`, `lastSync`, `pendingChanges` |
| RÈGLE #10 | `_id`, `_rev` CouchDB conservés sur tous les documents |

## Checkpoints

- `@checkpoint wf-init` : Initialisation PouchDB
- `@checkpoint wf-db-ready` : Bases local/remote prêtes
- `@checkpoint wf-design-docs` : Design documents créés
- `@checkpoint wf-sync-active` : Réplication démarrée
- `@checkpoint wf-relance-loaded` : Relance chargée depuis PouchDB
- `@checkpoint wf-modal-opened` : Modal affiché avec données
- `@checkpoint wf-save-start` : Début sauvegarde
- `@checkpoint wf-save-complete` : Sauvegarde réussie
- `@checkpoint wf-complete` : Workflow terminé
- `@checkpoint wf-error` : Erreur rencontrée

## Dépendances

```html
<!-- PouchDB -->
<script src="https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.min.js"></script>

<!-- Alpine.js -->
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>

<!-- Workflow -->
<script src="js/open-edit-relance-pouchdb.js"></script>
```

## Exemple Complet

Voir : `example-open-edit-relance-pouchdb.html`

```html
<div x-data="openEditRelanceWorkflow()" x-init="init()">
  <!-- Indicateur sync -->
  <div :class="syncStatusClass">
    <span x-text="syncStatusIcon"></span>
    <span x-text="syncStatusLabel"></span>
  </div>
  
  <!-- Liste relances -->
  <template x-for="rel in relances">
    <button @click="openEditRelance(rel)">Éditer</button>
  </template>
  
  <!-- Modal édition -->
  <div x-show="showModal">
    <form @submit.prevent="saveRelance()">
      <input type="date" x-model="formData.dateProgrammee">
      <textarea x-model="formData.contenu"></textarea>
      <select x-model="formData.statut">
        <option value="brouillon">Brouillon</option>
        <option value="programmee">Programmée</option>
      </select>
      <button type="button" @click="cancelEdit()">Annuler</button>
      <button type="submit">Sauvegarder</button>
    </form>
  </div>
</div>
```
