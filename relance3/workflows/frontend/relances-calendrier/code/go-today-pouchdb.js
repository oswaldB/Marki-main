/**
 * Workflow: relances-calendrier-go-today
 * Adapté pour PouchDB avec pattern local-first
 * 
 * Ce workflow est une action cliente pure (pas d'appel API).
 * Il réinitialise la date à aujourd'hui et recharge les données depuis PouchDB local.
 * 
 * @checkpoint wf-cal-today-init
 * @checkpoint wf-cal-today-reset
 * @checkpoint wf-cal-today-data-loaded
 * @checkpoint wf-cal-today-complete
 */

// ============================================
// WORKFLOW GO-TODAY - VERSION POUCHDB
// ============================================
function relancesCalendrierGoTodayPouchDB() {
  return {
    // ========================================
    // ÉTAT: Date et Vue (RÈGLE #8: Alpine.js)
    // ========================================
    currentDate: new Date(),
    selectedDate: null,
    viewMode: 'month', // 'month' | 'week'
    
    // ========================================
    // ÉTAT: Données
    // ========================================
    relancesProgrammees: [],
    relancesDuJour: [],
    
    // ========================================
    // ÉTAT: Synchronisation (RÈGLE #9)
    // ========================================
    syncStatus: 'initial',
    isOnline: navigator.onLine,
    lastSync: null,
    
    // ========================================
    // ÉTAT: UI
    // ========================================
    loading: false,
    error: null,
    
    // ========================================
    // INSTANCES POUCHDB (RÈGLE #1)
    // ========================================
    localDB: null,
    
    // ========================================
    // INITIALISATION
    // ========================================
    
    /**
     * @action Initialiser PouchDB
     * @checkpoint wf-cal-today-init
     */
    async init() {
      // Initialiser PouchDB local (RÈGLE #1, #6)
      this.localDB = new PouchDB('marki_relances');
      console.log('[POUCHDB] Base locale initialisée: marki_relances');
      
      // Configurer les écouteurs réseau (RÈGLE #7)
      this.setupNetworkListeners();
      
      console.log('[CHECKPOINT] wf-cal-today-init');
    },
    
    // ========================================
    // ACTION PRINCIPALE: GO TO TODAY
    // ========================================
    
    /**
     * @action Réinitialiser à aujourd'hui et charger les données
     * @checkpoint wf-cal-today-reset
     * 
     * RÈGLE #6: Lecture depuis PouchDB local (pas d'appel API)
     * Pas d'appel API direct - tout passe par PouchDB local
     */
    async goToToday() {
      console.log('[CHECKPOINT] wf-cal-today-reset');
      
      this.loading = true;
      this.error = null;
      
      try {
        // 1. Réinitialiser la date à aujourd'hui
        this.currentDate = new Date();
        this.selectedDate = new Date();
        
        console.log('[GO-TODAY] Date réinitialisée:', this.currentDate.toISOString());
        
        // 2. Charger les données pour cette date depuis PouchDB (RÈGLE #2, #6)
        await this.loadDataForDate(this.currentDate);
        
        console.log('[CHECKPOINT] wf-cal-today-data-loaded');
        
        this.loading = false;
        console.log('[CHECKPOINT] wf-cal-today-complete');
        
      } catch (err) {
        console.error('[GO-TODAY] Erreur:', err);
        this.error = err.message;
        this.loading = false;
      }
    },
    
    /**
     * @action Charger les relances pour une date depuis PouchDB (RÈGLE #2, #6)
     * 
     * RÈGLE #2: Utilise db.find avec sélecteur Mango au lieu d'API
     * RÈGLE #10: Utilise les IDs CouchDB (_id) et révisions (_rev)
     */
    async loadDataForDate(date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      try {
        // RÈGLE #2: db.find pour requête Mango sur les dates
        // RÈGLE #4: include_docs et conflicts pour détecter les conflits
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
          rev: doc._rev
        }));
        
        // Charger aussi toutes les relances du mois/semaine pour la vue calendrier
        await this.loadRelancesForPeriod(this.viewMode, date);
        
        console.log('[DATA] Relances chargées:', this.relancesDuJour.length);
        
      } catch (err) {
        console.error('[DATA] Erreur chargement:', err);
        // Fallback: charger toutes les relances et filtrer en mémoire
        await this.loadAllRelancesFallback(date);
      }
    },
    
    /**
     * @action Charger les relances pour une période (mois ou semaine)
     * 
     * RÈGLE #2: db.query avec vue Mango pour les périodes
     */
    async loadRelancesForPeriod(viewMode, date) {
      let startDate, endDate;
      
      if (viewMode === 'month') {
        // Début et fin du mois
        startDate = new Date(date.getFullYear(), date.getMonth(), 1);
        endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
      } else {
        // Début et fin de la semaine
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Lundi
        startDate = new Date(date.setDate(diff));
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
      }
      
      try {
        // RÈGLE #2: Utiliser une vue Mango pour les périodes (si elle existe)
        const result = await this.localDB.query('relances/by_date_envoi', {
          startkey: startDate.toISOString(),
          endkey: endDate.toISOString(),
          include_docs: true
        });
        
        this.relancesProgrammees = result.rows.map(row => ({
          ...row.doc,
          id: row.doc._id,
          rev: row.doc._rev
        }));
        
      } catch (err) {
        // Vue n'existe pas encore, utiliser find
        const result = await this.localDB.find({
          selector: {
            type: 'relance',
            date_envoi_planifiee: {
              $gte: startDate.toISOString(),
              $lte: endDate.toISOString()
            }
          }
        });
        
        this.relancesProgrammees = result.docs.map(doc => ({
          ...doc,
          id: doc._id,
          rev: doc._rev
        }));
      }
    },
    
    /**
     * @action Fallback: charger toutes les relances
     */
    async loadAllRelancesFallback(date) {
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
      
      // Filtrer pour le jour sélectionné
      const dateStr = date.toISOString().split('T')[0];
      this.relancesDuJour = allRelances.filter(r => {
        if (!r.date_envoi_planifiee) return false;
        return r.date_envoi_planifiee.startsWith(dateStr);
      });
      
      this.relancesProgrammees = allRelances;
    },
    
    // ========================================
    // NAVIGATION
    // ========================================
    
    /**
     * @action Aller à la période précédente
     */
    async previousPeriod() {
      if (this.viewMode === 'month') {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      } else {
        this.currentDate.setDate(this.currentDate.getDate() - 7);
      }
      this.currentDate = new Date(this.currentDate); // Trigger reactivity
      await this.loadDataForDate(this.currentDate);
    },
    
    /**
     * @action Aller à la période suivante
     */
    async nextPeriod() {
      if (this.viewMode === 'month') {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      } else {
        this.currentDate.setDate(this.currentDate.getDate() + 7);
      }
      this.currentDate = new Date(this.currentDate); // Trigger reactivity
      await this.loadDataForDate(this.currentDate);
    },
    
    /**
     * @action Changer le mode de vue
     */
    async switchView(mode) {
      this.viewMode = mode;
      await this.loadDataForDate(this.currentDate);
    },
    
    // ========================================
    // GESTION RÉSEAU (RÈGLE #7)
    // ========================================
    
    setupNetworkListeners() {
      window.addEventListener('online', () => {
        console.log('[NETWORK] En ligne');
        this.isOnline = true;
      });
      
      window.addEventListener('offline', () => {
        console.log('[NETWORK] Hors ligne');
        this.isOnline = false;
      });
    },
    
    // ========================================
    // UTILITAIRES
    // ========================================
    
    formatDate(date) {
      if (!date) return '-';
      return new Date(date).toLocaleDateString('fr-FR');
    },
    
    formatDateTime(date) {
      if (!date) return '-';
      return new Date(date).toLocaleString('fr-FR');
    },
    
    /**
     * @computed Label du mois courant
     */
    get currentMonthLabel() {
      return this.currentDate.toLocaleDateString('fr-FR', {
        month: 'long',
        year: 'numeric'
      });
    },
    
    /**
     * @computed Label de la semaine courante
     */
    get currentWeekLabel() {
      const start = new Date(this.currentDate);
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      
      return `${start.toLocaleDateString('fr-FR')} - ${end.toLocaleDateString('fr-FR')}`;
    },
    
    /**
     * @computed Label de la période courante
     */
    get periodLabel() {
      return this.viewMode === 'month' ? this.currentMonthLabel : this.currentWeekLabel;
    }
  };
}

// ============================================
// EXPORT
// ============================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { relancesCalendrierGoTodayPouchDB };
}

if (typeof window !== 'undefined') {
  window.relancesCalendrierGoTodayPouchDB = relancesCalendrierGoTodayPouchDB;
}
