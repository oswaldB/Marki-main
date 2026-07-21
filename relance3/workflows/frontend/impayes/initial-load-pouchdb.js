/**
 * Workflow: impayes-initial-load-pouchdb
 * Description: Charger la liste paginée des factures impayées avec PouchDB + réplication live CouchDB
 * Screen: impayes
 * Architecture: Local-first avec sync bidirectionnelle
 */

// ============================================
// CONFIGURATION POUCHDB + COUCHDB
// ============================================

const POUCHDB_CONFIG = {
  // Base PouchDB locale (IndexedDB)
  localDbName: 'adti_impayes',
  
  // URL CouchDB distant
  remoteUrl: window.location.hostname === 'localhost' 
    ? 'http://localhost:5984/adti_impayes'
    : 'https://couchdb.markidiags.com/adti_impayes',
  
  // Options de réplication
  syncOptions: {
    live: true,           // Réplication continue
    retry: true,        // Retry automatique en cas d'erreur
    heartbeat: 10000,   // Ping toutes les 10s
    timeout: 30000      // Timeout de 30s
  },
  
  // Options de query
  queryOptions: {
    include_docs: true,
    conflicts: true     // Important: gérer les conflits
  }
};

// ============================================
// DESIGN DOCUMENTS (VUES MANGO)
// ============================================

const DESIGN_DOCS = {
  _id: '_design/impayes_views',
  views: {
    // Vue: Impayés non soldés (facture_soldee = 0)
    by_statut: {
      map: function(doc) {
        if (doc.type === 'impaye' && doc.facture_soldee === 0) {
          emit(doc.statut, {
            id: doc._id,
            numero: doc.numero,
            payeur_nom: doc.payeur_nom,
            montant: doc.montant,
            reste: doc.reste,
            date_echeance: doc.date_echeance,
            date_facture: doc.date_facture,
            statut: doc.statut,
            a_reparer: doc.a_reparer,
            blackliste: doc.blackliste,
            _rev: doc._rev
          });
        }
      }.toString()
    },
    
    // Vue: Par date d'échéance (pour tri)
    by_date_echeance: {
      map: function(doc) {
        if (doc.type === 'impaye' && doc.facture_soldee === 0) {
          emit(doc.date_echeance, doc._id);
        }
      }.toString()
    },
    
    // Vue: Par montant (pour tri)
    by_montant: {
      map: function(doc) {
        if (doc.type === 'impaye' && doc.facture_soldee === 0) {
          emit(doc.montant, doc._id);
        }
      }.toString()
    },
    
    // Vue: Stats pour dashboard
    stats_global: {
      map: function(doc) {
        if (doc.type === 'impaye') {
          emit('total', doc.reste || 0);
          emit('count', 1);
          if (doc.a_reparer) emit('a_reparer', 1);
          if (doc.blackliste) emit('blackliste', 1);
        }
      }.toString(),
      reduce: '_sum'
    },
    
    // Vue: Par payeur (pour regroupement)
    by_payeur: {
      map: function(doc) {
        if (doc.type === 'impaye' && doc.facture_soldee === 0) {
          emit(doc.payeur_id, {
            impaye_id: doc._id,
            numero: doc.numero,
            reste: doc.reste,
            date_echeance: doc.date_echeance
          });
        }
      }.toString()
    }
  }
};

// ============================================
// STORE ALPINE.JS AVEC POUCHDB
// ============================================

document.addEventListener('alpine:init', () => {
  Alpine.data('impayesStore', () => ({
    // État des données
    impayes: [],
    impayesFiltered: [],
    stats: {
      total: 0,
      montantTotal: 0,
      aReparer: 0,
      blacklistes: 0
    },
    
    // État UI
    loading: true,
    skeletonVisible: true,
    error: null,
    
    // Pagination
    currentPage: 1,
    itemsPerPage: 50,
    totalPages: 1,
    
    // Filtres
    filters: {
      statut: 'impaye',
      search: '',
      orderBy: 'date_echeance',
      order: 'DESC'
    },
    
    // Sync PouchDB
    syncStatus: 'initializing', // 'initializing' | 'connected' | 'syncing' | 'paused' | 'error' | 'offline'
    lastSyncAt: null,
    syncError: null,
    pendingChanges: 0,
    
    // Instances PouchDB
    db: null,
    remoteDb: null,
    syncHandler: null,
    
    // ============================================
    // INITIALISATION
    // ============================================
    
    /**
     * @action Initialiser PouchDB et démarrer la réplication live
     * @checkpoint pouchdb-initialized, db instance créée
     */
    async init() {
      console.log('[CHECKPOINT] pouchdb-initializing');
      
      try {
        // Initialiser PouchDB local
        this.db = new PouchDB(POUCHDB_CONFIG.localDbName);
        
        // Créer les vues si elles n'existent pas
        await this.ensureDesignDocs();
        
        // Initialiser la réplication
        await this.initReplication();
        
        this.syncStatus = 'initialized';
        console.log('[CHECKPOINT] pouchdb-initialized');
        
        // Charger les données initiales depuis PouchDB local
        await this.loadFromLocal();
        
      } catch (err) {
        console.error('[CHECKPOINT] pouchdb-init-error', err);
        this.syncStatus = 'error';
        this.syncError = err.message;
        this.error = 'Erreur d\'initialisation PouchDB';
      }
    },
    
    /**
     * @action Créer/mettre à jour les design documents
     * @checkpoint design-docs-ready
     */
    async ensureDesignDocs() {
      try {
        const existing = await this.db.get(DESIGN_DOCS._id);
        // Mettre à jour si nécessaire
        if (JSON.stringify(existing.views) !== JSON.stringify(DESIGN_DOCS.views)) {
          await this.db.put({
            ...DESIGN_DOCS,
            _rev: existing._rev
          });
        }
      } catch (err) {
        if (err.status === 404) {
          // Créer le design doc
          await this.db.put(DESIGN_DOCS);
        } else {
          throw err;
        }
      }
      console.log('[CHECKPOINT] design-docs-ready');
    },
    
    /**
     * @action Initialiser la réplication bidirectionnelle live
     * @checkpoint replication-started, listeners actifs
     */
    async initReplication() {
      this.remoteDb = new PouchDB(POUCHDB_CONFIG.remoteUrl, {
        // Auth si nécessaire
        // auth: { username: 'user', password: 'pass' }
      });
      
      // Sync bidirectionnelle live
      this.syncHandler = this.db.sync(this.remoteDb, POUCHDB_CONFIG.syncOptions)
        .on('change', (info) => {
          // Changements reçus ou envoyés
          this.pendingChanges = info.change ? info.change.docs.length : 0;
          console.log('[CHECKPOINT] sync-change', info);
          
          // Recharger les données si changements entrants
          if (info.direction === 'pull' && info.change && info.change.docs.length > 0) {
            this.handleIncomingChanges(info.change.docs);
          }
        })
        .on('paused', (err) => {
          // Réplication en pause (catch-up done ou offline)
          this.syncStatus = err ? 'offline' : 'connected';
          this.lastSyncAt = new Date().toISOString();
          console.log('[CHECKPOINT] sync-paused', err ? 'offline' : 'online');
        })
        .on('active', () => {
          // Réplication active
          this.syncStatus = 'syncing';
          console.log('[CHECKPOINT] sync-active');
        })
        .on('denied', (err) => {
          // Document rejeté (permissions)
          console.error('[CHECKPOINT] sync-denied', err);
        })
        .on('complete', (info) => {
          // Sync complété (si non-live)
          console.log('[CHECKPOINT] sync-complete', info);
        })
        .on('error', (err) => {
          // Erreur de réplication
          this.syncStatus = 'error';
          this.syncError = err.message;
          console.error('[CHECKPOINT] sync-error', err);
        });
      
      console.log('[CHECKPOINT] replication-started');
    },
    
    // ============================================
    // CHARGEMENT DES DONNÉES (LOCAL-FIRST)
    // ============================================
    
    /**
     * @action Charger les impayés depuis PouchDB local (local-first)
     * @checkpoint impayes-fetched-local, données locales utilisées
     * @uses PouchDB query avec include_docs
     */
    async loadFromLocal() {
      console.log('[CHECKPOINT] loading-from-local');
      this.loading = true;
      this.skeletonVisible = true;
      
      try {
        // Utiliser la vue Mango pour filtrer les impayés non soldés
        const result = await this.db.query('impayes_views/by_statut', {
          key: 'impaye',
          include_docs: true,
          conflicts: true  // Important: détecter les conflits
        });
        
        // Transformer les résultats
        this.impayes = result.rows.map(row => ({
          ...row.doc,
          _conflicts: row.value._conflicts || []  // Garder l'info de conflit
        }));
        
        // Gérer les conflits si présents
        await this.handleConflicts(this.impayes);
        
        console.log('[CHECKPOINT] impayes-fetched-local', this.impayes.length);
        
        // Appliquer les filtres et tri
        this.applyFiltersAndSort();
        
        // Calculer les stats
        this.calculateStats();
        
        // Mettre à jour la pagination
        this.updatePagination();
        
        this.skeletonVisible = false;
        this.loading = false;
        
        console.log('[CHECKPOINT] table-rendered-from-local');
        
      } catch (err) {
        console.error('[CHECKPOINT] local-load-error', err);
        // Fallback: essayer de charger depuis le réseau si local échoue
        await this.loadFromRemote();
      }
    },
    
    /**
     * @action Charger depuis CouchDB distant (fallback)
     * @checkpoint impayes-fetched-remote
     */
    async loadFromRemote() {
      console.log('[CHECKPOINT] loading-from-remote');
      
      try {
        // Récupérer tous les documents depuis CouchDB
        const result = await this.remoteDb.allDocs({
          include_docs: true,
          conflicts: true,
          startkey: 'impaye_',
          endkey: 'impaye_\ufff0'
        });
        
        // Filtrer les non-soldés
        this.impayes = result.rows
          .map(row => row.doc)
          .filter(doc => doc.type === 'impaye' && doc.facture_soldee === 0);
        
        // Stocker localement
        await this.bulkSaveToLocal(this.impayes);
        
        console.log('[CHECKPOINT] impayes-fetched-remote', this.impayes.length);
        
        this.applyFiltersAndSort();
        this.calculateStats();
        this.updatePagination();
        
        this.skeletonVisible = false;
        this.loading = false;
        
      } catch (err) {
        console.error('[CHECKPOINT] remote-load-error', err);
        this.error = 'Erreur de chargement des données';
        this.loading = false;
        this.skeletonVisible = false;
      }
    },
    
    /**
     * @action Gérer les changements entrants de la réplication
     * @checkpoint incoming-changes-handled
     */
    async handleIncomingChanges(docs) {
      console.log('[CHECKPOINT] handling-incoming-changes', docs.length);
      
      // Identifier les documents modifiés qui sont affichés
      const relevantIds = docs
        .filter(doc => doc.type === 'impaye')
        .map(doc => doc._id);
      
      if (relevantIds.length === 0) return;
      
      // Recharger les données concernées
      await this.loadFromLocal();
      
      // Notifier l'utilisateur des mises à jour
      this.showSyncNotification(`${docs.length} document(s) synchronisé(s)`);
      
      console.log('[CHECKPOINT] incoming-changes-handled');
    },
    
    // ============================================
    // GESTION DES CONFLITS
    // ============================================
    
    /**
     * @action Détecter et gérer les conflits de réplication
     * @checkpoint conflicts-handled
     */
    async handleConflicts(impayes) {
      const conflicts = impayes.filter(imp => imp._conflicts && imp._conflicts.length > 0);
      
      if (conflicts.length > 0) {
        console.warn('[CHECKPOINT] conflicts-detected', conflicts.length);
        
        for (const impaye of conflicts) {
          await this.resolveConflict(impaye);
        }
      }
    },
    
    /**
     * @action Résoudre un conflit spécifique (stratégie: last-write-wins avec merge intelligent)
     * @checkpoint conflict-resolved
     */
    async resolveConflict(impaye) {
      try {
        // Récupérer toutes les révisions en conflit
        const conflictRevs = impaye._conflicts || [];
        const revisions = await Promise.all(
          conflictRevs.map(rev => this.db.get(impaye._id, { rev }))
        );
        
        // Stratégie: garder la version avec la date de modification la plus récente
        const allVersions = [impaye, ...revisions];
        const winner = allVersions.reduce((latest, current) => {
          const latestDate = new Date(latest.date_modification || latest._rev);
          const currentDate = new Date(current.date_modification || current._rev);
          return currentDate > latestDate ? current : latest;
        });
        
        // Supprimer les révisions en conflit
        for (const rev of conflictRevs) {
          await this.db.remove(impaye._id, rev);
        }
        
        // Mettre à jour avec la version gagnante
        await this.db.put({
          ...winner,
          _rev: impaye._rev,
          date_modification: new Date().toISOString(),
          _conflicts_resolved: true
        });
        
        console.log('[CHECKPOINT] conflict-resolved', impaye._id);
        
      } catch (err) {
        console.error('[CHECKPOINT] conflict-resolution-error', err);
      }
    },
    
    // ============================================
    // OPÉRATIONS CRUD VERS POUCHDB
    // ============================================
    
    /**
     * @action Mettre à jour un impayé (écrit dans PouchDB local, qui réplique vers CouchDB)
     * @checkpoint impaye-updated-local
     * @param {string} id - ID CouchDB (_id)
     * @param {Object} changes - Changements à appliquer
     */
    async updateImpaye(id, changes) {
      console.log('[CHECKPOINT] updating-impaye', id);
      
      try {
        // Lire le document actuel
        const doc = await this.db.get(id, { conflicts: true });
        
        // Créer la nouvelle version
        const updated = {
          ...doc,
          ...changes,
          _id: id,
          _rev: doc._rev,
          date_modification: new Date().toISOString()
        };
        
        // Écrire dans PouchDB (va répliquer automatiquement vers CouchDB)
        const result = await this.db.put(updated);
        
        console.log('[CHECKPOINT] impaye-updated-local', result.rev);
        
        // Mettre à jour le state local
        const index = this.impayes.findIndex(i => i._id === id);
        if (index !== -1) {
          this.impayes[index] = { ...updated, _rev: result.rev };
          this.applyFiltersAndSort();
        }
        
        return result;
        
      } catch (err) {
        if (err.status === 409) {
          // Conflit: récupérer la dernière version et réessayer
          console.warn('[CHECKPOINT] update-conflict-detected, retrying...');
          return this.updateImpayeWithConflictResolution(id, changes);
        }
        throw err;
      }
    },
    
    /**
     * @action Mettre à jour avec résolution de conflit automatique
     * @checkpoint impaye-updated-with-conflict-resolution
     */
    async updateImpayeWithConflictResolution(id, changes) {
      const doc = await this.db.get(id, { conflicts: true });
      
      // Fusionner les changements
      const merged = { ...doc, ...changes };
      
      // Réessayer avec la dernière révision
      const result = await this.db.put({
        ...merged,
        _id: id,
        _rev: doc._rev,
        date_modification: new Date().toISOString()
      });
      
      console.log('[CHECKPOINT] impaye-updated-conflict-resolved', result.rev);
      return result;
    },
    
    /**
     * @action Créer un nouvel impayé
     * @checkpoint impaye-created
     */
    async createImpaye(data) {
      console.log('[CHECKPOINT] creating-impaye');
      
      const doc = {
        _id: `impaye_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'impaye',
        ...data,
        facture_soldee: 0,
        statut: 'impaye',
        date_creation: new Date().toISOString(),
        date_modification: new Date().toISOString()
      };
      
      const result = await this.db.post(doc);
      
      console.log('[CHECKPOINT] impaye-created', result.id);
      
      // Ajouter au state local
      this.impayes.push({ ...doc, _rev: result.rev });
      this.applyFiltersAndSort();
      this.calculateStats();
      
      return result;
    },
    
    /**
     * @action Supprimer un impayé (soft delete)
     * @checkpoint impaye-deleted
     */
    async deleteImpaye(id) {
      console.log('[CHECKPOINT] deleting-impaye', id);
      
      const doc = await this.db.get(id);
      const result = await this.db.remove(doc);
      
      console.log('[CHECKPOINT] impaye-deleted');
      
      // Retirer du state local
      this.impayes = this.impayes.filter(i => i._id !== id);
      this.applyFiltersAndSort();
      this.calculateStats();
      
      return result;
    },
    
    /**
     * @action Sauvegarde bulk pour import
     * @checkpoint bulk-save-completed
     */
    async bulkSaveToLocal(docs) {
      const docsWithIds = docs.map(doc => ({
        ...doc,
        _id: doc._id || `impaye_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'impaye'
      }));
      
      return await this.db.bulkDocs(docsWithIds);
    },
    
    // ============================================
    // REQUÊTES AVEC VUES MANGO
    // ============================================
    
    /**
     * @action Rechercher avec index Mango
     * @checkpoint search-completed
     */
    async searchImpayes(query) {
      if (!query) {
        await this.loadFromLocal();
        return;
      }
      
      // Utiliser find() pour recherche textuelle (nécessite pouchdb-find plugin)
      const result = await this.db.find({
        selector: {
          type: 'impaye',
          facture_soldee: 0,
          $or: [
            { numero: { $regex: query } },
            { payeur_nom: { $regex: query } },
            { dossier: { $regex: query } }
          ]
        },
        limit: 100
      });
      
      this.impayes = result.docs;
      this.applyFiltersAndSort();
    },
    
    /**
     * @action Trier les impayés
     * @checkpoint sort-applied
     */
    async sortBy(column) {
      this.filters.orderBy = column;
      this.filters.order = this.filters.order === 'ASC' ? 'DESC' : 'ASC';
      
      // Utiliser la vue appropriée
      const viewName = column === 'date_echeance' ? 'by_date_echeance' : 
                       column === 'montant' ? 'by_montant' : 'by_statut';
      
      const result = await this.db.query(`impayes_views/${viewName}`, {
        descending: this.filters.order === 'DESC',
        include_docs: true
      });
      
      this.impayes = result.rows.map(row => row.doc);
      this.applyFiltersAndSort();
      
      console.log('[CHECKPOINT] sort-applied', column, this.filters.order);
    },
    
    // ============================================
    // UTILITAIRES
    // ============================================
    
    /**
     * @action Appliquer filtres et tri côté client
     * @checkpoint filters-applied
     */
    applyFiltersAndSort() {
      let filtered = [...this.impayes];
      
      // Filtre par recherche
      if (this.filters.search) {
        const q = this.filters.search.toLowerCase();
        filtered = filtered.filter(i => 
          i.numero?.toLowerCase().includes(q) ||
          i.payeur_nom?.toLowerCase().includes(q) ||
          i.dossier?.toLowerCase().includes(q)
        );
      }
      
      // Tri
      filtered.sort((a, b) => {
        let valA = a[this.filters.orderBy];
        let valB = b[this.filters.orderBy];
        
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        
        if (valA < valB) return this.filters.order === 'ASC' ? -1 : 1;
        if (valA > valB) return this.filters.order === 'ASC' ? 1 : -1;
        return 0;
      });
      
      this.impayesFiltered = filtered;
      this.updatePagination();
      
      console.log('[CHECKPOINT] filters-applied', filtered.length);
    },
    
    /**
     * @action Calculer les statistiques
     * @checkpoint stats-calculated
     */
    calculateStats() {
      this.stats = {
        total: this.impayes.length,
        montantTotal: this.impayes.reduce((sum, i) => sum + (parseFloat(i.reste) || 0), 0),
        aReparer: this.impayes.filter(i => i.a_reparer).length,
        blacklistes: this.impayes.filter(i => i.blackliste).length
      };
      console.log('[CHECKPOINT] stats-calculated', this.stats);
    },
    
    /**
     * @action Mettre à jour la pagination
     * @checkpoint pagination-updated
     */
    updatePagination() {
      this.totalPages = Math.ceil(this.impayesFiltered.length / this.itemsPerPage) || 1;
      if (this.currentPage > this.totalPages) {
        this.currentPage = this.totalPages;
      }
      console.log('[CHECKPOINT] pagination-updated', this.currentPage, this.totalPages);
    },
    
    /**
     * @action Pagination
     */
    goToPage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
        console.log('[CHECKPOINT] page-changed', page);
      }
    },
    
    /**
     * @action Retourner les items paginés
     */
    get paginatedImpayes() {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      return this.impayesFiltered.slice(start, start + this.itemsPerPage);
    },
    
    /**
     * @action Afficher notification de sync
     */
    showSyncNotification(message) {
      // Intégration avec le système de notifications existant
      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('sync-notification', { 
          detail: { message, status: this.syncStatus } 
        }));
      }
    },
    
    /**
     * @action Forcer une sync manuelle
     */
    async forceSync() {
      console.log('[CHECKPOINT] force-sync-requested');
      this.syncStatus = 'syncing';
      
      try {
        await this.db.replicate.to(this.remoteDb);
        await this.db.replicate.from(this.remoteDb);
        
        this.syncStatus = 'connected';
        this.lastSyncAt = new Date().toISOString();
        
        console.log('[CHECKPOINT] force-sync-completed');
        this.showSyncNotification('Synchronisation manuelle terminée');
        
        // Recharger les données
        await this.loadFromLocal();
        
      } catch (err) {
        this.syncStatus = 'error';
        console.error('[CHECKPOINT] force-sync-error', err);
      }
    },
    
    /**
     * @action Détruire proprement le store
     */
    destroy() {
      if (this.syncHandler) {
        this.syncHandler.cancel();
      }
      if (this.db) {
        this.db.close();
      }
      console.log('[CHECKPOINT] store-destroyed');
    }
  }));
});

// ============================================
// TEMPLATE HTML (référence)
// ============================================
/*
<div x-data="impayesStore" x-init="init()">
  <!-- Status de sync -->
  <div :class="{
    'bg-green-100 text-green-800': syncStatus === 'connected',
    'bg-yellow-100 text-yellow-800': syncStatus === 'syncing',
    'bg-red-100 text-red-800': syncStatus === 'error',
    'bg-gray-100 text-gray-800': syncStatus === 'offline'
  }" class="px-3 py-1 rounded-full text-sm">
    <span x-text="{
      'connected': 'Synchronisé',
      'syncing': 'Synchronisation...',
      'error': 'Erreur de sync',
      'offline': 'Hors ligne',
      'initializing': 'Initialisation...'
    }[syncStatus]"></span>
    <span x-show="lastSyncAt" x-text="'Dernière sync: ' + new Date(lastSyncAt).toLocaleTimeString()"></span>
  </div>
  
  <!-- Table des impayés -->
  <table>
    <template x-for="impaye in paginatedImpayes" :key="impaye._id">
      <tr>
        <td x-text="impaye.numero"></td>
        <td x-text="impaye.payeur_nom"></td>
        <td x-text="impaye.montant"></td>
        <td x-text="impaye.reste"></td>
        <td>
          <button @click="updateImpaye(impaye._id, { blackliste: !impaye.blackliste })">
            Toggle Blacklist
          </button>
        </td>
      </tr>
    </template>
  </table>
</div>
*/
