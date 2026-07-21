# Workflow : Fermer le modal nouvelle séquence (PouchDB)

## Écran
`sequences.html`

## Élément déclencheur
Bouton avec `@click="closeModal()"`

## Action
Annuler la création de séquence et réinitialiser l'état local

## Description
- Ferme le modal
- Annule sans créer dans PouchDB
- Réinitialise le formulaire avec les IDs CouchDB potentiels
- Vérifie l'état de synchronisation avant fermeture si modifications en attente

## Data Model
**Page Function:** `sequencesPagePouchDB()`

**Stores Alpine.js:**
- `$store.ui`
- `$store.sequencesDB` (Store PouchDB avec syncStatus)

**Données:**
- `sequences` (tableau local PouchDB)
- `searchQuery`
- `filterType`
- `newSequence` (objet avec `_id` et `_rev` CouchDB)
- `pendingChanges` (nombre de changements non synchronisés)

**États UI:**
- `loading`
- `error`
- `showNewSequenceModal`
- `showEditSequenceModal`
- `showDeleteModal`
- `editingSequence`
- `deletingSequence`
- `syncStatus` - `'initializing' | 'connected' | 'syncing' | 'paused' | 'error' | 'offline'`
- `hasUnsavedChanges` - booléen pour détecter les modifications locales

## State Changes

**Modifications:**
- `editingSequence` modifié
- `newSequence._id` réinitialisé (ID temporaire CouchDB supprimé)
- `newSequence._rev` réinitialisé
- `hasUnsavedChanges` mis à `false`
- `pendingChanges` vérifié depuis PouchDB

## PouchDB Operations

**Pas d'écriture PouchDB** - Action côté client uniquement, mais avec contexte sync.

**Lecture PouchDB (optionnelle):**
```javascript
// Vérifier s'il y a des changements en attente de synchronisation
const changes = await db.changes({ since: 'now', limit: 0 });
this.pendingChanges = changes.results.length;
```

## Organisation des fichiers

```
frontend/
└── app/
    └── sequences/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            ├── close-modal-pouchdb.js
            └── sequences-store-pouchdb.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/sequences/js/close-modal-pouchdb.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences/js/close-modal-pouchdb.js
export function closeModal() {
  // Implementation du workflow PouchDB
}
```

## Implementation PouchDB

```javascript
closeModal() {
  // @checkpoint modal-close-initiated
  
  // 1. Vérifier si des modifications locales n'ont pas été synchronisées
  if (this.hasUnsavedChanges && this.syncStatus === 'offline') {
    // @checkpoint unsaved-changes-detected-offline
    // Option: Afficher un warning "Vous êtes hors ligne, les modifications seront synchronées à la reconnexion"
    if (!confirm('Des modifications n\'ont pas été synchronisées. Fermer quand même ?')) {
      // @checkpoint modal-close-cancelled
      return;
    }
  }
  
  // 2. Hide modal
  this.showNewSequenceModal = false;
  this.showEditSequenceModal = false;
  this.showDeleteModal = false;
  // @checkpoint modals-hidden
  
  // 3. Reset selected avec IDs CouchDB
  this.selectedItem = null;
  this.editingSequence = null;
  this.deletingSequence = null;
  // @checkpoint editing-sequence-reset
  
  // 4. Clear validation errors
  this.validationErrors = {};
  this.error = null;
  // @checkpoint validation-cleared
  
  // 5. Réinitialiser newSequence avec structure CouchDB
  this.newSequence = {
    // ID temporaire sera généré lors du create
    _id: null,
    _rev: null,
    type: 'sequence',  // Type pour filtrage PouchDB
    nom: '',
    description: '',
    delai_jours: 15,
    niveau: 1,
    active: true,
    date_creation: null,
    date_modification: null
  };
  // @checkpoint new-sequence-reset-with-couchdb-ids
  
  // 6. Réinitialiser l'état de synchronisation local
  this.hasUnsavedChanges = false;
  this.lastLocalChange = null;
  // @checkpoint local-state-reset
  
  // 7. Nettoyer les conflits en mémoire si présents
  this.pendingConflicts = [];
  // @checkpoint conflicts-memory-cleared
  
  console.log('[CHECKPOINT] modal-closed-pouchdb-context', {
    syncStatus: this.syncStatus,
    timestamp: new Date().toISOString()
  });
}
```

## Version complète avec Store PouchDB

```javascript
// sequences-store-pouchdb.js
document.addEventListener('alpine:init', () => {
  Alpine.data('sequencesPagePouchDB', () => ({
    // Configuration PouchDB
    db: null,
    remoteDb: null,
    syncHandler: null,
    
    // Sync status
    syncStatus: 'initializing',
    lastSyncAt: null,
    pendingChanges: 0,
    hasUnsavedChanges: false,
    
    // Data
    sequences: [],
    searchQuery: '',
    filterType: 'all',
    
    // UI States
    loading: false,
    error: null,
    showNewSequenceModal: false,
    showEditSequenceModal: false,
    showDeleteModal: false,
    editingSequence: null,
    deletingSequence: null,
    validationErrors: {},
    pendingConflicts: [],
    
    // New sequence avec structure CouchDB
    newSequence: {
      _id: null,
      _rev: null,
      type: 'sequence',
      nom: '',
      description: '',
      delai_jours: 15,
      niveau: 1,
      active: true,
      date_creation: null,
      date_modification: null
    },
    
    async init() {
      // @checkpoint pouchdb-store-initialized
      this.db = new PouchDB('adti_sequences');
      await this.initReplication();
      await this.loadSequences();
    },
    
    async initReplication() {
      this.remoteDb = new PouchDB('https://couchdb.markidiags.com/adti_sequences');
      this.syncHandler = this.db.sync(this.remoteDb, {
        live: true,
        retry: true,
        conflicts: true
      })
      .on('change', (info) => {
        this.pendingChanges = info.change ? info.change.docs.length : 0;
      })
      .on('paused', () => {
        this.syncStatus = 'connected';
        this.lastSyncAt = new Date().toISOString();
      })
      .on('active', () => {
        this.syncStatus = 'syncing';
      })
      .on('error', (err) => {
        this.syncStatus = 'error';
        this.error = err.message;
      });
    },
    
    async loadSequences() {
      const result = await this.db.query('sequences_views/by_niveau', {
        include_docs: true
      });
      this.sequences = result.rows.map(row => row.doc);
    },
    
    /**
     * Fermer le modal avec gestion PouchDB
     * @action closeModal
     * @checkpoint modal-close-pouchdb
     */
    closeModal() {
      // Vérifier les changements non synchronisés
      if (this.hasUnsavedChanges && this.syncStatus === 'offline') {
        if (!confirm('Modifications non synchronisées. Fermer ?')) {
          return;
        }
      }
      
      // Réinitialiser tous les états de modal
      this.showNewSequenceModal = false;
      this.showEditSequenceModal = false;
      this.showDeleteModal = false;
      
      // Réinitialiser les données d'édition
      this.editingSequence = null;
      this.deletingSequence = null;
      
      // Réinitialiser le formulaire avec structure CouchDB
      this.newSequence = {
        _id: null,
        _rev: null,
        type: 'sequence',
        nom: '',
        description: '',
        delai_jours: 15,
        niveau: 1,
        active: true,
        date_creation: null,
        date_modification: null
      };
      
      // Nettoyer les erreurs
      this.validationErrors = {};
      this.error = null;
      this.hasUnsavedChanges = false;
      
      console.log('[CHECKPOINT] modal-closed', {
        syncStatus: this.syncStatus,
        timestamp: new Date().toISOString()
      });
    }
  }));
});
```

## Template HTML avec Sync Status

```html
<div x-data="sequencesPagePouchDB" x-init="init()">
  <!-- Indicateur de sync PouchDB -->
  <div 
    x-show="syncStatus !== 'connected'"
    :class="{
      'bg-yellow-100 text-yellow-800': syncStatus === 'syncing',
      'bg-red-100 text-red-800': syncStatus === 'error',
      'bg-gray-100 text-gray-800': syncStatus === 'offline'
    }"
    class="px-3 py-2 mb-4 rounded text-sm"
  >
    <span x-text="{
      'syncing': '🔄 Synchronisation...',
      'error': '❌ Erreur de sync',
      'offline': '📵 Hors ligne',
      'initializing': '⏳ Initialisation...'
    }[syncStatus]"
    ></span>
    <span x-show="pendingChanges > 0" 
          x-text="' (' + pendingChanges + ' changements en attente)'"
          class="text-xs"
    ></span>
  </div>
  
  <!-- Modal Nouvelle Séquence -->
  <div x-show="showNewSequenceModal" 
       x-transition
       class="fixed inset-0 bg-black bg-opacity-50 z-50">
    <div class="bg-white rounded-lg p-6 max-w-md mx-auto mt-20">
      <h2>Nouvelle Séquence</h2>
      
      <!-- Form avec binding PouchDB -->
      <input 
        x-model="newSequence.nom" 
        @input="hasUnsavedChanges = true"
        placeholder="Nom de la séquence"
      />
      
      <textarea 
        x-model="newSequence.description"
        @input="hasUnsavedChanges = true"
        placeholder="Description"
      ></textarea>
      
      <!-- Bouton fermer avec closeModal() PouchDB -->
      <button @click="closeModal()" class="btn-secondary">
        Annuler
      </button>
      
      <button @click="saveSequence()" class="btn-primary">
        Enregistrer
      </button>
    </div>
  </div>
</div>
```

## Notes PouchDB

- **Pas d'appel API** : Ce workflow est purement UI, mais intègre le contexte PouchDB
- **Sync status** : Affiche l'état de la réplication lors de la fermeture
- **IDs CouchDB** : Réinitialise `_id` et `_rev` pour la prochaine création
- **Conflits** : Option pour gérer les conflits en mémoire avant fermeture
- **Offline-aware** : Warning si modifications non synchronées et mode offline
