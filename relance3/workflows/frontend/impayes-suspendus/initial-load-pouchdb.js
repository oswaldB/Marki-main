/**
 * Workflow: impayes-suspendus-initial-load-pouchdb
 * Description: Charger la liste des factures suspendues avec PouchDB + réplication live CouchDB
 * 
 * Architecture:
 * - PouchDB côté frontend (stockage local IndexedDB)
 * - Réplication bidirectionnelle live avec CouchDB
 * - Pattern local-first: lectures locales, écritures locales qui répliquent
 * - Gestion des conflits et états de synchronisation
 */

// ============================================
// CONFIGURATION COUCHDB
// ============================================
const COUCHDB_CONFIG = {
  url: 'http://localhost:5984',
  database: 'adti_impayes',
  username: 'admin',
  password: 'password'
};

// ============================================
// DESIGN DOCUMENTS (Vues Mango)
// ============================================
const DESIGN_DOCS = {
  _id: '_design/impayes',
  views: {
    by_statut: {
      map: function(doc) {
        if (doc.type === 'impaye' && doc.statut) {
          emit(doc.statut, doc);
        }
      }.toString()
    },
    by_suspension: {
      map: function(doc) {
        if (doc.type === 'impaye' && doc.is_suspended === true) {
          emit(doc.blacklist_motif || 'Non spécifié', doc);
        }
      }.toString()
    },
    by_payer: {
      map: function(doc) {
        if (doc.type === 'impaye' && doc.payer_id) {
          emit(doc.payer_id, doc);
        }
      }.toString()
    },
    suspended_with_motif: {
      map: function(doc) {
        if (doc.type === 'impaye' && doc.is_suspended === true) {
          emit([doc.suspended_at, doc.blacklist_motif], {
            _id: doc._id,
            facture_numero: doc.facture_numero,
            montant: doc.montant,
            blacklist_motif: doc.blacklist_motif,
            suspended_at: doc.suspended_at,
            suspended_by: doc.suspended_by,
            payer_nom: doc.payer_nom
          });
        }
      }.toString()
    }
  }
};

// ============================================
// INITIALISATION POUCHDB
// ============================================

/**
 * Initialise PouchDB avec les design documents
 * @param {string} localDbName - Nom de la base locale
 * @returns {PouchDB} Instance PouchDB
 */
async function initPouchDB(localDbName = 'adti_impayes_local') {
  // Créer la base locale
  const localDB = new PouchDB(localDbName);
  
  // Vérifier et créer les design documents
  try {
    const existing = await localDB.get('_design/impayes');
    // Mettre à jour si nécessaire
    DESIGN_DOCS._rev = existing._rev;
    await localDB.put(DESIGN_DOCS);
  } catch (err) {
    if (err.status === 404) {
      await localDB.put(DESIGN_DOCS);
    }
  }
  
  console.log('[CHECKPOINT] pouchdb-initialized, base locale prête');
  return localDB;
}

// ============================================
// GESTION SYNCHRONISATION
// ============================================

/**
 * Gère la réplication bidirectionnelle PouchDB <-> CouchDB
 * @param {PouchDB} localDB - Base locale
 * @returns {Object} Contrôleurs de synchronisation
 */
function setupReplication(localDB) {
  const remoteUrl = `${COUCHDB_CONFIG.url}/${COUCHDB_CONFIG.database}`;
  const remoteDB = new PouchDB(remoteUrl, {
    auth: {
      username: COUCHDB_CONFIG.username,
      password: COUCHDB_CONFIG.password
    }
  });
  
  // Sync bidirectionnel en live avec retry
  const syncHandler = localDB.sync(remoteDB, {
    live: true,
    retry: true,
    conflicts: true,  // IMPORTANT: Activer la gestion des conflits
    batch_size: 100,
    batches_limit: 5
  });
  
  // État de synchronisation pour Alpine
  const syncState = {
    status: 'initializing', // initializing, active, paused, error, offline
    direction: null,        // push, pull, sync
    lastSeq: null,
    pending: 0,
    errors: []
  };
  
  // Events de synchronisation
  syncHandler
    .on('change', (info) => {
      syncState.direction = info.direction;
      syncState.lastSeq = info.change && info.change.last_seq;
      console.log(`[SYNC] ${info.direction}:`, info.change);
      
      // Mettre à jour le store Alpine si disponible
      if (window.Alpine && Alpine.store('sync')) {
        Alpine.store('sync').updateState({
          status: 'active',
          direction: info.direction,
          lastSync: new Date()
        });
      }
    })
    .on('paused', (err) => {
      // Réplication en pause (généralement en attente de changements)
      syncState.status = err ? 'error' : 'paused';
      console.log('[SYNC] paused:', err || 'En attente de changements');
      
      if (window.Alpine && Alpine.store('sync')) {
        Alpine.store('sync').updateState({
          status: err ? 'error' : 'online',
          error: err
        });
      }
    })
    .on('active', () => {
      // Réplication active
      syncState.status = 'active';
      console.log('[SYNC] active: Réplication en cours...');
      
      if (window.Alpine && Alpine.store('sync')) {
        Alpine.store('sync').updateState({ status: 'syncing' });
      }
    })
    .on('denied', (err) => {
      // Document rejeté (permissions)
      console.error('[SYNC] denied:', err);
      syncState.errors.push({ type: 'denied', error: err, time: new Date() });
      
      if (window.Alpine && Alpine.store('sync')) {
        Alpine.store('sync').addError({ type: 'denied', message: err.message });
      }
    })
    .on('complete', (info) => {
      console.log('[SYNC] complete:', info);
      syncState.status = 'completed';
    })
    .on('error', (err) => {
      console.error('[SYNC] error:', err);
      syncState.status = 'error';
      syncState.errors.push({ type: 'error', error: err, time: new Date() });
      
      if (window.Alpine && Alpine.store('sync')) {
        Alpine.store('sync').updateState({ status: 'error', error: err.message });
      }
    });
  
  console.log('[CHECKPOINT] replication-setup, sync live active');
  
  return {
    handler: syncHandler,
    state: syncState,
    cancel: () => syncHandler.cancel(),
    
    // Forcer une synchronisation manuelle
    syncNow: async () => {
      try {
        const result = await localDB.replicate.to(remoteDB);
        await localDB.replicate.from(remoteDB);
        return { success: true, result };
      } catch (err) {
        return { success: false, error: err };
      }
    }
  };
}

// ============================================
// GESTION DES CONFLITS
// ============================================

/**
 * Résout les conflits de réplication
 * @param {PouchDB} db - Instance PouchDB
 * @param {string} docId - ID du document en conflit
 */
async function resolveConflict(db, docId) {
  try {
    // Récupérer le document avec les révisions conflictuelles
    const doc = await db.get(docId, { conflicts: true });
    
    if (!doc._conflicts || doc._conflicts.length === 0) {
      return { resolved: false, reason: 'No conflicts' };
    }
    
    console.log(`[CONFLICT] Résolution pour ${docId}:`, doc._conflicts);
    
    // Stratégie: garder la version la plus récente (winning rev)
    // OU fusionner les données selon la logique métier
    const conflictingRevs = doc._conflicts;
    const revisions = await Promise.all(
      conflictingRevs.map(rev => db.get(docId, { rev }))
    );
    
    // Stratégie de fusion personnalisée
    const merged = mergeConflictingDocs(doc, revisions);
    
    // Supprimer les révisions conflictuelles
    for (const rev of conflictingRevs) {
      await db.remove(docId, rev);
    }
    
    // Mettre à jour avec la version fusionnée
    delete doc._conflicts;
    Object.assign(doc, merged);
    await db.put(doc);
    
    console.log('[CHECKPOINT] conflict-resolved, document fusionné');
    return { resolved: true, doc: merged };
    
  } catch (err) {
    console.error('[CONFLICT] Erreur résolution:', err);
    return { resolved: false, error: err };
  }
}

/**
 * Fusionne les documents en conflit (logique métier personnalisée)
 */
function mergeConflictingDocs(winningDoc, conflictingDocs) {
  // Stratégie: garder les valeurs non-nulles, privilégier les données les plus récentes
  const merged = { ...winningDoc };
  
  for (const conflictDoc of conflictingDocs) {
    // Pour les champs timestamp, prendre le plus récent
    if (conflictDoc.updated_at && merged.updated_at) {
      if (new Date(conflictDoc.updated_at) > new Date(merged.updated_at)) {
        merged.updated_at = conflictDoc.updated_at;
        merged.updated_by = conflictDoc.updated_by;
      }
    }
    
    // Pour les champs critiques (suspension), garder l'état le plus restrictif
    if (conflictDoc.is_suspended === true) {
      merged.is_suspended = true;
      merged.blacklist_motif = conflictDoc.blacklist_motif || merged.blacklist_motif;
    }
  }
  
  return merged;
}

// ============================================
// WORKFLOW ALPINE.JS AVEC POUCHDB
// ============================================

/**
 * @workflow impayes-suspendus-initial-load-pouchdb
 * @description Chargement initial des impayés suspendus avec PouchDB local-first
 */

// Store global pour la synchronisation
Alpine.store('sync', {
  status: 'initializing', // initializing, online, offline, syncing, error
  lastSync: null,
  pendingChanges: 0,
  errors: [],
  
  init() {
    console.log('[CHECKPOINT] sync-store-initialized');
  },
  
  updateState(newState) {
    Object.assign(this, newState);
  },
  
  addError(error) {
    this.errors.push({ ...error, timestamp: new Date() });
    if (this.errors.length > 10) this.errors.shift();
  },
  
  get isOnline() {
    return this.status === 'online' || this.status === 'syncing';
  },
  
  get isSyncing() {
    return this.status === 'syncing';
  }
});

// Composant Alpine pour la gestion des impayés suspendus
document.addEventListener('alpine:init', () => {
  
  Alpine.data('impayesSuspendusPouchDB', () => ({
    // ========================================
    // ÉTAT (State)
    // ========================================
    db: null,                    // Instance PouchDB
    syncManager: null,           // Gestionnaire de sync
    syncStatus: 'initializing',  // État de sync pour le template
    
    // Données
    facturesSuspendues: [],
    motifs: [],
    filters: {
      motif: '',
      search: ''
    },
    
    // UI
    isLoading: true,
    skeletonRows: 5,
    error: null,
    
    // ========================================
    // INITIALISATION
    // ========================================
    
    async init() {
      /**
       * @action Initialiser PouchDB et la réplication
       * @checkpoint pouchdb-init-started
       */
      console.log('[CHECKPOINT] state-initialized, filtres prêts');
      
      try {
        // Initialiser la base locale
        this.db = await initPouchDB();
        
        // Configurer la réplication live
        this.syncManager = setupReplication(this.db);
        
        // Écouter les changements de statut
        this.$watch('syncManager.state.status', (value) => {
          this.syncStatus = value;
        });
        
        console.log('[CHECKPOINT] pouchdb-ready, réplication configurée');
        
        /**
         * @action Afficher le skeleton loader
         * @checkpoint skeleton-shown
         */
        this.isLoading = true;
        
        // Charger les données depuis PouchDB (local-first)
        await this.loadSuspendedImpayes();
        
      } catch (err) {
        console.error('[ERROR] Initialisation PouchDB:', err);
        this.error = err.message;
        this.syncStatus = 'error';
      }
    },
    
    // ========================================
    // OPÉRATIONS POUCHDB (READ)
    // ========================================
    
    async loadSuspendedImpayes() {
      /**
       * @action Récupérer les impayés suspendus via vue PouchDB
       * @checkpoint suspendus-fetched
       * 
       * Approche local-first: Lecture depuis PouchDB local
       * Les données sont synchronisées automatiquement depuis CouchDB
       */
      try {
        // Utiliser la vue Mango pour les impayés suspendus
        const result = await this.db.query('impayes/by_suspension', {
          include_docs: true,
          conflicts: true  // IMPORTANT: Récupérer les conflits
        });
        
        console.log('[CHECKPOINT] suspendus-fetched,', result.rows.length, 'factures');
        
        // Transformer les résultats
        this.facturesSuspendues = result.rows.map(row => ({
          ...row.doc,
          _conflicts: row.doc._conflicts || []  // Conserver info conflits
        }));
        
        /**
         * @action Extraire les motifs uniques
         * @checkpoint motifs-extracted
         */
        this.extractMotifs();
        
        /**
         * @action Rendre le tableau
         * @checkpoint table-rendered
         */
        this.isLoading = false;
        
        console.log('[CHECKPOINT] data-stored,', this.facturesSuspendues.length, 'factures disponibles');
        
      } catch (err) {
        // Si la vue n'existe pas encore, utiliser allDocs avec filtre
        if (err.status === 404) {
          await this.loadWithAllDocs();
        } else {
          throw err;
        }
      }
    },
    
    /**
     * Fallback: Charger tous les docs et filtrer côté client
     */
    async loadWithAllDocs() {
      const result = await this.db.allDocs({
        include_docs: true,
        conflicts: true
      });
      
      this.facturesSuspendues = result.rows
        .filter(row => row.doc.type === 'impaye' && row.doc.is_suspended)
        .map(row => row.doc);
      
      this.extractMotifs();
      this.isLoading = false;
    },
    
    extractMotifs() {
      // Extraire les motifs uniques des factures suspendues
      const motifsSet = new Set(
        this.facturesSuspendues
          .map(f => f.blacklist_motif || 'Non spécifié')
          .filter(Boolean)
      );
      
      this.motifs = Array.from(motifsSet).sort();
      console.log('[CHECKPOINT] motifs-extracted,', this.motifs.length, 'motifs trouvés');
    },
    
    // ========================================
    // OPÉRATIONS POUCHDB (WRITE)
    // ========================================
    
    async reactivateFacture(factureId) {
      /**
       * @action Réactiver une facture suspendue
       * @checkpoint reactivation-started
       * 
       * Pattern local-first:
       * 1. Lire le document local
       * 2. Modifier localement
       * 3. Sauvegarder localement (PouchDB)
       * 4. La réplication envoie vers CouchDB automatiquement
       */
      try {
        // 1. Récupérer le document avec sa révision
        const doc = await this.db.get(factureId, { conflicts: true });
        
        // Vérifier les conflits avant modification
        if (doc._conflicts && doc._conflicts.length > 0) {
          await resolveConflict(this.db, factureId);
        }
        
        // 2. Modifier le document
        const updatedDoc = {
          ...doc,
          is_suspended: false,
          blacklist_motif: null,
          unsuspended_at: new Date().toISOString(),
          unsuspended_by: this.currentUser?.id || 'system'
        };
        
        // 3. Sauvegarder localement (PouchDB gère le _rev)
        const response = await this.db.put(updatedDoc);
        
        console.log('[CHECKPOINT] facture-reactivated, id:', response.id, 'rev:', response.rev);
        
        // 4. Mettre à jour l'UI immédiatement (local-first)
        this.facturesSuspendues = this.facturesSuspendues.filter(f => f._id !== factureId);
        
        // La réplication vers CouchDB se fait automatiquement en arrière-plan
        
        return { success: true, id: response.id, rev: response.rev };
        
      } catch (err) {
        console.error('[ERROR] Réactivation échouée:', err);
        
        // Gérer les conflits de révision (409)
        if (err.status === 409) {
          await resolveConflict(this.db, factureId);
          return this.reactivateFacture(factureId); // Retry
        }
        
        return { success: false, error: err.message };
      }
    },
    
    async updateFacture(factureId, updates) {
      /**
       * @action Mettre à jour une facture (générique)
       * @checkpoint update-started
       */
      try {
        const doc = await this.db.get(factureId);
        
        const updatedDoc = {
          ...doc,
          ...updates,
          updated_at: new Date().toISOString(),
          updated_by: this.currentUser?.id || 'system'
        };
        
        const response = await this.db.put(updatedDoc);
        
        console.log('[CHECKPOINT] facture-updated, id:', response.id);
        
        // Mettre à jour le store local
        const index = this.facturesSuspendues.findIndex(f => f._id === factureId);
        if (index !== -1) {
          this.facturesSuspendues[index] = { ...updatedDoc, _rev: response.rev };
        }
        
        return { success: true, id: response.id, rev: response.rev };
        
      } catch (err) {
        if (err.status === 409) {
          await resolveConflict(this.db, factureId);
          return this.updateFacture(factureId, updates);
        }
        throw err;
      }
    },
    
    // ========================================
    // SYNCHRONISATION MANUELLE
    // ========================================
    
    async forceSync() {
      /**
       * @action Forcer la synchronisation manuelle
       * @checkpoint manual-sync-triggered
       */
      if (!this.syncManager) return;
      
      this.syncStatus = 'syncing';
      const result = await this.syncManager.syncNow();
      
      if (result.success) {
        this.syncStatus = 'online';
        await this.loadSuspendedImpayes(); // Recharger les données
      } else {
        this.syncStatus = 'error';
      }
      
      return result;
    },
    
    // ========================================
    // GESTION DES CONFLITS UI
    // ========================================
    
    async handleConflict(docId) {
      const result = await resolveConflict(this.db, docId);
      if (result.resolved) {
        await this.loadSuspendedImpayes();
      }
      return result;
    },
    
    hasConflicts(doc) {
      return doc._conflicts && doc._conflicts.length > 0;
    },
    
    // ========================================
    // COMPUTED & HELPERS
    // ========================================
    
    get filteredFactures() {
      return this.facturesSuspendues.filter(f => {
        const matchMotif = !this.filters.motif || 
          (f.blacklist_motif || 'Non spécifié') === this.filters.motif;
        
        const matchSearch = !this.filters.search || 
          f.facture_numero?.toLowerCase().includes(this.filters.search.toLowerCase()) ||
          f.payer_nom?.toLowerCase().includes(this.filters.search.toLowerCase());
        
        return matchMotif && matchSearch;
      });
    },
    
    get syncStatusLabel() {
      const labels = {
        initializing: 'Initialisation...',
        online: 'Synchronisé',
        offline: 'Hors ligne',
        syncing: 'Synchronisation...',
        error: 'Erreur de sync',
        paused: 'En attente'
      };
      return labels[this.syncStatus] || this.syncStatus;
    },
    
    get syncStatusClass() {
      const classes = {
        initializing: 'badge-warning',
        online: 'badge-success',
        offline: 'badge-error',
        syncing: 'badge-info',
        error: 'badge-error',
        paused: 'badge-ghost'
      };
      return classes[this.syncStatus] || 'badge-ghost';
    },
    
    // ========================================
    // NETTOYAGE
    // ========================================
    
    destroy() {
      if (this.syncManager) {
        this.syncManager.cancel();
        console.log('[CHECKPOINT] replication-cancelled, cleanup done');
      }
    }
  }));
  
  console.log('[CHECKPOINT] alpine-component-registered, impayesSuspendusPouchDB prêt');
});

// ============================================
// UTILITAIRES POUCHDB (CRUD COMPLET)
// ============================================

/**
 * Crée un nouveau document avec ID CouchDB
 * @param {PouchDB} db - Instance PouchDB
 * @param {Object} doc - Document à créer
 * @param {string} prefix - Préfixe pour l'ID (ex: 'impaye_')
 */
async function createDocument(db, doc, prefix = '') {
  const newDoc = {
    ...doc,
    _id: doc._id || `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    created_at: new Date().toISOString(),
    type: doc.type || prefix.replace('_', '')
  };
  
  const response = await db.put(newDoc);
  return { ...newDoc, _rev: response.rev };
}

/**
 * Supprime un document (soft delete avec flag)
 */
async function softDeleteDocument(db, docId, userId = 'system') {
  const doc = await db.get(docId);
  doc._deleted = true;
  doc.deleted_at = new Date().toISOString();
  doc.deleted_by = userId;
  
  return await db.put(doc);
}

/**
 * Query Mango (alternative aux vues)
 */
async function queryMango(db, selector, options = {}) {
  const query = {
    selector,
    ...options
  };
  
  return await db.find(query);
}

// Export pour utilisation externe
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initPouchDB,
    setupReplication,
    resolveConflict,
    createDocument,
    softDeleteDocument,
    queryMango,
    COUCHDB_CONFIG,
    DESIGN_DOCS
  };
}
