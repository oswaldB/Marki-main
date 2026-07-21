/**
 * Workflow: sequences-initial-load
 * Adapté pour PouchDB avec réplication CouchDB en temps réel
 * 
 * Pattern local-first : lectures depuis PouchDB local, écritures vers PouchDB
 * Synchronisation bidirectionnelle live avec gestion des conflits
 * 
 * @checkpoint wf-sequences-init
 * @checkpoint wf-sequences-pouchdb-ready
 * @checkpoint wf-sequences-design-docs-created
 * @checkpoint wf-sequences-sync-started
 * @checkpoint wf-sequences-data-fetched
 * @checkpoint wf-sequences-stats-calculated
 * @checkpoint wf-sequences-list-rendered
 * @checkpoint wf-sequences-complete
 * @checkpoint wf-sequences-error
 */

// ============================================
// CONFIGURATION COUCHDB
// ============================================
const COUCHDB_CONFIG = {
  url: window.location.hostname === 'localhost' 
    ? 'http://admin:admin@localhost:5984'
    : 'https://admin:admin@dev.markidiags.com/data',
  databases: {
    sequences: 'marki_sequences',
    impayes: 'marki_impayes'
  },
  options: {
    live: true,        // Réplication continue
    retry: true,       // Reconnexion automatique
    heartbeat: 10000,  // Ping toutes les 10s
    timeout: 30000     // Timeout de 30s
  }
};

// ============================================
// DESIGN DOCUMENTS (Vues Mango pour les séquences)
// ============================================
const DESIGN_DOCS = {
  sequences: [
    {
      _id: '_design/sequences',
      views: {
        // Toutes les séquences par type
        by_type: {
          map: function(doc) {
            if (doc.type === 'sequence') {
              emit(doc.sequence_type || 'relance', doc);
            }
          }.toString()
        },
        // Par statut actif/inactif
        by_actif: {
          map: function(doc) {
            if (doc.type === 'sequence') {
              emit(doc.actif ? 'actif' : 'inactif', doc);
            }
          }.toString()
        },
        // Toutes les séquences
        all: {
          map: function(doc) {
            if (doc.type === 'sequence') {
              emit(doc._id, doc);
            }
          }.toString()
        },
        // Par niveau
        by_niveau: {
          map: function(doc) {
            if (doc.type === 'sequence' && doc.niveau) {
              emit(doc.niveau, doc);
            }
          }.toString()
        }
      }
    },
    {
      _id: '_design/sequences_stats',
      views: {
        // Statistiques par type
        by_type_count: {
          map: function(doc) {
            if (doc.type === 'sequence') {
              emit(doc.sequence_type || 'relance', 1);
            }
          }.toString(),
          reduce: '_sum'
        },
        // Nombre total de séquences
        total: {
          map: function(doc) {
            if (doc.type === 'sequence') {
              emit('total', 1);
            }
          }.toString(),
          reduce: '_sum'
        }
      }
    }
  ],
  impayes: [
    {
      _id: '_design/impayes_by_sequence',
      views: {
        // Compter les impayés par sequence_id
        count_by_sequence: {
          map: function(doc) {
            if (doc.type === 'impaye' && doc.sequence_id) {
              emit(doc.sequence_id, 1);
            }
          }.toString(),
          reduce: '_sum'
        }
      }
    }
  ]
};

// ============================================
// WORKFLOW SÉQUENCES - VERSION POUCHDB
// ============================================
function sequencesPouchDBManager() {
  return {
    // ========================================
    // ÉTAT: Données
    // ========================================
    sequences: [],           // Liste complète des séquences
    filteredSequences: [],   // Liste filtrée
    impayes: [],            // Impayés pour calcul des stats
    
    // ========================================
    // ÉTAT: Synchronisation (RÈGLE #9)
    // ========================================
    syncStatus: 'initial', // 'initial' | 'syncing' | 'paused' | 'error' | 'complete'
    syncStatusImpayes: 'initial',
    isOnline: navigator.onLine,
    lastSync: null,
    pendingChanges: 0,
    conflicts: [],
    
    // ========================================
    // ÉTAT: UI / Loading
    // ========================================
    loading: true,
    skeletonVisible: true,
    error: null,
    
    // ========================================
    // ÉTAT: Filtres
    // ========================================
    filters: {
      type: 'all',          // 'all' | 'relance' | 'suivi'
      actif: null           // null | true | false
    },
    
    // ========================================
    // ÉTAT: Statistiques
    // ========================================
    stats: {
      total: 0,
      relance: 0,
      suivi: 0,
      actives: 0
    },
    
    // ========================================
    // INSTANCES POUCHDB (RÈGLE #1)
    // ========================================
    localDB: null,
    remoteDB: null,
    localImpayesDB: null,
    remoteImpayesDB: null,
    syncHandler: null,
    syncHandlerImpayes: null,
    
    // ========================================
    // INITIALISATION
    // ========================================
    
    /**
     * @action Initialiser PouchDB et charger les données
     * @checkpoint wf-sequences-init
     */
    async init() {
      console.log('[CHECKPOINT] wf-sequences-init');
      this.loading = true;
      this.skeletonVisible = true;
      this.error = null;
      
      try {
        // 1. Initialiser PouchDB local pour séquences (RÈGLE #1)
        this.localDB = new PouchDB(COUCHDB_CONFIG.databases.sequences);
        console.log('[POUCHDB] Base locale séquences:', COUCHDB_CONFIG.databases.sequences);
        
        // 2. Initialiser PouchDB local pour impayés (pour les stats)
        this.localImpayesDB = new PouchDB(COUCHDB_CONFIG.databases.impayes);
        console.log('[POUCHDB] Base locale impayés:', COUCHDB_CONFIG.databases.impayes);
        
        // 3. Initialiser PouchDB remote (RÈGLE #1)
        const remoteUrl = `${COUCHDB_CONFIG.url}/${COUCHDB_CONFIG.databases.sequences}`;
        this.remoteDB = new PouchDB(remoteUrl, { skip_setup: true });
        
        const remoteImpayesUrl = `${COUCHDB_CONFIG.url}/${COUCHDB_CONFIG.databases.impayes}`;
        this.remoteImpayesDB = new PouchDB(remoteImpayesUrl, { skip_setup: true });
        
        console.log('[CHECKPOINT] wf-sequences-pouchdb-ready');
        
        // 4. Créer les design documents (RÈGLE #5)
        await this.ensureDesignDocs();
        console.log('[CHECKPOINT] wf-sequences-design-docs-created');
        
        // 5. Configurer la réplication (RÈGLE #3)
        await this.setupReplication();
        console.log('[CHECKPOINT] wf-sequences-sync-started');
        
        // 6. Charger les données depuis PouchDB local (RÈGLE #6)
        await this.loadSequences();
        await this.loadImpayes();
        console.log('[CHECKPOINT] wf-sequences-data-fetched');
        
        // 7. Calculer les statistiques
        await this.calculateStats();
        console.log('[CHECKPOINT] wf-sequences-stats-calculated');
        
        // 8. Appliquer filtres
        this.applyFilters();
        
        // 9. Masquer le skeleton
        this.skeletonVisible = false;
        this.loading = false;
        console.log('[CHECKPOINT] wf-sequences-list-rendered');
        
        // 10. Configurer les écouteurs réseau (RÈGLE #7)
        this.setupNetworkListeners();
        
        console.log('[CHECKPOINT] wf-sequences-complete');
        
      } catch (err) {
        console.error('[CHECKPOINT] wf-sequences-error', err);
        this.error = err.message;
        this.syncStatus = 'error';
        this.loading = false;
        this.skeletonVisible = false;
      }
    },
    
    /**
     * @action Créer les design documents (RÈGLE #5)
     */
    async ensureDesignDocs() {
      // Design docs pour séquences
      for (const doc of DESIGN_DOCS.sequences) {
        try {
          const existing = await this.localDB.get(doc._id);
          if (JSON.stringify(existing.views) !== JSON.stringify(doc.views)) {
            await this.localDB.put({ ...doc, _rev: existing._rev });
            console.log('[DESIGN DOC] Séquences mis à jour:', doc._id);
          }
        } catch (err) {
          if (err.status === 404) {
            await this.localDB.put(doc);
            console.log('[DESIGN DOC] Séquences créé:', doc._id);
          }
        }
      }
      
      // Design docs pour impayés
      for (const doc of DESIGN_DOCS.impayes) {
        try {
          const existing = await this.localImpayesDB.get(doc._id);
          if (JSON.stringify(existing.views) !== JSON.stringify(doc.views)) {
            await this.localImpayesDB.put({ ...doc, _rev: existing._rev });
            console.log('[DESIGN DOC] Impayés mis à jour:', doc._id);
          }
        } catch (err) {
          if (err.status === 404) {
            await this.localImpayesDB.put(doc);
            console.log('[DESIGN DOC] Impayés créé:', doc._id);
          }
        }
      }
    },
    
    /**
     * @action Configurer la réplication bidirectionnelle (RÈGLE #3)
     */
    async setupReplication() {
      console.log('[SYNC] Démarrage réplication...');
      this.syncStatus = 'syncing';
      this.syncStatusImpayes = 'syncing';
      
      // Sync séquences
      this.syncHandler = this.localDB.sync(this.remoteDB, {
        live: COUCHDB_CONFIG.options.live,
        retry: COUCHDB_CONFIG.options.retry,
        heartbeat: COUCHDB_CONFIG.options.heartbeat,
        timeout: COUCHDB_CONFIG.options.timeout
      })
      .on('change', (info) => {
        console.log('[SYNC Séquences] Changement:', info);
        this.pendingChanges = info.change?.pending || 0;
        if (info.direction === 'pull' && info.change?.docs?.length > 0) {
          this.loadSequences();
          this.calculateStats();
        }
      })
      .on('paused', (err) => {
        console.log('[SYNC Séquences] En pause');
        this.syncStatus = err ? 'error' : 'paused';
        this.lastSync = new Date().toISOString();
      })
      .on('active', () => {
        console.log('[SYNC Séquences] Active');
        this.syncStatus = 'syncing';
        this.isOnline = true;
      })
      .on('error', (err) => {
        console.error('[SYNC Séquences] Erreur:', err);
        this.syncStatus = 'error';
        this.isOnline = false;
      });
      
      // Sync impayés (pour les stats)
      this.syncHandlerImpayes = this.localImpayesDB.sync(this.remoteImpayesDB, {
        live: COUCHDB_CONFIG.options.live,
        retry: COUCHDB_CONFIG.options.retry
      })
      .on('change', (info) => {
        if (info.direction === 'pull') {
          this.loadImpayes();
          this.calculateStats();
        }
      })
      .on('paused', (err) => {
        this.syncStatusImpayes = err ? 'error' : 'paused';
      })
      .on('active', () => {
        this.syncStatusImpayes = 'syncing';
      })
      .on('error', () => {
        this.syncStatusImpayes = 'error';
      });
    },
    
    // ========================================
    // CHARGEMENT DES DONNÉES (RÈGLE #2, #6)
    // ========================================
    
    /**
     * @action Charger les séquences depuis PouchDB local
     * @checkpoint wf-sequences-data-fetched
     */
    async loadSequences() {
      try {
        // RÈGLE #2: Utiliser db.query avec vue Mango
        // RÈGLE #4: Inclure les conflits
        const result = await this.localDB.query('sequences/all', {
          include_docs: true,
          conflicts: true
        });
        
        // Mapper les documents avec _id et _rev (RÈGLE #10)
        this.sequences = result.rows.map(row => {
          const seq = row.doc;
          // Enrichir avec nombre d'étapes (calculé côté client)
          const nbEtapes = seq.emails ? seq.emails.length : 0;
          return {
            ...seq,
            id: seq._id,
            nbEtapes: nbEtapes,
            hasConflicts: !!(row.doc._conflicts && row.doc._conflicts.length > 0)
          };
        });
        
        // Détecter les conflits (RÈGLE #4)
        this.conflicts = result.rows
          .filter(row => row.doc._conflicts && row.doc._conflicts.length > 0)
          .map(row => ({
            id: row.doc._id,
            rev: row.doc._rev,
            conflictRevs: row.doc._conflicts
          }));
        
        console.log('[DATA] Séquences chargées:', this.sequences.length);
        
      } catch (err) {
        console.error('[DATA] Erreur chargement vues séquences:', err);
        // Fallback: charger tous les documents
        const allDocs = await this.localDB.allDocs({
          include_docs: true,
          conflicts: true
        });
        
        this.sequences = allDocs.rows
          .filter(row => row.doc.type === 'sequence')
          .map(row => ({
            ...row.doc,
            id: row.doc._id,
            nbEtapes: row.doc.emails ? row.doc.emails.length : 0,
            hasConflicts: !!(row.doc._conflicts && row.doc._conflicts.length > 0)
          }));
        
        console.log('[DATA] Séquences chargées (fallback):', this.sequences.length);
      }
    },
    
    /**
     * @action Charger les impayés pour calcul des stats
     */
    async loadImpayes() {
      try {
        const result = await this.localImpayesDB.query('impayes_by_sequence/count_by_sequence', {
          reduce: true,
          group: true
        });
        
        // Stocker le mapping sequence_id -> count
        this.impayesCountBySequence = {};
        result.rows.forEach(row => {
          this.impayesCountBySequence[row.key] = row.value;
        });
        
        console.log('[DATA] Impayés par séquence:', this.impayesCountBySequence);
        
      } catch (err) {
        console.error('[DATA] Erreur chargement impayés:', err);
        this.impayesCountBySequence = {};
      }
    },
    
    /**
     * @action Calculer les statistiques depuis CouchDB
     * @checkpoint wf-sequences-stats-calculated
     */
    async calculateStats() {
      try {
        // RÈGLE #2: Utiliser db.query avec reduce
        const result = await this.localDB.query('sequences_stats/by_type_count', {
          reduce: true,
          group: true
        });
        
        // Mapper les résultats
        const statsMap = {};
        result.rows.forEach(row => {
          statsMap[row.key] = row.value;
        });
        
        // Compter les actives
        const actives = this.sequences.filter(s => s.actif).length;
        
        this.stats = {
          total: statsMap['relance'] + statsMap['suivi'] || this.sequences.length,
          relance: statsMap['relance'] || 0,
          suivi: statsMap['suivi'] || 0,
          actives: actives
        };
        
        // Enrichir les séquences avec le nombre d'impayés liés
        this.sequences = this.sequences.map(seq => ({
          ...seq,
          nbFactures: this.impayesCountBySequence[seq._id] || 0
        }));
        
        console.log('[STATS] Calculées:', this.stats);
        
      } catch (err) {
        console.error('[STATS] Erreur, calcul local:', err);
        this.calculateStatsLocally();
      }
    },
    
    calculateStatsLocally() {
      const relance = this.sequences.filter(s => s.sequence_type === 'relance').length;
      const suivi = this.sequences.filter(s => s.sequence_type === 'suivi').length;
      const actives = this.sequences.filter(s => s.actif).length;
      
      this.stats = {
        total: this.sequences.length,
        relance: relance,
        suivi: suivi,
        actives: actives
      };
      
      // Enrichir avec nombre d'impayés (si pas de vue disponible)
      this.sequences = this.sequences.map(seq => ({
        ...seq,
        nbFactures: this.impayesCountBySequence[seq._id] || 0
      }));
    },
    
    // ========================================
    // FILTRAGE
    // ========================================
    
    /**
     * @action Appliquer les filtres
     */
    applyFilters() {
      let result = [...this.sequences];
      
      // Filtre par type
      if (this.filters.type && this.filters.type !== 'all') {
        result = result.filter(s => s.sequence_type === this.filters.type);
      }
      
      // Filtre par actif
      if (this.filters.actif !== null) {
        result = result.filter(s => s.actif === this.filters.actif);
      }
      
      this.filteredSequences = result;
    },
    
    /**
     * @action Définir le filtre type
     */
    setTypeFilter(type) {
      this.filters.type = type;
      this.applyFilters();
    },
    
    /**
     * @action Définir le filtre actif
     */
    setActifFilter(actif) {
      this.filters.actif = actif;
      this.applyFilters();
    },
    
    // ========================================
    // CRUD OPÉRATIONS (RÈGLE #2)
    // ========================================
    
    /**
     * @action Créer une nouvelle séquence (RÈGLE #2: db.put)
     */
    async createSequence(sequenceData) {
      try {
        const doc = {
          _id: `sequence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'sequence',
          ...sequenceData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const result = await this.localDB.put(doc);
        console.log('[CREATE] Séquence créée:', result.id);
        
        // Recharger les données
        await this.loadSequences();
        this.applyFilters();
        
        return { success: true, id: result.id };
        
      } catch (err) {
        console.error('[CREATE] Erreur:', err);
        return { success: false, error: err.message };
      }
    },
    
    /**
     * @action Mettre à jour une séquence (RÈGLE #2: db.get + db.put avec _rev)
     */
    async updateSequence(id, updates) {
      try {
        // RÈGLE #10: Récupérer avec _rev
        const doc = await this.localDB.get(id);
        
        const updatedDoc = {
          ...doc,
          ...updates,
          _id: id,
          _rev: doc._rev,  // RÈGLE #10: Inclure la révision
          updated_at: new Date().toISOString()
        };
        
        const result = await this.localDB.put(updatedDoc);
        console.log('[UPDATE] Séquence mise à jour:', id);
        
        // Recharger les données
        await this.loadSequences();
        this.applyFilters();
        
        return { success: true, rev: result.rev };
        
      } catch (err) {
        // Gestion des conflits (RÈGLE #4)
        if (err.status === 409) {
          console.error('[CONFLICT] Conflit de révision sur:', id);
          return { success: false, error: 'conflict', message: err.message };
        }
        console.error('[UPDATE] Erreur:', err);
        return { success: false, error: err.message };
      }
    },
    
    /**
     * @action Supprimer une séquence (RÈGLE #2: db.remove avec _rev)
     */
    async deleteSequence(id) {
      try {
        // RÈGLE #10: Récupérer avec _rev pour suppression
        const doc = await this.localDB.get(id);
        
        await this.localDB.remove(doc);
        console.log('[DELETE] Séquence supprimée:', id);
        
        // Recharger les données
        await this.loadSequences();
        this.applyFilters();
        
        return { success: true };
        
      } catch (err) {
        console.error('[DELETE] Erreur:', err);
        return { success: false, error: err.message };
      }
    },
    
    /**
     * @action Dupliquer une séquence
     */
    async duplicateSequence(id) {
      try {
        const doc = await this.localDB.get(id);
        
        const newDoc = {
          ...doc,
          _id: undefined,
          _rev: undefined,
          nom: `${doc.nom} (copie)`,
          actif: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Générer nouvel ID
        delete newDoc._id;
        delete newDoc._rev;
        newDoc._id = `sequence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const result = await this.localDB.put(newDoc);
        console.log('[DUPLICATE] Séquence dupliquée:', result.id);
        
        await this.loadSequences();
        this.applyFilters();
        
        return { success: true, id: result.id };
        
      } catch (err) {
        console.error('[DUPLICATE] Erreur:', err);
        return { success: false, error: err.message };
      }
    },
    
    /**
     * @action Résoudre un conflit (RÈGLE #4)
     */
    async resolveConflict(id, winningRev) {
      try {
        const doc = await this.localDB.get(id, { conflicts: true });
        
        if (!doc._conflicts) return;
        
        // Supprimer les révisions conflictuelles
        for (const conflictRev of doc._conflicts) {
          if (conflictRev !== winningRev) {
            const conflictDoc = await this.localDB.get(id, { rev: conflictRev });
            await this.localDB.remove(conflictDoc);
            console.log('[CONFLICT] Révision supprimée:', conflictRev);
          }
        }
        
        // Recharger
        await this.loadSequences();
        
      } catch (err) {
        console.error('[CONFLICT] Erreur résolution:', err);
      }
    },
    
    // ========================================
    // SYNCHRONISATION MANUELLE
    // ========================================
    
    async forceSync() {
      if (!this.isOnline) return;
      
      this.syncStatus = 'syncing';
      
      try {
        // RÈGLE #3: Réplication manuelle bidirectionnelle
        const pushResult = await this.localDB.replicate.to(this.remoteDB);
        const pullResult = await this.localDB.replicate.from(this.remoteDB);
        
        // Sync impayés aussi
        await this.localImpayesDB.replicate.to(this.remoteImpayesDB);
        await this.localImpayesDB.replicate.from(this.remoteImpayesDB);
        
        await this.loadSequences();
        await this.loadImpayes();
        await this.calculateStats();
        this.applyFilters();
        
        this.syncStatus = 'complete';
        this.lastSync = new Date().toISOString();
        
        console.log('[SYNC] Manuelle terminée:', {
          pushed: pushResult.docs_written,
          pulled: pullResult.docs_written
        });
        
      } catch (err) {
        this.syncStatus = 'error';
        console.error('[SYNC] Erreur:', err);
      }
    },
    
    // ========================================
    // GESTION RÉSEAU (RÈGLE #7)
    // ========================================
    
    setupNetworkListeners() {
      window.addEventListener('online', () => {
        console.log('[NETWORK] En ligne');
        this.isOnline = true;
        this.syncStatus = 'syncing';
        if (this.syncHandler) {
          this.syncHandler.cancel();
          this.setupReplication();
        }
      });
      
      window.addEventListener('offline', () => {
        console.log('[NETWORK] Hors ligne');
        this.isOnline = false;
        this.syncStatus = 'paused';
      });
    },
    
    // ========================================
    // UTILITAIRES D'AFFICHAGE
    // ========================================
    
    getSequenceTypeLabel(type) {
      const labels = {
        relance: 'Relance',
        suivi: 'Suivi'
      };
      return labels[type] || type;
    },
    
    getSequenceTypeClass(type) {
      const classes = {
        relance: 'bg-amber-100 text-amber-800',
        suivi: 'bg-blue-100 text-blue-800'
      };
      return classes[type] || 'bg-gray-100 text-gray-800';
    },
    
    // ========================================
    // PROPRIÉTÉS CALCULÉES (RÈGLE #8: Alpine.js)
    // ========================================
    
    get syncStatusClass() {
      const classes = {
        initial: 'bg-gray-400',
        syncing: 'bg-blue-500 animate-pulse',
        paused: this.isOnline ? 'bg-green-500' : 'bg-yellow-500',
        error: 'bg-red-500',
        complete: 'bg-green-500'
      };
      return classes[this.syncStatus] || classes.initial;
    },
    
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
    
    get hasConflicts() {
      return this.conflicts.length > 0;
    }
  };
}

// ============================================
// EXPORT (RÈGLE #8)
// ============================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    sequencesPouchDBManager,
    COUCHDB_CONFIG,
    DESIGN_DOCS
  };
}

if (typeof window !== 'undefined') {
  window.sequencesPouchDBManager = sequencesPouchDBManager;
  window.COUCHDB_CONFIG = COUCHDB_CONFIG;
  window.DESIGN_DOCS = DESIGN_DOCS;
}
