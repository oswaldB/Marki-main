/**
 * Workflow Template PouchDB
 * Description: Template générique pour adapter tout workflow avec PouchDB + CouchDB live sync
 * 
 * RÈGLES implémentées:
 * 1. PouchDB local avec réplication live vers CouchDB
 * 2. Remplace appels API par opérations PouchDB (db.get, db.put, db.query, db.find)
 * 3. Sync bidirectionnelle avec db.sync()
 * 4. Gestion conflits avec conflicts: true
 * 5. Design documents (_design/) pour vues Mango
 * 6. Pattern local-first: lecture PouchDB local, écriture PouchDB, sync auto
 * 7. Gestion offline/online avec events paused/active
 * 8. Conserver structure Alpine.js x-data
 * 9. Ajouter syncStatus: idle|syncing|paused|error
 * 10. Utiliser _id et _rev CouchDB
 */

// ============================================
// CONFIGURATION COUCHDB
// ============================================
const POUCHDB_CONFIG = {
  // URL CouchDB (adapter selon environnement)
  url: 'http://localhost:5984',
  // Nom de la base distante
  database: 'adti_workflow',
  // Authentification
  auth: {
    username: 'admin',
    password: 'password'
  },
  // Options de synchronisation
  sync: {
    live: true,
    retry: true,
    conflicts: true,
    heartbeat: 10000,
    timeout: 30000,
    batch_size: 100,
    batches_limit: 5
  }
};

// ============================================
// DESIGN DOCUMENTS (Vues Mango)
// ============================================
const DESIGN_DOCUMENTS = [
  {
    _id: '_design/workflow',
    views: {
      // Vue tous les documents par type
      by_type: {
        map: function(doc) {
          if (doc.type) {
            emit(doc.type, doc);
          }
        }.toString()
      },
      // Vue par statut
      by_statut: {
        map: function(doc) {
          if (doc.type && doc.statut) {
            emit([doc.type, doc.statut], doc);
          }
        }.toString()
      },
      // Vue par date de création
      by_date: {
        map: function(doc) {
          if (doc.created_at) {
            emit(doc.created_at, doc);
          }
        }.toString()
      },
      // Vue avec réduction (comptage)
      count_by_type: {
        map: function(doc) {
          if (doc.type) {
            emit(doc.type, 1);
          }
        }.toString(),
        reduce: '_count'
      }
    }
  },
  {
    _id: '_design/search',
    // Index Mango pour recherches rapides
    indexes: {
      search_index: {
        fields: ['type', 'statut', 'created_at', 'updated_at', 'nom', 'email']
      }
    }
  }
];

// ============================================
// CLASSE POUCHDB SERVICE
// ============================================

class PouchDBService {
  /**
   * @param {string} localDbName - Nom de la base locale
   * @param {Object} config - Configuration (optionnel, utilise POUCHDB_CONFIG par défaut)
   */
  constructor(localDbName = 'adti_local', config = POUCHDB_CONFIG) {
    this.config = config;
    this.localDB = null;
    this.remoteDB = null;
    this.syncHandler = null;
    this.changesHandler = null;
    
    // État de synchronisation observable
    this.syncState = {
      status: 'initializing', // initializing, idle, syncing, paused, error, offline
      direction: null,          // push, pull, sync
      lastSync: null,
      pending: 0,
      errors: []
    };
    
    // Callbacks pour Alpine.js
    this.onSyncChange = null;
    this.onSyncError = null;
    this.onDataChange = null;
    
    // Nom de la base locale
    this.localDbName = localDbName;
  }

  // ========================================
  // INITIALISATION
  // ========================================
  
  /**
   * Initialise la base locale et la connexion distante
   * @returns {PouchDB} Instance base locale
   */
  async init() {
    console.log('[CHECKPOINT] pouchdb-init-started');
    
    // Créer la base locale
    this.localDB = new PouchDB(this.localDbName);
    
    // Créer la connexion distante
    const remoteUrl = `${this.config.url}/${this.config.database}`;
    this.remoteDB = new PouchDB(remoteUrl, {
      auth: this.config.auth,
      skip_setup: true
    });
    
    console.log('[POUCHDB] Base locale créée:', this.localDbName);
    console.log('[POUCHDB] Connexion distante:', remoteUrl);
    
    // Créer/mettre à jour les design documents
    await this.ensureDesignDocs();
    
    console.log('[CHECKPOINT] pouchdb-init-complete');
    return this.localDB;
  }

  /**
   * Crée ou met à jour les design documents
   */
  async ensureDesignDocs() {
    for (const doc of DESIGN_DOCUMENTS) {
      try {
        const existing = await this.localDB.get(doc._id);
        // Mettre à jour si différent
        if (JSON.stringify(existing.views) !== JSON.stringify(doc.views) ||
            JSON.stringify(existing.indexes) !== JSON.stringify(doc.indexes)) {
          await this.localDB.put({ ...doc, _rev: existing._rev });
          console.log('[DESIGN DOC] Mis à jour:', doc._id);
        }
      } catch (err) {
        if (err.status === 404) {
          await this.localDB.put(doc);
          console.log('[DESIGN DOC] Créé:', doc._id);
        }
      }
    }
    console.log('[CHECKPOINT] design-docs-ready');
  }

  // ========================================
  // SYNCHRONISATION LIVE
  // ========================================
  
  /**
   * Démarre la réplication bidirectionnelle live
   * @returns {Object} Gestionnaire de sync avec méthode cancel()
   */
  startSync() {
    console.log('[CHECKPOINT] sync-started');
    
    if (this.syncHandler) {
      this.syncHandler.cancel();
    }
    
    this.syncHandler = this.localDB.sync(this.remoteDB, this.config.sync)
      .on('change', (info) => {
        this.syncState.direction = info.direction;
        this.syncState.pending = info.change?.pending || 0;
        
        if (info.direction === 'pull') {
          console.log('[SYNC] Données reçues du serveur');
          this.onDataChange?.(info);
        }
        
        this.onSyncChange?.(this.syncState);
      })
      .on('paused', (err) => {
        this.syncState.status = err ? 'error' : 'paused';
        this.syncState.lastSync = new Date().toISOString();
        console.log('[SYNC] Paused:', err || 'En attente');
        this.onSyncChange?.(this.syncState);
      })
      .on('active', () => {
        this.syncState.status = 'syncing';
        console.log('[SYNC] Active: Réplication en cours...');
        this.onSyncChange?.(this.syncState);
      })
      .on('denied', (err) => {
        console.error('[SYNC] Denied:', err);
        this.syncState.status = 'error';
        this.syncState.errors.push({ type: 'denied', error: err, time: new Date() });
        this.onSyncError?.(err);
        this.onSyncChange?.(this.syncState);
      })
      .on('complete', (info) => {
        console.log('[SYNC] Complete:', info);
        this.syncState.status = 'idle';
        this.onSyncChange?.(this.syncState);
      })
      .on('error', (err) => {
        console.error('[SYNC] Error:', err);
        this.syncState.status = 'error';
        this.syncState.errors.push({ type: 'error', error: err, time: new Date() });
        this.onSyncError?.(err);
        this.onSyncChange?.(this.syncState);
      });
    
    // Écouter les changements locaux pour UI réactive
    this.changesHandler = this.localDB.changes({
      since: 'now',
      live: true,
      include_docs: true
    }).on('change', (change) => {
      console.log('[CHANGES] Changement local:', change.id);
      this.onDataChange?.({ localChange: change });
    });
    
    return {
      handler: this.syncHandler,
      cancel: () => this.stopSync(),
      forceSync: () => this.forceSync()
    };
  }

  /**
   * Arrête la synchronisation
   */
  stopSync() {
    if (this.syncHandler) {
      this.syncHandler.cancel();
      this.syncHandler = null;
    }
    if (this.changesHandler) {
      this.changesHandler.cancel();
      this.changesHandler = null;
    }
    console.log('[CHECKPOINT] sync-stopped');
  }

  /**
   * Force une synchronisation manuelle
   */
  async forceSync() {
    console.log('[CHECKPOINT] manual-sync-started');
    this.syncState.status = 'syncing';
    
    try {
      const toResult = await this.localDB.replicate.to(this.remoteDB);
      const fromResult = await this.localDB.replicate.from(this.remoteDB);
      
      this.syncState.status = 'idle';
      this.syncState.lastSync = new Date().toISOString();
      
      console.log('[CHECKPOINT] manual-sync-complete');
      return {
        success: true,
        pushed: toResult.docs_written,
        pulled: fromResult.docs_written
      };
    } catch (err) {
      this.syncState.status = 'error';
      console.error('[SYNC] Manual sync error:', err);
      return { success: false, error: err.message };
    }
  }

  // ========================================
  // OPÉRATIONS CRUD
  // ========================================
  
  /**
   * Récupère un document par son ID
   * @param {string} id - ID du document (_id CouchDB)
   * @param {Object} options - Options (conflicts: true)
   * @returns {Object} Document avec _id et _rev
   */
  async get(id, options = {}) {
    try {
      const doc = await this.localDB.get(id, options);
      return { success: true, doc };
    } catch (err) {
      console.error('[POUCHDB] Get error:', err);
      return { success: false, error: err.message, status: err.status };
    }
  }

  /**
   * Crée un nouveau document
   * @param {Object} data - Données du document
   * @param {string} prefix - Préfixe pour l'ID (ex: 'facture_')
   * @returns {Object} Résultat avec _id et _rev
   */
  async create(data, prefix = '') {
    try {
      const doc = {
        _id: data._id || `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...data,
        type: data.type || prefix.replace('_', ''),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const result = await this.localDB.put(doc);
      console.log('[CHECKPOINT] document-created, id:', result.id);
      
      return { success: true, id: result.id, rev: result.rev, doc };
    } catch (err) {
      console.error('[POUCHDB] Create error:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Met à jour un document existant
   * @param {string} id - ID du document
   * @param {Object} updates - Données à mettre à jour
   * @param {string} rev - Révision (optionnel, récupérée automatiquement)
   * @returns {Object} Résultat avec nouveau _rev
   */
  async update(id, updates, rev = null) {
    try {
      let doc;
      if (rev) {
        doc = { _id: id, _rev: rev };
      } else {
        const result = await this.localDB.get(id);
        doc = result;
      }
      
      const updatedDoc = {
        ...doc,
        ...updates,
        _id: id,
        updated_at: new Date().toISOString()
      };
      
      const result = await this.localDB.put(updatedDoc);
      console.log('[CHECKPOINT] document-updated, id:', result.id, 'rev:', result.rev);
      
      return { success: true, id: result.id, rev: result.rev };
    } catch (err) {
      // Gérer le conflit 409
      if (err.status === 409) {
        return this.handleConflict(id, updates);
      }
      console.error('[POUCHDB] Update error:', err);
      return { success: false, error: err.message, status: err.status };
    }
  }

  /**
   * Supprime un document (soft delete avec _deleted)
   * @param {string} id - ID du document
   * @param {boolean} hardDelete - Suppression définitive
   * @returns {Object} Résultat de l'opération
   */
  async delete(id, hardDelete = false) {
    try {
      const doc = await this.localDB.get(id);
      
      if (hardDelete) {
        await this.localDB.remove(doc);
      } else {
        // Soft delete
        doc._deleted = true;
        doc.deleted_at = new Date().toISOString();
        await this.localDB.put(doc);
      }
      
      console.log('[CHECKPOINT] document-deleted, id:', id);
      return { success: true };
    } catch (err) {
      console.error('[POUCHDB] Delete error:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Récupère tous les documents avec pagination
   * @param {Object} options - Options (startkey, endkey, limit, include_docs)
   * @returns {Object} Liste des documents
   */
  async allDocs(options = {}) {
    try {
      const defaultOptions = {
        include_docs: true,
        conflicts: true,
        ...options
      };
      
      const result = await this.localDB.allDocs(defaultOptions);
      const docs = result.rows
        .filter(row => !row.doc._deleted)
        .map(row => row.doc);
      
      return { success: true, docs, total: result.total_rows };
    } catch (err) {
      console.error('[POUCHDB] AllDocs error:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Query via une vue (design document)
   * @param {string} viewName - Nom de la vue (ex: 'workflow/by_type')
   * @param {Object} options - Options de query
   * @returns {Object} Résultats de la vue
   */
  async query(viewName, options = {}) {
    try {
      const defaultOptions = {
        include_docs: true,
        conflicts: true,
        ...options
      };
      
      const result = await this.localDB.query(viewName, defaultOptions);
      const docs = result.rows.map(row => row.doc || row.value);
      
      return { success: true, docs, total: result.total_rows };
    } catch (err) {
      // Fallback sur allDocs si la vue n'existe pas
      if (err.status === 404) {
        console.warn('[POUCHDB] Vue non trouvée, fallback allDocs');
        return this.allDocs(options);
      }
      console.error('[POUCHDB] Query error:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Recherche via Mango Query (index)
   * @param {Object} selector - Sélecteur Mango
   * @param {Object} options - Options (sort, limit, fields)
   * @returns {Object} Documents correspondants
   */
  async find(selector, options = {}) {
    try {
      const query = {
        selector,
        ...options
      };
      
      const result = await this.localDB.find(query);
      return { success: true, docs: result.docs, bookmark: result.bookmark };
    } catch (err) {
      console.error('[POUCHDB] Find error:', err);
      return { success: false, error: err.message };
    }
  }

  // ========================================
  // GESTION DES CONFLITS
  // ========================================
  
  /**
   * Récupère les documents en conflit
   * @returns {Array} Liste des documents avec conflits
   */
  async getConflicts() {
    try {
      const result = await this.localDB.allDocs({
        include_docs: true,
        conflicts: true
      });
      
      return result.rows
        .filter(row => row.doc._conflicts && row.doc._conflicts.length > 0)
        .map(row => ({
          id: row.doc._id,
          rev: row.doc._rev,
          conflictRevs: row.doc._conflicts
        }));
    } catch (err) {
      console.error('[POUCHDB] GetConflicts error:', err);
      return [];
    }
  }

  /**
   * Résout un conflit pour un document
   * @param {string} docId - ID du document
   * @param {Function} mergeStrategy - Fonction de fusion (winningDoc, conflictDocs) => merged
   * @returns {Object} Résultat de la résolution
   */
  async resolveConflict(docId, mergeStrategy = null) {
    try {
      const doc = await this.localDB.get(docId, { conflicts: true });
      
      if (!doc._conflicts || doc._conflicts.length === 0) {
        return { resolved: false, reason: 'No conflicts' };
      }
      
      // Récupérer toutes les versions en conflit
      const conflictDocs = await Promise.all(
        doc._conflicts.map(rev => this.localDB.get(docId, { rev }))
      );
      
      console.log('[CONFLICT] Résolution pour:', docId, 'versions:', conflictDocs.length);
      
      // Fusionner avec la stratégie fournie ou par défaut
      const strategy = mergeStrategy || this.defaultMergeStrategy;
      const merged = strategy(doc, conflictDocs);
      
      // Supprimer les révisions en conflit
      for (const rev of doc._conflicts) {
        await this.localDB.remove(docId, rev);
      }
      
      // Sauvegarder la version fusionnée
      delete doc._conflicts;
      Object.assign(doc, merged);
      await this.localDB.put(doc);
      
      console.log('[CHECKPOINT] conflict-resolved, id:', docId);
      return { resolved: true, doc };
      
    } catch (err) {
      console.error('[CONFLICT] Erreur résolution:', err);
      return { resolved: false, error: err.message };
    }
  }

  /**
   * Stratégie de fusion par défaut
   */
  defaultMergeStrategy(winningDoc, conflictDocs) {
    const merged = { ...winningDoc };
    
    for (const conflictDoc of conflictDocs) {
      // Garder les valeurs les plus récentes pour les timestamps
      if (conflictDoc.updated_at && merged.updated_at) {
        if (new Date(conflictDoc.updated_at) > new Date(merged.updated_at)) {
          merged.updated_at = conflictDoc.updated_at;
          merged.updated_by = conflictDoc.updated_by;
        }
      }
      
      // Pour les états critiques, privilégier l'état le plus restrictif
      if (conflictDoc.statut === 'bloque' || conflictDoc.statut === 'suspendu') {
        merged.statut = conflictDoc.statut;
      }
    }
    
    return merged;
  }

  /**
   * Gère automatiquement les conflits lors d'une mise à jour
   */
  async handleConflict(docId, localUpdates) {
    try {
      console.log('[CONFLICT] Retry avec résolution pour:', docId);
      
      const doc = await this.localDB.get(docId, { conflicts: true });
      const conflictRevs = doc._conflicts || [];
      
      if (conflictRevs.length > 0) {
        // Récupérer et fusionner
        const conflictDocs = await Promise.all(
          conflictRevs.map(rev => this.localDB.get(docId, { rev }))
        );
        
        // Fusionner les données locales avec les conflits
        for (const conflictDoc of conflictDocs) {
          Object.assign(localUpdates, this.defaultMergeStrategy(conflictDoc, [doc]));
        }
        
        // Supprimer les anciennes révisions
        for (const rev of conflictRevs) {
          await this.localDB.remove(docId, rev);
        }
      }
      
      // Réessayer avec la dernière révision
      doc._rev = doc._rev;
      const updatedDoc = { ...doc, ...localUpdates };
      const result = await this.localDB.put(updatedDoc);
      
      console.log('[CHECKPOINT] conflict-resolved-and-updated, id:', docId);
      return { success: true, id: result.id, rev: result.rev, resolved: true };
      
    } catch (err) {
      console.error('[CONFLICT] Échec résolution:', err);
      return { success: false, error: err.message };
    }
  }

  // ========================================
  // UTILITAIRES
  // ========================================
  
  /**
   * Retourne l'état actuel de synchronisation
   */
  getSyncState() {
    return { ...this.syncState };
  }

  /**
   * Vérifie si online
   */
  isOnline() {
    return navigator.onLine;
  }

  /**
   * Change le statut manuellement
   */
  setSyncStatus(status) {
    this.syncState.status = status;
    this.onSyncChange?.(this.syncState);
  }
}

// ============================================
// ALPINE.JS COMPONENT FACTORY
// ============================================

/**
 * Factory pour créer un composant Alpine.js avec PouchDB
 * @param {string} componentName - Nom du composant
 * @param {Object} options - Options de configuration
 * @returns {Function} Fonction pour Alpine.data()
 */
function createPouchDBComponent(componentName, options = {}) {
  const {
    localDbName = 'adti_local',
    entityType = 'document',
    idPrefix = 'doc_',
    designDocs = [],
    onInit = null,
    onDataLoaded = null,
    onSyncChange = null
  } = options;

  return () => ({
    // ========================================
    // ÉTAT DE DONNÉES
    // ========================================
    items: [],
    selectedItem: null,
    filteredItems: [],
    
    // ========================================
    // ÉTAT DE SYNCHRONISATION
    // ========================================
    syncStatus: 'initializing', // initial, syncing, paused, error, offline
    lastSync: null,
    isOnline: navigator.onLine,
    pendingChanges: 0,
    conflicts: [],
    
    // ========================================
    // ÉTAT UI
    // ========================================
    loading: true,
    saving: false,
    error: null,
    successMessage: null,
    
    // Filtres
    searchQuery: '',
    filters: {},
    
    // Pagination
    currentPage: 1,
    pageSize: 50,
    totalPages: 1,
    
    // ========================================
    // SERVICE POUCHDB
    // ========================================
    pouchService: null,
    syncManager: null,
    
    // ========================================
    // INITIALISATION
    // ========================================
    
    async init() {
      console.log(`[CHECKPOINT] ${componentName}-initialized`);
      this.loading = true;
      
      try {
        // Initialiser le service PouchDB
        this.pouchService = new PouchDBService(localDbName);
        await this.pouchService.init();
        
        // Configurer les callbacks
        this.pouchService.onSyncChange = (state) => {
          this.syncStatus = state.status;
          this.lastSync = state.lastSync;
          this.pendingChanges = state.pending;
          onSyncChange?.(state, this);
        };
        
        this.pouchService.onDataChange = (info) => {
          if (info.localChange || info.direction === 'pull') {
            this.refreshData();
          }
        };
        
        // Démarrer la synchronisation
        this.syncManager = this.pouchService.startSync();
        
        // Charger les données initiales
        await this.loadData();
        
        // Hook personnalisé
        await onInit?.(this);
        
        // Écouter les événements réseau
        this.setupNetworkListeners();
        
        this.loading = false;
        console.log(`[CHECKPOINT] ${componentName}-ready`);
        
      } catch (err) {
        console.error(`[ERROR] ${componentName} init:`, err);
        this.error = err.message;
        this.syncStatus = 'error';
        this.loading = false;
      }
    },
    
    // ========================================
    // CHARGEMENT DES DONNÉES
    // ========================================
    
    async loadData() {
      console.log('[CHECKPOINT] data-loading-started');
      
      try {
        // Utiliser la vue si disponible, sinon allDocs
        const result = await this.pouchService.query('workflow/by_type', {
          key: entityType,
          include_docs: true
        });
        
        if (result.success) {
          this.items = result.docs;
          this.applyFilters();
          
          // Détecter les conflits
          this.conflicts = result.docs
            .filter(doc => doc._conflicts?.length > 0)
            .map(doc => ({ id: doc._id, revs: doc._conflicts }));
        }
        
        onDataLoaded?.(this.items, this);
        console.log('[CHECKPOINT] data-loaded, count:', this.items.length);
        
      } catch (err) {
        console.error('[ERROR] Load data:', err);
        this.error = err.message;
      }
    },
    
    async refreshData() {
      await this.loadData();
    },
    
    // ========================================
    // CRUD OPÉRATIONS
    // ========================================
    
    async createItem(data) {
      this.saving = true;
      
      try {
        const result = await this.pouchService.create(data, idPrefix);
        
        if (result.success) {
          this.items.unshift(result.doc);
          this.applyFilters();
          this.successMessage = 'Créé avec succès';
          console.log('[CHECKPOINT] item-created, id:', result.id);
        } else {
          this.error = result.error;
        }
        
        return result;
      } catch (err) {
        this.error = err.message;
        return { success: false, error: err.message };
      } finally {
        this.saving = false;
      }
    },
    
    async updateItem(id, updates) {
      this.saving = true;
      
      try {
        const result = await this.pouchService.update(id, updates);
        
        if (result.success) {
          const index = this.items.findIndex(item => item._id === id);
          if (index !== -1) {
            this.items[index] = { ...this.items[index], ...updates, _rev: result.rev };
            this.applyFilters();
          }
          this.successMessage = 'Mis à jour avec succès';
          console.log('[CHECKPOINT] item-updated, id:', id);
        } else {
          this.error = result.error;
        }
        
        return result;
      } catch (err) {
        this.error = err.message;
        return { success: false, error: err.message };
      } finally {
        this.saving = false;
      }
    },
    
    async deleteItem(id) {
      try {
        const result = await this.pouchService.delete(id);
        
        if (result.success) {
          this.items = this.items.filter(item => item._id !== id);
          this.applyFilters();
          this.successMessage = 'Supprimé avec succès';
          console.log('[CHECKPOINT] item-deleted, id:', id);
        } else {
          this.error = result.error;
        }
        
        return result;
      } catch (err) {
        this.error = err.message;
        return { success: false, error: err.message };
      }
    },
    
    async getItem(id) {
      const result = await this.pouchService.get(id, { conflicts: true });
      if (result.success) {
        this.selectedItem = result.doc;
      }
      return result;
    },
    
    // ========================================
    // FILTRAGE
    // ========================================
    
    applyFilters() {
      let filtered = [...this.items];
      
      // Filtre par recherche
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        filtered = filtered.filter(item => 
          JSON.stringify(item).toLowerCase().includes(query)
        );
      }
      
      // Filtres personnalisés
      Object.keys(this.filters).forEach(key => {
        const value = this.filters[key];
        if (value) {
          filtered = filtered.filter(item => item[key] === value);
        }
      });
      
      this.filteredItems = filtered;
      this.totalPages = Math.ceil(filtered.length / this.pageSize);
      this.currentPage = 1;
    },
    
    setSearchQuery(query) {
      this.searchQuery = query;
      this.applyFilters();
    },
    
    setFilter(key, value) {
      this.filters[key] = value;
      this.applyFilters();
    },
    
    clearFilters() {
      this.filters = {};
      this.searchQuery = '';
      this.applyFilters();
    },
    
    // ========================================
    // PAGINATION
    // ========================================
    
    get paginatedItems() {
      const start = (this.currentPage - 1) * this.pageSize;
      return this.filteredItems.slice(start, start + this.pageSize);
    },
    
    nextPage() {
      if (this.currentPage < this.totalPages) {
        this.currentPage++;
      }
    },
    
    prevPage() {
      if (this.currentPage > 1) {
        this.currentPage--;
      }
    },
    
    // ========================================
    // SYNCHRONISATION
    // ========================================
    
    async forceSync() {
      if (this.syncManager) {
        return await this.syncManager.forceSync();
      }
    },
    
    // ========================================
    // GESTION DES CONFLITS
    // ========================================
    
    async resolveItemConflict(id) {
      const result = await this.pouchService.resolveConflict(id);
      if (result.resolved) {
        await this.refreshData();
      }
      return result;
    },
    
    // ========================================
    // ÉCOUTEURS RÉSEAU
    // ========================================
    
    setupNetworkListeners() {
      window.addEventListener('online', () => {
        console.log('[NETWORK] Online');
        this.isOnline = true;
        this.forceSync();
      });
      
      window.addEventListener('offline', () => {
        console.log('[NETWORK] Offline');
        this.isOnline = false;
        this.syncStatus = 'offline';
      });
    },
    
    // ========================================
    // COMPUTED PROPERTIES
    // ========================================
    
    get syncStatusClass() {
      const classes = {
        initializing: 'bg-gray-400',
        idle: 'bg-green-500',
        syncing: 'bg-blue-500 animate-pulse',
        paused: 'bg-yellow-500',
        error: 'bg-red-500',
        offline: 'bg-gray-600'
      };
      return classes[this.syncStatus] || classes.initializing;
    },
    
    get syncStatusLabel() {
      const labels = {
        initializing: 'Initialisation...',
        idle: 'Synchronisé',
        syncing: 'Synchronisation...',
        paused: 'En pause',
        error: 'Erreur',
        offline: 'Hors ligne'
      };
      return labels[this.syncStatus] || '...';
    },
    
    get hasConflicts() {
      return this.conflicts.length > 0;
    },
    
    get totalItems() {
      return this.items.length;
    },
    
    // ========================================
    // NETTOYAGE
    // ========================================
    
    destroy() {
      if (this.syncManager) {
        this.syncManager.cancel();
      }
      console.log(`[CHECKPOINT] ${componentName}-destroyed`);
    }
  });
}

// ============================================
// ENREGISTREMENT ALPINE.JS
// ============================================

document.addEventListener('alpine:init', () => {
  
  // Enregistrer le service global
  Alpine.store('pouchdb', {
    service: null,
    
    async init(dbName = 'adti_global') {
      this.service = new PouchDBService(dbName);
      await this.service.init();
      this.service.startSync();
      console.log('[CHECKPOINT] pouchdb-store-initialized');
    },
    
    get db() {
      return this.service?.localDB;
    },
    
    get syncState() {
      return this.service?.getSyncState();
    }
  });
  
  // Enregistrer le composant template
  Alpine.data('workflowPouchDB', createPouchDBComponent('workflowPouchDB', {
    localDbName: 'adti_workflow',
    entityType: 'document'
  }));
  
  console.log('[CHECKPOINT] alpine-components-registered');
});

// ============================================
// EXPORTS
// ============================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PouchDBService,
    createPouchDBComponent,
    POUCHDB_CONFIG,
    DESIGN_DOCUMENTS
  };
}
