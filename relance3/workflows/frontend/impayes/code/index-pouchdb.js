/**
 * Workflow: impayes-initial-load
 * VERSION POUCHDB - Pattern local-first avec réplication CouchDB live
 * 
 * RÈGLES IMPLEMENTÉES:
 * #1 - PouchDB côté frontend avec réplication live
 * #2 - Remplacement des appels API par db.get/db.put/db.query
 * #3 - Synchronisation bidirectionnelle avec db.sync()
 * #4 - Gestion des conflits (conflicts: true)
 * #5 - _design documents pour vues Mango
 * #6 - Pattern local-first (lectures PouchDB local, écritures PouchDB)
 * #7 - États offline/online avec events paused/active
 * #8 - Structure Alpine.js x-data conservée
 * #9 - Propriété syncStatus pour suivre l'état de la sync
 * #10 - IDs CouchDB (_id) et révisions (_rev) appropriés
 * 
 * @checkpoint wf-impayes-init
 * @checkpoint wf-impayes-pouchdb-ready
 * @checkpoint wf-impayes-design-docs-created
 * @checkpoint wf-impayes-sync-started
 * @checkpoint wf-impayes-data-fetched
 * @checkpoint wf-impayes-stats-calculated
 * @checkpoint wf-impayes-pagination-updated
 * @checkpoint wf-impayes-table-rendered
 * @checkpoint wf-impayes-complete
 * @checkpoint wf-impayes-error
 */

// ============================================
// CONFIGURATION COUCHDB (RÈGLE #1)
// ============================================
const COUCHDB_CONFIG = {
  url: window.location.hostname === 'localhost' 
    ? 'http://admin:admin@localhost:5984'
    : 'https://admin:admin@dev.markidiags.com/data',
  dbName: 'marki_impayes',
  options: {
    live: true,        // Réplication continue (RÈGLE #1)
    retry: true,       // Reconnexion automatique
    heartbeat: 10000,  // Ping toutes les 10s
    timeout: 30000     // Timeout de 30s
  }
};

// ============================================
// DESIGN DOCUMENTS POUR VUES MANGO (RÈGLE #5)
// ============================================
const DESIGN_DOCS = [
  {
    _id: '_design/impayes',
    views: {
      // Vue principale: tous les impayés par statut soldé
      by_soldee: {
        map: function(doc) {
          if (doc.type === 'impaye') {
            emit(doc.facture_soldee || 0, doc);
          }
        }.toString()
      },
      // Vue: par statut (impaye, paye, annule)
      by_statut: {
        map: function(doc) {
          if (doc.type === 'impaye' && doc.statut) {
            emit(doc.statut, doc);
          }
        }.toString()
      },
      // Vue: par payeur (pour recherche)
      by_payeur: {
        map: function(doc) {
          if (doc.type === 'impaye' && doc.payeur) {
            emit(doc.payeur.toLowerCase(), doc);
          }
        }.toString()
      },
      // Vue: par date d'échéance (pour tri)
      by_date_echeance: {
        map: function(doc) {
          if (doc.type === 'impaye' && doc.date_echeance) {
            emit(doc.date_echeance, doc);
          }
        }.toString()
      },
      // Vue: par dossier (pour tri)
      by_dossier: {
        map: function(doc) {
          if (doc.type === 'impaye' && doc.dossier) {
            emit(doc.dossier.toLowerCase(), doc);
          }
        }.toString()
      },
      // Vue: par montant restant (pour tri)
      by_reste: {
        map: function(doc) {
          if (doc.type === 'impaye') {
            emit(doc.reste || 0, doc);
          }
        }.toString()
      },
      // Vue: par numéro de facture (pour tri)
      by_numero: {
        map: function(doc) {
          if (doc.type === 'impaye' && doc.numero_facture) {
            emit(doc.numero_facture.toLowerCase(), doc);
          }
        }.toString()
      },
      // Vue: tous les impayés
      all: {
        map: function(doc) {
          if (doc.type === 'impaye') {
            emit(doc._id, doc);
          }
        }.toString()
      }
    }
  },
  {
    _id: '_design/impayes_stats',
    views: {
      // Statistiques agrégées avec reduce
      stats: {
        map: function(doc) {
          if (doc.type === 'impaye') {
            emit('total', 1);
            emit('total_montant', doc.montant || 0);
            emit('total_reste', doc.reste || 0);
            
            if (doc.facture_soldee === 0 || !doc.facture_soldee) {
              emit('non_soldees', 1);
              emit('non_soldees_montant', doc.reste || 0);
            }
            
            if (doc.statut === 'impaye') emit('impayes', 1);
            if (doc.statut === 'paye') emit('payes', 1);
            if (doc.statut === 'annule') emit('annules', 1);
            
            // Compteur "à réparer" (sans payeur ou montant invalide)
            if (!doc.payeur || doc.payeur === '' || doc.reste <= 0) {
              emit('a_reparer', 1);
            }
          }
        }.toString(),
        reduce: '_sum'
      }
    }
  }
];

// ============================================
// WORKFLOW IMPAYÉS - VERSION POUCHDB COMPLÈTE
// ============================================
function impayesPouchDBManager() {
  return {
    // ========================================
    // ÉTAT: Données (RÈGLE #8: Alpine.js)
    // ========================================
    impayes: [],           // Liste complète des impayés
    filteredImpayes: [],   // Liste filtrée (recherche, statut)
    paginatedImpayes: [],  // Liste paginée pour affichage
    
    // ========================================
    // ÉTAT: Synchronisation (RÈGLE #9)
    // ========================================
    /** @type {'initial'|'syncing'|'paused'|'error'|'complete'} */
    syncStatus: 'initial',
    isOnline: navigator.onLine,
    lastSync: null,
    pendingChanges: 0,
    conflicts: [],         // Conflits détectés (RÈGLE #4)
    
    // ========================================
    // ÉTAT: UI / Loading (RÈGLE #8)
    // ========================================
    loading: true,
    skeletonVisible: true,
    error: null,
    
    // ========================================
    // ÉTAT: Filtres et tri (RÈGLE #8)
    // ========================================
    filters: {
      facture_soldee: 0,   // 0 = non soldées, 1 = soldées
      statut: 'impaye',    // 'impaye', 'paye', 'annule', null
      searchQuery: '',     // Recherche textuelle
      order_by: 'date_echeance',
      order: 'DESC'
    },
    
    // ========================================
    // ÉTAT: Pagination (RÈGLE #8)
    // ========================================
    pagination: {
      currentPage: 1,
      itemsPerPage: 50,
      totalPages: 0,
      totalItems: 0
    },
    
    // ========================================
    // ÉTAT: Statistiques (RÈGLE #8)
    // ========================================
    stats: {
      total: 0,
      nonSoldees: 0,
      aReparer: 0,
      totalMontant: 0,
      totalReste: 0
    },
    
    // ========================================
    // INSTANCES POUCHDB (RÈGLE #1)
    // ========================================
    localDB: null,   // Base PouchDB locale
    remoteDB: null,  // Base PouchDB remote (CouchDB)
    syncHandler: null, // Handler de synchronisation
    
    // ========================================
    // INITIALISATION (RÈGLE #8: Alpine.js x-data)
    // ========================================
    
    /**
     * @action Initialiser PouchDB et charger les données
     * @checkpoint wf-impayes-init
     */
    async init() {
      console.log('[CHECKPOINT] wf-impayes-init');
      this.loading = true;
      this.skeletonVisible = true;
      this.error = null;
      
      try {
        // 1. Initialiser PouchDB local (RÈGLE #1)
        this.localDB = new PouchDB(COUCHDB_CONFIG.dbName);
        console.log('[POUCHDB] Base locale initialisée:', COUCHDB_CONFIG.dbName);
        
        // 2. Initialiser PouchDB remote (RÈGLE #1)
        const remoteUrl = `${COUCHDB_CONFIG.url}/${COUCHDB_CONFIG.dbName}`;
        this.remoteDB = new PouchDB(remoteUrl, { skip_setup: true });
        console.log('[POUCHDB] Base remote initialisée:', remoteUrl);
        
        console.log('[CHECKPOINT] wf-impayes-pouchdb-ready');
        
        // 3. Créer les design documents pour vues Mango (RÈGLE #5)
        await this.ensureDesignDocs();
        console.log('[CHECKPOINT] wf-impayes-design-docs-created');
        
        // 4. Configurer la réplication bidirectionnelle (RÈGLE #3)
        await this.setupReplication();
        console.log('[CHECKPOINT] wf-impayes-sync-started');
        
        // 5. Charger les données depuis PouchDB local (RÈGLE #6: local-first)
        await this.loadImpayes();
        console.log('[CHECKPOINT] wf-impayes-data-fetched');
        
        // 6. Calculer les statistiques
        await this.calculateStats();
        console.log('[CHECKPOINT] wf-impayes-stats-calculated');
        
        // 7. Appliquer filtres et pagination
        this.applyFilters();
        this.updatePagination();
        console.log('[CHECKPOINT] wf-impayes-pagination-updated');
        
        // 8. Masquer le skeleton, afficher le tableau
        this.skeletonVisible = false;
        this.loading = false;
        console.log('[CHECKPOINT] wf-impayes-table-rendered');
        
        // 9. Configurer les écouteurs réseau (RÈGLE #7)
        this.setupNetworkListeners();
        
        console.log('[CHECKPOINT] wf-impayes-complete');
        
      } catch (err) {
        console.error('[CHECKPOINT] wf-impayes-error', err);
        this.error = err.message;
        this.syncStatus = 'error';
        this.loading = false;
        this.skeletonVisible = false;
      }
    },
    
    /**
     * @action Créer les design documents pour vues Mango (RÈGLE #5)
     */
    async ensureDesignDocs() {
      for (const doc of DESIGN_DOCS) {
        try {
          // Essayer de récupérer le design doc existant
          const existing = await this.localDB.get(doc._id);
          
          // Mettre à jour si les vues ont changé
          if (JSON.stringify(existing.views) !== JSON.stringify(doc.views)) {
            await this.localDB.put({
              ...doc,
              _rev: existing._rev  // RÈGLE #10: _rev approprié
            });
            console.log('[DESIGN DOC] Mis à jour:', doc._id);
          }
        } catch (err) {
          if (err.status === 404) {
            // Créer le design doc s'il n'existe pas
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
     * Utilise db.sync() pour réplication to/from automatique
     */
    async setupReplication() {
      console.log('[SYNC] Démarrage réplication bidirectionnelle...');
      this.syncStatus = 'syncing';
      
      // RÈGLE #3: db.sync() pour synchronisation bidirectionnelle
      this.syncHandler = this.localDB.sync(this.remoteDB, {
        live: COUCHDB_CONFIG.options.live,      // Réplication continue
        retry: COUCHDB_CONFIG.options.retry,    // Reconnexion auto
        heartbeat: COUCHDB_CONFIG.options.heartbeat,
        timeout: COUCHDB_CONFIG.options.timeout
      })
      .on('change', (info) => {
        // Changement détecté
        console.log('[SYNC] Changement:', info.direction, info.change?.docs?.length || 0, 'docs');
        this.pendingChanges = info.change?.pending || 0;
        
        // Si données reçues du serveur (pull), recharger
        if (info.direction === 'pull' && info.change?.docs?.length > 0) {
          this.loadImpayes();
          this.calculateStats();
        }
      })
      .on('paused', (err) => {
        // RÈGLE #7: Gestion état paused (offline ou en attente)
        console.log('[SYNC] Réplication en pause');
        this.syncStatus = err ? 'error' : 'paused';
        this.lastSync = new Date().toISOString();
        
        if (!err) {
          console.log('[SYNC] Synchronisation à jour');
        }
      })
      .on('active', () => {
        // RÈGLE #7: Gestion état active (online et synchro active)
        console.log('[SYNC] Réplication active');
        this.syncStatus = 'syncing';
        this.isOnline = true;
      })
      .on('denied', (err) => {
        // Document rejeté (permissions, etc.)
        console.error('[SYNC] Document rejeté:', err);
        this.syncStatus = 'error';
      })
      .on('complete', () => {
        // Synchronisation complétée (annulée manuellement)
        this.syncStatus = 'complete';
        this.lastSync = new Date().toISOString();
      })
      .on('error', (err) => {
        // RÈGLE #7: Gestion erreurs réseau
        console.error('[SYNC] Erreur:', err);
        this.syncStatus = 'error';
        this.isOnline = false;
      });
    },
    
    // ========================================
    // CHARGEMENT DES DONNÉES (RÈGLE #2, #6)
    // ========================================
    
    /**
     * @action Charger les impayés depuis PouchDB local (RÈGLE #6: local-first)
     * @checkpoint wf-impayes-data-fetched
     * 
     * RÈGLE #2: Utilise db.query avec vue Mango (pas d'API directe)
     * RÈGLE #4: Gère les conflits avec conflicts: true
     * RÈGLE #10: Utilise _id et _rev de CouchDB
     */
    async loadImpayes() {
      try {
        // RÈGLE #2: db.query avec vue Mango au lieu d'appel API
        // RÈGLE #4: include_docs et conflicts pour détecter les conflits
        const result = await this.localDB.query('impayes/by_soldee', {
          key: 0,  // facture_soldee = 0 (non soldées)
          include_docs: true,
          conflicts: true  // RÈGLE #4: détecter les conflits
        });
        
        // Mapper les documents avec _id et _rev (RÈGLE #10)
        this.impayes = result.rows.map(row => ({
          ...row.doc,
          id: row.doc._id,        // RÈGLE #10: ID CouchDB
          rev: row.doc._rev,      // RÈGLE #10: révision CouchDB
          hasConflicts: !!(row.doc._conflicts && row.doc._conflicts.length > 0)
        }));
        
        // Collecter les conflits pour affichage/gestion (RÈGLE #4)
        this.conflicts = result.rows
          .filter(row => row.doc._conflicts && row.doc._conflicts.length > 0)
          .map(row => ({
            id: row.doc._id,
            rev: row.doc._rev,
            conflictRevs: row.doc._conflicts
          }));
        
        if (this.conflicts.length > 0) {
          console.warn('[CONFLICTS] Conflits détectés:', this.conflicts);
        }
        
        console.log('[DATA] Impayés chargés depuis PouchDB local:', this.impayes.length);
        
      } catch (err) {
        console.error('[DATA] Erreur chargement vues:', err);
        // Fallback: charger tous les documents avec allDocs
        const allDocs = await this.localDB.allDocs({
          include_docs: true,
          conflicts: true  // RÈGLE #4
        });
        
        this.impayes = allDocs.rows
          .filter(row => row.doc.type === 'impaye' && !row.doc.facture_soldee)
          .map(row => ({
            ...row.doc,
            id: row.doc._id,      // RÈGLE #10
            rev: row.doc._rev,    // RÈGLE #10
            hasConflicts: !!(row.doc._conflicts && row.doc._conflicts.length > 0)
          }));
        
        console.log('[DATA] Impayés chargés (fallback):', this.impayes.length);
      }
    },
    
    /**
     * @action Calculer les statistiques depuis CouchDB (RÈGLE #2)
     * @checkpoint wf-impayes-stats-calculated
     * 
     * RÈGLE #2: Utilise db.query avec reduce au lieu d'API /api/dashboard/stats
     */
    async calculateStats() {
      try {
        // RÈGLE #2: db.query avec vue reduce pour statistiques
        const result = await this.localDB.query('impayes_stats/stats', {
          reduce: true,
          group: true
        });
        
        // Mapper les résultats réduits
        const statsMap = {};
        result.rows.forEach(row => {
          statsMap[row.key] = row.value;
        });
        
        this.stats = {
          total: statsMap['total'] || 0,
          nonSoldees: statsMap['non_soldees'] || 0,
          aReparer: statsMap['a_reparer'] || 0,
          totalMontant: statsMap['total_montant'] || 0,
          totalReste: statsMap['total_reste'] || 0
        };
        
        console.log('[STATS] Calculées via vue reduce:', this.stats);
        
      } catch (err) {
        console.error('[STATS] Erreur vue reduce, calcul local:', err);
        // Fallback: calcul local depuis les données
        this.calculateStatsLocally();
      }
    },
    
    /**
     * @action Calcul des statistiques en local (fallback)
     */
    calculateStatsLocally() {
      this.stats = {
        total: this.impayes.length,
        nonSoldees: this.impayes.filter(i => !i.facture_soldee).length,
        aReparer: this.impayes.filter(i => !i.payeur || i.reste <= 0).length,
        totalMontant: this.impayes.reduce((sum, i) => sum + (i.montant || 0), 0),
        totalReste: this.impayes.reduce((sum, i) => sum + (i.reste || 0), 0)
      };
      console.log('[STATS] Calculées localement:', this.stats);
    },
    
    // ========================================
    // FILTRAGE ET TRI
    // ========================================
    
    /**
     * @action Appliquer les filtres et le tri
     */
    applyFilters() {
      let result = [...this.impayes];
      
      // Filtre par statut
      if (this.filters.statut) {
        result = result.filter(i => i.statut === this.filters.statut);
      }
      
      // Filtre par solde
      if (this.filters.facture_soldee !== null) {
        result = result.filter(i => 
          (i.facture_soldee || 0) === this.filters.facture_soldee
        );
      }
      
      // Recherche textuelle
      if (this.filters.searchQuery) {
        const query = this.filters.searchQuery.toLowerCase();
        result = result.filter(i => 
          (i.payeur && i.payeur.toLowerCase().includes(query)) ||
          (i.dossier && i.dossier.toLowerCase().includes(query)) ||
          (i.numero_facture && i.numero_facture.toLowerCase().includes(query))
        );
      }
      
      // Tri
      result.sort((a, b) => {
        let aVal = a[this.filters.order_by];
        let bVal = b[this.filters.order_by];
        
        // Gestion des dates
        if (this.filters.order_by === 'date_echeance') {
          aVal = aVal ? new Date(aVal).getTime() : 0;
          bVal = bVal ? new Date(bVal).getTime() : 0;
        }
        
        // Gestion des chaînes
        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = (bVal || '').toLowerCase();
        }
        
        const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        return this.filters.order === 'DESC' ? -comparison : comparison;
      });
      
      this.filteredImpayes = result;
      this.updatePagination();
    },
    
    /**
     * @action Mettre à jour la pagination
     * @checkpoint wf-impayes-pagination-updated
     */
    updatePagination() {
      this.pagination.totalItems = this.filteredImpayes.length;
      this.pagination.totalPages = Math.ceil(
        this.pagination.totalItems / this.pagination.itemsPerPage
      );
      
      // S'assurer que la page courante est valide
      if (this.pagination.currentPage > this.pagination.totalPages) {
        this.pagination.currentPage = this.pagination.totalPages || 1;
      }
      
      // Extraire les items pour la page courante
      const start = (this.pagination.currentPage - 1) * this.pagination.itemsPerPage;
      const end = start + this.pagination.itemsPerPage;
      this.paginatedImpayes = this.filteredImpayes.slice(start, end);
    },
    
    // ========================================
    // ACTIONS UTILISATEUR
    // ========================================
    
    /**
     * @action Changer la page
     */
    goToPage(page) {
      if (page < 1 || page > this.pagination.totalPages) return;
      this.pagination.currentPage = page;
      this.updatePagination();
    },
    
    /**
     * @action Définir le tri
     */
    setSort(column) {
      if (this.filters.order_by === column) {
        // Inverser la direction
        this.filters.order = this.filters.order === 'ASC' ? 'DESC' : 'ASC';
      } else {
        this.filters.order_by = column;
        this.filters.order = 'ASC';
      }
      this.applyFilters();
    },
    
    /**
     * @action Définir la recherche
     */
    setSearch(query) {
      this.filters.searchQuery = query;
      this.pagination.currentPage = 1; // Reset à la première page
      this.applyFilters();
    },
    
    /**
     * @action Définir le filtre statut
     */
    setStatutFilter(statut) {
      this.filters.statut = statut;
      this.pagination.currentPage = 1;
      this.applyFilters();
    },
    
    /**
     * @action Afficher soldées / non soldées
     */
    setSoldeeFilter(soldee) {
      this.filters.facture_soldee = soldee;
      this.pagination.currentPage = 1;
      this.applyFilters();
    },
    
    // ========================================
    // OPERATIONS CRUD AVEC POUCHDB (RÈGLE #2)
    // Toutes les écritures passent par PouchDB local
    // ========================================
    
    /**
     * @action Récupérer un impayé par ID (RÈGLE #2: db.get)
     * RÈGLE #10: Utilise _id CouchDB
     * @param {string} id - L'_id CouchDB du document
     * @returns {Promise<Object>}
     */
    async getImpaye(id) {
      try {
        const doc = await this.localDB.get(id, { conflicts: true });  // RÈGLE #4
        return {
          ...doc,
          id: doc._id,      // RÈGLE #10
          rev: doc._rev,    // RÈGLE #10
          hasConflicts: !!(doc._conflicts && doc._conflicts.length > 0)
        };
      } catch (err) {
        console.error('[CRUD] Erreur getImpaye:', err);
        throw err;
      }
    },
    
    /**
     * @action Sauvegarder un impayé (RÈGLE #2: db.put)
     * RÈGLE #6: Écriture vers PouchDB local (qui réplique vers CouchDB)
     * RÈGLE #10: Gère _id et _rev
     * @param {Object} impaye - L'objet impayé à sauvegarder
     * @returns {Promise<Object>}
     */
    async saveImpaye(impaye) {
      try {
        // RÈGLE #10: S'assurer qu'on a le bon format _id et _rev
        const doc = {
          ...impaye,
          _id: impaye._id || impaye.id,  // Utilise _id CouchDB
          type: 'impaye',
          updated_at: new Date().toISOString()
        };
        
        // Supprimer les propriétés auxiliaires
        delete doc.id;
        delete doc.hasConflicts;
        
        // RÈGLE #2: db.put pour créer ou mettre à jour
        const result = await this.localDB.put(doc);
        console.log('[CRUD] Impayé sauvegardé:', result);
        
        // Recharger les données après modification
        await this.loadImpayes();
        this.applyFilters();
        
        return result;
      } catch (err) {
        console.error('[CRUD] Erreur saveImpaye:', err);
        throw err;
      }
    },
    
    /**
     * @action Supprimer un impayé (RÈGLE #2: db.remove)
     * RÈGLE #10: Nécessite _rev pour suppression
     * @param {string} id - L'_id CouchDB
     * @param {string} rev - Le _rev CouchDB
     * @returns {Promise<Object>}
     */
    async removeImpaye(id, rev) {
      try {
        // RÈGLE #2: db.remove avec _id et _rev
        const result = await this.localDB.remove(id, rev);  // RÈGLE #10
        console.log('[CRUD] Impayé supprimé:', result);
        
        // Recharger les données
        await this.loadImpayes();
        this.applyFilters();
        
        return result;
      } catch (err) {
        console.error('[CRUD] Erreur removeImpaye:', err);
        throw err;
      }
    },
    
    /**
     * @action Résoudre un conflit (RÈGLE #4)
     * @param {string} id - L'_id du document en conflit
     * @param {string} winningRev - La révision gagnante
     * @param {string[]} losingRevs - Les révisions perdantes à supprimer
     */
    async resolveConflict(id, winningRev, losingRevs) {
      try {
        // Récupérer le document gagnant
        const winningDoc = await this.localDB.get(id, { rev: winningRev });
        
        // Supprimer les révisions en conflit
        for (const rev of losingRevs) {
          await this.localDB.remove(id, rev);  // RÈGLE #10
        }
        
        console.log('[CONFLICTS] Conflit résolu pour', id);
        
        // Recharger les données
        await this.loadImpayes();
        
      } catch (err) {
        console.error('[CONFLICTS] Erreur résolution:', err);
        throw err;
      }
    },
    
    /**
     * @action Requête Mango pour rechercher des impayés (RÈGLE #2)
     * Alternative à db.query pour des requêtes ad-hoc
     * @param {Object} selector - Sélecteur Mango
     * @returns {Promise<Array>}
     */
    async findImpayes(selector) {
      try {
        // RÈGLE #2: db.find pour requêtes Mango
        const result = await this.localDB.find({
          selector: {
            type: 'impaye',
            ...selector
          },
          conflicts: true  // RÈGLE #4
        });
        
        return result.docs.map(doc => ({
          ...doc,
          id: doc._id,      // RÈGLE #10
          rev: doc._rev,    // RÈGLE #10
          hasConflicts: !!(doc._conflicts && doc._conflicts.length > 0)
        }));
      } catch (err) {
        console.error('[CRUD] Erreur findImpayes:', err);
        throw err;
      }
    },
    
    // ========================================
    // SYNCHRONISATION MANUELLE
    // ========================================
    
    /**
     * @action Forcer une synchronisation manuelle (RÈGLE #3)
     * Utilise replicate.to/from pour contrôle total
     */
    async forceSync() {
      if (!this.isOnline) {
        console.warn('[SYNC] Hors ligne, impossible de synchroniser');
        return;
      }
      
      this.syncStatus = 'syncing';
      
      try {
        // RÈGLE #3: Réplication explicite vers le serveur
        console.log('[SYNC] Push vers CouchDB...');
        const pushResult = await this.localDB.replicate.to(this.remoteDB);
        console.log('[SYNC] Push terminé:', pushResult.docs_written, 'docs');
        
        // RÈGLE #3: Réplication explicite depuis le serveur
        console.log('[SYNC] Pull depuis CouchDB...');
        const pullResult = await this.localDB.replicate.from(this.remoteDB);
        console.log('[SYNC] Pull terminé:', pullResult.docs_written, 'docs');
        
        // Recharger les données après sync
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
        throw err;
      }
    },
    
    /**
     * @action Annuler la synchronisation en cours
     */
    cancelSync() {
      if (this.syncHandler) {
        this.syncHandler.cancel();
        console.log('[SYNC] Synchronisation annulée');
      }
    },
    
    // ========================================
    // GESTION RÉSEAU (RÈGLE #7)
    // ========================================
    
    /**
     * @action Configurer les écouteurs réseau pour offline/online
     * RÈGLE #7: Gestion des états offline/online
     */
    setupNetworkListeners() {
      // Passage en ligne
      window.addEventListener('online', () => {
        console.log('[NETWORK] En ligne');
        this.isOnline = true;
        this.syncStatus = 'syncing';
        
        // Redémarrer la synchro si elle était en pause
        if (this.syncHandler) {
          this.syncHandler.cancel();
          this.setupReplication();
        }
      });
      
      // Passage hors ligne
      window.addEventListener('offline', () => {
        console.log('[NETWORK] Hors ligne');
        this.isOnline = false;
        this.syncStatus = 'paused';
      });
    },
    
    // ========================================
    // UTILITAIRES D'AFFICHAGE
    // ========================================
    
    formatMontant(montant) {
      if (!montant) return '0,00 €';
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
      }).format(montant);
    },
    
    formatDate(date) {
      if (!date) return '-';
      return new Date(date).toLocaleDateString('fr-FR');
    },
    
    // ========================================
    // PROPRIÉTÉS CALCULÉES (RÈGLE #8: Alpine.js)
    // ========================================
    
    /**
     * @computed Classes CSS pour l'indicateur de statut de sync (RÈGLE #9)
     */
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
    
    /**
     * @computed Label pour le statut de sync (RÈGLE #9)
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
     * @computed Icône de tri
     */
    get sortIcon() {
      return this.filters.order === 'ASC' ? '↑' : '↓';
    },
    
    /**
     * @computed Pagination - a page précédente
     */
    get hasPreviousPage() {
      return this.pagination.currentPage > 1;
    },
    
    /**
     * @computed Pagination - a page suivante
     */
    get hasNextPage() {
      return this.pagination.currentPage < this.pagination.totalPages;
    },
    
    /**
     * @computed Pagination - numéros de pages visibles
     */
    get pageNumbers() {
      const pages = [];
      const maxVisible = 5;
      const half = Math.floor(maxVisible / 2);
      
      let start = Math.max(1, this.pagination.currentPage - half);
      let end = Math.min(this.pagination.totalPages, start + maxVisible - 1);
      
      if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1);
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      return pages;
    },
    
    /**
     * @computed Indicateur de conflits (RÈGLE #4)
     */
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
    impayesPouchDBManager,
    COUCHDB_CONFIG,
    DESIGN_DOCS
  };
}

if (typeof window !== 'undefined') {
  window.impayesPouchDBManager = impayesPouchDBManager;
  window.COUCHDB_CONFIG = COUCHDB_CONFIG;
  window.DESIGN_DOCS = DESIGN_DOCS;
}
