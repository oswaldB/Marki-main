/**
 * WORKFLOW FRONTEND - Filtrer Séquences Relance (PouchDB + CouchDB)
 * ===================================================================
 * Adaptation du workflow filter-relance.md pour PouchDB local-first avec réplication live
 * 
 * RÈGLES IMPLÉMENTÉES:
 * ✓ PouchDB côté frontend avec réplication live vers CouchDB
 * ✓ Remplacement des appels API par opérations PouchDB (db.get, db.query, db.find)
 * ✓ Synchronisation bidirectionnelle avec db.sync()
 * ✓ Gestion des conflits (conflicts: true)
 * ✓ Design documents pour les vues Mango
 * ✓ Pattern local-first : lectures depuis PouchDB local, écritures vers PouchDB
 * ✓ Gestion offline/online avec events 'paused'/'active'
 * ✓ Structure Alpine.js x-data conservée
 * ✓ Propriété 'syncStatus' pour suivre l'état de la sync
 * ✓ IDs CouchDB (_id) et révisions (_rev) appropriés
 * 
 * @checkpoint fr-init
 * @checkpoint fr-db-ready
 * @checkpoint fr-design-docs
 * @checkpoint fr-sync-active
 * @checkpoint fr-data-loaded
 * @checkpoint fr-filter-applied
 * @checkpoint fr-complete
 * @checkpoint fr-error
 */

// ============================================
// CONFIGURATION COUCHDB
// ============================================
const FR_COUCHDB_CONFIG = {
  url: window.location.hostname === 'localhost' 
    ? 'http://admin:admin@localhost:5984'
    : 'https://admin:admin@dev.markidiags.com/data',
  dbName: 'marki_database',
  options: {
    live: true,
    retry: true,
    heartbeat: 10000,
    timeout: 30000
  }
};

// ============================================
// DESIGN DOCUMENTS (Vues Mango)
// ============================================
const FR_DESIGN_DOCS = [
  {
    _id: '_design/sequencesFilter',
    views: {
      // Vue: toutes les séquences
      all_sequences: {
        map: function(doc) {
          if (doc.type === 'sequence') {
            emit(doc._id, doc);
          }
        }.toString()
      },
      // Vue: séquences par type (relance vs suivi)
      by_type: {
        map: function(doc) {
          if (doc.type === 'sequence' && doc.type_sequence) {
            emit(doc.type_sequence, doc);
          }
        }.toString()
      },
      // Vue: séquences actives uniquement
      actives: {
        map: function(doc) {
          if (doc.type === 'sequence' && doc.actif === true) {
            emit(doc._id, doc);
          }
        }.toString()
      },
      // Vue: séquences par type et statut actif
      by_type_and_status: {
        map: function(doc) {
          if (doc.type === 'sequence' && doc.type_sequence) {
            emit([doc.type_sequence, doc.actif], doc);
          }
        }.toString()
      },
      // Vue: recherche textuelle (nom, description)
      by_name: {
        map: function(doc) {
          if (doc.type === 'sequence') {
            emit(doc.nom ? doc.nom.toLowerCase() : '', doc);
          }
        }.toString()
      },
      // Vue: statistiques par type
      stats_by_type: {
        map: function(doc) {
          if (doc.type === 'sequence' && doc.type_sequence) {
            emit(doc.type_sequence, 1);
          }
        }.toString(),
        reduce: '_count'
      }
    }
  }
];

// ============================================
// WORKFLOW FILTER RELANCE (POUCHDB)
// ============================================
function filterRelancePouchDBWorkflow() {
  return {
    // ========================================
    // ÉTAT: Données (conservé du workflow original)
    // ========================================
    sequences: [],           // Toutes les séquences
    filteredSequences: [],   // Séquences filtrées
    
    // ========================================
    // ÉTAT: Filtres (conservé du workflow original)
    // ========================================
    searchQuery: '',
    filterType: 'all',       // 'all' | 'relance' | 'suivi'
    filterStatut: null,      // null | 'actif' | 'inactif'
    sortField: 'nom',
    sortDirection: 'asc',
    
    // ========================================
    // ÉTAT: Synchronisation (RÈGLE #9)
    // ========================================
    syncStatus: 'initial',
    isOnline: navigator.onLine,
    lastSync: null,
    pendingChanges: 0,
    conflicts: [],
    
    // ========================================
    // ÉTAT: UI (conservé du workflow original)
    // ========================================
    loading: true,
    error: null,
    successMessage: null,
    showNewSequenceModal: false,
    showEditSequenceModal: false,
    showDeleteModal: false,
    editingSequence: null,
    deletingSequence: null,
    newSequence: {
      nom: '',
      description: '',
      type_sequence: 'relance',
      actif: true,
      emails_json: []
    },
    
    // ========================================
    // INSTANCES POUCHDB (RÈGLE #1)
    // ========================================
    localDB: null,
    remoteDB: null,
    syncHandler: null,
    
    // ========================================
    // INITIALISATION
    // ========================================
    
    /**
     * @action Initialiser PouchDB et démarrer la réplication
     * @checkpoint fr-init
     */
    async init() {
      console.log('[CHECKPOINT] fr-init');
      this.loading = true;
      this.error = null;
      
      try {
        // 1. Initialiser PouchDB local (RÈGLE #1)
        this.localDB = new PouchDB(FR_COUCHDB_CONFIG.dbName);
        console.log('[POUCHDB] Base locale initialisée:', FR_COUCHDB_CONFIG.dbName);
        
        // 2. Initialiser PouchDB remote (RÈGLE #1)
        const remoteUrl = `${FR_COUCHDB_CONFIG.url}/${FR_COUCHDB_CONFIG.dbName}`;
        this.remoteDB = new PouchDB(remoteUrl, { skip_setup: true });
        console.log('[POUCHDB] Base remote initialisée:', remoteUrl);
        
        console.log('[CHECKPOINT] fr-db-ready');
        
        // 3. Créer les design documents (RÈGLE #5)
        await this.ensureDesignDocs();
        console.log('[CHECKPOINT] fr-design-docs');
        
        // 4. Configurer la réplication bidirectionnelle (RÈGLE #3)
        await this.setupReplication();
        console.log('[CHECKPOINT] fr-sync-active');
        
        // 5. Charger les séquences depuis PouchDB local (RÈGLE #6)
        await this.loadSequences();
        console.log('[CHECKPOINT] fr-data-loaded');
        
        // 6. Configurer les écouteurs réseau (RÈGLE #7)
        this.setupNetworkListeners();
        
        this.loading = false;
        console.log('[CHECKPOINT] fr-complete');
        
      } catch (err) {
        console.error('[CHECKPOINT] fr-error', err);
        this.error = err.message;
        this.syncStatus = 'error';
        this.loading = false;
      }
    },
    
    /**
     * @action Créer/mettre à jour les design documents (RÈGLE #5)
     */
    async ensureDesignDocs() {
      for (const doc of FR_DESIGN_DOCS) {
        try {
          const existing = await this.localDB.get(doc._id);
          if (JSON.stringify(existing.views) !== JSON.stringify(doc.views)) {
            await this.localDB.put({
              ...doc,
              _rev: existing._rev
            });
            console.log('[DESIGN DOC] Mis à jour:', doc._id);
          }
        } catch (err) {
          if (err.status === 404) {
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
      
      this.syncHandler = this.localDB.sync(this.remoteDB, {
        live: FR_COUCHDB_CONFIG.options.live,
        retry: FR_COUCHDB_CONFIG.options.retry,
        heartbeat: FR_COUCHDB_CONFIG.options.heartbeat,
        timeout: FR_COUCHDB_CONFIG.options.timeout
      })
      .on('change', (info) => {
        console.log('[SYNC] Changement:', info);
        this.pendingChanges = info.change?.pending || 0;
        
        // Si des données arrivent du serveur, recharger les séquences
        if (info.direction === 'pull' && info.change?.docs?.length > 0) {
          console.log('[SYNC] Données reçues du serveur:', info.change.docs.length);
          this.loadSequences();
        }
      })
      .on('paused', (err) => {
        console.log('[SYNC] Réplication en pause');
        this.syncStatus = err ? 'error' : 'paused';
        this.lastSync = new Date().toISOString();
        
        if (err) {
          console.log('[SYNC] Pause due à une erreur:', err);
        }
      })
      .on('active', () => {
        console.log('[SYNC] Réplication active');
        this.syncStatus = 'syncing';
        this.isOnline = true;
      })
      .on('denied', (err) => {
        console.error('[SYNC] Document rejeté:', err);
        this.syncStatus = 'error';
      })
      .on('complete', (info) => {
        console.log('[SYNC] Réplication complète:', info);
        this.syncStatus = 'complete';
        this.lastSync = new Date().toISOString();
      })
      .on('error', (err) => {
        console.error('[SYNC] Erreur réplication:', err);
        this.syncStatus = 'error';
        this.isOnline = false;
      });
    },
    
    // ========================================
    // CHARGEMENT DES DONNÉES (RÈGLE #2, #6)
    // ========================================
    
    /**
     * @action Charger toutes les séquences depuis PouchDB local (RÈGLE #6)
     * @checkpoint fr-data-loaded
     */
    async loadSequences() {
      this.loading = true;
      
      try {
        // RÈGLE #2: Utiliser la vue Mango pour récupérer toutes les séquences
        // RÈGLE #4: include_docs avec conflicts: true
        const result = await this.localDB.query('sequencesFilter/all_sequences', {
          include_docs: true,
          conflicts: true
        });
        
        // Mapper les documents avec _id et _rev (RÈGLE #10)
        this.sequences = result.rows.map(row => ({
          ...row.doc,
          id: row.doc._id,
          hasConflicts: !!(row.doc._conflicts && row.doc._conflicts.length > 0)
        }));
        
        // Détecter les conflits (RÈGLE #4)
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
        
        // Appliquer les filtres
        this.applyFilter();
        
        console.log('[DATA] Séquences chargées:', this.sequences.length);
        console.log('[CHECKPOINT] fr-data-loaded');
        
      } catch (err) {
        console.error('[DATA] Erreur chargement:', err);
        
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
        
        this.applyFilter();
        
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * @action Charger les séquences filtrées par type (RÈGLE #2)
     */
    async loadSequencesByType(type) {
      this.loading = true;
      
      try {
        // RÈGLE #2: Utiliser la vue Mango by_type
        const result = await this.localDB.query('sequencesFilter/by_type', {
          key: type,
          include_docs: true,
          conflicts: true
        });
        
        return result.rows.map(row => ({
          ...row.doc,
          id: row.doc._id,
          hasConflicts: !!(row.doc._conflicts && row.doc._conflicts.length > 0)
        }));
        
      } catch (err) {
        console.error('[DATA] Erreur chargement par type:', err);
        // Fallback: filtrer en mémoire
        return this.sequences.filter(seq => seq.type_sequence === type);
        
      } finally {
        this.loading = false;
      }
    },
    
    // ========================================
    // FILTRAGE (adapté du workflow original)
    // ========================================
    
    /**
     * @action Appliquer le filtre sur type = 'relance'
     * Déclencheur: @click="filterType = 'relance'"
     * @checkpoint fr-filter-applied
     */
    applyFilter() {
      console.log('[FILTER] Application du filtre:', this.filterType);
      
      let result = [...this.sequences];
      
      // 1. Filtre par type (relance vs suivi)
      if (this.filterType && this.filterType !== 'all') {
        result = result.filter(seq => seq.type_sequence === this.filterType);
        console.log('[FILTER] Filtre type:', this.filterType, '-', result.length, 'séquences');
      }
      
      // 2. Filtre par statut (actif/inactif)
      if (this.filterStatut !== null) {
        const actif = this.filterStatut === 'actif';
        result = result.filter(seq => seq.actif === actif);
      }
      
      // 3. Recherche textuelle
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        result = result.filter(seq => {
          const nameMatch = seq.nom && seq.nom.toLowerCase().includes(query);
          const descMatch = seq.description && seq.description.toLowerCase().includes(query);
          return nameMatch || descMatch;
        });
      }
      
      // 4. Tri
      result = this.sortSequences(result);
      
      this.filteredSequences = result;
      
      console.log('[CHECKPOINT] fr-filter-applied:', result.length, 'séquences affichées');
    },
    
    /**
     * @action Définir le filtre sur 'relance'
     * Action principale du workflow
     */
    setFilterRelance() {
      this.filterType = 'relance';
      this.applyFilter();
      console.log('[FILTER] Mode relance activé - séquences de suivi masquées');
    },
    
    /**
     * @action Définir le filtre sur 'suivi'
     */
    setFilterSuivi() {
      this.filterType = 'suivi';
      this.applyFilter();
    },
    
    /**
     * @action Réinitialiser tous les filtres
     */
    resetFilter() {
      this.filterType = 'all';
      this.filterStatut = null;
      this.searchQuery = '';
      this.applyFilter();
    },
    
    /**
     * @action Définir la recherche
     */
    setSearchQuery(query) {
      this.searchQuery = query;
      this.applyFilter();
    },
    
    /**
     * @action Définir le filtre de statut
     */
    setFilterStatut(statut) {
      this.filterStatut = statut;
      this.applyFilter();
    },
    
    /**
     * @action Trier les séquences
     */
    sortSequences(data) {
      return data.sort((a, b) => {
        let aVal = a[this.sortField] || '';
        let bVal = b[this.sortField] || '';
        
        // Gérer les types
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        
        let comparison = 0;
        if (aVal < bVal) comparison = -1;
        if (aVal > bVal) comparison = 1;
        
        return this.sortDirection === 'asc' ? comparison : -comparison;
      });
    },
    
    /**
     * @action Changer le champ de tri
     */
    setSort(field) {
      if (this.sortField === field) {
        // Inverser la direction
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortField = field;
        this.sortDirection = 'asc';
      }
      this.applyFilter();
    },
    
    // ========================================
    // CRUD SÉQUENCES (RÈGLE #2, #6, #10)
    // ========================================
    
    /**
     * @action Créer une nouvelle séquence (RÈGLE #2: db.put)
     */
    async createSequence(sequenceData) {
      console.log('[DATA] Création séquence...');
      
      // Générer un ID CouchDB (RÈGLE #10)
      const _id = `seq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const doc = {
        _id: _id,
        type: 'sequence',
        ...sequenceData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      try {
        const result = await this.localDB.put(doc);
        console.log('[DATA] Séquence créée:', result.id);
        
        // Recharger les séquences
        await this.loadSequences();
        
        this.successMessage = 'Séquence créée avec succès';
        
        return {
          success: true,
          id: result.id,
          rev: result.rev
        };
        
      } catch (err) {
        console.error('[DATA] Erreur création:', err);
        return { success: false, error: err.message };
      }
    },
    
    /**
     * @action Mettre à jour une séquence (RÈGLE #2: db.put, RÈGLE #10)
     */
    async updateSequence(id, updates) {
      console.log('[DATA] Mise à jour séquence:', id);
      
      try {
        const doc = await this.localDB.get(id, { conflicts: true });
        
        const updatedDoc = {
          ...doc,
          ...updates,
          _id: doc._id,
          _rev: doc._rev,
          updatedAt: new Date().toISOString()
        };
        
        const result = await this.localDB.put(updatedDoc);
        console.log('[DATA] Séquence mise à jour:', result.id);
        
        // Recharger
        await this.loadSequences();
        
        this.successMessage = 'Séquence mise à jour';
        
        return { success: true, id: result.id, rev: result.rev };
        
      } catch (err) {
        if (err.status === 409) {
          return this.handleConflict(id, updates);
        }
        console.error('[DATA] Erreur mise à jour:', err);
        return { success: false, error: err.message };
      }
    },
    
    /**
     * @action Supprimer une séquence (RÈGLE #2: db.remove)
     */
    async deleteSequence(id) {
      console.log('[DATA] Suppression séquence:', id);
      
      try {
        const doc = await this.localDB.get(id);
        await this.localDB.remove(doc);
        
        console.log('[DATA] Séquence supprimée:', id);
        
        // Recharger
        await this.loadSequences();
        
        this.successMessage = 'Séquence supprimée';
        
        return { success: true };
        
      } catch (err) {
        console.error('[DATA] Erreur suppression:', err);
        return { success: false, error: err.message };
      }
    },
    
    /**
     * @action Basculer le statut actif/inactif
     */
    async toggleActive(sequence) {
      return await this.updateSequence(sequence._id, {
        actif: !sequence.actif
      });
    },
    
    // ========================================
    // GESTION DES CONFLITS (RÈGLE #4)
    // ========================================
    
    /**
     * @action Gérer les conflits de réplication
     */
    async handleConflict(docId, localUpdates) {
      console.log('[CONFLICT] Résolution conflit pour:', docId);
      
      try {
        const doc = await this.localDB.get(docId, { conflicts: true });
        const conflictRevs = doc._conflicts || [];
        
        if (conflictRevs.length === 0) {
          return await this.updateSequence(docId, localUpdates);
        }
        
        // Supprimer les révisions en conflit
        for (const conflictRev of conflictRevs) {
          try {
            await this.localDB.remove(docId, conflictRev);
          } catch (err) {
            console.error('[CONFLICT] Erreur suppression révision:', err);
          }
        }
        
        // Réessayer
        return await this.updateSequence(docId, localUpdates);
        
      } catch (err) {
        console.error('[CONFLICT] Erreur résolution:', err);
        return { success: false, error: err.message };
      }
    },
    
    // ========================================
    // SYNCHRONISATION MANUELLE
    // ========================================
    
    /**
     * @action Forcer une synchronisation
     */
    async forceSync() {
      if (!this.isOnline) {
        return { success: false, error: 'Hors ligne' };
      }
      
      this.syncStatus = 'syncing';
      
      try {
        const pushResult = await this.localDB.replicate.to(this.remoteDB);
        const pullResult = await this.localDB.replicate.from(this.remoteDB);
        
        await this.loadSequences();
        
        this.syncStatus = 'complete';
        this.lastSync = new Date().toISOString();
        
        return {
          success: true,
          pushed: pushResult.docs_written,
          pulled: pullResult.docs_written
        };
        
      } catch (err) {
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
    
    setupNetworkListeners() {
      window.addEventListener('online', () => {
        console.log('[NETWORK] En ligne');
        this.isOnline = true;
        this.restartReplication();
      });
      
      window.addEventListener('offline', () => {
        console.log('[NETWORK] Hors ligne');
        this.isOnline = false;
        this.syncStatus = 'paused';
      });
    },
    
    // ========================================
    // MODALS
    // ========================================
    
    openNewSequenceModal() {
      this.newSequence = {
        nom: '',
        description: '',
        type_sequence: this.filterType === 'all' ? 'relance' : this.filterType,
        actif: true,
        emails_json: []
      };
      this.showNewSequenceModal = true;
    },
    
    closeNewSequenceModal() {
      this.showNewSequenceModal = false;
    },
    
    openEditSequenceModal(sequence) {
      this.editingSequence = { ...sequence };
      this.showEditSequenceModal = true;
    },
    
    closeEditSequenceModal() {
      this.showEditSequenceModal = false;
      this.editingSequence = null;
    },
    
    openDeleteModal(sequence) {
      this.deletingSequence = sequence;
      this.showDeleteModal = true;
    },
    
    closeDeleteModal() {
      this.showDeleteModal = false;
      this.deletingSequence = null;
    },
    
    // ========================================
    // PROPRIÉTÉS CALCULÉES (RÈGLE #8: Alpine.js)
    // ========================================
    
    /**
     * @computed Séquences filtrées (compatibilité avec code existant)
     */
    get filteredData() {
      return this.filteredSequences;
    },
    
    /**
     * @computed Compte des séquences
     */
    get sequencesCount() {
      return this.sequences.length;
    },
    
    /**
     * @computed Compte des séquences filtrées
     */
    get filteredCount() {
      return this.filteredSequences.length;
    },
    
    /**
     * @computed Nombre de séquences de relance
     */
    get relanceCount() {
      return this.sequences.filter(s => s.type_sequence === 'relance').length;
    },
    
    /**
     * @computed Nombre de séquences de suivi
     */
    get suiviCount() {
      return this.sequences.filter(s => s.type_sequence === 'suivi').length;
    },
    
    /**
     * @computed Classe CSS pour le statut de sync
     */
    get syncStatusClass() {
      const classes = {
        initial: 'bg-gray-400',
        syncing: 'bg-blue-500 animate-pulse',
        paused: this.isOnline ? 'bg-yellow-500' : 'bg-gray-500',
        error: 'bg-red-500',
        complete: 'bg-green-500'
      };
      return classes[this.syncStatus] || classes.initial;
    },
    
    /**
     * @computed Libellé du statut de sync (RÈGLE #9)
     */
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
    
    /**
     * @computed Icône du statut
     */
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
    
    /**
     * @computed Label du filtre actif
     */
    get filterLabel() {
      const labels = {
        'all': 'Toutes',
        'relance': 'Relances',
        'suivi': 'Suivis'
      };
      return labels[this.filterType] || 'Toutes';
    },
    
    /**
     * @computed Indique si le filtre relance est actif
     */
    get isFilterRelanceActive() {
      return this.filterType === 'relance';
    },
    
    /**
     * @computed Indique si le filtre suivi est actif
     */
    get isFilterSuiviActive() {
      return this.filterType === 'suivi';
    },
    
    // ========================================
    // NETTOYAGE
    // ========================================
    
    destroy() {
      this.cancelReplication();
      console.log('[POUCHDB] FilterRelance workflow détruit');
    }
  };
}

// ============================================
// EXPORT
// ============================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    filterRelancePouchDBWorkflow,
    FR_COUCHDB_CONFIG,
    FR_DESIGN_DOCS
  };
}

// Exposer globalement pour Alpine.js (RÈGLE #8)
if (typeof window !== 'undefined') {
  window.filterRelancePouchDBWorkflow = filterRelancePouchDBWorkflow;
  window.FR_COUCHDB_CONFIG = FR_COUCHDB_CONFIG;
  window.FR_DESIGN_DOCS = FR_DESIGN_DOCS;
}
