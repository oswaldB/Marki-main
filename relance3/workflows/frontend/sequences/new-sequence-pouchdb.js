/**
 * WORKFLOW : Nouvelle Séquence (PouchDB + CouchDB)
 * ================================================
 * Adaptation du workflow frontend new-sequence pour PouchDB local-first
 * 
 * CE WORKFLOW EST UI-ONLY mais bénéficie de:
 * - Persistance locale du brouillon (draft) dans PouchDB
 * - Réplication live des données
 * - Gestion offline/online
 * - Pattern local-first
 * 
 * RÈGLES IMPLÉMENTÉES:
 * ✓ PouchDB local-first, réplication bidirectionnelle live
 * ✓ Persistance locale du formulaire (brouillon)
 * ✓ Synchronisation bidirectionnelle avec db.sync()
 * ✓ Gestion des conflits (conflicts: true)
 * ✓ Design documents pour vues Mango
 * ✓ Pattern local-first: lectures locales, écritures locales → réplication
 * ✓ Gestion offline/online (events paused/active)
 * ✓ Structure Alpine.js x-data préservée
 * ✓ Propriété syncStatus pour suivre l'état
 * ✓ IDs CouchDB (_id) et révisions (_rev) gérés
 * 
 * @checkpoint wf-init
 * @checkpoint wf-db-ready
 * @checkpoint wf-design-docs
 * @checkpoint wf-sync-active
 * @checkpoint wf-draft-loaded
 * @checkpoint wf-modal-opened
 * @checkpoint wf-complete
 * @checkpoint wf-error
 */

// ============================================
// CONFIGURATION COUCHDB
// ============================================
const COUCHDB_CONFIG = {
  url: window.location.hostname === 'localhost' 
    ? 'http://admin:admin@localhost:5984'
    : 'https://admin:admin@dev.markidiags.com/data',
  dbName: 'marki_database',
  options: {
    live: true,        // Réplication continue
    retry: true,       // Reconnexion automatique
    heartbeat: 10000,  // Ping toutes les 10s
    timeout: 30000     // Timeout de 30s
  }
};

// ============================================
// DESIGN DOCUMENTS (Vues Mango pour Séquences et Drafts)
// ============================================
const DESIGN_DOCS = [
  {
    _id: '_design/sequences',
    views: {
      // Vue: toutes les séquences
      all: {
        map: function(doc) {
          if (doc.type === 'sequence') {
            emit(doc._id, doc);
          }
        }.toString()
      },
      // Vue: séquences par type (relance/suivi)
      by_type: {
        map: function(doc) {
          if (doc.type === 'sequence' && doc.sequence_type) {
            emit(doc.sequence_type, doc);
          }
        }.toString()
      },
      // Vue: séquences actives
      active: {
        map: function(doc) {
          if (doc.type === 'sequence' && doc.is_active !== false) {
            emit(doc.createdAt, doc);
          }
        }.toString()
      }
    }
  },
  {
    _id: '_design/drafts',
    views: {
      // Vue: tous les brouillons
      all: {
        map: function(doc) {
          if (doc.type === 'draft') {
            emit(doc._id, doc);
          }
        }.toString()
      },
      // Vue: brouillons par entité
      by_entity: {
        map: function(doc) {
          if (doc.type === 'draft' && doc.entity_type) {
            emit([doc.entity_type, doc.createdAt], doc);
          }
        }.toString()
      }
    }
  }
];

// ============================================
// ÉTAT INITIAL DU FORMULAIRE
// ============================================
const getInitialSequenceState = () => ({
  nom: '',
  sequence_type: 'relance',  // 'relance' ou 'suivi'
  description: '',
  is_active: true,
  emails: [],              // Liste des emails de la séquence
  created_from_draft: false
});

// ============================================
// WORKFLOW NOUVELLE SÉQUENCE - POUCHDB
// ============================================
function newSequenceWorkflow() {
  return {
    // ========================================
    // ÉTAT: Données (Alpine.js x-data)
    // ========================================
    sequences: [],             // Liste des séquences (chargée depuis PouchDB)
    searchQuery: '',
    filterType: 'all',         // 'all', 'relance', 'suivi'
    
    // Formulaire nouvelle séquence
    newSequence: getInitialSequenceState(),
    
    // ========================================
    // ÉTAT: Synchronisation (RÈGLE #9)
    // ========================================
    syncStatus: 'initial',     // 'initial' | 'syncing' | 'paused' | 'error' | 'complete'
    isOnline: navigator.onLine,
    lastSync: null,
    pendingChanges: 0,
    conflicts: [],           // Documents en conflit
    draftId: null,           // ID du brouillon sauvegardé
    
    // ========================================
    // ÉTAT: UI (Alpine.js x-data)
    // ========================================
    loading: true,
    error: null,
    successMessage: null,
    
    // Modals
    showNewSequenceModal: false,
    showEditSequenceModal: false,
    showDeleteModal: false,
    
    // Édition/Suppression
    editingSequence: null,
    deletingSequence: null,
    
    // ========================================
    // INSTANCES POUCHDB (RÈGLE #1)
    // ========================================
    localDB: null,             // PouchDB local (IndexedDB)
    remoteDB: null,            // PouchDB remote (CouchDB)
    syncHandler: null,         // Handler de réplication
    
    // ========================================
    // INITIALISATION
    // ========================================
    
    /**
     * @action Initialiser PouchDB et démarrer la réplication
     * @checkpoint wf-init
     */
    async init() {
      console.log('[CHECKPOINT] wf-init');
      this.loading = true;
      this.error = null;
      
      try {
        // 1. Initialiser PouchDB local (RÈGLE #1)
        this.localDB = new PouchDB(COUCHDB_CONFIG.dbName);
        console.log('[POUCHDB] Base locale initialisée:', COUCHDB_CONFIG.dbName);
        
        // 2. Initialiser PouchDB remote (RÈGLE #1)
        const remoteUrl = `${COUCHDB_CONFIG.url}/${COUCHDB_CONFIG.dbName}`;
        this.remoteDB = new PouchDB(remoteUrl, { skip_setup: true });
        console.log('[POUCHDB] Base remote initialisée:', remoteUrl);
        
        console.log('[CHECKPOINT] wf-db-ready');
        
        // 3. Créer les design documents (RÈGLE #5)
        await this.ensureDesignDocs();
        console.log('[CHECKPOINT] wf-design-docs');
        
        // 4. Configurer la réplication bidirectionnelle (RÈGLE #3)
        await this.setupReplication();
        console.log('[CHECKPOINT] wf-sync-active');
        
        // 5. Charger les séquences existantes (RÈGLE #6)
        await this.loadSequences();
        
        // 6. Charger le brouillon sauvegardé (RÈGLE #6)
        await this.loadDraft();
        console.log('[CHECKPOINT] wf-draft-loaded');
        
        // 7. Configurer les écouteurs réseau (RÈGLE #7)
        this.setupNetworkListeners();
        
        this.loading = false;
        console.log('[CHECKPOINT] wf-complete');
        
      } catch (err) {
        console.error('[CHECKPOINT] wf-error', err);
        this.error = err.message;
        this.syncStatus = 'error';
        this.loading = false;
      }
    },
    
    /**
     * @action Créer/mettre à jour les design documents (RÈGLE #5)
     */
    async ensureDesignDocs() {
      for (const doc of DESIGN_DOCS) {
        try {
          const existing = await this.localDB.get(doc._id);
          // Mettre à jour si les vues ont changé
          if (JSON.stringify(existing.views) !== JSON.stringify(doc.views)) {
            await this.localDB.put({
              ...doc,
              _rev: existing._rev
            });
            console.log('[DESIGN DOC] Mis à jour:', doc._id);
          }
        } catch (err) {
          if (err.status === 404) {
            // Créer le design document
            await this.localDB.put(doc);
            console.log('[DESIGN DOC] Créé:', doc._id);
          } else {
            throw err;
          }
        }
      }
    },
    
    /**
     * @action Configurer la réplication bidirectionnelle (RÈGLE #3)
     */
    async setupReplication() {
      console.log('[SYNC] Démarrage réplication bidirectionnelle...');
      this.syncStatus = 'syncing';
      
      // Réplication bidirectionnelle avec sync (RÈGLE #3)
      this.syncHandler = this.localDB.sync(this.remoteDB, {
        live: COUCHDB_CONFIG.options.live,
        retry: COUCHDB_CONFIG.options.retry,
        heartbeat: COUCHDB_CONFIG.options.heartbeat,
        timeout: COUCHDB_CONFIG.options.timeout
      })
      .on('change', (info) => {
        // Changement reçu (push ou pull)
        console.log('[SYNC] Changement:', info);
        this.pendingChanges = info.change?.pending || 0;
        
        // Si des données arrivent du serveur, recharger les séquences
        if (info.direction === 'pull' && info.change?.docs?.length > 0) {
          console.log('[SYNC] Données reçues du serveur:', info.change.docs.length);
          this.loadSequences();
        }
      })
      .on('paused', (err) => {
        // Réplication en pause (RÈGLE #7)
        console.log('[SYNC] Réplication en pause');
        this.syncStatus = err ? 'error' : 'paused';
        this.lastSync = new Date().toISOString();
        
        if (err) {
          console.log('[SYNC] Pause due à une erreur:', err);
        }
      })
      .on('active', () => {
        // Réplication active (RÈGLE #7)
        console.log('[SYNC] Réplication active');
        this.syncStatus = 'syncing';
        this.isOnline = true;
      })
      .on('denied', (err) => {
        // Document rejeté (permissions)
        console.error('[SYNC] Document rejeté:', err);
        this.syncStatus = 'error';
      })
      .on('complete', (info) => {
        // Réplication terminée (si live: false)
        console.log('[SYNC] Réplication complète:', info);
        this.syncStatus = 'complete';
        this.lastSync = new Date().toISOString();
      })
      .on('error', (err) => {
        // Erreur de réplication
        console.error('[SYNC] Erreur réplication:', err);
        this.syncStatus = 'error';
        this.isOnline = false;
      });
    },
    
    // ========================================
    // OPÉRATIONS CRUD (RÈGLE #2)
    // ========================================
    
    /**
     * @action Charger les séquences depuis PouchDB local (RÈGLE #6)
     */
    async loadSequences() {
      console.log('[DATA] Chargement séquences...');
      
      try {
        // RÈGLE #6: Lecture depuis PouchDB local (RÈGLE #2: db.query)
        const result = await this.localDB.query('sequences/all', {
          include_docs: true,
          conflicts: true  // RÈGLE #4: Détecter les conflits
        });
        
        // Mapper les documents avec _id et _rev (RÈGLE #10)
        this.sequences = result.rows.map(row => ({
          ...row.doc,
          id: row.doc._id,  // Alias pour compatibilité
          hasConflicts: !!(row.doc._conflicts && row.doc._conflicts.length > 0)
        }));
        
        // Détecter les documents en conflit (RÈGLE #4)
        this.conflicts = result.rows
          .filter(row => row.doc._conflicts && row.doc._conflicts.length > 0)
          .map(row => ({
            id: row.doc._id,
            rev: row.doc._rev,
            conflictRevs: row.doc._conflicts
          }));
        
        if (this.conflicts.length > 0) {
          console.warn('[CONFLICT] Documents en conflit:', this.conflicts);
        }
        
        console.log('[DATA] Séquences chargées:', this.sequences.length);
        
      } catch (err) {
        console.error('[DATA] Erreur chargement séquences:', err);
        // Fallback: charger tous les documents sans vue
        const allDocs = await this.localDB.allDocs({
          include_docs: true,
          conflicts: true
        });
        this.sequences = allDocs.rows
          .filter(row => row.doc.type === 'sequence')
          .map(row => ({
            ...row.doc,
            id: row.doc._id,
            hasConflicts: !!(row.doc._conflicts && row.doc._conflicts.length > 0)
          }));
      }
    },
    
    /**
     * @action Charger le brouillon sauvegardé (RÈGLE #2, #6)
     * Permet de restaurer le formulaire si l'utilisateur a quitté la page
     */
    async loadDraft() {
      console.log('[DATA] Chargement brouillon...');
      
      try {
        // ID fixe pour le brouillon de nouvelle séquence
        const draftDocId = 'draft_new_sequence';
        
        // RÈGLE #2: db.get pour récupérer le brouillon
        const draft = await this.localDB.get(draftDocId);
        
        // Restaurer l'état du formulaire
        if (draft && draft.data) {
          this.newSequence = {
            ...getInitialSequenceState(),
            ...draft.data
          };
          this.draftId = draft._id;
          console.log('[DATA] Brouillon restauré');
        }
        
        console.log('[CHECKPOINT] wf-draft-loaded');
        
      } catch (err) {
        if (err.status === 404) {
          // Pas de brouillon, c'est normal
          console.log('[DATA] Aucun brouillon trouvé');
        } else {
          console.error('[DATA] Erreur chargement brouillon:', err);
        }
      }
    },
    
    /**
     * @action Sauvegarder le brouillon (RÈGLE #2, #6, #10)
     * Auto-sauvegarde du formulaire dans PouchDB
     */
    async saveDraft() {
      console.log('[DATA] Sauvegarde brouillon...');
      
      // Ne pas sauvegarder si le formulaire est vide
      if (!this.newSequence.nom && !this.newSequence.description) {
        return;
      }
      
      const draftDocId = 'draft_new_sequence';
      
      const draftDoc = {
        _id: draftDocId,                           // RÈGLE #10: ID CouchDB fixe
        type: 'draft',
        entity_type: 'sequence',
        data: { ...this.newSequence },
        updatedAt: new Date().toISOString()
      };
      
      try {
        // Vérifier si le brouillon existe déjà
        try {
          const existing = await this.localDB.get(draftDocId);
          draftDoc._rev = existing._rev;            // RÈGLE #10: Conserver la révision
        } catch (err) {
          if (err.status !== 404) throw err;
          // Nouveau brouillon
        }
        
        // RÈGLE #2: db.put pour sauvegarder
        const result = await this.localDB.put(draftDoc);
        
        this.draftId = result.id;
        console.log('[DATA] Brouillon sauvegardé:', result.id);
        
      } catch (err) {
        console.error('[DATA] Erreur sauvegarde brouillon:', err);
      }
    },
    
    /**
     * @action Supprimer le brouillon (RÈGLE #2)
     * Appelé après création réussie d'une séquence
     */
    async deleteDraft() {
      console.log('[DATA] Suppression brouillon...');
      
      const draftDocId = 'draft_new_sequence';
      
      try {
        // RÈGLE #2: db.get puis db.remove
        const doc = await this.localDB.get(draftDocId);
        await this.localDB.remove(doc);
        
        this.draftId = null;
        console.log('[DATA] Brouillon supprimé');
        
      } catch (err) {
        if (err.status !== 404) {
          console.error('[DATA] Erreur suppression brouillon:', err);
        }
      }
    },
    
    // ========================================
    // WORKFLOW NOUVELLE SÉQUENCE
    // ========================================
    
    /**
     * @action Ouvrir le modal de création de séquence
     * Reset le formulaire, charge le brouillon si existe
     * @checkpoint wf-modal-opened
     */
    async newSequence() {
      console.log('[CHECKPOINT] wf-modal-opened');
      
      // 1. Reset form avec état initial
      this.newSequence = getInitialSequenceState();
      
      // 2. Charger le brouillon si existe (RÈGLE #6)
      await this.loadDraft();
      
      // 3. Show modal
      this.showNewSequenceModal = true;
      this.error = null;
      
      // 4. Focus first input (après le prochain tick DOM)
      this.$nextTick(() => {
        this.$refs.firstInput?.focus();
      });
      
      // 5. Démarrer l'auto-sauvegarde du brouillon
      this.startAutoSave();
      
      console.log('[CHECKPOINT] wf-complete');
    },
    
    /**
     * @action Fermer le modal de création
     */
    closeNewSequenceModal() {
      this.showNewSequenceModal = false;
      this.stopAutoSave();
      
      // Sauvegarder une dernière fois avant fermeture
      this.saveDraft();
    },
    
    /**
     * @action Auto-sauvegarde périodique du brouillon
     */
    autoSaveInterval: null,
    
    startAutoSave() {
      // Sauvegarder toutes les 5 secondes si modification
      this.autoSaveInterval = setInterval(() => {
        this.saveDraft();
      }, 5000);
    },
    
    stopAutoSave() {
      if (this.autoSaveInterval) {
        clearInterval(this.autoSaveInterval);
        this.autoSaveInterval = null;
      }
    },
    
    /**
     * @action Réinitialiser le formulaire
     */
    resetForm() {
      this.newSequence = getInitialSequenceState();
      this.error = null;
    },
    
    /**
     * @action Changer le type de séquence
     */
    setSequenceType(type) {
      this.newSequence.sequence_type = type;
      this.saveDraft(); // Auto-sauvegarde
    },
    
    // ========================================
    // FILTRAGE ET RECHERCHE
    // ========================================
    
    /**
     * @action Filtrer les séquences par type
     */
    setFilterType(type) {
      this.filterType = type;
    },
    
    /**
     * @action Définir la requête de recherche
     */
    setSearchQuery(query) {
      this.searchQuery = query;
    },
    
    /**
     * @action Séquences filtrées (computed-like)
     */
    get filteredSequences() {
      let result = [...this.sequences];
      
      // Filtre par type
      if (this.filterType !== 'all') {
        result = result.filter(seq => seq.sequence_type === this.filterType);
      }
      
      // Recherche textuelle
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        result = result.filter(seq => {
          const text = `${seq.nom || ''} ${seq.description || ''}`.toLowerCase();
          return text.includes(query);
        });
      }
      
      // Tri par date de création (plus récent en premier)
      result.sort((a, b) => {
        const dateA = new Date(b.createdAt || 0);
        const dateB = new Date(a.createdAt || 0);
        return dateA - dateB;
      });
      
      return result;
    },
    
    // ========================================
    // SYNCHRONISATION MANUELLE
    // ========================================
    
    /**
     * @action Forcer une synchronisation manuelle
     */
    async forceSync() {
      if (!this.isOnline) {
        return { success: false, error: 'Hors ligne' };
      }
      
      this.syncStatus = 'syncing';
      
      try {
        // Push vers CouchDB
        const pushResult = await this.localDB.replicate.to(this.remoteDB);
        console.log('[SYNC] Push:', pushResult);
        
        // Pull depuis CouchDB
        const pullResult = await this.localDB.replicate.from(this.remoteDB);
        console.log('[SYNC] Pull:', pullResult);
        
        // Recharger les séquences
        await this.loadSequences();
        
        this.syncStatus = 'complete';
        this.lastSync = new Date().toISOString();
        this.successMessage = 'Synchronisation terminée';
        
        return {
          success: true,
          pushed: pushResult.docs_written,
          pulled: pullResult.docs_written
        };
        
      } catch (err) {
        console.error('[SYNC] Erreur:', err);
        this.syncStatus = 'error';
        return { success: false, error: err.message };
      }
    },
    
    /**
     * @action Annuler la réplication
     */
    cancelReplication() {
      if (this.syncHandler) {
        this.syncHandler.cancel();
        this.syncStatus = 'paused';
        console.log('[SYNC] Réplication annulée');
      }
    },
    
    /**
     * @action Redémarrer la réplication
     */
    async restartReplication() {
      this.cancelReplication();
      await this.setupReplication();
    },
    
    // ========================================
    // GESTION RÉSEAU (RÈGLE #7)
    // ========================================
    
    /**
     * @action Configurer les écouteurs réseau (RÈGLE #7)
     */
    setupNetworkListeners() {
      window.addEventListener('online', () => {
        console.log('[NETWORK] En ligne');
        this.isOnline = true;
        this.syncStatus = 'syncing';
        
        // Redémarrer la réplication si nécessaire
        if (this.syncHandler && this.syncHandler.cancel) {
          this.restartReplication();
        }
      });
      
      window.addEventListener('offline', () => {
        console.log('[NETWORK] Hors ligne');
        this.isOnline = false;
        this.syncStatus = 'paused';
      });
    },
    
    // ========================================
    // PROPRIÉTÉS CALCULÉES (RÈGLE #8: Alpine.js)
    // ========================================
    
    // Classe CSS pour l'indicateur de sync (RÈGLE #9)
    get syncStatusClass() {
      const classes = {
        initial: 'bg-gray-400',
        syncing: 'bg-blue-500 animate-pulse',
        paused: this.isOnline ? 'bg-green-500' : 'bg-gray-500',
        error: 'bg-red-500',
        complete: 'bg-green-500'
      };
      return classes[this.syncStatus] || classes.initial;
    },
    
    // Libellé du statut de sync (RÈGLE #9)
    get syncStatusLabel() {
      const labels = {
        initial: 'Initialisation...',
        syncing: 'Synchronisation...',
        paused: this.isOnline ? 'À jour' : 'Hors ligne',
        error: 'Erreur de sync',
        complete: 'Synchronisé'
      };
      return labels[this.syncStatus] || 'Inconnu';
    },
    
    // Icone du statut
    get syncStatusIcon() {
      const icons = {
        initial: '⏳',
        syncing: '🔄',
        paused: this.isOnline ? '✓' : '⚠️',
        error: '❌',
        complete: '✅'
      };
      return icons[this.syncStatus] || '❓';
    },
    
    // Libellé du type de séquence
    get sequenceTypeLabel() {
      const labels = {
        relance: 'Relance',
        suivi: 'Suivi'
      };
      return labels[this.newSequence.sequence_type] || 'Inconnu';
    },
    
    // Nombre de séquences
    get sequencesCount() {
      return this.sequences.length;
    },
    
    // Nombre de séquences filtrées
    get filteredCount() {
      return this.filteredSequences.length;
    },
    
    // Format de la dernière sync
    get lastSyncFormatted() {
      if (!this.lastSync) return 'Jamais';
      const date = new Date(this.lastSync);
      return date.toLocaleString('fr-FR');
    },
    
    // Le formulaire est-il valide?
    get isFormValid() {
      return this.newSequence.nom?.trim().length > 0;
    },
    
    // ========================================
    // NETTOYAGE
    // ========================================
    
    /**
     * @action Détruire les instances (appeler au démontage)
     */
    destroy() {
      this.stopAutoSave();
      this.cancelReplication();
      console.log('[POUCHDB] Workflow new-sequence détruit');
    }
  };
}

// ============================================
// EXPORT
// ============================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    newSequenceWorkflow,
    COUCHDB_CONFIG,
    DESIGN_DOCS,
    getInitialSequenceState
  };
}

// Exposer globalement pour Alpine.js (RÈGLE #8)
if (typeof window !== 'undefined') {
  window.newSequenceWorkflow = newSequenceWorkflow;
  window.COUCHDB_CONFIG = COUCHDB_CONFIG;
  window.DESIGN_DOCS = DESIGN_DOCS;
  window.getInitialSequenceState = getInitialSequenceState;
}
