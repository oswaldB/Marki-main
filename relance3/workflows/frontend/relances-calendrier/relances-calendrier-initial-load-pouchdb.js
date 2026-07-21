/**
 * Workflow: relances-calendrier-initial-load
 * Adapté pour PouchDB avec réplication CouchDB en temps réel
 * 
 * Vue calendrier mensuel des relances programmées avec synchronisation live
 * 
 * @checkpoint wf-calendar-init
 * @checkpoint wf-calendar-pouchdb-ready
 * @checkpoint wf-calendar-design-docs-ready
 * @checkpoint wf-calendar-sync-active
 * @checkpoint wf-calendar-data-loaded
 * @checkpoint wf-calendar-grid-rendered
 * @checkpoint wf-calendar-complete
 * @checkpoint wf-calendar-error
 */

// ============================================
// CONFIGURATION
// ============================================

const CALENDAR_COUCHDB_CONFIG = {
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

const CALENDAR_DESIGN_DOCS = [
  {
    _id: '_design/calendar_relances',
    views: {
      by_date_envoi: {
        map: function(doc) {
          if (doc.type === 'relance' && doc.dateEnvoiPrevue) {
            emit(doc.dateEnvoiPrevue, doc);
          }
        }.toString()
      },
      by_mois: {
        map: function(doc) {
          if (doc.type === 'relance' && doc.dateEnvoiPrevue) {
            // Émettre au format YYYY-MM pour filtrage par mois
            const mois = doc.dateEnvoiPrevue.substring(0, 7);
            emit(mois, doc);
          }
        }.toString()
      },
      by_statut_date: {
        map: function(doc) {
          if (doc.type === 'relance' && doc.dateEnvoiPrevue && doc.statut) {
            emit([doc.dateEnvoiPrevue, doc.statut], doc);
          }
        }.toString()
      }
    }
  },
  {
    _id: '_design/calendar_stats',
    views: {
      by_statut: {
        map: function(doc) {
          if (doc.type === 'relance' && doc.statut) {
            emit(doc.statut, 1);
          }
        }.toString(),
        reduce: '_count'
      }
    }
  }
];

// ============================================
// UTILITAIRES CALENDRIER
// ============================================

const CalendarUtils = {
  // Obtenir le premier jour du mois
  getFirstDayOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  },

  // Obtenir le dernier jour du mois
  getLastDayOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  },

  // Obtenir le début de la semaine (lundi)
  getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajuster pour lundi
    return new Date(d.setDate(diff));
  },

  // Formater une date en YYYY-MM-DD
  formatDateYYYYMMDD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // Formater une date en YYYY-MM
  formatDateYYYYMM(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  },

  // Formater pour affichage
  formatDisplayMonth(date) {
    const mois = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    return `${mois[date.getMonth()]} ${date.getFullYear()}`;
  },

  // Générer la grille de 42 jours (6 semaines)
  generateCalendarGrid(currentDate) {
    const firstDayOfMonth = this.getFirstDayOfMonth(currentDate);
    const startOfGrid = this.getStartOfWeek(firstDayOfMonth);
    
    const days = [];
    for (let i = 0; i < 42; i++) {
      const day = new Date(startOfGrid);
      day.setDate(startOfGrid.getDate() + i);
      days.push({
        date: day,
        dateStr: this.formatDateYYYYMMDD(day),
        isCurrentMonth: day.getMonth() === currentDate.getMonth(),
        isToday: this.isSameDay(day, new Date())
      });
    }
    
    return days;
  },

  // Vérifier si deux dates sont le même jour
  isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  },

  // Obtenir la couleur du badge selon le statut
  getStatutColor(statut) {
    const colors = {
      'a_valider': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'a_envoyer': 'bg-blue-100 text-blue-800 border-blue-200',
      'envoyee': 'bg-green-100 text-green-800 border-green-200',
      'en_attente': 'bg-purple-100 text-purple-800 border-purple-200',
      'blacklistee': 'bg-red-100 text-red-800 border-red-200',
      'supprimee': 'bg-gray-100 text-gray-600 border-gray-200'
    };
    return colors[statut] || 'bg-gray-100 text-gray-800 border-gray-200';
  },

  // Libellé du statut
  getStatutLabel(statut) {
    const labels = {
      'a_valider': 'À valider',
      'a_envoyer': 'À envoyer',
      'envoyee': 'Envoyée',
      'en_attente': 'En attente',
      'blacklistee': 'Blacklistée',
      'supprimee': 'Supprimée'
    };
    return labels[statut] || statut;
  }
};

// ============================================
// WORKFLOW CALENDRIER POUCHDB
// ============================================

function relancesCalendrierPouchDBManager() {
  return {
    // ========================================
    // ÉTAT DU CALENDRIER
    // ========================================
    currentDate: new Date(),
    viewMode: 'month', // 'month' | 'week'
    calendarDays: [],
    
    // Relances groupées par date
    relancesByDate: {},
    relances: [],
    
    // Jours sélectionnés
    selectedDate: null,
    selectedRelances: [],
    
    // Jours avec relances (pour marquer les jours)
    daysWithRelances: new Set(),
    
    // Statistiques
    stats: {
      total: 0,
      byStatut: {}
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
    error: null,
    showRelanceModal: false,
    selectedRelance: null,
    
    // Filtres
    filterStatut: '', // '' = tous
    filterPayeur: '',
    
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
     * @action Initialiser le workflow calendrier
     * @checkpoint wf-calendar-init
     */
    async init() {
      console.log('[CHECKPOINT] wf-calendar-init');
      this.loading = true;
      
      try {
        // Initialiser PouchDB
        this.localDB = new PouchDB(CALENDAR_COUCHDB_CONFIG.dbName);
        const remoteUrl = `${CALENDAR_COUCHDB_CONFIG.url}/${CALENDAR_COUCHDB_CONFIG.dbName}`;
        this.remoteDB = new PouchDB(remoteUrl, { skip_setup: true });
        
        console.log('[POUCHDB] Calendrier DB initialisé');
        
        // Créer les design documents
        await this.ensureDesignDocs();
        
        // Configurer la réplication
        await this.setupReplication();
        
        // Générer la grille initiale
        this.generateCalendarGrid();
        
        // Charger les relances
        await this.loadRelancesForMonth();
        
        // Configurer les écouteurs réseau
        this.setupNetworkListeners();
        
        this.loading = false;
        console.log('[CHECKPOINT] wf-calendar-complete');
        
      } catch (err) {
        console.error('[CHECKPOINT] wf-calendar-error', err);
        this.error = err.message;
        this.loading = false;
        this.syncStatus = 'error';
      }
    },
    
    /**
     * @action Créer/mettre à jour les design documents
     * @checkpoint wf-calendar-design-docs-ready
     */
    async ensureDesignDocs() {
      for (const doc of CALENDAR_DESIGN_DOCS) {
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
      console.log('[CHECKPOINT] wf-calendar-design-docs-ready');
    },
    
    /**
     * @action Configurer la réplication bidirectionnelle
     * @checkpoint wf-calendar-sync-active
     */
    async setupReplication() {
      console.log('[CHECKPOINT] wf-calendar-sync-active');
      
      if (this.syncHandler) {
        this.syncHandler.cancel();
      }
      
      this.syncHandler = this.localDB.sync(this.remoteDB, {
        live: CALENDAR_COUCHDB_CONFIG.options.live,
        retry: CALENDAR_COUCHDB_CONFIG.options.retry,
        heartbeat: CALENDAR_COUCHDB_CONFIG.options.heartbeat
      })
      .on('change', (info) => {
        this.pendingChanges = info.change?.pending || 0;
        
        if (info.direction === 'pull') {
          console.log('[SYNC] Nouvelles relances reçues');
          this.loadRelancesForMonth();
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
    // GESTION DU CALENDRIER
    // ========================================
    
    /**
     * @action Générer la grille du calendrier
     * @checkpoint wf-calendar-grid-rendered
     */
    generateCalendarGrid() {
      this.calendarDays = CalendarUtils.generateCalendarGrid(this.currentDate);
      console.log('[CHECKPOINT] wf-calendar-grid-rendered', { days: this.calendarDays.length });
    },
    
    /**
     * @action Calculer la plage de dates du mois
     */
    getMonthDateRange() {
      const firstDay = CalendarUtils.getFirstDayOfMonth(this.currentDate);
      const lastDay = CalendarUtils.getLastDayOfMonth(this.currentDate);
      
      return {
        debut: CalendarUtils.formatDateYYYYMM(firstDay),
        debutISO: firstDay.toISOString().split('T')[0],
        finISO: lastDay.toISOString().split('T')[0]
      };
    },
    
    /**
     * @action Charger les relances pour le mois affiché
     * @checkpoint wf-calendar-data-loaded
     */
    async loadRelancesForMonth() {
      this.loading = true;
      
      try {
        const { debut } = this.getMonthDateRange();
        
        // Utiliser la vue by_mois pour charger seulement les relances du mois
        const result = await this.localDB.query('calendar_relances/by_mois', {
          key: debut,
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
        
        // Grouper les relances par date
        this.groupRelancesByDate();
        
        // Calculer les stats
        this.calculateStats();
        
        console.log('[CHECKPOINT] wf-calendar-data-loaded', {
          count: this.relances.length,
          conflicts: this.conflicts.length
        });
        
      } catch (err) {
        console.error('Erreur chargement relances:', err);
        // Fallback: charger toutes les relances et filtrer
        await this.loadRelancesFallback();
      }
      
      this.loading = false;
    },
    
    /**
     * @action Fallback: charger avec allDocs
     */
    async loadRelancesFallback() {
      try {
        const { debutISO, finISO } = this.getMonthDateRange();
        
        const result = await this.localDB.allDocs({ include_docs: true });
        
        this.relances = result.rows
          .filter(r => r.doc.type === 'relance')
          .filter(r => {
            if (!r.doc.dateEnvoiPrevue) return false;
            const dateRelance = r.doc.dateEnvoiPrevue;
            return dateRelance >= debutISO && dateRelance <= finISO;
          })
          .map(r => ({ ...r.doc, id: r.doc._id }));
        
        this.groupRelancesByDate();
        this.calculateStats();
        
      } catch (err) {
        console.error('Erreur fallback:', err);
        this.relances = [];
      }
    },
    
    /**
     * @action Grouper les relances par date
     */
    groupRelancesByDate() {
      const grouped = {};
      const daysWithRelances = new Set();
      
      // Filtrer selon le statut si nécessaire
      let filteredRelances = this.relances;
      if (this.filterStatut) {
        filteredRelances = this.relances.filter(r => r.statut === this.filterStatut);
      }
      
      // Grouper par date
      filteredRelances.forEach(relance => {
        if (!relance.dateEnvoiPrevue) return;
        
        const dateStr = relance.dateEnvoiPrevue.split('T')[0];
        
        if (!grouped[dateStr]) {
          grouped[dateStr] = [];
        }
        grouped[dateStr].push(relance);
        daysWithRelances.add(dateStr);
      });
      
      this.relancesByDate = grouped;
      this.daysWithRelances = daysWithRelances;
    },
    
    /**
     * @action Calculer les statistiques
     */
    calculateStats() {
      this.stats = {
        total: this.relances.length,
        byStatut: {}
      };
      
      this.relances.forEach(r => {
        this.stats.byStatut[r.statut] = (this.stats.byStatut[r.statut] || 0) + 1;
      });
    },
    
    // ========================================
    // NAVIGATION CALENDRIER
    // ========================================
    
    /**
     * @action Aller au mois précédent
     */
    async previousMonth() {
      this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
      this.generateCalendarGrid();
      await this.loadRelancesForMonth();
    },
    
    /**
     * @action Aller au mois suivant
     */
    async nextMonth() {
      this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
      this.generateCalendarGrid();
      await this.loadRelancesForMonth();
    },
    
    /**
     * @action Aller à aujourd'hui
     */
    async goToToday() {
      this.currentDate = new Date();
      this.generateCalendarGrid();
      await this.loadRelancesForMonth();
    },
    
    /**
     * @action Changer de vue (mois/semaine)
     */
    setViewMode(mode) {
      this.viewMode = mode;
      // Implémentation future pour la vue semaine
    },
    
    // ========================================
    // SÉLECTION ET DÉTAILS
    // ========================================
    
    /**
     * @action Sélectionner une date et afficher ses relances
     */
    selectDate(dateStr) {
      this.selectedDate = dateStr;
      this.selectedRelances = this.relancesByDate[dateStr] || [];
      this.showRelanceModal = true;
    },
    
    /**
     * @action Obtenir les relances pour une cellule
     */
    getRelancesForDay(day) {
      return this.relancesByDate[day.dateStr] || [];
    },
    
    /**
     * @action Vérifier si une cellule a des relances
     */
    hasRelances(day) {
      return this.daysWithRelances.has(day.dateStr);
    },
    
    // ========================================
    // FILTRAGE
    // ========================================
    
    /**
     * @action Définir le filtre par statut
     */
    setFilterStatut(statut) {
      this.filterStatut = statut;
      this.groupRelancesByDate();
    },
    
    // ========================================
    // CRUD RELANCES (via calendrier)
    // ========================================
    
    /**
     * @action Créer une relance pour une date
     */
    async createRelanceForDate(dateStr, data) {
      try {
        const doc = {
          _id: `relance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'relance',
          ...data,
          dateEnvoiPrevue: dateStr,
          statut: 'a_valider',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await this.localDB.put(doc);
        await this.loadRelancesForMonth();
        
        return { success: true, id: doc._id };
      } catch (err) {
        console.error('Erreur création relance:', err);
        return { success: false, error: err.message };
      }
    },
    
    /**
     * @action Déplacer une relance vers une autre date
     */
    async moveRelance(relanceId, newDate) {
      try {
        const doc = await this.localDB.get(relanceId);
        
        await this.localDB.put({
          ...doc,
          dateEnvoiPrevue: newDate,
          updatedAt: new Date().toISOString()
        });
        
        await this.loadRelancesForMonth();
        return { success: true };
      } catch (err) {
        if (err.status === 409) {
          return this.handleConflict(relanceId, { dateEnvoiPrevue: newDate });
        }
        return { success: false, error: err.message };
      }
    },
    
    /**
     * @action Mettre à jour le statut d'une relance
     */
    async updateRelanceStatut(relanceId, newStatut) {
      try {
        const doc = await this.localDB.get(relanceId);
        
        await this.localDB.put({
          ...doc,
          statut: newStatut,
          updatedAt: new Date().toISOString()
        });
        
        await this.loadRelancesForMonth();
        return { success: true };
      } catch (err) {
        if (err.status === 409) {
          return this.handleConflict(relanceId, { statut: newStatut });
        }
        return { success: false, error: err.message };
      }
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
        
        if (conflictRevs.length === 0) {
          return this.updateRelanceStatut(docId, localUpdates.statut || doc.statut);
        }
        
        // Stratégie: garder les données locales
        for (const rev of conflictRevs) {
          await this.localDB.remove(docId, rev);
        }
        
        const merged = { ...doc, ...localUpdates, _rev: doc._rev };
        await this.localDB.put(merged);
        
        await this.loadRelancesForMonth();
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
     * @action Forcer une synchronisation
     */
    async forceSync() {
      this.syncStatus = 'syncing';
      
      try {
        await this.localDB.replicate.to(this.remoteDB);
        await this.localDB.replicate.from(this.remoteDB);
        await this.loadRelancesForMonth();
        
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
        this.isOnline = true;
        await this.forceSync();
      });
      
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    },
    
    // ========================================
    // COMPUTED PROPERTIES
    // ========================================
    
    get displayMonth() {
      return CalendarUtils.formatDisplayMonth(this.currentDate);
    },
    
    get weekDays() {
      return ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
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
        error: 'Erreur',
        complete: 'Synchronisé'
      };
      return labels[this.syncStatus] || '...';
    },
    
    get hasConflicts() {
      return this.conflicts.length > 0;
    },
    
    get totalRelancesMonth() {
      return this.relances.length;
    },
    
    get selectedDateFormatted() {
      if (!this.selectedDate) return '';
      const [year, month, day] = this.selectedDate.split('-');
      return `${day}/${month}/${year}`;
    }
  };
}

// ============================================
// EXPORT
// ============================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    relancesCalendrierPouchDBManager,
    CALENDAR_COUCHDB_CONFIG,
    CALENDAR_DESIGN_DOCS,
    CalendarUtils
  };
}
