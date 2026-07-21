/**
 * Workflow: factures-pouchdb
 * Description: Gestion des factures avec PouchDB + CouchDB live sync
 * 
 * Adaptation du workflow factures existant vers PouchDB
 * Pattern local-first avec réplication bidirectionnelle
 * 
 * @checkpoint wf-factures-init
 * @checkpoint wf-factures-pouchdb-ready
 * @checkpoint wf-factures-design-docs-ready
 * @checkpoint wf-factures-sync-active
 * @checkpoint wf-factures-data-loaded
 * @checkpoint wf-factures-relations-resolved
 * @checkpoint wf-factures-rendering-complete
 */

// ============================================
// CONFIGURATION COUCHDB SPÉCIFIQUE FACTURES
// ============================================
const FACTURES_COUCHDB_CONFIG = {
  url: 'http://localhost:5984',
  database: 'marki_factures',
  auth: {
    username: 'admin',
    password: 'admin'
  },
  sync: {
    live: true,
    retry: true,
    conflicts: true,
    heartbeat: 10000,
    timeout: 30000
  }
};

// ============================================
// DESIGN DOCUMENTS COUCHDB - FACTURES
// ============================================
const FACTURES_DESIGN_DOCS = [
  {
    _id: '_design/factures',
    views: {
      // Vue principale: toutes les factures
      all: {
        map: function(doc) {
          if (doc.type === 'facture') {
            emit(doc._id, doc);
          }
        }.toString()
      },
      // Vue par statut (impaye, payee, en_retard)
      by_statut: {
        map: function(doc) {
          if (doc.type === 'facture' && doc.statut) {
            emit(doc.statut, doc);
          }
        }.toString()
      },
      // Vue par payeur
      by_payeur: {
        map: function(doc) {
          if (doc.type === 'facture' && doc.payeurId) {
            emit(doc.payeurId, doc);
          }
        }.toString()
      },
      // Vue par date d'émission
      by_date_emission: {
        map: function(doc) {
          if (doc.type === 'facture' && doc.dateEmission) {
            emit(doc.dateEmission, doc);
          }
        }.toString()
      },
      // Vue par date d'échéance
      by_date_echeance: {
        map: function(doc) {
          if (doc.type === 'facture' && doc.dateEcheance) {
            emit(doc.dateEcheance, doc);
          }
        }.toString()
      },
      // Vue des factures en retard
      en_retard: {
        map: function(doc) {
          if (doc.type === 'facture' && doc.statut === 'impaye') {
            const today = new Date().toISOString().split('T')[0];
            if (doc.dateEcheance && doc.dateEcheance < today) {
              emit(doc.dateEcheance, doc);
            }
          }
        }.toString()
      }
    }
  },
  {
    _id: '_design/factures_stats',
    views: {
      // Stats par statut (comptage)
      count_by_statut: {
        map: function(doc) {
          if (doc.type === 'facture' && doc.statut) {
            emit(doc.statut, doc.montantTotal || 0);
          }
        }.toString(),
        reduce: '_sum'
      },
      // Stats par mois
      by_mois: {
        map: function(doc) {
          if (doc.type === 'facture' && doc.dateEmission) {
            const mois = doc.dateEmission.substring(0, 7);
            emit([mois, doc.statut], doc.montantTotal || 0);
          }
        }.toString(),
        reduce: '_sum'
      }
    }
  }
];

// ============================================
// SERVICE POUCHDB FACTURES
// ============================================

class FacturesPouchDBService {
  constructor() {
    this.localDB = null;
    this.remoteDB = null;
    this.syncHandler = null;
    this.changesHandler = null;
    
    // État de synchronisation
    this.syncState = {
      status: 'initializing',
      direction: null,
      lastSync: null,
      pending: 0,
      errors: []
    };
    
    // Callbacks
    this.onSyncChange = null;
    this.onDataChange = null;
  }

  // ========================================
  // INITIALISATION
  // ========================================
  
  async init() {
    console.log('[CHECKPOINT] wf-factures-init');
    
    // Créer base locale
    this.localDB = new PouchDB(FACTURES_COUCHDB_CONFIG.database);
    
    // Connexion distante
    const remoteUrl = `${FACTURES_COUCHDB_CONFIG.url}/${FACTURES_COUCHDB_CONFIG.database}`;
    this.remoteDB = new PouchDB(remoteUrl, {
      auth: FACTURES_COUCHDB_CONFIG.auth,
      skip_setup: true
    });
    
    console.log('[CHECKPOINT] wf-factures-pouchdb-ready');
    
    // Créer design documents
    await this.ensureDesignDocs();
    
    return this.localDB;
  }

  async ensureDesignDocs() {
    for (const doc of FACTURES_DESIGN_DOCS) {
      try {
        const existing = await this.localDB.get(doc._id);
        if (JSON.stringify(existing.views) !== JSON.stringify(doc.views)) {
          await this.localDB.put({ ...doc, _rev: existing._rev });
        }
      } catch (err) {
        if (err.status === 404) {
          await this.localDB.put(doc);
        }
      }
    }
    console.log('[CHECKPOINT] wf-factures-design-docs-ready');
  }

  // ========================================
  // SYNCHRONISATION LIVE
  // ========================================
  
  startSync() {
    console.log('[CHECKPOINT] wf-factures-sync-active');
    
    this.syncHandler = this.localDB.sync(this.remoteDB, FACTURES_COUCHDB_CONFIG.sync)
      .on('change', (info) => {
        this.syncState.direction = info.direction;
        this.syncState.pending = info.change?.pending || 0;
        
        if (info.direction === 'pull') {
          console.log('[SYNC] Factures reçues du serveur');
          this.onDataChange?.({ type: 'pull', info });
        }
        
        this.onSyncChange?.(this.syncState);
      })
      .on('paused', (err) => {
        this.syncState.status = err ? 'error' : 'paused';
        this.syncState.lastSync = new Date().toISOString();
        this.onSyncChange?.(this.syncState);
      })
      .on('active', () => {
        this.syncState.status = 'syncing';
        this.onSyncChange?.(this.syncState);
      })
      .on('error', (err) => {
        console.error('[SYNC] Error:', err);
        this.syncState.status = 'error';
        this.onSyncChange?.(this.syncState);
      });
    
    // Écouter les changements locaux
    this.changesHandler = this.localDB.changes({
      since: 'now',
      live: true,
      include_docs: true
    }).on('change', (change) => {
      this.onDataChange?.({ type: 'local', change });
    });
    
    return {
      cancel: () => this.stopSync(),
      forceSync: () => this.forceSync()
    };
  }

  stopSync() {
    if (this.syncHandler) this.syncHandler.cancel();
    if (this.changesHandler) this.changesHandler.cancel();
  }

  async forceSync() {
    this.syncState.status = 'syncing';
    await this.localDB.replicate.to(this.remoteDB);
    await this.localDB.replicate.from(this.remoteDB);
    this.syncState.status = 'paused';
    this.syncState.lastSync = new Date().toISOString();
  }

  // ========================================
  // CRUD OPÉRATIONS POUCHDB
  // ========================================
  
  /**
   * Récupère toutes les factures depuis PouchDB local
   * RÈGLE: Pattern local-first - lecture depuis PouchDB local
   */
  async getAllFactures() {
    try {
      const result = await this.localDB.query('factures/all', {
        include_docs: true,
        conflicts: true  // RÈGLE: Gestion conflits avec conflicts: true
      });
      
      return {
        success: true,
        factures: result.rows.map(row => row.doc),
        conflicts: result.rows
          .filter(row => row.doc._conflicts?.length > 0)
          .map(row => ({ id: row.doc._id, revs: row.doc._conflicts }))
      };
    } catch (err) {
      // Fallback allDocs si vue non dispo
      const result = await this.localDB.allDocs({
        include_docs: true,
        startkey: 'facture_',
        endkey: 'facture_\ufff0'
      });
      
      return {
        success: true,
        factures: result.rows.map(row => row.doc),
        conflicts: []
      };
    }
  }

  /**
   * Récupère les factures par statut
   * RÈGLE: Utilise db.query avec design document (_design/factures)
   */
  async getFacturesByStatut(statut) {
    try {
      const result = await this.localDB.query('factures/by_statut', {
        key: statut,
        include_docs: true
      });
      
      return {
        success: true,
        factures: result.rows.map(row => row.doc)
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Récupère les factures d'un payeur
   */
  async getFacturesByPayeur(payeurId) {
    try {
      const result = await this.localDB.query('factures/by_payeur', {
        key: payeurId,
        include_docs: true
      });
      
      return {
        success: true,
        factures: result.rows.map(row => row.doc)
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Récupère une facture par ID
   * RÈGLE: Utilise db.get avec _id CouchDB
   */
  async getFacture(id) {
    try {
      const doc = await this.localDB.get(id, { conflicts: true });
      return { success: true, facture: doc };
    } catch (err) {
      return { success: false, error: err.message, status: err.status };
    }
  }

  /**
   * Crée une nouvelle facture
   * RÈGLE: Écriture PouchDB local, sync auto vers CouchDB
   * RÈGLE: Utilise _id CouchDB format
   */
  async createFacture(data) {
    try {
      const doc = {
        _id: `facture_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'facture',
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const result = await this.localDB.put(doc);
      
      console.log('[CHECKPOINT] facture-created, id:', result.id);
      return {
        success: true,
        id: result.id,
        rev: result.rev,
        facture: { ...doc, _rev: result.rev }
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Met à jour une facture
   * RÈGLE: Utilise db.put avec _id et _rev CouchDB
   * RÈGLE: Gestion conflits 409
   */
  async updateFacture(id, updates) {
    try {
      const doc = await this.localDB.get(id);
      
      const updatedDoc = {
        ...doc,
        ...updates,
        updated_at: new Date().toISOString()
      };
      
      const result = await this.localDB.put(updatedDoc);
      
      console.log('[CHECKPOINT] facture-updated, id:', id, 'rev:', result.rev);
      return { success: true, id: result.id, rev: result.rev };
      
    } catch (err) {
      if (err.status === 409) {
        // Conflit - résoudre et réessayer
        return this.resolveAndUpdate(id, updates);
      }
      return { success: false, error: err.message };
    }
  }

  /**
   * Supprime une facture (soft delete)
   */
  async deleteFacture(id) {
    try {
      const doc = await this.localDB.get(id);
      doc._deleted = true;
      doc.deleted_at = new Date().toISOString();
      
      await this.localDB.put(doc);
      
      console.log('[CHECKPOINT] facture-deleted, id:', id);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Marque une facture comme payée
   */
  async markAsPaid(id, datePaiement = new Date().toISOString()) {
    return this.updateFacture(id, {
      statut: 'payee',
      datePaiement: datePaiement
    });
  }

  /**
   * Met une facture en retard
   */
  async markAsLate(id) {
    return this.updateFacture(id, {
      statut: 'en_retard',
      datePassageRetard: new Date().toISOString()
    });
  }

  // ========================================
  // GESTION DES CONFLITS
  // ========================================
  
  async resolveAndUpdate(id, localUpdates) {
    try {
      const doc = await this.localDB.get(id, { conflicts: true });
      const conflictRevs = doc._conflicts || [];
      
      if (conflictRevs.length > 0) {
        const conflictDocs = await Promise.all(
          conflictRevs.map(rev => this.localDB.get(id, { rev }))
        );
        
        // Stratégie: garder les données les plus récentes
        for (const conflictDoc of conflictDocs) {
          if (conflictDoc.updated_at > doc.updated_at) {
            Object.assign(localUpdates, {
              updated_at: conflictDoc.updated_at,
              updated_by: conflictDoc.updated_by
            });
          }
        }
        
        // Supprimer les révisions en conflit
        for (const rev of conflictRevs) {
          await this.localDB.remove(id, rev);
        }
      }
      
      // Réessayer
      doc._rev = doc._rev;
      const result = await this.localDB.put({ ...doc, ...localUpdates });
      
      return { success: true, id: result.id, rev: result.rev, resolved: true };
      
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async resolveConflicts(id, mergeStrategy) {
    try {
      const doc = await this.localDB.get(id, { conflicts: true });
      
      if (!doc._conflicts || doc._conflicts.length === 0) {
        return { resolved: false, reason: 'No conflicts' };
      }
      
      const conflictDocs = await Promise.all(
        doc._conflicts.map(rev => this.localDB.get(id, { rev }))
      );
      
      const strategy = mergeStrategy || this.defaultMergeStrategy;
      const merged = strategy(doc, conflictDocs);
      
      // Supprimer les révisions en conflit
      for (const rev of doc._conflicts) {
        await this.localDB.remove(id, rev);
      }
      
      // Sauvegarder
      delete doc._conflicts;
      Object.assign(doc, merged);
      await this.localDB.put(doc);
      
      return { resolved: true, doc };
      
    } catch (err) {
      return { resolved: false, error: err.message };
    }
  }

  defaultMergeStrategy(winningDoc, conflictDocs) {
    const merged = { ...winningDoc };
    
    for (const conflictDoc of conflictDocs) {
      // Garder les valeurs les plus récentes
      if (conflictDoc.updated_at > merged.updated_at) {
        merged.updated_at = conflictDoc.updated_at;
        merged.updated_by = conflictDoc.updated_by;
      }
      
      // Pour les montants, privilégier le plus grand
      if (conflictDoc.montantTotal > merged.montantTotal) {
        merged.montantTotal = conflictDoc.montantTotal;
      }
      
      // Pour le statut, privilégier payee > en_retard > impaye
      const statutPriority = { payee: 3, en_retard: 2, impaye: 1 };
      if ((statutPriority[conflictDoc.statut] || 0) > (statutPriority[merged.statut] || 0)) {
        merged.statut = conflictDoc.statut;
      }
    }
    
    return merged;
  }

  // ========================================
  // STATS ET REQUÊTES AVANCÉES
  // ========================================
  
  async getStats() {
    try {
      const result = await this.localDB.query('factures_stats/count_by_statut', {
        group: true
      });
      
      return {
        success: true,
        stats: result.rows.reduce((acc, row) => {
          acc[row.key] = { count: row.value };
          return acc;
        }, {})
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async getFacturesEnRetard() {
    try {
      const result = await this.localDB.query('factures/en_retard', {
        include_docs: true
      });
      
      return {
        success: true,
        factures: result.rows.map(row => row.doc)
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

// ============================================
// COMPONENT ALPINE.JS FACTURES
// ============================================

function facturesPouchDBManager() {
  return {
    // ========================================
    // ÉTAT DE DONNÉES
    // ========================================
    factures: [],
    filteredFactures: [],
    selectedFacture: null,
    payeurs: [],
    
    // ========================================
    // ÉTAT DE SYNCHRONISATION
    // ========================================
    syncStatus: 'initializing', // RÈGLE: syncStatus avec valeurs: idle|syncing|paused|error
    isOnline: navigator.onLine,
    lastSync: null,
    pendingChanges: 0,
    conflicts: [],
    
    // ========================================
    // ÉTAT UI
    // ========================================
    loading: true,
    saving: false,
    error: null,
    successMessage: null,
    showModal: false,
    modalMode: 'create', // create, edit
    
    // Filtres
    searchQuery: '',
    filterStatut: '',
    filterDateDebut: '',
    filterDateFin: '',
    
    // Pagination
    currentPage: 1,
    pageSize: 50,
    totalPages: 1,
    
    // Formulaire
    form: {
      numero: '',
      dateEmission: '',
      dateEcheance: '',
      montantTotal: 0,
      payeurId: '',
      statut: 'impaye'
    },
    
    // Service PouchDB
    service: null,
    syncManager: null,
    
    // ========================================
    // INITIALISATION
    // ========================================
    
    async init() {
      console.log('[CHECKPOINT] wf-factures-init');
      this.loading = true;
      
      try {
        // Initialiser le service PouchDB
        this.service = new FacturesPouchDBService();
        await this.service.init();
        
        // Configurer callbacks de sync
        this.service.onSyncChange = (state) => {
          this.syncStatus = state.status;
          this.lastSync = state.lastSync;
          this.pendingChanges = state.pending;
        };
        
        this.service.onDataChange = (info) => {
          if (info.type === 'pull' || info.type === 'local') {
            this.refreshData();
          }
        };
        
        // Démarrer la synchronisation
        this.syncManager = this.service.startSync();
        
        // Charger les données
        await this.loadFactures();
        
        // Écouter les événements réseau
        this.setupNetworkListeners();
        
        this.loading = false;
        console.log('[CHECKPOINT] wf-factures-rendering-complete');
        
      } catch (err) {
        console.error('[CHECKPOINT] wf-factures-error', err);
        this.error = err.message;
        this.syncStatus = 'error';
        this.loading = false;
      }
    },
    
    // ========================================
    // CHARGEMENT DES DONNÉES
    // ========================================
    
    async loadFactures() {
      console.log('[CHECKPOINT] wf-factures-data-loaded');
      
      const result = await this.service.getAllFactures();
      
      if (result.success) {
        this.factures = result.factures;
        this.conflicts = result.conflicts || [];
        this.applyFilters();
      } else {
        this.error = result.error;
      }
    },
    
    async refreshData() {
      await this.loadFactures();
    },
    
    // ========================================
    // CRUD OPÉRATIONS
    // ========================================
    
    async createFacture() {
      this.saving = true;
      
      const result = await this.service.createFacture({
        numero: this.form.numero,
        dateEmission: this.form.dateEmission,
        dateEcheance: this.form.dateEcheance,
        montantTotal: parseFloat(this.form.montantTotal),
        payeurId: this.form.payeurId,
        statut: this.form.statut
      });
      
      if (result.success) {
        this.factures.unshift(result.facture);
        this.applyFilters();
        this.closeModal();
        this.successMessage = 'Facture créée avec succès';
        
        console.log('[CHECKPOINT] facture-created-ui-updated');
      } else {
        this.error = result.error;
      }
      
      this.saving = false;
      return result;
    },
    
    async updateFacture() {
      if (!this.selectedFacture) return;
      
      this.saving = true;
      
      const result = await this.service.updateFacture(
        this.selectedFacture._id,
        {
          numero: this.form.numero,
          dateEmission: this.form.dateEmission,
          dateEcheance: this.form.dateEcheance,
          montantTotal: parseFloat(this.form.montantTotal),
          payeurId: this.form.payeurId,
          statut: this.form.statut
        }
      );
      
      if (result.success) {
        // Mettre à jour localement
        const index = this.factures.findIndex(f => f._id === this.selectedFacture._id);
        if (index !== -1) {
          this.factures[index] = {
            ...this.factures[index],
            ...this.form,
            _rev: result.rev
          };
          this.applyFilters();
        }
        
        this.closeModal();
        this.successMessage = 'Facture mise à jour';
        
        console.log('[CHECKPOINT] facture-updated-ui-synced');
      } else {
        this.error = result.error;
      }
      
      this.saving = false;
      return result;
    },
    
    async deleteFacture(id) {
      if (!confirm('Confirmer la suppression ?')) return;
      
      const result = await this.service.deleteFacture(id);
      
      if (result.success) {
        this.factures = this.factures.filter(f => f._id !== id);
        this.applyFilters();
        this.successMessage = 'Facture supprimée';
        
        console.log('[CHECKPOINT] facture-deleted-ui-updated');
      } else {
        this.error = result.error;
      }
    },
    
    async markAsPaid(id) {
      const result = await this.service.markAsPaid(id);
      
      if (result.success) {
        await this.refreshData();
        this.successMessage = 'Facture marquée comme payée';
      }
    },
    
    // ========================================
    // FILTRAGE
    // ========================================
    
    applyFilters() {
      let filtered = [...this.factures];
      
      // Filtre par statut
      if (this.filterStatut) {
        filtered = filtered.filter(f => f.statut === this.filterStatut);
      }
      
      // Filtre par recherche
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        filtered = filtered.filter(f =>
          (f.numero?.toLowerCase().includes(query)) ||
          (f.payeurNom?.toLowerCase().includes(query))
        );
      }
      
      // Filtre par date
      if (this.filterDateDebut) {
        filtered = filtered.filter(f => f.dateEmission >= this.filterDateDebut);
      }
      
      if (this.filterDateFin) {
        filtered = filtered.filter(f => f.dateEmission <= this.filterDateFin);
      }
      
      this.filteredFactures = filtered;
      this.totalPages = Math.ceil(filtered.length / this.pageSize);
    },
    
    // ========================================
    // MODAL
    // ========================================
    
    openCreateModal() {
      this.modalMode = 'create';
      this.selectedFacture = null;
      this.resetForm();
      this.showModal = true;
    },
    
    openEditModal(facture) {
      this.modalMode = 'edit';
      this.selectedFacture = facture;
      this.form = { ...facture };
      this.showModal = true;
    },
    
    closeModal() {
      this.showModal = false;
      this.selectedFacture = null;
      this.resetForm();
    },
    
    resetForm() {
      this.form = {
        numero: '',
        dateEmission: '',
        dateEcheance: '',
        montantTotal: 0,
        payeurId: '',
        statut: 'impaye'
      };
    },
    
    async saveFacture() {
      if (this.modalMode === 'create') {
        return this.createFacture();
      } else {
        return this.updateFacture();
      }
    },
    
    // ========================================
    // SYNCHRONISATION
    // ========================================
    
    async forceSync() {
      if (this.syncManager) {
        this.syncStatus = 'syncing';
        const result = await this.syncManager.forceSync();
        this.syncStatus = result.success ? 'paused' : 'error';
        if (result.success) {
          await this.refreshData();
        }
      }
    },
    
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
    // GESTION DES CONFLITS
    // ========================================
    
    async resolveConflict(factureId) {
      const result = await this.service.resolveConflicts(factureId);
      if (result.resolved) {
        await this.refreshData();
        this.successMessage = 'Conflit résolu';
      }
      return result;
    },
    
    // ========================================
    // COMPUTED PROPERTIES
    // ========================================
    
    get syncStatusClass() {
      const classes = {
        initializing: 'bg-gray-400',
        idle: 'bg-green-500',
        syncing: 'bg-blue-500 animate-pulse',
        paused: 'bg-green-400',
        error: 'bg-red-500',
        offline: 'bg-gray-600'
      };
      return classes[this.syncStatus] || 'bg-gray-400';
    },
    
    get syncStatusLabel() {
      const labels = {
        initializing: 'Initialisation...',
        idle: 'Synchronisé',
        syncing: 'Synchronisation...',
        paused: 'À jour',
        error: 'Erreur de sync',
        offline: 'Hors ligne'
      };
      return labels[this.syncStatus] || '...';
    },
    
    get paginatedFactures() {
      const start = (this.currentPage - 1) * this.pageSize;
      return this.filteredFactures.slice(start, start + this.pageSize);
    },
    
    get totalFactures() {
      return this.factures.length;
    },
    
    get impayesCount() {
      return this.factures.filter(f => f.statut === 'impaye').length;
    },
    
    get enRetardCount() {
      const today = new Date().toISOString().split('T')[0];
      return this.factures.filter(f => 
        f.statut === 'impaye' && f.dateEcheance && f.dateEcheance < today
      ).length;
    },
    
    get hasConflicts() {
      return this.conflicts.length > 0;
    },
    
    // ========================================
    // NETTOYAGE
    // ========================================
    
    destroy() {
      if (this.syncManager) {
        this.syncManager.cancel();
      }
      console.log('[CHECKPOINT] wf-factures-destroyed');
    }
  };
}

// ============================================
// ENREGISTREMENT ALPINE.JS
// ============================================

document.addEventListener('alpine:init', () => {
  
  // Enregistrer le composant
  Alpine.data('facturesPouchDB', facturesPouchDBManager);
  
  console.log('[CHECKPOINT] wf-factures-registered');
});

// ============================================
// EXPORTS
// ============================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FacturesPouchDBService,
    facturesPouchDBManager,
    FACTURES_COUCHDB_CONFIG,
    FACTURES_DESIGN_DOCS
  };
}
