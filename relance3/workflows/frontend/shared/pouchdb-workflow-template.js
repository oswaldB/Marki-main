/**
 * WORKFLOW TEMPLATE - PouchDB + CouchDB (Local-First)
 * =====================================================
 * Template générique pour adapter tout workflow à PouchDB avec réplication live CouchDB
 * 
 * RÈGLES IMPLÉMENTÉES:
 * ✓ PouchDB local-first, réplication bidirectionnelle live
 * ✓ Remplacement des API par db.get, db.put, db.query
 * ✓ Gestion des conflits (conflicts: true)
 * ✓ Design documents pour vues Mango
 * ✓ Pattern local-first: lectures locales, écritures locales → réplication
 * ✓ Gestion offline/online (events paused/active)
 * ✓ Propriété syncStatus pour suivre l'état
 * ✓ IDs CouchDB (_id) et révisions (_rev) gérés
 * 
 * @checkpoint wf-init
 * @checkpoint wf-db-ready
 * @checkpoint wf-design-docs
 * @checkpoint wf-sync-active
 * @checkpoint wf-data-loaded
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
  dbName: 'marki_database', // ← Adapter selon le workflow
  options: {
    live: true,        // Réplication continue
    retry: true,       // Reconnexion automatique
    heartbeat: 10000,  // Ping toutes les 10s
    timeout: 30000     // Timeout de 30s
  }
};

// ============================================
// DESIGN DOCUMENTS (Vues Mango)
// ============================================
const DESIGN_DOCS = [
  {
    _id: '_design/myWorkflow',
    views: {
      // Vue: tous les documents par type
      by_type: {
        map: function(doc) {
          if (doc.type === 'myType') {
            emit(doc._id, doc);
          }
        }.toString()
      },
      // Vue: documents par statut
      by_status: {
        map: function(doc) {
          if (doc.type === 'myType' && doc.status) {
            emit(doc.status, doc);
          }
        }.toString()
      },
      // Vue: documents par date
      by_date: {
        map: function(doc) {
          if (doc.type === 'myType' && doc.createdAt) {
            emit(doc.createdAt, doc);
          }
        }.toString()
      },
      // Vue: statistiques agrégées
      stats: {
        map: function(doc) {
          if (doc.type === 'myType') {
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
// TEMPLATE WORKFLOW POUCHDB
// ============================================
function pouchDBWorkflowManager() {
  return {
    // ========================================
    // ÉTAT: Données
    // ========================================
    items: [],           // Liste des documents
    filteredItems: [],   // Liste filtrée
    currentItem: null,   // Document en cours d'édition
    
    // ========================================
    // ÉTAT: Synchronisation (RÈGLE #9)
    // ========================================
    syncStatus: 'initial', // 'initial' | 'syncing' | 'paused' | 'error' | 'complete'
    isOnline: navigator.onLine,
    lastSync: null,
    pendingChanges: 0,
    conflicts: [],       // Documents en conflit
    
    // ========================================
    // ÉTAT: UI
    // ========================================
    loading: true,
    error: null,
    successMessage: null,
    
    // ========================================
    // ÉTAT: Filtres
    // ========================================
    searchQuery: '',
    filterStatus: 'all',
    sortField: 'createdAt',
    sortDirection: 'desc',
    
    // ========================================
    // INSTANCES POUCHDB (RÈGLE #1)
    // ========================================
    localDB: null,   // PouchDB local (IndexedDB)
    remoteDB: null,  // PouchDB remote (CouchDB)
    syncHandler: null, // Handler de réplication
    
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
        
        // 5. Charger les données initiales depuis PouchDB local (RÈGLE #6)
        await this.loadItems();
        console.log('[CHECKPOINT] wf-data-loaded');
        
        // 6. Configurer les écouteurs réseau (RÈGLE #7)
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
        
        // Si des données arrivent du serveur, recharger
        if (info.direction === 'pull' && info.change?.docs?.length > 0) {
          console.log('[SYNC] Données reçues du serveur:', info.change.docs.length);
          this.loadItems();
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
     * @action Charger tous les documents depuis PouchDB local (RÈGLE #6)
     * @checkpoint wf-data-loaded
     */
    async loadItems() {
      try {
        // Utiliser la vue Mango avec include_docs (RÈGLE #2, #4)
        const result = await this.localDB.query('myWorkflow/by_type', {
          include_docs: true,
          conflicts: true  // RÈGLE #4: Détecter les conflits
        });
        
        // Mapper les documents avec _id et _rev (RÈGLE #10)
        this.items = result.rows.map(row => ({
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
        
        // Appliquer les filtres
        this.applyFilters();
        
        console.log('[DATA] Items chargés:', this.items.length);
        
      } catch (err) {
        console.error('[DATA] Erreur chargement:', err);
        // Fallback: charger tous les documents sans vue
        const allDocs = await this.localDB.allDocs({
          include_docs: true,
          conflicts: true
        });
        this.items = allDocs.rows
          .filter(row => row.doc.type === 'myType')
          .map(row => ({
            ...row.doc,
            id: row.doc._id,
            hasConflicts: !!(row.doc._conflicts && row.doc._conflicts.length > 0)
          }));
        this.applyFilters();
      }
    },
    
    /**
     * @action Récupérer un document par ID (RÈGLE #2)
     */
    async getItem(id) {
      try {
        // RÈGLE #6: Lecture depuis PouchDB local (RÈGLE #2: db.get)
        const doc = await this.localDB.get(id, { conflicts: true });
        
        this.currentItem = {
          ...doc,
          id: doc._id,
          hasConflicts: !!(doc._conflicts && doc._conflicts.length > 0)
        };
        
        // Alerte si conflits détectés (RÈGLE #4)
        if (doc._conflicts && doc._conflicts.length > 0) {
          console.warn('[CONFLICT] Conflits sur document:', id, doc._conflicts);
        }
        
        return this.currentItem;
        
      } catch (err) {
        console.error('[DATA] Erreur getItem:', err);
        this.error = 'Document non trouvé';
        return null;
      }
    },
    
    /**
     * @action Créer un nouveau document (RÈGLE #2, #6, #10)
     */
    async createItem(data) {
      console.log('[DATA] Création document...');
      
      // Générer un ID CouchDB (RÈGLE #10)
      const _id = data._id || `mytype_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const doc = {
        _id: _id,           // RÈGLE #10: ID CouchDB
        type: 'myType',
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      try {
        // RÈGLE #6: Écriture dans PouchDB local (RÈGLE #2: db.put)
        const result = await this.localDB.put(doc);
        
        console.log('[DATA] Document créé:', result.id, 'rev:', result.rev);
        
        // Attendre la sync si en ligne (optionnel, la sync live s'en charge)
        this.successMessage = 'Document créé avec succès';
        
        // Recharger les données
        await this.loadItems();
        
        return {
          success: true,
          id: result.id,      // RÈGLE #10: ID CouchDB
          rev: result.rev     // RÈGLE #10: Révision CouchDB
        };
        
      } catch (err) {
        console.error('[DATA] Erreur création:', err);
        return { success: false, error: err.message };
      }
    },
    
    /**
     * @action Mettre à jour un document (RÈGLE #2, #6, #10)
     */
    async updateItem(id, updates) {
      console.log('[DATA] Mise à jour document:', id);
      
      try {
        // RÈGLE #6: Lire depuis PouchDB local, puis écrire
        const doc = await this.localDB.get(id, { conflicts: true });
        
        const updatedDoc = {
          ...doc,
          ...updates,
          _id: doc._id,       // RÈGLE #10: Conserver l'ID
          _rev: doc._rev,     // RÈGLE #10: Conserver la révision
          updatedAt: new Date().toISOString()
        };
        
        // RÈGLE #2: db.put pour mise à jour
        const result = await this.localDB.put(updatedDoc);
        
        console.log('[DATA] Document mis à jour:', result.id, 'nouvelle rev:', result.rev);
        
        this.successMessage = 'Document mis à jour';
        await this.loadItems();
        
        return {
          success: true,
          id: result.id,
          rev: result.rev     // RÈGLE #10: Nouvelle révision
        };
        
      } catch (err) {
        if (err.status === 409) {
          // Conflit de révision (RÈGLE #4)
          console.error('[CONFLICT] Conflit de révision sur:', id);
          return this.handleConflict(id, updates);
        }
        console.error('[DATA] Erreur mise à jour:', err);
        return { success: false, error: err.message };
      }
    },
    
    /**
     * @action Supprimer un document (RÈGLE #2, #10)
     */
    async deleteItem(id) {
      if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
        return { success: false, cancelled: true };
      }
      
      console.log('[DATA] Suppression document:', id);
      
      try {
        // RÈGLE #2: db.get puis db.remove
        const doc = await this.localDB.get(id);
        const result = await this.localDB.remove(doc); // db.remove utilise _id et _rev
        
        console.log('[DATA] Document supprimé:', id);
        
        this.successMessage = 'Document supprimé';
        await this.loadItems();
        
        return { success: true };
        
      } catch (err) {
        console.error('[DATA] Erreur suppression:', err);
        return { success: false, error: err.message };
      }
    },
    
    // ========================================
    // GESTION DES CONFLITS (RÈGLE #4)
    // ========================================
    
    /**
     * @action Gérer les conflits de réplication (RÈGLE #4)
     */
    async handleConflict(docId, localUpdates) {
      console.log('[CONFLICT] Résolution conflit pour:', docId);
      
      try {
        // Récupérer toutes les révisions en conflit
        const doc = await this.localDB.get(docId, { conflicts: true });
        const conflictRevs = doc._conflicts || [];
        
        if (conflictRevs.length === 0) {
          // Pas de conflit, réessayer simplement
          return await this.updateItem(docId, localUpdates);
        }
        
        // Récupérer chaque révision en conflit
        const conflictingDocs = await Promise.all(
          conflictRevs.map(rev => this.localDB.get(docId, { rev }))
        );
        
        console.log('[CONFLICT] Révisions en conflit:', conflictRevs);
        
        // Stratégie de fusion (personnalisable)
        const mergedDoc = this.mergeConflicts(doc, conflictingDocs, localUpdates);
        
        // Supprimer les révisions en conflit
        for (const conflictRev of conflictRevs) {
          await this.localDB.remove(docId, conflictRev);
          console.log('[CONFLICT] Révision supprimée:', conflictRev);
        }
        
        // Sauvegarder le document fusionné
        mergedDoc._rev = doc._rev;
        const result = await this.localDB.put(mergedDoc);
        
        console.log('[CONFLICT] Conflit résolu:', docId);
        
        await this.loadItems();
        
        return {
          success: true,
          id: result.id,
          rev: result.rev,
          resolved: true
        };
        
      } catch (err) {
        console.error('[CONFLICT] Erreur résolution:', err);
        return { success: false, error: err.message };
      }
    },
    
    /**
     * @action Fusionner les conflits (stratégie personnalisable)
     */
    mergeConflicts(currentDoc, conflictingDocs, localUpdates) {
      // Stratégie par défaut: garder les données locales
      // À personnaliser selon le besoin métier
      const merged = {
        ...currentDoc,
        ...localUpdates,
        _conflicts: undefined, // Nettoyer
        _rev: undefined         // Sera réassigné
      };
      
      // Exemple de stratégie alternative: prendre les champs les plus récents
      // for (const conflictDoc of conflictingDocs) {
      //   if (new Date(conflictDoc.updatedAt) > new Date(merged.updatedAt)) {
      //     merged.someField = conflictDoc.someField;
      //   }
      // }
      
      return merged;
    },
    
    /**
     * @action Résoudre manuellement un conflit
     */
    async resolveConflictManually(docId, chosenRev) {
      try {
        const doc = await this.localDB.get(docId, { conflicts: true });
        const conflictRevs = doc._conflicts || [];
        
        // Supprimer toutes les révisions sauf celle choisie
        for (const rev of conflictRevs) {
          if (rev !== chosenRev) {
            await this.localDB.remove(docId, rev);
          }
        }
        
        // Recharger
        await this.loadItems();
        
        return { success: true };
        
      } catch (err) {
        console.error('[CONFLICT] Erreur résolution manuelle:', err);
        return { success: false, error: err.message };
      }
    },
    
    // ========================================
    // RECHERCHE ET REQUÊTES (RÈGLE #2)
    // ========================================
    
    /**
     * @action Rechercher avec vue Mango (RÈGLE #2: db.query)
     */
    async queryByStatus(status) {
      try {
        const result = await this.localDB.query('myWorkflow/by_status', {
          key: status,
          include_docs: true
        });
        
        return result.rows.map(row => ({
          ...row.doc,
          id: row.doc._id
        }));
        
      } catch (err) {
        console.error('[QUERY] Erreur:', err);
        // Fallback: filtrer en mémoire
        return this.items.filter(item => item.status === status);
      }
    },
    
    /**
     * @action Recherche textuelle avec index Mango (RÈGLE #2)
     */
    async searchItems(query) {
      if (!query || query.trim() === '') {
        return this.items;
      }
      
      const searchLower = query.toLowerCase();
      
      // Recherche en mémoire (peut être remplacée par une vue Mango)
      return this.items.filter(item => {
        const searchable = [
          item.name,
          item.description,
          item.email,
          item.notes
        ].join(' ').toLowerCase();
        
        return searchable.includes(searchLower);
      });
    },
    
    /**
     * @action Charger les statistiques avec reduce (RÈGLE #2)
     */
    async loadStats() {
      try {
        const result = await this.localDB.query('myWorkflow/stats', {
          reduce: true,
          group: true
        });
        
        const stats = {};
        result.rows.forEach(row => {
          stats[row.key] = row.value;
        });
        
        return stats;
        
      } catch (err) {
        console.error('[STATS] Erreur:', err);
        // Fallback: calculer localement
        return this.calculateStatsLocally();
      }
    },
    
    calculateStatsLocally() {
      const stats = { total: this.items.length };
      
      this.items.forEach(item => {
        if (item.status) {
          const key = `status_${item.status}`;
          stats[key] = (stats[key] || 0) + 1;
        }
      });
      
      return stats;
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
        
        // Recharger les données
        await this.loadItems();
        
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
    // FILTRAGE ET TRI
    // ========================================
    
    /**
     * @action Appliquer les filtres et le tri
     */
    applyFilters() {
      let result = [...this.items];
      
      // Filtre par statut
      if (this.filterStatus !== 'all') {
        result = result.filter(item => item.status === this.filterStatus);
      }
      
      // Recherche textuelle
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        result = result.filter(item => {
          const text = `${item.name || ''} ${item.description || ''}`.toLowerCase();
          return text.includes(query);
        });
      }
      
      // Tri
      result.sort((a, b) => {
        const aVal = a[this.sortField] || '';
        const bVal = b[this.sortField] || '';
        const comparison = aVal.localeCompare(bVal, 'fr', { sensitivity: 'base' });
        return this.sortDirection === 'asc' ? comparison : -comparison;
      });
      
      this.filteredItems = result;
    },
    
    setSearchQuery(query) {
      this.searchQuery = query;
      this.applyFilters();
    },
    
    setFilterStatus(status) {
      this.filterStatus = status;
      this.applyFilters();
    },
    
    setSort(field, direction = null) {
      if (this.sortField === field && direction === null) {
        // Inverser la direction
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortField = field;
        this.sortDirection = direction || 'asc';
      }
      this.applyFilters();
    },
    
    // ========================================
    // UTILITAIRES
    // ========================================
    
    /**
     * @action Générer un ID CouchDB unique (RÈGLE #10)
     */
    generateId(prefix = 'doc') {
      return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },
    
    /**
     * @action Réinitialiser les messages
     */
    clearMessages() {
      this.error = null;
      this.successMessage = null;
    },
    
    // ========================================
    // PROPRIÉTÉS CALCULÉES (RÈGLE #8: Alpine.js)
    // ========================================
    
    // Classe CSS pour l'indicateur de sync
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
    
    // Nombre total d'items
    get totalCount() {
      return this.items.length;
    },
    
    // Nombre d'items filtrés
    get filteredCount() {
      return this.filteredItems.length;
    },
    
    // Nombre de conflits
    get conflictCount() {
      return this.conflicts.length;
    },
    
    // Format de la dernière sync
    get lastSyncFormatted() {
      if (!this.lastSync) return 'Jamais';
      const date = new Date(this.lastSync);
      return date.toLocaleString('fr-FR');
    },
    
    // ========================================
    // NETTOYAGE
    // ========================================
    
    /**
     * @action Détruire les instances (appeler au démontage)
     */
    destroy() {
      this.cancelReplication();
      // Les bases PouchDB sont gérées automatiquement
      console.log('[POUCHDB] Workflow détruit');
    }
  };
}

// ============================================
// EXPORT
// ============================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    pouchDBWorkflowManager,
    COUCHDB_CONFIG,
    DESIGN_DOCS
  };
}

// Exposer globalement pour Alpine.js (RÈGLE #8)
if (typeof window !== 'undefined') {
  window.pouchDBWorkflowManager = pouchDBWorkflowManager;
  window.COUCHDB_CONFIG = COUCHDB_CONFIG;
  window.DESIGN_DOCS = DESIGN_DOCS;
}
