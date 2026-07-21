/**
 * Workflow: relances-calendrier (Complet)
 * VERSION POUCHDB - Pattern local-first avec réplication CouchDB live
 * 
 * Combine: initial-load + go-today + navigation + sync
 * 
 * RÈGLES IMPLEMENTÉES:
 * #1 - PouchDB côté frontend avec réplication live
 * #2 - Remplacement des appels API par PouchDB (db.find, db.query)
 * #3 - Synchronisation bidirectionnelle avec db.sync()
 * #4 - Gestion des conflits (conflicts: true)
 * #5 - _design documents pour vues Mango
 * #6 - Pattern local-first (lectures PouchDB local)
 * #7 - États offline/online avec events paused/active
 * #8 - Structure Alpine.js x-data conservée
 * #9 - Propriété syncStatus pour suivre l'état de la sync
 * #10 - IDs CouchDB (_id) et révisions (_rev) appropriés
 * 
 * @checkpoint wf-cal-init
 * @checkpoint wf-cal-pouchdb-ready
 * @checkpoint wf-cal-design-docs-created
 * @checkpoint wf-cal-sync-started
 * @checkpoint wf-cal-data-loaded
 * @checkpoint wf-cal-rendered
 * @checkpoint wf-cal-complete
 */

// ============================================
// CONFIGURATION COUCHDB (RÈGLE #1)
// ============================================
const COUCHDB_CONFIG = {
  url: window.location.hostname === 'localhost' 
    ? 'http://admin:admin@localhost:5984'
    : 'https://admin:admin@dev.markidiags.com/data',
  dbName: 'marki_relances',
  options: {
    live: true,
    retry: true,
    heartbeat: 10000,
    timeout: 30000
  }
};

// ============================================
// DESIGN DOCUMENTS (RÈGLE #5)
// ============================================
const DESIGN_DOCS = [
  {
    _id: '_design/relances',
    views: {
      // Index par date d'envoi planifiée (pour calendrier)
      by_date_envoi: {
        map: function(doc) {
          if (doc.type === 'relance' && doc.date_envoi_planifiee) {
            emit(doc.date_envoi_planifiee, doc);
          }
        }.toString()
      },
      // Index par statut
      by_statut: {
        map: function(doc) {
          if (doc.type === 'relance' && doc.statut) {
            emit(doc.statut, doc);
          }
        }.toString()
      },
      // Index par contact/payeur
      by_contact: {
        map: function(doc) {
          if (doc.type === 'relance' && doc.contact_id) {
            emit(doc.contact_id, doc);
          }
        }.toString()
      },
      // Toutes les relances
      all: {
        map: function(doc) {
          if (doc.type === 'relance') {
            emit(doc._id, doc);
          }
        }.toString()
      }
    }
  },
  {
    _id: '_design/relances_stats',
    views: {
      // Statistiques par statut
      by_statut_count: {
        map: function(doc) {
          if (doc.type === 'relance' && doc.statut) {
            emit(doc.statut, 1);
          }
        }.toString(),
        reduce: '_sum'
      },
      // Relances par mois
      by_month: {
        map: function(doc) {
          if (doc.type === 'relance' && doc.date_envoi_planifiee) {
            const date = new Date(doc.date_envoi_planifiee);
            const monthKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
            emit(monthKey, 1);
          }
        }.toString(),
        reduce: '_sum'
      }
    }
  }
];

// ============================================
// WORKFLOW CALENDRIER COMPLET - VERSION POUCHDB
// ============================================
function relancesCalendrierPouchDBManager() {
  return {
    // ========================================
    // ÉTAT: Date et Vue (RÈGLE #8)
    // ========================================
    currentDate: new Date(),
    selectedDate: new Date(),
    viewMode: 'month', // 'month' | 'week'
    
    // ========================================
    // ÉTAT: Données
    // ========================================
    relancesProgrammees: [],  // Relances du mois/semaine courant
    relancesDuJour: [],       // Relances du jour sélectionné
    
    // ========================================
    // ÉTAT: Synchronisation (RÈGLE #9)
    // ========================================
    syncStatus: 'initial',
    isOnline: navigator.onLine,
    lastSync: null,
    pendingChanges: 0,
    conflicts: [],
    
    // ========================================
    // ÉTAT: UI (RÈGLE #8)
    // ========================================
    loading: true,
    skeletonVisible: true,
    error: null,
    showModal: false,
    selectedRelance: null,
    
    // ========================================
    // INSTANCES POUCHDB (RÈGLE #1)
    // ========================================
    localDB: null,
    remoteDB: null,
    syncHandler: null,
    
    // ========================================
    // INITIALISATION (RÈGLE #8)
    // ========================================
    
    /**
     * @action Initialiser PouchDB et charger les données
     * @checkpoint wf-cal-init
     */
    async init() {
      console.log('[CHECKPOINT] wf-cal-init');
      this.loading = true;
      this.skeletonVisible = true;
      this.error = null;
      
      try {
        // 1. Initialiser PouchDB (RÈGLE #1)
        this.localDB = new PouchDB(COUCHDB_CONFIG.dbName);
        const remoteUrl = `${COUCHDB_CONFIG.url}/${COUCHDB_CONFIG.dbName}`;
        this.remoteDB = new PouchDB(remoteUrl, { skip_setup: true });
        console.log('[POUCHDB] Initialisé:', COUCHDB_CONFIG.dbName);
        
        console.log('[CHECKPOINT] wf-cal-pouchdb-ready');
        
        // 2. Créer les design documents (RÈGLE #5)
        await this.ensureDesignDocs();
        console.log('[CHECKPOINT] wf-cal-design-docs-created');
        
        // 3. Configurer la réplication (RÈGLE #3)
        await this.setupReplication();
        console.log('[CHECKPOINT] wf-cal-sync-started');
        
        // 4. Charger les données pour la date courante (RÈGLE #6)
        await this.loadDataForDate(this.currentDate);
        console.log('[CHECKPOINT] wf-cal-data-loaded');
        
        // 5. Afficher le calendrier
        this.skeletonVisible = false;
        this.loading = false;
        console.log('[CHECKPOINT] wf-cal-rendered');
        
        // 6. Écouteurs réseau (RÈGLE #7)
        this.setupNetworkListeners();
        
        console.log('[CHECKPOINT] wf-cal-complete');
        
      } catch (err) {
        console.error('[CHECKPOINT] wf-cal-error', err);
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
      for (const doc of DESIGN_DOCS) {
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
    },
    
    /**
     * @action Configurer la réplication bidirectionnelle (RÈGLE #3)
     */
    async setupReplication() {
      console.log('[SYNC] Démarrage...');
      this.syncStatus = 'syncing';
      
      this.syncHandler = this.localDB.sync(this.remoteDB, {
        live: COUCHDB_CONFIG.options.live,
        retry: COUCHDB_CONFIG.options.retry,
        heartbeat: COUCHDB_CONFIG.options.heartbeat,
        timeout: COUCHDB_CONFIG.options.timeout
      })
      .on('change', (info) => {
        console.log('[SYNC] Changement:', info.direction);
        this.pendingChanges = info.change?.pending || 0;
        if (info.direction === 'pull' && info.change?.docs?.length > 0) {
          this.loadDataForDate(this.currentDate);
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
      .on('error', (err) => {
        console.error('[SYNC] Erreur:', err);
        this.syncStatus = 'error';
        this.isOnline = false;
      });
    },
    
    // ========================================
    // CHARGEMENT DES DONNÉES (RÈGLE #2, #6)
    // ========================================
    
    /**
     * @action Charger les relances pour une date
     * @checkpoint wf-cal-data-loaded
     */
    async loadDataForDate(date) {
      // Charger les relances du jour
      await this.loadRelancesDuJour(date);
      // Charger les relances de la période (mois/semaine)
      await this.loadRelancesForPeriod(this.viewMode, date);
    },
    
    /**
     * @action Charger les relances du jour (RÈGLE #2)
     */
    async loadRelancesDuJour(date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      try {
        // RÈGLE #2: db.find avec sélecteur Mango
        const result = await this.localDB.find({
          selector: {
            type: 'relance',
            date_envoi_planifiee: {
              $gte: startOfDay.toISOString(),
              $lte: endOfDay.toISOString()
            }
          },
          sort: [{ date_envoi_planifiee: 'asc' }]
        });
        
        // RÈGLE #10: Mapper avec _id et _rev
        this.relancesDuJour = result.docs.map(doc => ({
          ...doc,
          id: doc._id,
          rev: doc._rev,
          hasConflicts: !!(doc._conflicts && doc._conflicts.length > 0)
        }));
        
      } catch (err) {
        console.error('[DATA] Erreur, fallback:', err);
        await this.loadRelancesFallback(date, 'day');
      }
    },
    
    /**
     * @action Charger les relances pour une période (RÈGLE #2)
     */
    async loadRelancesForPeriod(viewMode, date) {
      let startDate, endDate;
      
      if (viewMode === 'month') {
        startDate = new Date(date.getFullYear(), date.getMonth(), 1);
        endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
      } else {
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        startDate = new Date(date);
        startDate.setDate(diff);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
      }
      
      try {
        // RÈGLE #2: db.query avec vue Mango
        const result = await this.localDB.query('relances/by_date_envoi', {
          startkey: startDate.toISOString(),
          endkey: endDate.toISOString(),
          include_docs: true,
          conflicts: true // RÈGLE #4
        });
        
        this.relancesProgrammees = result.rows.map(row => ({
          ...row.doc,
          id: row.doc._id,
          rev: row.doc._rev,
          hasConflicts: !!(row.doc._conflicts && row.doc._conflicts.length > 0)
        }));
        
      } catch (err) {
        await this.loadRelancesFallback(date, viewMode);
      }
    },
    
    /**
     * @action Fallback: charger depuis allDocs
     */
    async loadRelancesFallback(date, period) {
      const result = await this.localDB.allDocs({
        include_docs: true,
        conflicts: true // RÈGLE #4
      });
      
      const allRelances = result.rows
        .filter(row => row.doc.type === 'relance')
        .map(row => ({
          ...row.doc,
          id: row.doc._id,
          rev: row.doc._rev
        }));
      
      const dateStr = date.toISOString().split('T')[0];
      
      if (period === 'day') {
        this.relancesDuJour = allRelances.filter(r => 
          r.date_envoi_planifiee?.startsWith(dateStr)
        );
      } else {
        this.relancesProgrammees = allRelances.filter(r => {
          if (!r.date_envoi_planifiee) return false;
          const rDate = new Date(r.date_envoi_planifiee);
          return rDate >= this.getPeriodStart(date, period) && 
                 rDate <= this.getPeriodEnd(date, period);
        });
      }
    },
    
    getPeriodStart(date, period) {
      if (period === 'month') {
        return new Date(date.getFullYear(), date.getMonth(), 1);
      } else {
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const start = new Date(date);
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);
        return start;
      }
    },
    
    getPeriodEnd(date, period) {
      if (period === 'month') {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
      } else {
        const start = this.getPeriodStart(date, period);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return end;
      }
    },
    
    // ========================================
    // NAVIGATION ET ACTIONS
    // ========================================
    
    /**
     * @action Aller à aujourd'hui (WORKFLOW GO-TODAY)
     * @checkpoint wf-cal-today-reset
     */
    async goToToday() {
      console.log('[CHECKPOINT] wf-cal-today-reset');
      this.loading = true;
      
      // Réinitialiser les dates
      this.currentDate = new Date();
      this.selectedDate = new Date();
      
      // Recharger les données depuis PouchDB (RÈGLE #6)
      await this.loadDataForDate(this.currentDate);
      
      this.loading = false;
      console.log('[CHECKPOINT] wf-cal-today-complete');
    },
    
    /**
     * @action Période précédente
     */
    async previousPeriod() {
      if (this.viewMode === 'month') {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      } else {
        this.currentDate.setDate(this.currentDate.getDate() - 7);
      }
      this.currentDate = new Date(this.currentDate);
      await this.loadDataForDate(this.currentDate);
    },
    
    /**
     * @action Période suivante
     */
    async nextPeriod() {
      if (this.viewMode === 'month') {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      } else {
        this.currentDate.setDate(this.currentDate.getDate() + 7);
      }
      this.currentDate = new Date(this.currentDate);
      await this.loadDataForDate(this.currentDate);
    },
    
    /**
     * @action Changer de vue
     */
    async switchView(mode) {
      this.viewMode = mode;
      await this.loadDataForPeriod(this.viewMode, this.currentDate);
    },
    
    /**
     * @action Sélectionner une date
     */
    async selectDate(date) {
      this.selectedDate = new Date(date);
      await this.loadRelancesDuJour(this.selectedDate);
      this.showModal = true;
    },
    
    /**
     * @action Fermer le modal
     */
    closeModal() {
      this.showModal = false;
      this.selectedRelance = null;
    },
    
    // ========================================
    // CRUD OPERATIONS (RÈGLE #2)
    // ========================================
    
    /**
     * @action Récupérer une relance (RÈGLE #2: db.get)
     */
    async getRelance(id) {
      try {
        const doc = await this.localDB.get(id, { conflicts: true });
        return {
          ...doc,
          id: doc._id,
          rev: doc._rev,
          hasConflicts: !!(doc._conflicts?.length > 0)
        };
      } catch (err) {
        console.error('[CRUD] Erreur getRelance:', err);
        throw err;
      }
    },
    
    /**
     * @action Sauvegarder une relance (RÈGLE #2: db.put)
     * RÈGLE #6: Écriture vers PouchDB local (réplication automatique)
     */
    async saveRelance(relance) {
      try {
        const doc = {
          ...relance,
          _id: relance._id || relance.id || `relance_${Date.now()}`,
          type: 'relance',
          updated_at: new Date().toISOString()
        };
        
        delete doc.id;
        delete doc.hasConflicts;
        
        const result = await this.localDB.put(doc);
        console.log('[CRUD] Relance sauvegardée:', result);
        
        // Recharger les données
        await this.loadDataForDate(this.currentDate);
        
        return result;
      } catch (err) {
        console.error('[CRUD] Erreur saveRelance:', err);
        throw err;
      }
    },
    
    /**
     * @action Supprimer une relance (RÈGLE #2: db.remove)
     */
    async removeRelance(id, rev) {
      try {
        const result = await this.localDB.remove(id, rev);
        console.log('[CRUD] Relance supprimée:', result);
        await this.loadDataForDate(this.currentDate);
        return result;
      } catch (err) {
        console.error('[CRUD] Erreur removeRelance:', err);
        throw err;
      }
    },
    
    // ========================================
    // SYNCHRONISATION (RÈGLE #3)
    // ========================================
    
    async forceSync() {
      if (!this.isOnline) return;
      this.syncStatus = 'syncing';
      
      try {
        await this.localDB.replicate.to(this.remoteDB);
        await this.localDB.replicate.from(this.remoteDB);
        await this.loadDataForDate(this.currentDate);
        
        this.syncStatus = 'complete';
        this.lastSync = new Date().toISOString();
      } catch (err) {
        this.syncStatus = 'error';
        throw err;
      }
    },
    
    // ========================================
    // GESTION RÉSEAU (RÈGLE #7)
    // ========================================
    
    setupNetworkListeners() {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.syncStatus = 'syncing';
        if (this.syncHandler) {
          this.syncHandler.cancel();
          this.setupReplication();
        }
      });
      
      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.syncStatus = 'paused';
      });
    },
    
    // ========================================
    // UTILITAIRES D'AFFICHAGE
    // ========================================
    
    formatDate(date) {
      if (!date) return '-';
      return new Date(date).toLocaleDateString('fr-FR');
    },
    
    formatDateTime(date) {
      if (!date) return '-';
      return new Date(date).toLocaleString('fr-FR');
    },
    
    // ========================================
    // PROPRIÉTÉS CALCULÉES (RÈGLE #8, #9)
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
        error: 'Erreur',
        complete: 'Synchronisé'
      };
      return labels[this.syncStatus] || 'Inconnu';
    },
    
    get periodLabel() {
      if (this.viewMode === 'month') {
        return this.currentDate.toLocaleDateString('fr-FR', {
          month: 'long',
          year: 'numeric'
        });
      } else {
        const start = this.getPeriodStart(this.currentDate, 'week');
        const end = this.getPeriodEnd(this.currentDate, 'week');
        return `${this.formatDate(start)} - ${this.formatDate(end)}`;
      }
    },
    
    get daysInMonth() {
      const year = this.currentDate.getFullYear();
      const month = this.currentDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startingDay = firstDay.getDay() || 7; // 1 = Lundi
      
      const days = [];
      // Jours vides avant le 1er
      for (let i = 1; i < startingDay; i++) {
        days.push(null);
      }
      // Jours du mois
      for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(year, month, i));
      }
      return days;
    },
    
    get weeksInView() {
      const days = this.daysInMonth;
      const weeks = [];
      for (let i = 0; i < days.length; i += 7) {
        weeks.push(days.slice(i, i + 7));
      }
      return weeks;
    },
    
    get relancesByDate() {
      const map = {};
      this.relancesProgrammees.forEach(relance => {
        if (relance.date_envoi_planifiee) {
          const dateKey = relance.date_envoi_planifiee.split('T')[0];
          if (!map[dateKey]) map[dateKey] = [];
          map[dateKey].push(relance);
        }
      });
      return map;
    }
  };
}

// ============================================
// EXPORT
// ============================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    relancesCalendrierPouchDBManager,
    COUCHDB_CONFIG,
    DESIGN_DOCS
  };
}

if (typeof window !== 'undefined') {
  window.relancesCalendrierPouchDBManager = relancesCalendrierPouchDBManager;
  window.COUCHDB_CONFIG = COUCHDB_CONFIG;
  window.DESIGN_DOCS = DESIGN_DOCS;
}
