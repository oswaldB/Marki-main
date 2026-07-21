/**
 * Workflow: filter-all-pouchdb
 * Description: Filtrer toutes les séquences avec PouchDB (local-first)
 * 
 * Ce workflow ne fait pas d'appel API - filtrage client-side sur les données PouchDB locales
 * avec synchronisation bidirectionnelle live vers CouchDB
 */

// ============================================
// CONFIGURATION POUCHDB / COUCHDB
// ============================================

const POUCHDB_CONFIG = {
  // Nom de la base locale
  localDbName: 'marki_sequences',
  
  // URL de la base CouchDB distante
  remoteDbUrl: 'http://localhost:5984/marki_sequences',
  
  // Options de réplication
  replicationOptions: {
    live: true,
    retry: true,
    conflicts: true,        // Gérer les conflits
    include_docs: true,
    continuous: true
  }
};

// ============================================
// ALPINE.JS COMPONENT - Filter All PouchDB
// ============================================

document.addEventListener('alpine:init', () => {
  
  Alpine.data('sequencesFilterAllPouchDB', () => ({
    // ========================================
    // ÉTAT (State)
    // ========================================
    
    // Instance PouchDB locale
    db: null,
    
    // Référence à la base distante CouchDB
    remoteDb: null,
    
    // Handler de réplication (pour cleanup)
    syncHandler: null,
    
    // Données locales (chargées depuis PouchDB)
    sequences: [],
    
    // Filtres
    filterType: 'all',        // 'all' | 'suivi' | 'relance'
    searchQuery: '',
    
    // État UI
    loading: false,
    error: null,
    
    // État de synchronisation PouchDB (règle #9)
    syncStatus: 'initializing', // 'initializing' | 'connected' | 'syncing' | 'paused' | 'error' | 'disconnected'
    lastSyncAt: null,
    pendingChanges: 0,
    
    // Conflits de réplication
    conflicts: [],
    
    // Modals
    showNewSequenceModal: false,
    showEditSequenceModal: false,
    showDeleteModal: false,
    editingSequence: null,
    deletingSequence: null,
    
    // Nouvelle séquence (pour création)
    newSequence: {
      name: '',
      description: '',
      sequence_type: 'relance',
      niveau: 1,
      emails: []
    },
    
    // ========================================
    // INITIALISATION
    // ========================================
    
    async init() {
      /**
       * @action Initialiser le composant, créer la base PouchDB et démarrer la réplication live
       * @checkpoint pouchdb-component-initialized
       * 
       * Pattern local-first : lecture depuis PouchDB local, écritures vers PouchDB
       * Réplication bidirectionnelle automatique vers CouchDB
       */
      console.log('[CHECKPOINT] filter-all-pouchdb-component-initialized');
      
      try {
        this.loading = true;
        this.syncStatus = 'initializing';
        
        // 1. Initialiser PouchDB locale (règle #1)
        await this.initPouchDB();
        
        // 2. Créer les vues Mango si elles n'existent pas (règle #5)
        await this.createDesignDocs();
        
        // 3. Démarrer la réplication live vers CouchDB (règle #3)
        await this.startLiveReplication();
        
        // 4. Charger les données depuis PouchDB local (règle #6)
        await this.loadSequences();
        
        this.syncStatus = 'connected';
        console.log('[CHECKPOINT] pouchdb-ready-all-sequences');
        
      } catch (err) {
        console.error('[ERROR] Initialisation PouchDB:', err);
        this.error = err.message;
        this.syncStatus = 'error';
      } finally {
        this.loading = false;
      }
    },
    
    // ========================================
    // POUCHDB INITIALIZATION
    // ========================================
    
    async initPouchDB() {
      /**
       * @action Initialiser les connexions PouchDB local et distant
       * @checkpoint pouchdb-connections-established
       */
      
      // Créer la base locale
      this.db = new PouchDB(POUCHDB_CONFIG.localDbName);
      
      // Référence à la base distante
      this.remoteDb = POUCHDB_CONFIG.remoteDbUrl;
      
      console.log('[CHECKPOINT] pouchdb-connections-established, local:', POUCHDB_CONFIG.localDbName);
    },
    
    async createDesignDocs() {
      /**
       * @action Créer les _design documents pour les vues Mango (règle #5)
         * @checkpoint design-docs-created
       */
      try {
        // Design document pour indexer les séquences par type
        const designDoc = {
          _id: '_design/sequences',
          views: {
            by_type: {
              map: function(doc) {
                if (doc.type === 'sequence') {
                  emit(doc.sequence_type, doc);
                }
              }.toString()
            },
            by_niveau: {
              map: function(doc) {
                if (doc.type === 'sequence') {
                  emit(doc.niveau, doc);
                }
              }.toString()
            },
            all_sequences: {
              map: function(doc) {
                if (doc.type === 'sequence') {
                  emit(doc._id, doc);
                }
              }.toString()
            }
          }
        };
        
        try {
          await this.db.put(designDoc);
          console.log('[CHECKPOINT] design-docs-created');
        } catch (err) {
          if (err.status !== 409) throw err;
          // Design doc existe déjà, on met à jour
          const existing = await this.db.get('_design/sequences');
          designDoc._rev = existing._rev;
          await this.db.put(designDoc);
        }
        
      } catch (err) {
        console.warn('[WARN] Création design docs:', err);
      }
    },
    
    startLiveReplication() {
      /**
       * @action Démarrer la synchronisation bidirectionnelle live (règle #3)
       * @checkpoint live-replication-started
       * 
       * Gestion des états offline/online avec events 'paused'/'active' (règle #7)
       * Gestion des conflits (règle #4)
       */
      
      this.syncHandler = this.db.sync(this.remoteDb, POUCHDB_CONFIG.replicationOptions)
        .on('change', (info) => {
          // Changements reçus ou envoyés
          this.syncStatus = 'syncing';
          this.lastSyncAt = new Date().toISOString();
          console.log('[SYNC] Changement détecté:', info);
          
          // Recharger les données si nécessaire
          if (info.direction === 'pull' && info.change.docs.length > 0) {
            this.loadSequences();
          }
        })
        .on('paused', (err) => {
          // Réplication en pause (attente ou erreur réseau)
          this.syncStatus = 'paused';
          if (err) {
            console.log('[SYNC] En pause (erreur réseau possible):', err);
          } else {
            console.log('[SYNC] En pause (à jour)');
          }
        })
        .on('active', () => {
          // Réplication active
          this.syncStatus = 'syncing';
          console.log('[SYNC] Réplication active');
        })
        .on('denied', (err) => {
          // Document rejeté (permissions)
          console.error('[SYNC] Document rejeté:', err);
        })
        .on('complete', (info) => {
          // Réplication terminée (si non-continuous)
          this.syncStatus = 'connected';
          console.log('[SYNC] Complété:', info);
        })
        .on('error', (err) => {
          // Erreur de réplication
          this.syncStatus = 'error';
          console.error('[SYNC] Erreur:', err);
        });
      
      // Écouter les conflits (règle #4)
      this.db.changes({
        since: 'now',
        live: true,
        include_docs: true,
        conflicts: true
      }).on('change', (change) => {
        if (change.doc._conflicts) {
          this.handleConflicts(change.doc);
        }
      });
      
      console.log('[CHECKPOINT] live-replication-started');
    },
    
    // ========================================
    // GESTION DES CONFLITS (règle #4)
    // ========================================
    
    async handleConflicts(doc) {
      /**
       * @action Gérer les conflits de réplication
       * @checkpoint conflicts-detected
       */
      console.log('[CONFLICT] Conflit détecté sur:', doc._id);
      
      try {
        // Récupérer toutes les révisions conflictuelles
        const conflicts = await this.db.get(doc._id, { conflicts: true, include_docs: true });
        
        if (conflicts._conflicts) {
          this.conflicts.push({
            docId: doc._id,
            revisions: conflicts._conflicts,
            current: doc
          });
          
          // Stratégie : résolution manuelle ou automatique
          // Ici on pourrait merger les données ou choisir la dernière version
          console.log('[CONFLICT] Révisions conflictuelles:', conflicts._conflicts);
        }
      } catch (err) {
        console.error('[ERROR] Gestion conflits:', err);
      }
    },
    
    async resolveConflict(docId, winningRev, losingRevs) {
      /**
       * @action Résoudre un conflit en choisissant la version gagnante
       * @checkpoint conflict-resolved
       */
      try {
        // Supprimer les révisions perdantes
        for (const rev of losingRevs) {
          await this.db.remove(docId, rev);
        }
        
        console.log('[CHECKPOINT] conflict-resolved, doc:', docId);
        
        // Recharger les données
        await this.loadSequences();
      } catch (err) {
        console.error('[ERROR] Résolution conflit:', err);
      }
    },
    
    // ========================================
    // CHARGEMENT DONNÉES POUCHDB (règle #6)
    // ========================================
    
    async loadSequences() {
      /**
       * @action Charger toutes les séquences depuis PouchDB local
       * @checkpoint sequences-loaded-from-pouchdb
       * 
       * Pas d'appel API - lecture instantanée depuis IndexedDB
       * Pattern local-first : les données sont toujours lues localement
       */
      try {
        this.loading = true;
        
        // Utiliser la vue Mango pour récupérer toutes les séquences (règle #5)
        const result = await this.db.query('sequences/all_sequences', {
          include_docs: true
        });
        
        this.sequences = result.rows
          .filter(row => row.doc && !row.doc._deleted)
          .map(row => row.doc);
        
        console.log('[CHECKPOINT] sequences-loaded-from-pouchdb,', this.sequences.length, 'séquences');
        
      } catch (err) {
        // Fallback sur allDocs si la vue n'existe pas encore
        const result = await this.db.allDocs({
          include_docs: true,
          startkey: 'sequence_',
          endkey: 'sequence_\ufff0'
        });
        
        this.sequences = result.rows
          .filter(row => row.doc && !row.doc._deleted && row.doc.type === 'sequence')
          .map(row => row.doc);
        
        console.log('[CHECKPOINT] sequences-loaded-from-pouchdb (fallback),', this.sequences.length, 'séquences');
      } finally {
        this.loading = false;
      }
    },
    
    // ========================================
    // FILTRAGE (Client-side, pas d'appel API)
    // ========================================
    
    /**
     * @action Afficher toutes les séquences (réinitialiser le filtre)
     * @checkpoint filter-all-applied
     * 
     * Pas d'appel API - filtrage purement client-side sur les données PouchDB locales
     * Réinitialise filterType à 'all' pour afficher relances et suivis
     */
    filterAll() {
      this.filterType = 'all';
      this.searchQuery = '';
      
      console.log('[CHECKPOINT] filter-all-applied, showing all sequences');
      
      // Le computed filteredSequences se met à jour automatiquement
      // Pas besoin de recharger les données - elles sont déjà en local
    },
    
    /**
     * @action Réinitialiser complètement les filtres
     * @checkpoint filters-reset
     */
    resetFilters() {
      this.filterType = 'all';
      this.searchQuery = '';
      console.log('[CHECKPOINT] filters-reset');
    },
    
    // ========================================
    // COMPUTED - Données filtrées
    // ========================================
    
    get filteredSequences() {
      /**
       * @computed Filtrer les séquences selon les critères actuels
       * @description Pas d'appel API - filtrage client-side sur données PouchDB
       */
      let result = [...this.sequences];
      
      // 1. Filtre par type (si différent de 'all')
      if (this.filterType && this.filterType !== 'all') {
        result = result.filter(seq => seq.sequence_type === this.filterType);
      }
      
      // 2. Filtre par recherche texte
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        result = result.filter(seq => 
          seq.name?.toLowerCase().includes(query) ||
          seq.description?.toLowerCase().includes(query) ||
          seq.emails?.some(email => 
            email.subject?.toLowerCase().includes(query) ||
            email.content?.toLowerCase().includes(query)
          )
        );
      }
      
      // 3. Trier par ordre/niveau
      result.sort((a, b) => (a.niveau || 0) - (b.niveau || 0));
      
      return result;
    },
    
    get sequencesCount() {
      /** Nombre total de séquences */
      return this.sequences.length;
    },
    
    get suiviCount() {
      /** Nombre de séquences de suivi (pour affichage badge) */
      return this.sequences.filter(seq => seq.sequence_type === 'suivi').length;
    },
    
    get relanceCount() {
      /** Nombre de séquences de relance (pour affichage badge) */
      return this.sequences.filter(seq => seq.sequence_type === 'relance').length;
    },
    
    // ========================================
    // POUCHDB WRITE (règle #2, #6)
    // ========================================
    
    async saveSequence(sequenceData) {
      /**
       * @action Sauvegarder une séquence (création ou modification)
       * @checkpoint sequence-saved-to-pouchdb
       * 
       * Écriture locale PouchDB, réplication automatique vers CouchDB
       * Gestion des _id et _rev CouchDB (règle #10)
       */
      try {
        let doc;
        
        if (sequenceData._id) {
          // Modification - récupérer le document existant avec sa _rev
          try {
            doc = await this.db.get(sequenceData._id);
          } catch (err) {
            if (err.status === 404) {
              // Document n'existe pas, créer nouveau
              doc = { _id: sequenceData._id };
            } else {
              throw err;
            }
          }
        } else {
          // Création - générer un nouvel ID CouchDB (règle #10)
          doc = {
            _id: `sequence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          };
        }
        
        const updatedDoc = {
          ...doc,
          ...sequenceData,
          type: 'sequence',
          updated_at: new Date().toISOString()
        };
        
        // Conserver la _rev si elle existe
        if (doc._rev) {
          updatedDoc._rev = doc._rev;
        }
        
        const response = await this.db.put(updatedDoc);
        
        console.log('[CHECKPOINT] sequence-saved-to-pouchdb,', response.id);
        
        // Mettre à jour le tableau local immédiatement (règle #6)
        if (sequenceData._id) {
          const index = this.sequences.findIndex(s => s._id === sequenceData._id);
          if (index !== -1) {
            this.sequences[index] = { ...updatedDoc, _rev: response.rev };
          }
        } else {
          this.sequences.push({ ...updatedDoc, _rev: response.rev });
        }
        
        // Déclencher une sync manuelle pour immédiateté
        this.triggerImmediateSync();
        
        return { success: true, id: response.id, rev: response.rev };
        
      } catch (err) {
        if (err.status === 409) {
          // Conflit - récupérer la dernière révision et réessayer (règle #4)
          console.log('[CONFLICT] Conflit de révision détecté, retry...');
          const latest = await this.db.get(sequenceData._id);
          sequenceData._rev = latest._rev;
          return this.saveSequence(sequenceData);
        }
        throw err;
      }
    },
    
    async deleteSequence(sequenceId) {
      /**
       * @action Supprimer une séquence (soft delete avec flag _deleted)
       * @checkpoint sequence-deleted-from-pouchdb
       * 
       * PouchDB utilise _deleted: true pour le soft delete
       */
      try {
        const doc = await this.db.get(sequenceId);
        doc._deleted = true;
        doc.deleted_at = new Date().toISOString();
        
        await this.db.put(doc);
        
        console.log('[CHECKPOINT] sequence-deleted-from-pouchdb,', sequenceId);
        
        // Mettre à jour le tableau local immédiatement
        this.sequences = this.sequences.filter(s => s._id !== sequenceId);
        
        // Déclencher une sync manuelle
        this.triggerImmediateSync();
        
        return { success: true };
        
      } catch (err) {
        console.error('[ERROR] Suppression séquence:', err);
        return { success: false, error: err.message };
      }
    },
    
    async triggerImmediateSync() {
      /**
       * @action Déclencher une synchronisation immédiate
       * @checkpoint immediate-sync-triggered
       */
      try {
        this.syncStatus = 'syncing';
        await this.db.replicate.to(this.remoteDb, { retry: true });
        this.syncStatus = 'connected';
        this.lastSyncAt = new Date().toISOString();
      } catch (err) {
        console.warn('[SYNC] Sync immédiate échouée:', err);
        this.syncStatus = 'error';
      }
    },
    
    // ========================================
    // CLEANUP
    // ========================================
    
    destroy() {
      /**
       * @action Nettoyer les ressources lors de la destruction du composant
       * @checkpoint component-destroyed
       */
      if (this.syncHandler) {
        this.syncHandler.cancel();
        this.syncHandler = null;
      }
      console.log('[CHECKPOINT] component-destroyed, replication cancelled');
    }
  }));
  
  console.log('[CHECKPOINT] alpine-filter-all-pouchdb-component-registered');
});

// ============================================
// FONCTION UTILITAIRE STANDALONE
// ============================================

/**
 * Fonction utilitaire pour réinitialiser le filtre
 * Peut être utilisée hors Alpine.js si nécessaire
 * 
 * @param {Object} componentInstance - Instance du composant Alpine.js
 * @returns {void}
 */
export function filterAll(componentInstance) {
  /**
   * @utility Réinitialiser le filtre pour afficher toutes les séquences
   * @checkpoint filter-all-executed
   * 
   * Cette fonction est exportée pour usage externe
   */
  if (componentInstance && typeof componentInstance.filterAll === 'function') {
    componentInstance.filterAll();
    console.log('[CHECKPOINT] filter-all-executed');
  } else {
    console.warn('[WARN] Component instance not available for filterAll');
  }
}

/**
 * Fonction utilitaire pour initialiser une base PouchDB standalone
 * 
 * @param {string} localDbName - Nom de la base locale
 * @param {string} remoteDbUrl - URL de la base CouchDB distante
 * @returns {Object} { db, remoteDb, startSync }
 */
export function initPouchDBConnection(localDbName, remoteDbUrl) {
  /**
   * @utility Initialiser une connexion PouchDB/CouchDB
   * @checkpoint pouchdb-connection-utility
   */
  const db = new PouchDB(localDbName);
  
  const startSync = (options = {}) => {
    const syncHandler = db.sync(remoteDbUrl, {
      live: true,
      retry: true,
      conflicts: true,
      ...options
    });
    
    console.log('[CHECKPOINT] pouchdb-connection-utility, sync started');
    return syncHandler;
  };
  
  return { db, remoteDb: remoteDbUrl, startSync };
}

// Export pour usage dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    filterAll,
    initPouchDBConnection
  };
}
