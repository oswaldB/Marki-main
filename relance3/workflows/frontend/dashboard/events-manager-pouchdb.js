/**
 * Workflow: dashboard-events-manager
 * Adapté pour PouchDB avec réplication CouchDB en temps réel
 * 
 * Pattern local-first : lectures depuis PouchDB local, écritures vers PouchDB
 * Synchronisation bidirectionnelle live avec gestion des conflits
 * 
 * @checkpoint wf-events-init
 * @checkpoint wf-events-pouchdb-ready
 * @checkpoint wf-events-design-docs-created
 * @checkpoint wf-events-sync-started
 * @checkpoint wf-events-data-fetched
 * @checkpoint wf-events-read-state-loaded
 * @checkpoint wf-events-rendered
 * @checkpoint wf-events-complete
 * @checkpoint wf-events-error
 */

// ============================================
// CONFIGURATION COUCHDB
// ============================================
const COUCHDB_CONFIG = {
  url: window.location.hostname === 'localhost' 
    ? 'http://admin:admin@localhost:5984'
    : 'https://admin:admin@dev.markidiags.com/data',
  dbName: 'marki_events',
  options: {
    live: true,        // Réplication continue
    retry: true,       // Reconnexion automatique
    heartbeat: 10000,  // Ping toutes les 10s
    timeout: 30000     // Timeout de 30s
  }
};

// ============================================
// DESIGN DOCUMENTS (Vues Mango pour les événements)
// ============================================
const DESIGN_DOCS = [
  {
    _id: '_design/events',
    views: {
      // Tous les événements par date décroissante
      by_date: {
        map: function(doc) {
          if (doc.type === 'event' && doc.created_at) {
            emit(doc.created_at, doc);
          }
        }.toString()
      },
      // Par type d'événement
      by_type: {
        map: function(doc) {
          if (doc.type === 'event' && doc.event_type) {
            emit(doc.event_type, doc);
          }
        }.toString()
      },
      // Par utilisateur
      by_user: {
        map: function(doc) {
          if (doc.type === 'event' && doc.user_id) {
            emit(doc.user_id, doc);
          }
        }.toString()
      },
      // Événements non lus (pour le badge)
      unread_count: {
        map: function(doc) {
          if (doc.type === 'event' && !doc.read_at) {
            emit(null, 1);
          }
        }.toString(),
        reduce: '_sum'
      },
      // Tous les événements
      all: {
        map: function(doc) {
          if (doc.type === 'event') {
            emit(doc._id, doc);
          }
        }.toString()
      }
    }
  },
  {
    _id: '_design/events_stats',
    views: {
      // Statistiques par type
      by_type_count: {
        map: function(doc) {
          if (doc.type === 'event' && doc.event_type) {
            emit(doc.event_type, 1);
          }
        }.toString(),
        reduce: '_sum'
      },
      // Événements par jour (pour graphiques)
      by_day: {
        map: function(doc) {
          if (doc.type === 'event' && doc.created_at) {
            var date = doc.created_at.split('T')[0];
            emit(date, 1);
          }
        }.toString(),
        reduce: '_sum'
      }
    }
  }
];

// ============================================
// WORKFLOW EVENTS MANAGER - VERSION POUCHDB
// ============================================
function eventsManagerPouchDB() {
  return {
    // ========================================
    // ÉTAT: Données
    // ========================================
    events: [],              // Liste des événements
    readEvents: {},          // Map des events lus (_id -> read_at)
    
    // ========================================
    // ÉTAT: Synchronisation (RÈGLE #9)
    // ========================================
    syncStatus: 'initial',   // 'initial' | 'syncing' | 'paused' | 'error' | 'complete'
    isOnline: navigator.onLine,
    lastSync: null,
    pendingChanges: 0,
    conflicts: [],
    
    // ========================================
    // ÉTAT: UI / Loading
    // ========================================
    loading: true,
    error: null,
    hoveredEvent: null,      // Event actuellement hovered
    
    // ========================================
    // ÉTAT: Filtres
    // ========================================
    filter: {
      type: null,           // 'sync' | 'payment' | 'relance' | 'alert' | null
      limit: 20             // Nombre max d'events à charger
    },
    
    // ========================================
    // ÉTAT: Pagination live (load more)
    // ========================================
    pagination: {
      currentLimit: 20,
      hasMore: true
    },
    
    // ========================================
    // INSTANCES POUCHDB (RÈGLE #1)
    // ========================================
    localDB: null,
    remoteDB: null,
    syncHandler: null,
    changesHandler: null,    // Pour les changements temps réel
    
    // ========================================
    // INITIALISATION
    // ========================================
    
    /**
     * @action Initialiser PouchDB et charger les événements
     * @checkpoint wf-events-init
     */
    async init() {
      console.log('[CHECKPOINT] wf-events-init');
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
        
        console.log('[CHECKPOINT] wf-events-pouchdb-ready');
        
        // 3. Créer les design documents (RÈGLE #5)
        await this.ensureDesignDocs();
        console.log('[CHECKPOINT] wf-events-design-docs-created');
        
        // 4. Configurer la réplication (RÈGLE #3)
        await this.setupReplication();
        console.log('[CHECKPOINT] wf-events-sync-started');
        
        // 5. Charger les événements depuis PouchDB local (RÈGLE #6)
        await this.loadEvents();
        console.log('[CHECKPOINT] wf-events-data-fetched');
        
        // 6. Charger l'état "lu" depuis PouchDB (RÈGLE #6)
        await this.loadReadState();
        console.log('[CHECKPOINT] wf-events-read-state-loaded');
        
        // 7. Configurer le listener pour les changements temps réel
        this.setupChangesListener();
        
        this.loading = false;
        console.log('[CHECKPOINT] wf-events-rendered');
        
        // 8. Configurer les écouteurs réseau (RÈGLE #7)
        this.setupNetworkListeners();
        
        console.log('[CHECKPOINT] wf-events-complete');
        
      } catch (err) {
        console.error('[CHECKPOINT] wf-events-error', err);
        this.error = err.message;
        this.syncStatus = 'error';
        this.loading = false;
      }
    },
    
    /**
     * @action Créer les design documents (RÈGLE #5)
     */
    async ensureDesignDocs() {
      for (const doc of DESIGN_DOCS) {
        try {
          const existing = await this.localDB.get(doc._id);
          // Mettre à jour si les vues ont changé
          if (JSON.stringify(existing.views) !== JSON.stringify(doc.views)) {
            await this.localDB.put({
              ...doc,
              _rev: existing._rev  // RÈGLE #10
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
    },
    
    /**
     * @action Configurer la réplication bidirectionnelle (RÈGLE #3)
     */
    async setupReplication() {
      console.log('[SYNC] Démarrage réplication...');
      this.syncStatus = 'syncing';
      
      this.syncHandler = this.localDB.sync(this.remoteDB, {
        live: COUCHDB_CONFIG.options.live,
        retry: COUCHDB_CONFIG.options.retry,
        heartbeat: COUCHDB_CONFIG.options.heartbeat,
        timeout: COUCHDB_CONFIG.options.timeout
      })
      .on('change', (info) => {
        console.log('[SYNC] Changement:', info);
        this.pendingChanges = info.change?.pending || 0;
        
        // Si données reçues du serveur (pull), recharger si ce sont des events
        if (info.direction === 'pull' && info.change?.docs?.length > 0) {
          const hasEvents = info.change.docs.some(doc => doc.type === 'event');
          if (hasEvents) {
            this.loadEvents();
          }
        }
      })
      .on('paused', (err) => {
        console.log('[SYNC] Réplication en pause');
        this.syncStatus = err ? 'error' : 'paused';
        this.lastSync = new Date().toISOString();
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
      .on('complete', () => {
        this.syncStatus = 'complete';
        this.lastSync = new Date().toISOString();
      })
      .on('error', (err) => {
        console.error('[SYNC] Erreur:', err);
        this.syncStatus = 'error';
        this.isOnline = false;
      });
    },
    
    /**
     * @action Configurer le listener pour les changements temps réel
     */
    setupChangesListener() {
      // Écouter les changements sur la base locale
      this.changesHandler = this.localDB.changes({
        since: 'now',
        live: true,
        include_docs: true,
        conflicts: true  // RÈGLE #4
      }).on('change', (change) => {
        console.log('[CHANGES] Changement détecté:', change.id);
        
        if (change.doc.type === 'event') {
          // Mettre à jour l'event dans la liste
          const index = this.events.findIndex(e => e._id === change.id);
          if (index >= 0) {
            // Mise à jour d'un event existant
            this.events[index] = {
              ...change.doc,
              id: change.doc._id,
              time: this.formatRelativeDate(change.doc.created_at),
              icon: this.getIconForType(change.doc.event_type),
              hasConflicts: !!(change.doc._conflicts && change.doc._conflicts.length > 0)
            };
          } else if (!change.deleted) {
            // Nouvel event - l'ajouter en haut de la liste
            const newEvent = {
              ...change.doc,
              id: change.doc._id,
              time: "À l'instant",
              icon: this.getIconForType(change.doc.event_type),
              hasConflicts: !!(change.doc._conflicts && change.doc._conflicts.length > 0)
            };
            this.events.unshift(newEvent);
          }
        }
      }).on('error', (err) => {
        console.error('[CHANGES] Erreur:', err);
      });
    },
    
    // ========================================
    // CHARGEMENT DES DONNÉES (RÈGLE #2, #6)
    // ========================================
    
    /**
     * @action Charger les événements depuis PouchDB local
     * @checkpoint wf-events-data-fetched
     */
    async loadEvents() {
      try {
        // RÈGLE #2: Utiliser db.query avec vue Mango
        // RÈGLE #4: Inclure les conflits
        const result = await this.localDB.query('events/by_date', {
          descending: true,  // Du plus récent au plus ancien
          limit: this.pagination.currentLimit,
          include_docs: true,
          conflicts: true
        });
        
        // Mapper les documents avec _id et _rev (RÈGLE #10)
        this.events = result.rows.map(row => ({
          ...row.doc,
          id: row.doc._id,           // RÈGLE #10: ID CouchDB
          rev: row.doc._rev,         // RÈGLE #10: Révision CouchDB
          time: this.formatRelativeDate(row.doc.created_at),
          icon: this.getIconForType(row.doc.event_type),
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
        
        // Vérifier s'il y a plus d'events
        this.pagination.hasMore = result.rows.length >= this.pagination.currentLimit;
        
        console.log('[DATA] Events chargés:', this.events.length);
        
      } catch (err) {
        console.error('[DATA] Erreur chargement vues:', err);
        // Fallback: charger tous les documents
        const allDocs = await this.localDB.allDocs({
          include_docs: true,
          conflicts: true,
          limit: this.pagination.currentLimit
        });
        
        this.events = allDocs.rows
          .filter(row => row.doc.type === 'event')
          .sort((a, b) => new Date(b.doc.created_at) - new Date(a.doc.created_at))
          .map(row => ({
            ...row.doc,
            id: row.doc._id,
            rev: row.doc._rev,
            time: this.formatRelativeDate(row.doc.created_at),
            icon: this.getIconForType(row.doc.event_type),
            hasConflicts: !!(row.doc._conflicts && row.doc._conflicts.length > 0)
          }));
        
        console.log('[DATA] Events chargés (fallback):', this.events.length);
      }
    },
    
    /**
     * @action Charger l'état "lu" depuis PouchDB
     * @checkpoint wf-events-read-state-loaded
     */
    async loadReadState() {
      try {
        // RÈGLE #2: Utiliser une vue pour les events lus
        const result = await this.localDB.query('events/by_date', {
          include_docs: true,
          conflicts: true
        });
        
        // Construire la map des events lus
        this.readEvents = {};
        result.rows.forEach(row => {
          if (row.doc.read_at) {
            this.readEvents[row.doc._id] = row.doc.read_at;
          }
        });
        
        console.log('[DATA] État lu chargé:', Object.keys(this.readEvents).length, 'events lus');
        
      } catch (err) {
        console.error('[DATA] Erreur chargement état lu:', err);
        this.readEvents = {};
      }
    },
    
    /**
     * @action Charger plus d'événements (pagination)
     */
    async loadMore() {
      this.pagination.currentLimit += 20;
      await this.loadEvents();
    },
    
    // ========================================
    // MARQUAGE COMME LU (RÈGLE #2, #6)
    // ========================================
    
    /**
     * @action Marquer un événement comme lu
     * @checkpoint event-marked-as-read
     */
    async markEventAsRead(eventId) {
      if (this.readEvents[eventId]) return; // Déjà lu
      
      try {
        // RÈGLE #2: Utiliser db.get puis db.put
        const doc = await this.localDB.get(eventId);
        
        // RÈGLE #10: Mettre à jour avec _rev
        const result = await this.localDB.put({
          ...doc,
          _id: doc._id,           // RÈGLE #10
          _rev: doc._rev,         // RÈGLE #10
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
        // Mettre à jour localement
        this.readEvents[eventId] = new Date().toISOString();
        
        // Forcer le recalcul pour masquer la pastille
        this.events = [...this.events];
        
        console.log('[ACTION] Event marqué comme lu:', eventId, 'rev:', result.rev);
        
      } catch (err) {
        console.error('[ACTION] Erreur marquage lu:', err);
      }
    },
    
    /**
     * @action Marquer tous les événements comme lus
     * @checkpoint all-events-marked-as-read
     */
    async markAllAsRead() {
      const now = new Date().toISOString();
      
      try {
        // Récupérer tous les events non lus
        const unreadEvents = this.events.filter(e => !this.readEvents[e._id]);
        
        // Batch update avec bulkDocs (RÈGLE #2)
        const docsToUpdate = await Promise.all(
          unreadEvents.map(async (event) => {
            const doc = await this.localDB.get(event._id);
            return {
              ...doc,
              _id: doc._id,       // RÈGLE #10
              _rev: doc._rev,     // RÈGLE #10
              read_at: now,
              updated_at: now
            };
          })
        );
        
        if (docsToUpdate.length > 0) {
          // RÈGLE #2: bulkDocs pour mise à jour en batch
          const result = await this.localDB.bulkDocs(docsToUpdate);
          console.log('[ACTION] Bulk update result:', result);
          
          // Mettre à jour la map locale
          unreadEvents.forEach(event => {
            this.readEvents[event._id] = now;
          });
          
          // Forcer le recalcul
          this.events = [...this.events];
        }
        
        console.log('[ACTION] Tous les events marqués comme lus:', unreadEvents.length);
        
      } catch (err) {
        console.error('[ACTION] Erreur marquage tous lu:', err);
      }
    },
    
    /**
     * @action Créer un nouvel événement (pour tests ou création manuelle)
     */
    async createEvent(eventData) {
      try {
        const newEvent = {
          _id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'event',
          event_type: eventData.type || 'alert',
          title: eventData.title || 'Nouvel événement',
          description: eventData.description || '',
          created_at: new Date().toISOString(),
          user_id: eventData.user_id || null,
          user_username: eventData.user_username || null,
          by_marki: eventData.by_marki || false,
          read_at: null
        };
        
        // RÈGLE #2: db.put pour créer
        // RÈGLE #6: Écriture vers PouchDB local (réplication automatique)
        const result = await this.localDB.put(newEvent);
        
        // Ajouter à la liste locale immédiatement
        this.events.unshift({
          ...newEvent,
          id: newEvent._id,
          rev: result.rev,
          time: "À l'instant",
          icon: this.getIconForType(newEvent.event_type)
        });
        
        console.log('[ACTION] Event créé:', newEvent._id, 'rev:', result.rev);
        
        return result;
        
      } catch (err) {
        console.error('[ACTION] Erreur création event:', err);
        throw err;
      }
    },
    
    // ========================================
    // GESTION DES CONFLITS (RÈGLE #4)
    // ========================================
    
    /**
     * @action Résoudre un conflit manuellement
     */
    async resolveConflict(eventId, winningRev) {
      try {
        // Récupérer toutes les révisions en conflit
        const doc = await this.localDB.get(eventId, { conflicts: true });
        
        if (!doc._conflicts || doc._conflicts.length === 0) {
          console.log('[CONFLICT] Pas de conflit à résoudre pour:', eventId);
          return;
        }
        
        // Supprimer les révisions perdantes
        for (const rev of doc._conflicts) {
          if (rev !== winningRev) {
            await this.localDB.remove(eventId, rev);  // RÈGLE #10
            console.log('[CONFLICT] Révision supprimée:', rev);
          }
        }
        
        // Recharger les events
        await this.loadEvents();
        
        console.log('[CONFLICT] Conflit résolu pour:', eventId);
        
      } catch (err) {
        console.error('[CONFLICT] Erreur résolution:', err);
      }
    },
    
    // ========================================
    // FILTRAGE
    // ========================================
    
    /**
     * @action Définir le filtre par type
     */
    setTypeFilter(type) {
      this.filter.type = type === this.filter.type ? null : type;
    },
    
    /**
     * @action Réinitialiser tous les filtres
     */
    clearFilters() {
      this.filter.type = null;
      this.filter.limit = 20;
    },
    
    // ========================================
    // SYNCHRONISATION MANUELLE
    // ========================================
    
    async forceSync() {
      if (!this.isOnline) return;
      
      this.syncStatus = 'syncing';
      
      try {
        // RÈGLE #3: Réplication manuelle bidirectionnelle
        const pushResult = await this.localDB.replicate.to(this.remoteDB);
        const pullResult = await this.localDB.replicate.from(this.remoteDB);
        
        await this.loadEvents();
        await this.loadReadState();
        
        this.syncStatus = 'complete';
        this.lastSync = new Date().toISOString();
        
        console.log('[SYNC] Manuelle terminée:', {
          pushed: pushResult.docs_written,
          pulled: pullResult.docs_written
        });
        
      } catch (err) {
        this.syncStatus = 'error';
        console.error('[SYNC] Erreur:', err);
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
        if (this.syncHandler) {
          this.syncHandler.cancel();
          this.setupReplication();
        }
      });
      
      window.addEventListener('offline', () => {
        console.log('[NETWORK] Hors ligne');
        this.isOnline = false;
        this.syncStatus = 'paused';
      });
    },
    
    // ========================================
    // UTILITAIRES D'AFFICHAGE
    // ========================================
    
    /**
     * @action Vérifier si un event est lu
     */
    isEventRead(eventId) {
      return !!this.readEvents[eventId];
    },
    
    /**
     * @action Formater une date relative
     */
    formatRelativeDate(isoDate) {
      if (!isoDate) return '-';
      
      const date = new Date(isoDate);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      // Hier à HH:MM
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday = date.toDateString() === yesterday.toDateString();
      
      if (diffMins < 1) return "À l'instant";
      if (diffMins < 60) return `Il y a ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
      if (diffHours < 24) return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
      if (isYesterday) return `Hier à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
      if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
      
      return `Le ${date.toLocaleDateString('fr-FR')} à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    },
    
    /**
     * @action Obtenir l'icône pour un type d'événement
     */
    getIconForType(type) {
      const icons = {
        sync: 'fa-sync-alt',
        payment: 'fa-check-circle',
        relance: 'fa-paper-plane',
        alert: 'fa-exclamation-circle',
        import: 'fa-file-import',
        relance_cleaned: 'fa-broom',
        contact_blacklisted: 'fa-ban',
        payment_suspended: 'fa-pause-circle'
      };
      return icons[type] || 'fa-info-circle';
    },
    
    /**
     * @action Obtenir la classe CSS pour un type
     */
    getIconClassForType(type) {
      const classes = {
        sync: 'text-blue-500 bg-blue-50',
        payment: 'text-green-500 bg-green-50',
        relance: 'text-purple-500 bg-purple-50',
        alert: 'text-red-500 bg-red-50',
        import: 'text-orange-500 bg-orange-50',
        relance_cleaned: 'text-teal-500 bg-teal-50',
        contact_blacklisted: 'text-gray-500 bg-gray-50',
        payment_suspended: 'text-yellow-500 bg-yellow-50'
      };
      return classes[type] || 'text-slate-500 bg-slate-50';
    },
    
    // ========================================
    // PROPRIÉTÉS CALCULÉES (RÈGLE #8: Alpine.js)
    // ========================================
    
    get filteredEvents() {
      if (!this.filter.type) return this.events;
      return this.events.filter(e => e.event_type === this.filter.type);
    },
    
    get unreadCount() {
      return this.events.filter(e => !this.readEvents[e._id]).length;
    },
    
    get hasUnreadEvents() {
      return this.unreadCount > 0;
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
      const labels = {
        initial: 'Initialisation...',
        syncing: 'Synchronisation...',
        paused: this.isOnline ? 'À jour' : 'Hors ligne',
        error: 'Erreur de sync',
        complete: 'Synchronisé'
      };
      return labels[this.syncStatus] || 'Inconnu';
    },
    
    get isLoading() {
      return this.loading;
    },
    
    get hasError() {
      return !!this.error;
    },
    
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
    eventsManagerPouchDB,
    COUCHDB_CONFIG,
    DESIGN_DOCS
  };
}

if (typeof window !== 'undefined') {
  window.eventsManagerPouchDB = eventsManagerPouchDB;
  window.COUCHDB_CONFIG = COUCHDB_CONFIG;
  window.DESIGN_DOCS = DESIGN_DOCS;
}
