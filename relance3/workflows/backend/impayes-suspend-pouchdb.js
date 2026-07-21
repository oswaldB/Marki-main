/**
 * WORKFLOW : Suspendre Impayé (PouchDB + CouchDB)
 * ===============================================
 * Adaptation du workflow backend impayes-suspend pour PouchDB local-first
 * 
 * RÈGLES IMPLÉMENTÉES:
 * ✓ PouchDB local-first, réplication bidirectionnelle live
 * ✓ Remplacement des API SQLite par db.get, db.put, db.query
 * ✓ Synchronisation bidirectionnelle avec db.sync()
 * ✓ Gestion des conflits (conflicts: true)
 * ✓ Design documents pour vues Mango
 * ✓ Pattern local-first: lectures locales, écritures locales → réplication
 * ✓ Gestion offline/online (events paused/active)
 * ✓ Structure Alpine.js x-data préservée
 * ✓ Propriété syncStatus pour suivre l'état
 * ✓ IDs CouchDB (_id) et révisions (_rev) gérés
 * 
 * @checkpoint wf-init
 * @checkpoint wf-db-ready
 * @checkpoint wf-design-docs
 * @checkpoint wf-sync-active
 * @checkpoint wf-impaye-loaded
 * @checkpoint wf-impaye-suspended
 * @checkpoint wf-relances-cancelled
 * @checkpoint wf-log-created
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
  dbName: 'marki_database',
  options: {
    live: true,        // Réplication continue
    retry: true,       // Reconnexion automatique
    heartbeat: 10000,  // Ping toutes les 10s
    timeout: 30000     // Timeout de 30s
  }
};

// ============================================
// DESIGN DOCUMENTS (Vues Mango pour Impayés et Relances)
// ============================================
const DESIGN_DOCS = [
  {
    _id: '_design/impayes',
    views: {
      // Vue: tous les impayés
      all: {
        map: function(doc) {
          if (doc.type === 'impaye') {
            emit(doc._id, doc);
          }
        }.toString()
      },
      // Vue: impayés par contact_relance_id
      by_contact: {
        map: function(doc) {
          if (doc.type === 'impaye' && doc.contact_relance_id) {
            emit(doc.contact_relance_id, doc);
          }
        }.toString()
      },
      // Vue: impayés blacklistés
      blacklisted: {
        map: function(doc) {
          if (doc.type === 'impaye' && doc.is_blacklisted === 1) {
            emit(doc.blacklist_date, doc);
          }
        }.toString()
      },
      // Vue: impayés actifs (non blacklistés)
      active: {
        map: function(doc) {
          if (doc.type === 'impaye' && !doc.is_blacklisted) {
            emit(doc.createdAt, doc);
          }
        }.toString()
      }
    }
  },
  {
    _id: '_design/relances',
    views: {
      // Vue: toutes les relances
      all: {
        map: function(doc) {
          if (doc.type === 'relance') {
            emit(doc._id, doc);
          }
        }.toString()
      },
      // Vue: relances par contact_id
      by_contact: {
        map: function(doc) {
          if (doc.type === 'relance' && doc.contact_id) {
            emit(doc.contact_id, doc);
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
      },
      // Vue: relances actives (à annuler lors d'une suspension)
      active_by_contact: {
        map: function(doc) {
          if (doc.type === 'relance' && doc.contact_id && 
              ['brouillon', 'pret pour envoi', 'planifiee'].includes(doc.statut)) {
            emit(doc.contact_id, doc);
          }
        }.toString()
      }
    }
  },
  {
    _id: '_design/logs',
    views: {
      // Vue: logs par entité
      by_entity: {
        map: function(doc) {
          if (doc.type === 'log' && doc.entity_type && doc.entity_id) {
            emit([doc.entity_type, doc.entity_id, doc.createdAt], doc);
          }
        }.toString()
      },
      // Vue: logs par action
      by_action: {
        map: function(doc) {
          if (doc.type === 'log' && doc.action) {
            emit(doc.action, doc);
          }
        }.toString()
      }
    }
  }
];

// ============================================
// WORKFLOW SUSPENDRE IMPAYÉ - POUCHDB
// ============================================
function impayesSuspendWorkflow() {
  return {
    // ========================================
    // ÉTAT: Données
    // ========================================
    impaye: null,              // Impayé en cours de suspension
    impayeId: null,            // ID de l'impayé
    contactId: null,           // ID du contact associé
    relancesAnnulees: [],      // Liste des relances annulées
    motif: '',                 // Motif de suspension
    
    // ========================================
    // ÉTAT: Synchronisation (RÈGLE #9)
    // ========================================
    syncStatus: 'initial',     // 'initial' | 'syncing' | 'paused' | 'error' | 'complete'
    isOnline: navigator.onLine,
    lastSync: null,
    pendingChanges: 0,
    conflicts: [],             // Documents en conflit
    
    // ========================================
    // ÉTAT: UI et résultat
    // ========================================
    loading: true,
    processing: false,         // Traitement en cours (suspension)
    error: null,
    successMessage: null,
    result: null,              // Résultat de l'opération
    showConfirmModal: false,   // Modal de confirmation
    
    // ========================================
    // INSTANCES POUCHDB (RÈGLE #1)
    // ========================================
    localDB: null,             // PouchDB local (IndexedDB)
    remoteDB: null,            // PouchDB remote (CouchDB)
    syncHandler: null,         // Handler de réplication
    
    // ========================================
    // INITIALISATION
    // ========================================
    
    /**
     * @action Initialiser PouchDB et démarrer la réplication
     * @param {string} impayeId - ID de l'impayé à suspendre
     * @checkpoint wf-init
     */
    async init(impayeId = null) {
      console.log('[CHECKPOINT] wf-init');
      this.loading = true;
      this.error = null;
      this.impayeId = impayeId;
      
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
        
        // 5. Charger l'impayé si ID fourni (RÈGLE #6)
        if (this.impayeId) {
          await this.loadImpaye(this.impayeId);
          console.log('[CHECKPOINT] wf-impaye-loaded');
        }
        
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
        
        // Si des données arrivent du serveur, recharger l'impayé
        if (info.direction === 'pull' && info.change?.docs?.length > 0) {
          console.log('[SYNC] Données reçues du serveur:', info.change.docs.length);
          if (this.impayeId) {
            this.loadImpaye(this.impayeId);
          }
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
     * @action Étape 1: Charger l'impayé depuis PouchDB local (RÈGLE #6)
     * @checkpoint wf-impaye-loaded
     */
    async loadImpaye(id) {
      console.log('[DATA] Chargement impayé:', id);
      
      try {
        // RÈGLE #6: Lecture depuis PouchDB local (RÈGLE #2: db.get)
        const doc = await this.localDB.get(id, { conflicts: true });
        
        // Vérifier que c'est bien un impayé
        if (doc.type !== 'impaye') {
          throw new Error('Ce document n\'est pas un impayé');
        }
        
        this.impaye = {
          ...doc,
          id: doc._id,  // Alias pour compatibilité
          hasConflicts: !!(doc._conflicts && doc._conflicts.length > 0)
        };
        
        this.contactId = doc.contact_relance_id;
        
        // Alerte si conflits détectés (RÈGLE #4)
        if (doc._conflicts && doc._conflicts.length > 0) {
          console.warn('[CONFLICT] Conflits sur impayé:', id, doc._conflicts);
          this.conflicts.push({
            type: 'impaye',
            id: doc._id,
            rev: doc._rev,
            conflictRevs: doc._conflicts
          });
        }
        
        console.log('[CHECKPOINT] wf-impaye-loaded:', this.impaye._id);
        return this.impaye;
        
      } catch (err) {
        console.error('[DATA] Erreur chargement impayé:', err);
        this.error = err.status === 404 ? 'Impayé non trouvé' : err.message;
        return null;
      }
    },
    
    /**
     * @action Étape 2: Suspendre l'impayé (RÈGLE #2, #6, #10)
     * Marquer is_blacklisted = 1 avec motif
     * @checkpoint wf-impaye-suspended
     */
    async suspendreImpaye(motif = null) {
      console.log('[DATA] Suspension impayé:', this.impayeId);
      
      if (!this.impaye) {
        this.error = 'Aucun impayé chargé';
        return { success: false, error: this.error };
      }
      
      this.processing = true;
      this.error = null;
      
      const motifFinal = motif || this.motif || 'Suspension manuelle';
      
      try {
        // RÈGLE #6: Lire depuis PouchDB local, puis écrire
        const doc = await this.localDB.get(this.impayeId, { conflicts: true });
        
        const updatedDoc = {
          ...doc,
          is_blacklisted: 1,                                   // Marquer comme blacklisté
          blacklist_date: new Date().toISOString(),            // Date de suspension
          blacklist_motif: motifFinal,                          // Motif de suspension
          _id: doc._id,                                         // RÈGLE #10: Conserver l'ID
          _rev: doc._rev,                                       // RÈGLE #10: Conserver la révision
          updatedAt: new Date().toISOString()
        };
        
        // RÈGLE #2: db.put pour mise à jour
        const result = await this.localDB.put(updatedDoc);
        
        console.log('[DATA] Impayé suspendu:', result.id, 'nouvelle rev:', result.rev);
        console.log('[CHECKPOINT] wf-impaye-suspended');
        
        // Mettre à jour l'objet local
        this.impaye = {
          ...updatedDoc,
          id: result.id,
          _rev: result.rev
        };
        
        return {
          success: true,
          id: result.id,
          rev: result.rev                                        // RÈGLE #10: Nouvelle révision
        };
        
      } catch (err) {
        if (err.status === 409) {
          // Conflit de révision (RÈGLE #4)
          console.error('[CONFLICT] Conflit de révision sur impayé:', this.impayeId);
          return await this.handleImpayeConflict(motifFinal);
        }
        console.error('[DATA] Erreur suspension:', err);
        this.error = err.message;
        return { success: false, error: err.message };
      } finally {
        this.processing = false;
      }
    },
    
    /**
     * @action Étape 3: Annuler les relances en cours liées au contact (RÈGLE #2)
     * Annule les relances avec statut 'brouillon', 'pret pour envoi', 'planifiee'
     * @checkpoint wf-relances-cancelled
     */
    async annulerRelancesContact() {
      console.log('[DATA] Annulation relances pour contact:', this.contactId);
      
      if (!this.contactId) {
        console.log('[DATA] Aucun contact associé, pas de relances à annuler');
        return { success: true, relancesAnnulees: 0 };
      }
      
      try {
        // RÈGLE #2: Utiliser la vue Mango pour récupérer les relances actives
        const result = await this.localDB.query('relances/active_by_contact', {
          key: this.contactId,
          include_docs: true,
          conflicts: true  // RÈGLE #4: Détecter les conflits
        });
        
        const relancesToCancel = result.rows.map(row => row.doc);
        console.log('[DATA] Relances à annuler:', relancesToCancel.length);
        
        if (relancesToCancel.length === 0) {
          return { success: true, relancesAnnulees: 0 };
        }
        
        // Annuler chaque relance (mise à jour du statut)
        const cancelPromises = relancesToCancel.map(async (relance) => {
          const updatedRelance = {
            ...relance,
            statut: 'annulee',
            cancelled_at: new Date().toISOString(),
            cancelled_reason: `Annulé suite à la suspension de l'impayé ${this.impayeId}`,
            _id: relance._id,           // RÈGLE #10: Conserver l'ID
            _rev: relance._rev,         // RÈGLE #10: Conserver la révision
            updatedAt: new Date().toISOString()
          };
          
          try {
            const result = await this.localDB.put(updatedRelance);
            return {
              id: relance._id,
              rev: result.rev,
              success: true
            };
          } catch (err) {
            if (err.status === 409) {
              // Conflit de révision
              console.warn('[CONFLICT] Conflit sur relance:', relance._id);
              return { id: relance._id, success: false, conflict: true };
            }
            throw err;
          }
        });
        
        const results = await Promise.all(cancelPromises);
        
        this.relancesAnnulees = results.filter(r => r.success);
        const conflicts = results.filter(r => r.conflict);
        
        console.log('[DATA] Relances annulées:', this.relancesAnnulees.length);
        console.log('[CHECKPOINT] wf-relances-cancelled');
        
        if (conflicts.length > 0) {
          console.warn('[CONFLICT] Conflits sur relances:', conflicts);
        }
        
        return {
          success: true,
          relancesAnnulees: this.relancesAnnulees.length,
          conflicts: conflicts.length > 0 ? conflicts : undefined
        };
        
      } catch (err) {
        console.error('[DATA] Erreur annulation relances:', err);
        return { success: false, error: err.message };
      }
    },
    
    /**
     * @action Étape 4: Créer un log de l'action (RÈGLE #2)
     * @checkpoint wf-log-created
     */
    async creerLog() {
      console.log('[DATA] Création log de suspension');
      
      const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const logDoc = {
        _id: logId,                                    // RÈGLE #10: ID CouchDB
        type: 'log',
        action: 'suspendre_impaye',
        entity_type: 'impaye',
        entity_id: this.impayeId,
        contact_id: this.contactId,
        details: {
          motif: this.impaye?.blacklist_motif,
          relances_annulees: this.relancesAnnulees.length
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      try {
        // RÈGLE #2: db.put pour création
        const result = await this.localDB.put(logDoc);
        
        console.log('[DATA] Log créé:', result.id);
        console.log('[CHECKPOINT] wf-log-created');
        
        return {
          success: true,
          id: result.id,
          rev: result.rev
        };
        
      } catch (err) {
        console.error('[DATA] Erreur création log:', err);
        // Log non critique, on continue
        return { success: false, error: err.message };
      }
    },
    
    // ========================================
    // WORKFLOW COMPLET
    // ========================================
    
    /**
     * @action Workflow complet: suspendre un impayé
     * Orchestration des étapes 1 à 4
     */
    async executeSuspension(motif = null) {
      console.log('[WORKFLOW] Début suspension impayé:', this.impayeId);
      this.processing = true;
      this.error = null;
      this.result = null;
      
      try {
        // Étape 1: Vérifier que l'impayé est chargé
        if (!this.impaye) {
          if (this.impayeId) {
            await this.loadImpaye(this.impayeId);
          } else {
            throw new Error('Aucun impayé spécifié');
          }
        }
        
        // Vérifier si déjà blacklisté
        if (this.impaye.is_blacklisted === 1) {
          throw new Error('Cet impayé est déjà suspendu');
        }
        
        // Étape 2: Suspendre l'impayé
        const suspendResult = await this.suspendreImpaye(motif);
        if (!suspendResult.success) {
          throw new Error(suspendResult.error || 'Erreur lors de la suspension');
        }
        
        // Étape 3: Annuler les relances
        const cancelResult = await this.annulerRelancesContact();
        
        // Étape 4: Créer le log
        await this.creerLog();
        
        // Résultat final
        this.result = {
          impaye_id: this.impayeId,
          relances_annulees: cancelResult.relancesAnnulees || 0,
          motif: this.impaye.blacklist_motif
        };
        
        this.successMessage = `Impayé suspendu et ${cancelResult.relancesAnnulees || 0} relance(s) annulée(s)`;
        
        console.log('[WORKFLOW] Suspension terminée:', this.result);
        console.log('[CHECKPOINT] wf-complete');
        
        return {
          success: true,
          message: this.successMessage,
          data: this.result
        };
        
      } catch (err) {
        console.error('[WORKFLOW] Erreur:', err);
        this.error = err.message;
        console.log('[CHECKPOINT] wf-error');
        return { success: false, error: err.message };
      } finally {
        this.processing = false;
        this.showConfirmModal = false;
      }
    },
    
    /**
     * @action Ouvrir le modal de confirmation
     */
    openConfirmModal(motif = '') {
      this.motif = motif;
      this.showConfirmModal = true;
      this.error = null;
    },
    
    /**
     * @action Fermer le modal de confirmation
     */
    closeConfirmModal() {
      this.showConfirmModal = false;
    },
    
    /**
     * @action Confirmer et exécuter la suspension
     */
    async confirmSuspension() {
      return await this.executeSuspension(this.motif);
    },
    
    // ========================================
    // GESTION DES CONFLITS (RÈGLE #4)
    // ========================================
    
    /**
     * @action Gérer les conflits sur l'impayé (RÈGLE #4)
     */
    async handleImpayeConflict(motif) {
      console.log('[CONFLICT] Résolution conflit pour impayé:', this.impayeId);
      
      try {
        // Récupérer toutes les révisions en conflit
        const doc = await this.localDB.get(this.impayeId, { conflicts: true });
        const conflictRevs = doc._conflicts || [];
        
        if (conflictRevs.length === 0) {
          // Pas de conflit, réessayer simplement
          return await this.suspendreImpaye(motif);
        }
        
        // Stratégie: fusionner en gardant la suspension
        // Si une révision a déjà is_blacklisted = 1, on garde celle-là
        const mergedDoc = {
          ...doc,
          is_blacklisted: 1,
          blacklist_date: doc.blacklist_date || new Date().toISOString(),
          blacklist_motif: doc.blacklist_motif || motif,
          _conflicts: undefined,
          _rev: doc._rev
        };
        
        // Supprimer les révisions en conflit
        for (const conflictRev of conflictRevs) {
          await this.localDB.remove(this.impayeId, conflictRev);
          console.log('[CONFLICT] Révision supprimée:', conflictRev);
        }
        
        // Sauvegarder le document fusionné
        const result = await this.localDB.put(mergedDoc);
        
        console.log('[CONFLICT] Conflit résolu sur impayé:', this.impayeId);
        
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
        
        // Recharger l'impayé si nécessaire
        if (this.impayeId) {
          await this.loadImpaye(this.impayeId);
        }
        
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
    // PROPRIÉTÉS CALCULÉES (RÈGLE #8: Alpine.js)
    // ========================================
    
    // Classe CSS pour l'indicateur de sync (RÈGLE #9)
    get syncStatusClass() {
      const classes = {
        initial: 'bg-gray-400',
        syncing: 'bg-blue-500 animate-pulse',
        paused: this.isOnline ? 'bg-green-500' : 'bg-gray-500',
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
    
    // Statut de l'impayé
    get impayeStatus() {
      if (!this.impaye) return 'inconnu';
      return this.impaye.is_blacklisted === 1 ? 'suspendu' : 'actif';
    },
    
    // Label du statut
    get impayeStatusLabel() {
      const labels = {
        actif: 'Actif',
        suspendu: 'Suspendu',
        inconnu: 'Inconnu'
      };
      return labels[this.impayeStatus];
    },
    
    // Classe CSS du statut
    get impayeStatusClass() {
      const classes = {
        actif: 'bg-green-100 text-green-800',
        suspendu: 'bg-red-100 text-red-800',
        inconnu: 'bg-gray-100 text-gray-800'
      };
      return classes[this.impayeStatus];
    },
    
    // Format de la dernière sync
    get lastSyncFormatted() {
      if (!this.lastSync) return 'Jamais';
      const date = new Date(this.lastSync);
      return date.toLocaleString('fr-FR');
    },
    
    // Peut-on suspendre?
    get canSuspend() {
      return this.impaye && this.impaye.is_blacklisted !== 1 && !this.processing;
    },
    
    // ========================================
    // NETTOYAGE
    // ========================================
    
    /**
     * @action Détruire les instances (appeler au démontage)
     */
    destroy() {
      this.cancelReplication();
      console.log('[POUCHDB] Workflow impayes-suspend détruit');
    },
    
    /**
     * @action Réinitialiser l'état
     */
    reset() {
      this.impaye = null;
      this.impayeId = null;
      this.contactId = null;
      this.relancesAnnulees = [];
      this.motif = '';
      this.error = null;
      this.successMessage = null;
      this.result = null;
      this.showConfirmModal = false;
      this.conflicts = [];
    }
  };
}

// ============================================
// EXPORT
// ============================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    impayesSuspendWorkflow,
    COUCHDB_CONFIG,
    DESIGN_DOCS
  };
}

// Exposer globalement pour Alpine.js (RÈGLE #8)
if (typeof window !== 'undefined') {
  window.impayesSuspendWorkflow = impayesSuspendWorkflow;
  window.COUCHDB_CONFIG = COUCHDB_CONFIG;
  window.DESIGN_DOCS = DESIGN_DOCS;
}
