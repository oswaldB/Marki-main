/**
 * Workflow: relances-initial-load
 * Adapté pour PouchDB avec réplication CouchDB en temps réel
 * 
 * Pattern local-first : lectures depuis PouchDB local, écritures vers PouchDB
 * Synchronisation bidirectionnelle live avec gestion des conflits
 * 
 * @checkpoint wf-relances-init
 * @checkpoint wf-relances-pouchdb-ready
 * @checkpoint wf-relances-design-docs-ready
 * @checkpoint wf-relances-sync-active
 * @checkpoint wf-relances-data-loaded
 * @checkpoint wf-relances-relations-resolved
 * @checkpoint wf-relances-stats-calculated
 * @checkpoint wf-relances-rendering-complete
 * @checkpoint wf-relances-error
 */

// ============================================
// CONFIGURATION
// ============================================

const RELANCES_COUCHDB_CONFIG = {
  url: 'https://admin:admin@dev.markidiags.com/data',
  dbName: 'marki_relances',
  options: {
    live: true,
    retry: true,
    heartbeat: 10000,
    timeout: 30000
  }
};

// ============================================
// DESIGN DOCUMENTS COUCHDB
// ============================================

const RELANCES_DESIGN_DOCS = [
  {
    _id: '_design/relances',
    views: {
      all: {
        map: function(doc) {
          if (doc.type === 'relance') {
            emit(doc._id, doc);
          }
        }.toString()
      },
      by_statut: {
        map: function(doc) {
          if (doc.type === 'relance' && doc.statut) {
            emit(doc.statut, doc);
          }
        }.toString()
      },
      by_payeur: {
        map: function(doc) {
          if (doc.type === 'relance' && doc.payeurId) {
            emit(doc.payeurId, doc);
          }
        }.toString()
      },
      by_date_envoi: {
        map: function(doc) {
          if (doc.type === 'relance' && doc.dateEnvoiPrevue) {
            emit(doc.dateEnvoiPrevue, doc);
          }
        }.toString()
      },
      by_sequence: {
        map: function(doc) {
          if (doc.type === 'relance' && doc.sequenceId) {
            emit(doc.sequenceId, doc);
          }
        }.toString()
      }
    }
  },
  {
    _id: '_design/relances_stats',
    views: {
      by_statut: {
        map: function(doc) {
          if (doc.type === 'relance') {
            emit(doc.statut || 'inconnu', 1);
          }
        }.toString(),
        reduce: '_count'
      },
      by_mois: {
        map: function(doc) {
          if (doc.type === 'relance' && doc.dateEnvoiPrevue) {
            const mois = doc.dateEnvoiPrevue.substring(0, 7);
            emit(mois, 1);
          }
        }.toString(),
        reduce: '_count'
      }
    }
  }
];

// ============================================
// UTILITAIRES
// ============================================

function getInitials(nom, prenom) {
  if (!nom) return '??';
  const n = nom.charAt(0).toUpperCase();
  const p = prenom ? prenom.charAt(0).toUpperCase() : '';
  return p ? n + p : n;
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR');
}

function formatMontant(montant) {
  if (montant === null || montant === undefined) return '-';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(montant);
}

// ============================================
// WORKFLOW RELANCES POUCHDB
// ============================================

function relancesPouchDBManager() {
  return {
    // ========================================
    // ÉTAT DE DONNÉES
    // ========================================
    relances: [],
    filteredRelances: [],
    relancesByPayeur: [],
    contacts: [],
    impayes: [],
    
    // État du payeur sélectionné
    selectedPayeurId: null,
    selectedPayeurRelances: [],
    selectedPayeurImpayes: [],
    
    // Statistiques
    stats: {
      total: 0,
      aValider: 0,
      aEnvoyer: 0,
      envoyees: 0,
      enAttente: 0,
      blacklistees: 0,
      supprimees: 0
    },
    
    // ========================================
    // ÉTAT DE SYNCHRONISATION
    // ========================================
    syncStatus: 'initial',
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
    
    // Filtres
    searchQuery: '',
    filterStatut: '', // '' = tous
    filterDateDebut: '',
    filterDateFin: '',
    filterSequence: '',
    
    // Pagination
    currentPage: 1,
    pageSize: 50,
    totalPages: 1,
    
    // ========================================
    // INSTANCES POUCHDB
    // ========================================
    localDB: null,
    remoteDB: null,
    syncHandler: null,
    changesHandler: null,
    
    // ========================================
    // INITIALISATION
    // ========================================
    
    /**
     * @action Initialiser le workflow
     * @checkpoint wf-relances-init
     */
    async init() {
      console.log('[CHECKPOINT] wf-relances-init');
      this.loading = true;
      
      try {
        // Initialiser PouchDB local
        this.localDB = new PouchDB(RELANCES_COUCHDB_CONFIG.dbName);
        
        // Initialiser PouchDB remote (CouchDB)
        const remoteUrl = `${RELANCES_COUCHDB_CONFIG.url}/${RELANCES_COUCHDB_CONFIG.dbName}`;
        this.remoteDB = new PouchDB(remoteUrl, { skip_setup: true });
        
        console.log('[POUCHDB] Relances DB initialisé');
        console.log('[CHECKPOINT] wf-relances-pouchdb-ready');
        
        // Créer les design documents
        await this.ensureDesignDocs();
        
        // Configurer la réplication
        await this.setupReplication();
        
        // Charger les données
        await this.loadAllData();
        
        // Configurer les écouteurs réseau
        this.setupNetworkListeners();
        
        this.loading = false;
        console.log('[CHECKPOINT] wf-relances-rendering-complete');
        
      } catch (err) {
        console.error('[CHECKPOINT] wf-relances-error', err);
        this.error = err.message;
        this.syncStatus = 'error';
        this.loading = false;
      }
    },
    
    /**
     * @action Créer/mettre à jour les design documents
     * @checkpoint wf-relances-design-docs-ready
     */
    async ensureDesignDocs() {
      for (const doc of RELANCES_DESIGN_DOCS) {
        try {
          const existing = await this.localDB.get(doc._id);
          if (JSON.stringify(existing.views) !== JSON.stringify(doc.views)) {
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
      console.log('[CHECKPOINT] wf-relances-design-docs-ready');
    },
    
    /**
     * @action Configurer la réplication bidirectionnelle
     * @checkpoint wf-relances-sync-active
     */
    async setupReplication() {
      console.log('[CHECKPOINT] wf-relances-sync-active');
      
      if (this.syncHandler) {
        this.syncHandler.cancel();
      }
      
      this.syncHandler = this.localDB.sync(this.remoteDB, {
        live: RELANCES_COUCHDB_CONFIG.options.live,
        retry: RELANCES_COUCHDB_CONFIG.options.retry,
        heartbeat: RELANCES_COUCHDB_CONFIG.options.heartbeat
      })
      .on('change', (info) => {
        this.pendingChanges = info.change?.pending || 0;
        if (info.direction === 'pull') {
          console.log('[SYNC] Données reçues du serveur');
          this.loadAllData();
        }
      })
      .on('paused', (err) => {
        this.syncStatus = err ? 'error' : 'paused';
        this.lastSync = new Date().toISOString();
      })
      .on('active', () => {
        this.syncStatus = 'syncing';
        this.isOnline = true;
      })
      .on('denied', (err) => {
        console.error('[SYNC] Denied:', err);
        this.syncStatus = 'error';
      })
      .on('error', (err) => {
        console.error('[SYNC] Error:', err);
        this.syncStatus = 'error';
        this.isOnline = false;
      });
    },
    
    // ========================================
    // CHARGEMENT DES DONNÉES
    // ========================================
    
    /**
     * @action Charger toutes les données depuis PouchDB
     * @checkpoint wf-relances-data-loaded
     */
    async loadAllData() {
      await Promise.all([
        this.loadRelances(),
        this.loadContacts(),
        this.loadImpayes()
      ]);
      
      // Résoudre les relations entre données
      await this.resolveRelations();
      
      // Calculer les statistiques
      this.calculateStats();
      
      // Appliquer les filtres
      this.applyFilters();
      
      console.log('[CHECKPOINT] wf-relances-data-loaded', {
        relances: this.relances.length,
        contacts: this.contacts.length,
        impayes: this.impayes.length
      });
    },
    
    /**
     * @action Charger les relances depuis PouchDB
     */
    async loadRelances() {
      try {
        const result = await this.localDB.query('relances/all', {
          include_docs: true,
          conflicts: true
        });
        
        this.relances = result.rows.map(row => ({
          ...row.doc,
          id: row.doc._id
        }));
        
        // Détecter les conflits
        this.conflicts = result.rows
          .filter(row => row.doc._conflicts?.length > 0)
          .map(row => ({
            id: row.doc._id,
            rev: row.doc._rev,
            conflictRevs: row.doc._conflicts
          }));
        
      } catch (err) {
        console.error('Erreur chargement relances:', err);
        // Fallback allDocs
        const result = await this.localDB.allDocs({ include_docs: true });
        this.relances = result.rows
          .filter(r => r.doc.type === 'relance')
          .map(r => ({ ...r.doc, id: r.doc._id }));
      }
    },
    
    /**
     * @action Charger les contacts depuis PouchDB
     */
    async loadContacts() {
      try {
        // Contacts sont dans une autre base ou indexés localement
        const contactsDB = new PouchDB('marki_contacts');
        const result = await contactsDB.query('contacts/all', {
          include_docs: true
        });
        
        this.contacts = result.rows.map(row => ({
          ...row.doc,
          id: row.doc._id,
          nomComplet: row.doc.typePersonne === 'M' 
            ? row.doc.raisonSociale 
            : `${row.doc.prenom || ''} ${row.doc.nom || ''}`.trim(),
          initials: row.doc.typePersonne === 'P'
            ? getInitials(row.doc.nom, row.doc.prenom)
            : (row.doc.raisonSociale || '').substring(0, 2).toUpperCase()
        }));
        
      } catch (err) {
        console.log('Contacts non disponibles localement');
        this.contacts = [];
      }
    },
    
    /**
     * @action Charger les impayés depuis PouchDB
     */
    async loadImpayes() {
      try {
        const impayesDB = new PouchDB('marki_impayes');
        const result = await impayesDB.query('impayes/by_statut', {
          key: 'impaye',
          include_docs: true
        });
        
        this.impayes = result.rows.map(row => ({
          ...row.doc,
          id: row.doc._id
        }));
        
      } catch (err) {
        console.log('Impayés non disponibles localement');
        this.impayes = [];
      }
    },
    
    /**
     * @action Résoudre les relations entre entités
     * @checkpoint wf-relances-relations-resolved
     */
    async resolveRelations() {
      // Enrichir les relances avec les données du payeur
      this.relances = this.relances.map(relance => {
        const payeur = this.contacts.find(c => c._id === relance.payeurId);
        const impayesPayeur = this.impayes.filter(i => i.payeurId === relance.payeurId);
        
        return {
          ...relance,
          payeur: payeur || null,
          impayesCount: impayesPayeur.length,
          montantTotalImpayes: impayesPayeur.reduce((sum, i) => sum + (i.montantRestant || 0), 0)
        };
      });
      
      console.log('[CHECKPOINT] wf-relances-relations-resolved');
    },
    
    /**
     * @action Calculer les statistiques
     * @checkpoint wf-relances-stats-calculated
     */
    calculateStats() {
      this.stats = {
        total: this.relances.length,
        aValider: this.relances.filter(r => r.statut === 'a_valider').length,
        aEnvoyer: this.relances.filter(r => r.statut === 'a_envoyer').length,
        envoyees: this.relances.filter(r => r.statut === 'envoyee').length,
        enAttente: this.relances.filter(r => r.statut === 'en_attente').length,
        blacklistees: this.relances.filter(r => r.statut === 'blacklistee').length,
        supprimees: this.relances.filter(r => r.statut === 'supprimee').length
      };
      
      console.log('[CHECKPOINT] wf-relances-stats-calculated', this.stats);
    },
    
    // ========================================
    // CRUD OPÉRATIONS
    // ========================================
    
    /**
     * @action Créer une nouvelle relance
     */
    async createRelance(data) {
      this.saving = true;
      
      try {
        const doc = {
          _id: `relance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'relance',
          ...data,
          statut: 'a_valider',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        const result = await this.localDB.put(doc);
        
        // Recharger les données
        await this.loadAllData();
        
        this.successMessage = 'Relance créée avec succès';
        this.saving = false;
        
        return { success: true, id: result.id, rev: result.rev };
        
      } catch (err) {
        console.error('Erreur création relance:', err);
        this.error = err.message;
        this.saving = false;
        return { success: false, error: err.message };
      }
    },
    
    /**
     * @action Mettre à jour une relance
     */
    async updateRelance(id, updates) {
      this.saving = true;
      
      try {
        const doc = await this.localDB.get(id);
        
        const updated = {
          ...doc,
          ...updates,
          updatedAt: new Date().toISOString()
        };
        
        const result = await this.localDB.put(updated);
        
        // Recharger les données
        await this.loadAllData();
        
        this.successMessage = 'Relance mise à jour';
        this.saving = false;
        
        return { success: true, rev: result.rev };
        
      } catch (err) {
        if (err.status === 409) {
          return this.handleConflict(id, updates);
        }
        
        this.error = err.message;
        this.saving = false;
        return { success: false, error: err.message };
      }
    },
    
    /**
     * @action Valider une relance
     */
    async validerRelance(id) {
      return this.updateRelance(id, { statut: 'a_envoyer' });
    },
    
    /**
     * @action Envoyer une relance
     */
    async envoyerRelance(id) {
      return this.updateRelance(id, { 
        statut: 'envoyee',
        dateEnvoi: new Date().toISOString()
      });
    },
    
    /**
     * @action Supprimer une relance
     */
    async supprimerRelance(id) {
      try {
        const doc = await this.localDB.get(id);
        await this.localDB.remove(doc);
        
        await this.loadAllData();
        
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },
    
    /**
     * @action Blacklister une relance
     */
    async blacklisterRelance(id, motif) {
      return this.updateRelance(id, {
        statut: 'blacklistee',
        motifBlacklist: motif,
        dateBlacklist: new Date().toISOString()
      });
    },
    
    /**
     * @action Programmer une relance
     */
    async programmerRelance(id, dateEnvoi) {
      return this.updateRelance(id, {
        dateEnvoiPrevue: dateEnvoi,
        statut: 'en_attente'
      });
    },
    
    // ========================================
    // FILTRAGE ET RECHERCHE
    // ========================================
    
    /**
     * @action Appliquer les filtres
     */
    applyFilters() {
      let filtered = [...this.relances];
      
      // Filtre par statut
      if (this.filterStatut) {
        filtered = filtered.filter(r => r.statut === this.filterStatut);
      }
      
      // Filtre par recherche textuelle
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        filtered = filtered.filter(r => 
          (r.payeur?.nomComplet?.toLowerCase().includes(query)) ||
          (r.payeur?.email?.toLowerCase().includes(query)) ||
          (r.objet?.toLowerCase().includes(query))
        );
      }
      
      // Filtre par date
      if (this.filterDateDebut) {
        filtered = filtered.filter(r => 
          r.dateEnvoiPrevue >= this.filterDateDebut
        );
      }
      
      if (this.filterDateFin) {
        filtered = filtered.filter(r => 
          r.dateEnvoiPrevue <= this.filterDateFin
        );
      }
      
      this.filteredRelances = filtered;
      
      // Grouper par payeur
      this.groupByPayeur();
      
      // Calculer la pagination
      this.totalPages = Math.ceil(filtered.length / this.pageSize);
    },
    
    /**
     * @action Grouper les relances par payeur
     */
    groupByPayeur() {
      const groups = {};
      
      this.filteredRelances.forEach(relance => {
        const payeurId = relance.payeurId || 'unknown';
        if (!groups[payeurId]) {
          groups[payeurId] = {
            payeur: relance.payeur,
            payeurId: payeurId,
            relances: [],
            totalImpayes: relance.montantTotalImpayes || 0,
            impayesCount: relance.impayesCount || 0
          };
        }
        groups[payeurId].relances.push(relance);
      });
      
      this.relancesByPayeur = Object.values(groups).sort((a, b) => 
        (a.payeur?.nomComplet || '').localeCompare(b.payeur?.nomComplet || '')
      );
    },
    
    /**
     * @action Définir le filtre par statut
     */
    setFilterStatut(statut) {
      this.filterStatut = statut;
      this.currentPage = 1;
      this.applyFilters();
    },
    
    /**
     * @action Définir la recherche
     */
    setSearchQuery(query) {
      this.searchQuery = query;
      this.currentPage = 1;
      this.applyFilters();
    },
    
    // ========================================
    // SÉLECTION PAYEUR
    // ========================================
    
    /**
     * @action Sélectionner un payeur et charger ses données
     */
    async selectPayeur(payeurId) {
      this.selectedPayeurId = payeurId;
      
      // Charger les relances du payeur
      this.selectedPayeurRelances = this.relances.filter(r => 
        r.payeurId === payeurId
      );
      
      // Charger les impayés du payeur
      this.selectedPayeurImpayes = this.impayes.filter(i => 
        i.payeurId === payeurId
      );
    },
    
    /**
     * @action Désélectionner le payeur
     */
    deselectPayeur() {
      this.selectedPayeurId = null;
      this.selectedPayeurRelances = [];
      this.selectedPayeurImpayes = [];
    },
    
    // ========================================
    // GESTION DES CONFLITS
    // ========================================
    
    /**
     * @action Gérer un conflit de réplication
     */
    async handleConflict(docId, localUpdates) {
      try {
        const doc = await this.localDB.get(docId, { conflicts: true });
        const conflictRevs = doc._conflicts || [];
        
        // Récupérer les versions en conflit
        const conflictingDocs = await Promise.all(
          conflictRevs.map(rev => this.localDB.get(docId, { rev }))
        );
        
        console.log('[CONFLICT] Résolution pour:', docId);
        
        // Stratégie: garder localUpdates
        const merged = {
          ...doc,
          ...localUpdates,
          _conflicts: undefined
        };
        
        // Supprimer les révisions en conflit
        for (const rev of conflictRevs) {
          await this.localDB.remove(docId, rev);
        }
        
        // Sauvegarder
        merged._rev = doc._rev;
        await this.localDB.put(merged);
        
        await this.loadAllData();
        
        return { success: true, resolved: true };
        
      } catch (err) {
        console.error('[CONFLICT] Erreur:', err);
        return { success: false, error: err.message };
      }
    },
    
    // ========================================
    // SYNCHRONISATION
    // ========================================
    
    /**
     * @action Forcer une synchronisation manuelle
     */
    async forceSync() {
      this.syncStatus = 'syncing';
      
      try {
        await this.localDB.replicate.to(this.remoteDB);
        await this.localDB.replicate.from(this.remoteDB);
        
        await this.loadAllData();
        
        this.syncStatus = 'complete';
        this.lastSync = new Date().toISOString();
        
        return { success: true };
      } catch (err) {
        this.syncStatus = 'error';
        return { success: false, error: err.message };
      }
    },
    
    /**
     * @action Configurer les écouteurs réseau
     */
    setupNetworkListeners() {
      window.addEventListener('online', async () => {
        console.log('[NETWORK] En ligne');
        this.isOnline = true;
        await this.forceSync();
      });
      
      window.addEventListener('offline', () => {
        console.log('[NETWORK] Hors ligne');
        this.isOnline = false;
      });
    },
    
    // ========================================
    // COMPUTED PROPERTIES
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
      if (!this.isOnline) return 'Hors ligne';
      const labels = {
        initial: 'Initialisation...',
        syncing: 'Synchronisation...',
        paused: 'À jour',
        error: 'Erreur',
        complete: 'Synchronisé'
      };
      return labels[this.syncStatus] || '...';
    },
    
    get hasConflicts() {
      return this.conflicts.length > 0;
    },
    
    get paginatedRelances() {
      const start = (this.currentPage - 1) * this.pageSize;
      return this.filteredRelances.slice(start, start + this.pageSize);
    },
    
    get totalRelances() {
      return this.relances.length;
    },
    
    get isLoading() {
      return this.loading;
    },
    
    get canCreateRelance() {
      return !this.saving && this.isOnline;
    }
  };
}

// ============================================
// EXPORT
// ============================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    relancesPouchDBManager, 
    RELANCES_COUCHDB_CONFIG, 
    RELANCES_DESIGN_DOCS 
  };
}
