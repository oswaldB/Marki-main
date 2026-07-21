/**
 * WORKFLOW: next-period-pouchdb.js
 * ================================
 * Navigation vers la période suivante avec chargement PouchDB local-first
 * 
 * RÈGLES POUCHDB:
 * ✓ #1 PouchDB local avec réplication live CouchDB
 * ✓ #2 Opérations PouchDB (db.query) - pas d'API directe
 * ✓ #6 Pattern local-first: lectures depuis PouchDB local
 * ✓ #8 Structure Alpine.js x-data conservée
 * ✓ #9 syncStatus pour suivre l'état
 * ✓ #10 IDs CouchDB (_id) et révisions (_rev)
 * 
 * @checkpoint next-period-start
 * @checkpoint next-period-incremented
 * @checkpoint next-period-data-queried
 * @checkpoint next-period-data-loaded
 * @checkpoint next-period-complete
 * @checkpoint next-period-error
 */

// ============================================
// CONFIGURATION COUCHDB / POUCHDB
// ============================================
const COUCHDB_CONFIG = {
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
// DESIGN DOCUMENTS - Vues pour les relances
// ============================================
const DESIGN_DOCS = [
  {
    _id: '_design/relances',
    views: {
      // Vue: relances par date de relance (pour le calendrier)
      by_date_relance: {
        map: function(doc) {
          if (doc.type === 'relance' && doc.date_relance) {
            emit(doc.date_relance, doc);
          }
        }.toString()
      },
      // Vue: relances par période (année-mois)
      by_year_month: {
        map: function(doc) {
          if (doc.type === 'relance' && doc.date_relance) {
            const date = doc.date_relance.substring(0, 7); // YYYY-MM
            emit(date, doc);
          }
        }.toString()
      },
      // Vue: relances par statut
      by_status: {
        map: function(doc) {
          if (doc.type === 'relance' && doc.statut) {
            emit(doc.statut, doc);
          }
        }.toString()
      }
    }
  }
];

// ============================================
// WORKFLOW: nextPeriod avec PouchDB
// ============================================
function nextPeriodWorkflow() {
  return {
    // ========================================
    // ÉTAT: Données calendrier
    // ========================================
    currentDate: new Date(),
    viewMode: 'month', // 'month' | 'week'
    selectedDate: null,
    
    // Données relances
    relancesProgrammees: [],
    relancesDuJour: [],
    
    // ========================================
    // ÉTAT: Synchronisation (RÈGLE #9)
    // ========================================
    syncStatus: 'initial',
    isOnline: navigator.onLine,
    lastSync: null,
    pendingChanges: 0,
    
    // ========================================
    // ÉTAT: UI
    // ========================================
    loading: false,
    error: null,
    
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
     * @action Initialiser PouchDB et configurer la réplication
     * @checkpoint next-period-init
     */
    async init() {
      console.log('[CHECKPOINT] next-period-init');
      
      try {
        // Initialiser PouchDB local (RÈGLE #1)
        this.localDB = new PouchDB(COUCHDB_CONFIG.dbName);
        console.log('[POUCHDB] Base locale initialisée:', COUCHDB_CONFIG.dbName);
        
        // Initialiser PouchDB remote
        const remoteUrl = `${COUCHDB_CONFIG.url}/${COUCHDB_CONFIG.dbName}`;
        this.remoteDB = new PouchDB(remoteUrl, { skip_setup: true });
        
        // Créer les design documents (RÈGLE #5)
        await this.ensureDesignDocs();
        
        // Configurer la réplication bidirectionnelle (RÈGLE #3)
        await this.setupReplication();
        
        // Configurer les écouteurs réseau (RÈGLE #7)
        this.setupNetworkListeners();
        
      } catch (err) {
        console.error('[CHECKPOINT] next-period-init-error', err);
        this.error = err.message;
      }
    },
    
    /**
     * @action Créer/mettre à jour les design documents
     */
    async ensureDesignDocs() {
      for (const doc of DESIGN_DOCS) {
        try {
          const existing = await this.localDB.get(doc._id);
          if (JSON.stringify(existing.views) !== JSON.stringify(doc.views)) {
            await this.localDB.put({ ...doc, _rev: existing._rev });
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
     * @action Configurer la réplication bidirectionnelle
     */
    async setupReplication() {
      this.syncHandler = this.localDB.sync(this.remoteDB, {
        live: COUCHDB_CONFIG.options.live,
        retry: COUCHDB_CONFIG.options.retry,
        heartbeat: COUCHDB_CONFIG.options.heartbeat
      })
      .on('change', (info) => {
        this.pendingChanges = info.change?.pending || 0;
        if (info.direction === 'pull' && info.change?.docs?.length > 0) {
          // Données reçues, recharger si nécessaire
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
    // WORKFLOW PRINCIPAL: nextPeriod
    // ========================================
    
    /**
     * @action Naviguer vers la période suivante et charger les relances
     * @checkpoint next-period-start
     */
    async nextPeriod() {
      console.log('[CHECKPOINT] next-period-start');
      this.loading = true;
      this.error = null;
      
      try {
        // 1. Incrémenter la période
        this.incrementPeriod();
        console.log('[CHECKPOINT] next-period-incremented');
        
        // 2. Charger les relances depuis PouchDB pour la nouvelle période
        await this.loadRelancesForPeriod();
        console.log('[CHECKPOINT] next-period-data-queried');
        
        // 3. Filtrer les relances du jour sélectionné
        this.updateRelancesDuJour();
        console.log('[CHECKPOINT] next-period-data-loaded');
        
        this.loading = false;
        console.log('[CHECKPOINT] next-period-complete');
        
      } catch (err) {
        console.error('[CHECKPOINT] next-period-error', err);
        this.error = err.message;
        this.loading = false;
      }
    },
    
    /**
     * @action Incrémenter la période courante (mois ou semaine)
     */
    incrementPeriod() {
      const current = new Date(this.currentDate);
      
      if (this.viewMode === 'month') {
        // Avancer d'un mois
        current.setMonth(current.getMonth() + 1);
      } else {
        // Avancer d'une semaine
        current.setDate(current.getDate() + 7);
      }
      
      this.currentDate = current;
      this.selectedDate = null; // Réinitialiser la sélection
      
      console.log('[PERIOD] Nouvelle période:', this.currentDate.toISOString());
    },
    
    /**
     * @action Charger les relances depuis PouchDB pour la période courante
     * RÈGLE #6: Lecture depuis PouchDB local (pas d'appel API)
     */
    async loadRelancesForPeriod() {
      const yearMonth = this.getYearMonth(this.currentDate);
      
      try {
        // RÈGLE #2: Utiliser db.query avec la vue Mango
        const result = await this.localDB.query('relances/by_year_month', {
          key: yearMonth,
          include_docs: true,
          conflicts: true // RÈGLE #4: Détecter les conflits
        });
        
        // Mapper les documents avec _id et _rev (RÈGLE #10)
        this.relancesProgrammees = result.rows.map(row => ({
          ...row.doc,
          id: row.doc._id,           // RÈGLE #10: ID CouchDB
          rev: row.doc._rev,         // RÈGLE #10: Révision CouchDB
          hasConflicts: !!(row.doc._conflicts && row.doc._conflicts.length > 0)
        }));
        
        console.log('[POUCHDB] Relances chargées:', this.relancesProgrammees.length);
        
      } catch (err) {
        console.error('[POUCHDB] Erreur chargement relances:', err);
        
        // Fallback: charger toutes les relances et filtrer en mémoire
        const allDocs = await this.localDB.allDocs({
          include_docs: true,
          startkey: 'relance_',
          endkey: 'relance_\uffff'
        });
        
        this.relancesProgrammees = allDocs.rows
          .filter(row => {
            const docDate = row.doc.date_relance;
            return docDate && docDate.startsWith(yearMonth);
          })
          .map(row => ({
            ...row.doc,
            id: row.doc._id,
            rev: row.doc._rev
          }));
        
        console.log('[POUCHDB] Relances chargées (fallback):', this.relancesProgrammees.length);
      }
    },
    
    /**
     * @action Mettre à jour les relances du jour sélectionné
     */
    updateRelancesDuJour() {
      if (!this.selectedDate) {
        this.relancesDuJour = [];
        return;
      }
      
      const selectedDateStr = this.formatDateISO(this.selectedDate);
      
      this.relancesDuJour = this.relancesProgrammees.filter(
        relance => relance.date_relance === selectedDateStr
      );
      
      console.log('[DATA] Relances du jour:', this.relancesDuJour.length);
    },
    
    /**
     * @action Sélectionner une date spécifique
     */
    selectDate(date) {
      this.selectedDate = date;
      this.updateRelancesDuJour();
    },
    
    // ========================================
    // UTILITAIRES
    // ========================================
    
    /**
     * @action Formater la date en YYYY-MM
     */
    getYearMonth(date) {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}`;
    },
    
    /**
     * @action Formater la date en YYYY-MM-DD
     */
    formatDateISO(date) {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },
    
    /**
     * @action Obtenir le nom du mois
     */
    getMonthName(date) {
      const months = [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
      ];
      return months[date.getMonth()];
    },
    
    /**
     * @action Obtenir le libellé de la période courante
     */
    get currentPeriodLabel() {
      if (this.viewMode === 'month') {
        return `${this.getMonthName(this.currentDate)} ${this.currentDate.getFullYear()}`;
      } else {
        // Semaine
        const weekStart = new Date(this.currentDate);
        const dayOfWeek = weekStart.getDay();
        const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        weekStart.setDate(diff);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        return `${weekStart.getDate()}/${weekStart.getMonth() + 1} - ${weekEnd.getDate()}/${weekEnd.getMonth() + 1}`;
      }
    },
    
    // ========================================
    // GESTION RÉSEAU (RÈGLE #7)
    // ========================================
    
    setupNetworkListeners() {
      window.addEventListener('online', () => {
        console.log('[NETWORK] En ligne');
        this.isOnline = true;
        this.syncStatus = 'syncing';
      });
      
      window.addEventListener('offline', () => {
        console.log('[NETWORK] Hors ligne');
        this.isOnline = false;
        this.syncStatus = 'paused';
      });
    },
    
    // ========================================
    // PROPRIÉTÉS CALCULÉES (RÈGLE #8, #9)
    // ========================================
    
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
    
    get relancesCount() {
      return this.relancesProgrammees.length;
    },
    
    get hasRelancesDuJour() {
      return this.relancesDuJour.length > 0;
    }
  };
}

// ============================================
// EXPORT
// ============================================

// Pour Alpine.js (RÈGLE #8)
if (typeof window !== 'undefined') {
  window.nextPeriodWorkflow = nextPeriodWorkflow;
}

// Export ES6
export { nextPeriodWorkflow };

// Usage dans Alpine.js:
//
// <div x-data="nextPeriodWorkflow()" x-init="init()">
//   <button @click="nextPeriod()">Mois suivant</button>
//   <span x-text="currentPeriodLabel"></span>
//   <span :class="syncStatusClass" x-text="syncStatusLabel"></span>
// </div>
