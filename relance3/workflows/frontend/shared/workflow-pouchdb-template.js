/**
 * Template de Workflow PouchDB/CouchDB
 * Architecture local-first avec réplication bidirectionnelle en temps réel
 * 
 * Usage: Copier ce template et adapter selon vos besoins
 * 
 * @checkpoint wf-pouchdb-init
 * @checkpoint wf-pouchdb-db-ready
 * @checkpoint wf-pouchdb-design-docs-ready
 * @checkpoint wf-pouchdb-sync-active
 * @checkpoint wf-pouchdb-data-loaded
 * @checkpoint wf-pouchdb-complete
 */

// ============================================
// CONFIGURATION
// ============================================

const COUCHDB_CONFIG = {
  url: 'https://admin:admin@dev.markidiags.com/data',
  dbName: 'marki_data', // Adapter selon le workflow
  options: {
    live: true,      // Réplication continue
    retry: true,     // Retry automatique sur erreur
    heartbeat: 10000,
    timeout: 30000
  }
};

// ============================================
// DESIGN DOCUMENTS COUCHDB
// ============================================

const DESIGN_DOCS = [
  {
    _id: '_design/items',
    views: {
      all: {
        map: function(doc) {
          if (doc.type === 'item') {
            emit(doc._id, doc);
          }
        }.toString()
      },
      by_status: {
        map: function(doc) {
          if (doc.type === 'item' && doc.status) {
            emit(doc.status, doc);
          }
        }.toString()
      },
      by_date: {
        map: function(doc) {
          if (doc.type === 'item' && doc.createdAt) {
            emit(doc.createdAt, doc);
          }
        }.toString()
      }
    }
  },
  {
    _id: '_design/items_stats',
    views: {
      stats: {
        map: function(doc) {
          if (doc.type === 'item') {
            emit('total', 1);
            if (doc.status) emit('status_' + doc.status, 1);
          }
        }.toString(),
        reduce: '_count'
      }
    }
  }
];

// ============================================
// WORKFLOW POUCHDB
// ============================================

function workflowPouchDBManager() {
  return {
    // ========================================
    // ÉTAT DE DONNÉES
    // ========================================
    items: [],
    filteredItems: [],
    currentItem: null,
    stats: {
      total: 0
    },
    
    // ========================================
    // ÉTAT DE SYNCHRONISATION
    // ========================================
    syncStatus: 'initial', // 'initial' | 'syncing' | 'paused' | 'error' | 'complete'
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
    searchQuery: '',
    filterStatus: 'all',
    
    // ========================================
    // INSTANCES POUCHDB
    // ========================================
    localDB: null,
    remoteDB: null,
    syncHandler: null,
    changesHandler: null,
    
    // ========================================
    // ========================================
    // INITIALISATION
    // ========================================
    // ========================================
    
    /**
     * @action Initialiser le workflow PouchDB
     * @checkpoint wf-pouchdb-init
     */
    async init() {
      console.log('[CHECKPOINT] wf-pouchdb-init');
      this.loading = true;
      
      try {
        // Initialiser PouchDB local (IndexedDB)
        this.localDB = new PouchDB(COUCHDB_CONFIG.dbName);
        console.log('[POUCHDB] Local DB initialisé:', COUCHDB_CONFIG.dbName);
        
        // Initialiser PouchDB remote (CouchDB)
        const remoteUrl = `${COUCHDB_CONFIG.url}/${COUCHDB_CONFIG.dbName}`;
        this.remoteDB = new PouchDB(remoteUrl, { skip_setup: true });
        console.log('[POUCHDB] Remote DB initialisé:', remoteUrl);
        
        console.log('[CHECKPOINT] wf-pouchdb-db-ready');
        
        // Créer/mettre à jour les design documents
        await this.ensureDesignDocs();
        
        // Configurer la réplication bidirectionnelle
        await this.setupReplication();
        
        // Configurer l'écoute des changements en temps réel
        await this.setupChangesListener();
        
        // Charger les données initiales depuis PouchDB local
        await this.loadItems();
        await this.loadStats();
        
        // Configurer les écouteurs réseau
        this.setupNetworkListeners();
        
        this.loading = false;
        console.log('[CHECKPOINT] wf-pouchdb-complete');
        
      } catch (err) {
        console.error('[CHECKPOINT] wf-pouchdb-error', err);
        this.error = err.message;
        this.syncStatus = 'error';
        this.loading = false;
      }
    },
    
    /**
     * @action Créer/mettre à jour les design documents CouchDB
     * @checkpoint wf-pouchdb-design-docs-ready
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
            await this.localDB.put(doc);
            console.log('[DESIGN DOC] Créé:', doc._id);
          }
        }
      }
      console.log('[CHECKPOINT] wf-pouchdb-design-docs-ready');
    },
    
    /**
     * @action Configurer la réplication bidirectionnelle live
     * @checkpoint wf-pouchdb-sync-active
     */
    async setupReplication() {
      console.log('[CHECKPOINT] wf-pouchdb-sync-active');
      
      // Annuler la réplication existante si présente
      if (this.syncHandler) {
        this.syncHandler.cancel();
      }
      
      // Réplication bidirectionnelle avec sync
      this.syncHandler = this.localDB.sync(this.remoteDB, {
        live: COUCHDB_CONFIG.options.live,
        retry: COUCHDB_CONFIG.options.retry,
        heartbeat: COUCHDB_CONFIG.options.heartbeat,
        timeout: COUCHDB_CONFIG.options.timeout
      })
      .on('change', (info) => {
        // Changement reçu de la réplication
        console.log('[SYNC] Changement:', info);
        this.pendingChanges = info.change?.pending || 0;
        
        // Recharger les données si des changements sont reçus du serveur
        if (info.direction === 'pull') {
          console.log('[SYNC] Données reçues du serveur');
          this.loadItems();
          this.loadStats();
        }
      })
      .on('paused', (err) => {
        // Réplication en pause (attente de changements ou erreur réseau)
        console.log('[SYNC] Paused:', err ? 'erreur' : 'normal');
        this.syncStatus = err ? 'error' : 'paused';
        this.lastSync = new Date().toISOString();
      })
      .on('active', () => {
        // Réplication active
        console.log('[SYNC] Active');
        this.syncStatus = 'syncing';
        this.isOnline = true;
      })
      .on('denied', (err) => {
        // Document rejeté (permissions)
        console.error('[SYNC] Denied:', err);
        this.syncStatus = 'error';
        this.error = 'Permission refusée';
      })
      .on('complete', (info) => {
        // Réplication terminée (si live: false)
        console.log('[SYNC] Complete:', info);
        this.syncStatus = 'complete';
        this.lastSync = new Date().toISOString();
      })
      .on('error', (err) => {
        // Erreur de réplication
        console.error('[SYNC] Error:', err);
        this.syncStatus = 'error';
        this.isOnline = false;
        this.error = 'Erreur de synchronisation';
      });
    },
    
    /**
     * @action Configurer l'écoute des changements en temps réel
     */
    async setupChangesListener() {
      // Écouter les changements locaux pour mise à jour UI
      this.changesHandler = this.localDB.changes({
        since: 'now',
        live: true,
        include_docs: true
      }).on('change', (change) => {
        console.log('[CHANGES] Changement local:', change);
        // Mise à jour optimiste de l'UI
        this.handleLocalChange(change);
      }).on('error', (err) => {
        console.error('[CHANGES] Erreur:', err);
      });
    },
    
    /**
     * @action Gérer un changement local pour mise à jour UI
     */
    handleLocalChange(change) {
      const doc = change.doc;
      if (!doc || doc.type !== 'item') return;
      
      const existingIndex = this.items.findIndex(i => i._id === doc._id);
      
      if (change.deleted) {
        // Suppression
        if (existingIndex >= 0) {
          this.items.splice(existingIndex, 1);
        }
      } else {
        // Création ou mise à jour
        if (existingIndex >= 0) {
          this.items[existingIndex] = this.normalizeItem(doc);
        } else {
          this.items.push(this.normalizeItem(doc));
        }
      }
      
      // Réappliquer les filtres
      this.applyFilters();
    },
    
    // ========================================
    // ========================================
    // OPÉRATIONS CRUD
    // ========================================
    // ========================================
    
    /**
     * @action CRUD: Créer un nouvel item
     * @checkpoint wf-pouchdb-create-local
     * @checkpoint wf-pouchdb-create-sync
     */
    async createItem(itemData) {
      this.saving = true;
      this.error = null;
      
      try {
        // Générer un ID CouchDB unique
        const id = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const doc = {
          _id: id,
          type: 'item',
          ...itemData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        console.log('[CHECKPOINT] wf-pouchdb-create-local', { id });
        
        // Écriture locale (immediate)
        const result = await this.localDB.put(doc);
        
        console.log('[CHECKPOINT] wf-pouchdb-create-sync', { id: result.id, rev: result.rev });
        
        // La sync vers remote est automatique via setupReplication
        // Mais on peut forcer si besoin
        if (!this.isOnline) {
          this.pendingChanges++;
        }
        
        this.successMessage = 'Créé avec succès';
        this.saving = false;
        
        return { 
          success: true, 
          id: result.id, 
          rev: result.rev,
          doc: { ...doc, _rev: result.rev }
        };
        
      } catch (err) {
        console.error('[CHECKPOINT] wf-pouchdb-create-error', err);
        this.error = err.message;
        this.saving = false;
        return { success: false, error: err.message };
      }
    },
    
    /**
     * @action CRUD: Lire un item par ID
     */
    async readItem(id) {
      try {
        const doc = await this.localDB.get(id, { 
          conflicts: true // Inclure les conflits si présents
        });
        
        // Vérifier les conflits
        if (doc._conflicts && doc._conflicts.length > 0) {
          console.warn('[CONFLICT] Conflits détectés:', doc._conflicts);
          this.conflicts.push({
            id: doc._id,
            rev: doc._rev,
            conflictRevs: doc._conflicts
          });
        }
        
        this.currentItem = this.normalizeItem(doc);
        return { success: true, doc: this.currentItem };
        
      } catch (err) {
        console.error('Erreur lecture item:', err);
        return { success: false, error: err.message };
      }
    },
    
    /**
     * @action CRUD: Mettre à jour un item
     * @checkpoint wf-pouchdb-update-local
     * @checkpoint wf-pouchdb-update-sync
     */
    async updateItem(id, updates) {
      this.saving = true;
      this.error = null;
      
      try {
        // Lire le document existant avec la révision actuelle
        const doc = await this.localDB.get(id);
        
        const updatedDoc = {
          ...doc,
          ...updates,
          updatedAt: new Date().toISOString()
        };
        
        console.log('[CHECKPOINT] wf-pouchdb-update-local', { id, rev: doc._rev });
        
        // Écriture locale
        const result = await this.localDB.put(updatedDoc);
        
        console.log('[CHECKPOINT] wf-pouchdb-update-sync', { id: result.id, rev: result.rev });
        
        this.successMessage = 'Mis à jour avec succès';
        this.saving = false;
        
        // Mettre à jour l'item courant
        if (this.currentItem && this.currentItem._id === id) {
          this.currentItem = { ...updatedDoc, _rev: result.rev };
        }
        
        return { success: true, rev: result.rev };
        
      } catch (err) {
        if (err.status === 409) {
          // Conflit détecté
          return this.handleConflict(id, updates);
        }
        
        console.error('[CHECKPOINT] wf-pouchdb-update-error', err);
        this.error = err.message;
        this.saving = false;
        return { success: false, error: err.message };
      }
    },
    
    /**
     * @action CRUD: Supprimer un item
     * @checkpoint wf-pouchdb-delete-local
     * @checkpoint wf-pouchdb-delete-sync
     */
    async deleteItem(id) {
      this.saving = true;
      
      try {
        // Lire le document pour obtenir la révision
        const doc = await this.localDB.get(id);
        
        console.log('[CHECKPOINT] wf-pouchdb-delete-local', { id });
        
        // Suppression locale (soft delete avec _deleted: true)
        const result = await this.localDB.remove(doc);
        
        console.log('[CHECKPOINT] wf-pouchdb-delete-sync', { id });
        
        this.successMessage = 'Supprimé avec succès';
        this.saving = false;
        
        return { success: true };
        
      } catch (err) {
        console.error('[CHECKPOINT] wf-pouchdb-delete-error', err);
        this.error = err.message;
        this.saving = false;
        return { success: false, error: err.message };
      }
    },
    
    /**
     * @action CRUD: Opérations bulk (batch)
     */
    async bulkCreate(docs) {
      const docsWithIds = docs.map(doc => ({
        _id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'item',
        ...doc,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      
      try {
        const result = await this.localDB.bulkDocs(docsWithIds);
        console.log('[BULK] Créés:', result.length);
        
        // Recharger les données
        await this.loadItems();
        
        return { success: true, results: result };
      } catch (err) {
        console.error('[BULK] Erreur:', err);
        return { success: false, error: err.message };
      }
    },
    
    // ========================================
    // ========================================
    // REQUÊTES ET FILTRAGE
    // ========================================
    // ========================================
    
    /**
     * @action Charger tous les items depuis PouchDB local
     * @checkpoint wf-pouchdb-data-loaded
     */
    async loadItems() {
      try {
        // Utiliser la vue Mango pour récupérer tous les items
        const result = await this.localDB.query('items/all', {
          include_docs: true,
          conflicts: true // Détecter les conflits
        });
        
        // Normaliser et mapper les données
        this.items = result.rows.map(row => this.normalizeItem(row.doc));
        
        // Détecter les conflits
        this.conflicts = result.rows
          .filter(row => row.doc._conflicts && row.doc._conflicts.length > 0)
          .map(row => ({
            id: row.doc._id,
            rev: row.doc._rev,
            conflictRevs: row.doc._conflicts
          }));
        
        // Appliquer les filtres
        this.applyFilters();
        
        console.log('[CHECKPOINT] wf-pouchdb-data-loaded', { 
          count: this.items.length,
          conflicts: this.conflicts.length 
        });
        
        return { success: true, count: this.items.length };
        
      } catch (err) {
        console.error('[CHECKPOINT] Erreur chargement items:', err);
        // Fallback: utiliser allDocs si la vue n'existe pas encore
        return this.loadItemsFallback();
      }
    },
    
    /**
     * @action Fallback: Charger avec allDocs si les vues ne sont pas prêtes
     */
    async loadItemsFallback() {
      try {
        const result = await this.localDB.allDocs({
          include_docs: true,
          conflicts: true
        });
        
        this.items = result.rows
          .filter(row => row.doc.type === 'item')
          .map(row => this.normalizeItem(row.doc));
        
        this.applyFilters();
        
        console.log('[CHECKPOINT] wf-pouchdb-data-loaded (fallback)', { count: this.items.length });
        return { success: true, count: this.items.length };
        
      } catch (err) {
        console.error('[CHECKPOINT] Erreur fallback:', err);
        this.items = [];
        return { success: false, error: err.message };
      }
    },
    
    /**
     * @action Requête Mango Query (find)
     */
    async findItems(selector, options = {}) {
      try {
        const result = await this.localDB.find({
          selector,
          ...options
        });
        
        return { 
          success: true, 
          docs: result.docs.map(d => this.normalizeItem(d)),
          bookmark: result.bookmark
        };
        
      } catch (err) {
        console.error('Erreur find:', err);
        return { success: false, error: err.message };
      }
    },
    
    /**
     * @action Requête via Vue CouchDB
     */
    async queryView(viewName, key, options = {}) {
      try {
        const result = await this.localDB.query(`items/${viewName}`, {
          key,
          include_docs: true,
          ...options
        });
        
        return {
          success: true,
          rows: result.rows.map(r => this.normalizeItem(r.doc))
        };
        
      } catch (err) {
        console.error('Erreur vue:', err);
        return { success: false, error: err.message };
      }
    },
    
    /**
     * @action Charger les statistiques depuis la vue CouchDB
     */
    async loadStats() {
      try {
        const result = await this.localDB.query('items_stats/stats', {
          reduce: true,
          group: true
        });
        
        this.stats = { total: 0 };
        result.rows.forEach(row => {
          if (row.key === 'total') {
            this.stats.total = row.value;
          } else if (row.key.startsWith('status_')) {
            const status = row.key.replace('status_', '');
            this.stats[status] = row.value;
          }
        });
        
        return { success: true, stats: this.stats };
        
      } catch (err) {
        console.error('Erreur stats:', err);
        // Fallback: calculer localement
        this.calculateStatsLocally();
        return { success: false, error: err.message };
      }
    },
    
    /**
     * Calcul des stats en local (fallback)
     */
    calculateStatsLocally() {
      this.stats = {
        total: this.items.length
      };
    },
    
    // ========================================
    // ========================================
    // GESTION DES CONFLITS
    // ========================================
    // ========================================
    
    /**
     * @action Gérer un conflit de réplication
     */
    async handleConflict(docId, localUpdates) {
      console.log('[CONFLICT] Gestion du conflit pour:', docId);
      
      try {
        // Récupérer toutes les révisions en conflit
        const doc = await this.localDB.get(docId, { conflicts: true });
        const conflictRevs = doc._conflicts || [];
        
        if (conflictRevs.length === 0) {
          // Pas de conflit, réessayer simplement
          return this.updateItem(docId, localUpdates);
        }
        
        // Récupérer chaque révision en conflit
        const conflictingDocs = await Promise.all(
          conflictRevs.map(rev => this.localDB.get(docId, { rev }))
        );
        
        console.log('[CONFLICT] Révisions en conflit:', conflictRevs);
        
        // Stratégie de résolution: fusion manuelle
        const mergedDoc = this.mergeConflicts(doc, conflictingDocs, localUpdates);
        
        // Supprimer les révisions en conflit
        for (const conflictRev of conflictRevs) {
          await this.localDB.remove(docId, conflictRev);
          console.log('[CONFLICT] Suppression révision:', conflictRev);
        }
        
        // Sauvegarder le document fusionné
        mergedDoc._rev = doc._rev;
        const result = await this.localDB.put(mergedDoc);
        
        console.log('[CONFLICT] Conflit résolu:', docId);
        this.saving = false;
        
        return { success: true, resolved: true, rev: result.rev };
        
      } catch (err) {
        console.error('[CONFLICT] Erreur résolution:', err);
        this.saving = false;
        return { success: false, error: err.message };
      }
    },
    
    /**
     * Fusionner les conflits (stratégie personnalisable)
     */
    mergeConflicts(currentDoc, conflictingDocs, localUpdates) {
      // Stratégie: dernier modifié gagne avec préservation de certains champs
      const merged = {
        ...currentDoc,
        ...localUpdates,
        updatedAt: new Date().toISOString()
      };
      
      // Si besoin d'une stratégie plus complexe:
      // - Fusionner les tableaux
      // - Prendre la valeur la plus récente
      // - Combiner les changements de différents champs
      
      return merged;
    },
    
    /**
     * @action Résoudre tous les conflits détectés
     */
    async resolveAllConflicts() {
      const results = [];
      for (const conflict of this.conflicts) {
        const result = await this.handleConflict(conflict.id, {});
        results.push({ id: conflict.id, ...result });
      }
      
      // Recharger les données
      await this.loadItems();
      
      return results;
    },
    
    // ========================================
    // ========================================
    // SYNCHRONISATION MANUELLE
    // ========================================
    // ========================================
    
    /**
     * @action Forcer une synchronisation manuelle
     */
    async forceSync() {
      this.syncStatus = 'syncing';
      
      try {
        // Push vers CouchDB
        const pushResult = await this.localDB.replicate.to(this.remoteDB, {
          timeout: 30000
        });
        console.log('[SYNC] Push:', pushResult);
        
        // Pull depuis CouchDB
        const pullResult = await this.localDB.replicate.from(this.remoteDB, {
          timeout: 30000
        });
        console.log('[SYNC] Pull:', pullResult);
        
        // Recharger les données
        await this.loadItems();
        await this.loadStats();
        
        this.syncStatus = 'complete';
        this.lastSync = new Date().toISOString();
        this.pendingChanges = 0;
        
        return { 
          success: true, 
          push: pushResult, 
          pull: pullResult 
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
      
      if (this.changesHandler) {
        this.changesHandler.cancel();
      }
    },
    
    /**
     * @action Redémarrer la réplication
     */
    async restartReplication() {
      this.cancelReplication();
      await this.setupReplication();
      await this.setupChangesListener();
    },
    
    // ========================================
    // ========================================
    // UTILITAIRES
    // ========================================
    // ========================================
    
    /**
     * Normaliser un item pour l'UI
     */
    normalizeItem(doc) {
      return {
        ...doc,
        id: doc._id, // Alias pour compatibilité
        // Ajouter des propriétés calculées ici
      };
    },
    
    /**
     * @action Appliquer les filtres de recherche
     */
    applyFilters() {
      let filtered = [...this.items];
      
      // Filtre par statut
      if (this.filterStatus !== 'all') {
        filtered = filtered.filter(i => i.status === this.filterStatus);
      }
      
      // Filtre par recherche textuelle
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        filtered = filtered.filter(i => 
          (i.name && i.name.toLowerCase().includes(query)) ||
          (i.description && i.description.toLowerCase().includes(query))
        );
      }
      
      this.filteredItems = filtered;
    },
    
    /**
     * @action Configurer les écouteurs réseau
     */
    setupNetworkListeners() {
      window.addEventListener('online', async () => {
        console.log('[NETWORK] En ligne');
        this.isOnline = true;
        this.syncStatus = 'syncing';
        
        // Redémarrer la réplication
        await this.restartReplication();
        
        // Synchroniser les changements en attente
        await this.forceSync();
      });
      
      window.addEventListener('offline', () => {
        console.log('[NETWORK] Hors ligne');
        this.isOnline = false;
        this.syncStatus = 'paused';
      });
    },
    
    /**
     * @action Réinitialiser le formulaire
     */
    resetForm() {
      this.currentItem = null;
      this.error = null;
      this.successMessage = null;
    },
    
    /**
     * @action Détruire la base locale (debug/cleanup)
     */
    async destroyLocalDB() {
      if (confirm('Attention: Cela supprimera toutes les données locales. Continuer?')) {
        await this.localDB.destroy();
        console.log('[DB] Base locale détruite');
      }
    },
    
    // ========================================
    // ========================================
    // COMPUTED PROPERTIES (GETTERS)
    // ========================================
    // ========================================
    
    get hasConflicts() {
      return this.conflicts.length > 0;
    },
    
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
      if (!this.isOnline) return 'Hors ligne';
      
      const labels = {
        initial: 'Initialisation...',
        syncing: 'Synchronisation...',
        paused: 'À jour',
        error: 'Erreur de sync',
        complete: 'Synchronisé'
      };
      return labels[this.syncStatus] || 'Inconnu';
    },
    
    get isReady() {
      return !this.loading && this.syncStatus !== 'initial';
    },
    
    get itemCount() {
      return this.items.length;
    }
  };
}

// ============================================
// EXPORT
// ============================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    workflowPouchDBManager, 
    COUCHDB_CONFIG, 
    DESIGN_DOCS 
  };
}
