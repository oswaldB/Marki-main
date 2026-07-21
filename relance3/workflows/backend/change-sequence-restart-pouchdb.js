/**
 * WORKFLOW FRONTEND - Change Sequence Restart Mode (PouchDB + CouchDB)
 * ====================================================================
 * Adaptation du workflow backend change-sequence-restart.md pour PouchDB local-first
 * 
 * RÈGLES IMPLÉMENTÉES:
 * ✓ PouchDB côté frontend avec réplication live vers CouchDB
 * ✓ Remplacement des appels API par opérations PouchDB (db.get, db.put, db.query, etc.)
 * ✓ Synchronisation bidirectionnelle avec db.sync()
 * ✓ Gestion des conflits (conflicts: true)
 * ✓ Design documents pour les vues Mango
 * ✓ Pattern local-first : lectures depuis PouchDB local, écritures vers PouchDB
 * ✓ Gestion offline/online avec events 'paused'/'active'
 * ✓ Structure Alpine.js x-data conservée
 * ✓ Propriété 'syncStatus' pour suivre l'état de la sync
 * ✓ IDs CouchDB (_id) et révisions (_rev) appropriés
 * 
 * @checkpoint cs-init
 * @checkpoint cs-db-ready
 * @checkpoint cs-design-docs
 * @checkpoint cs-sync-active
 * @checkpoint cs-impaye-verified
 * @checkpoint cs-sequence-verified
 * @checkpoint cs-old-relances-deleted
 * @checkpoint cs-impaye-updated
 * @checkpoint cs-relances-created
 * @checkpoint cs-event-logged
 * @checkpoint cs-transaction-committed
 * @checkpoint cs-complete
 * @checkpoint cs-error
 */

// ============================================
// CONFIGURATION COUCHDB
// ============================================
const CS_COUCHDB_CONFIG = {
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
// DESIGN DOCUMENTS (Vues Mango)
// ============================================
const CS_DESIGN_DOCS = [
  {
    _id: '_design/changeSequence',
    views: {
      // Vue: impayé par ID
      impaye_by_id: {
        map: function(doc) {
          if (doc.type === 'impaye') {
            emit(doc._id, doc);
          }
        }.toString()
      },
      // Vue: séquences actives
      sequences_actives: {
        map: function(doc) {
          if (doc.type === 'sequence' && doc.actif === true) {
            emit(doc._id, doc);
          }
        }.toString()
      },
      // Vue: relances par impayé
      relances_by_impaye: {
        map: function(doc) {
          if (doc.type === 'relance' && doc.impaye_ids && doc.impaye_ids.length > 0) {
            doc.impaye_ids.forEach(function(impayeId) {
              emit(impayeId, doc);
            });
          }
        }.toString()
      },
      // Vue: relances non envoyées par impayé
      relances_non_envoyees_by_impaye: {
        map: function(doc) {
          if (doc.type === 'relance' && 
              doc.impaye_ids && 
              doc.impaye_ids.length > 0 &&
              doc.statut !== 'Envoyée' && 
              doc.statut !== 'annulee') {
            doc.impaye_ids.forEach(function(impayeId) {
              emit(impayeId, doc);
            });
          }
        }.toString()
      },
      // Vue: événements par entité
      events_by_entity: {
        map: function(doc) {
          if (doc.type === 'event' && doc.entity_type && doc.entity_id) {
            emit([doc.entity_type, doc.entity_id], doc);
          }
        }.toString()
      }
    }
  }
];

// ============================================
// WORKFLOW CHANGE SEQUENCE (POUCHDB)
// ============================================
function changeSequenceRestartWorkflow() {
  return {
    // ========================================
    // ÉTAT: Données
    // ========================================
    impaye: null,
    sequence: null,
    oldRelances: [],
    newRelances: [],
    
    // ========================================
    // ÉTAT: Résultat
    // ========================================
    result: {
      success: false,
      relancesCreated: 0,
      relancesDeleted: 0,
      sequence: null
    },
    
    // ========================================
    // ÉTAT: Synchronisation (RÈGLE #9)
    // ========================================
    syncStatus: 'initial',
    isOnline: navigator.onLine,
    lastSync: null,
    pendingChanges: 0,
    conflicts: [],
    
    // ========================================
    // ÉTAT: UI
    // ========================================
    loading: false,
    error: null,
    successMessage: null,
    currentStep: '',
    
    // ========================================
    // PARAMÈTRES
    // ========================================
    impayeId: '',
    sequenceId: '',
    mode: 'restart',
    
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
     * @action Initialiser PouchDB et démarrer la réplication
     * @checkpoint cs-init
     */
    async init() {
      console.log('[CHECKPOINT] cs-init');
      this.loading = true;
      this.error = null;
      
      try {
        // 1. Initialiser PouchDB local (RÈGLE #1)
        this.localDB = new PouchDB(CS_COUCHDB_CONFIG.dbName);
        console.log('[POUCHDB] Base locale initialisée:', CS_COUCHDB_CONFIG.dbName);
        
        // 2. Initialiser PouchDB remote (RÈGLE #1)
        const remoteUrl = `${CS_COUCHDB_CONFIG.url}/${CS_COUCHDB_CONFIG.dbName}`;
        this.remoteDB = new PouchDB(remoteUrl, { skip_setup: true });
        console.log('[POUCHDB] Base remote initialisée:', remoteUrl);
        
        console.log('[CHECKPOINT] cs-db-ready');
        
        // 3. Créer les design documents (RÈGLE #5)
        await this.ensureDesignDocs();
        console.log('[CHECKPOINT] cs-design-docs');
        
        // 4. Configurer la réplication bidirectionnelle (RÈGLE #3)
        await this.setupReplication();
        console.log('[CHECKPOINT] cs-sync-active');
        
        // 5. Configurer les écouteurs réseau (RÈGLE #7)
        this.setupNetworkListeners();
        
        this.loading = false;
        
      } catch (err) {
        console.error('[CHECKPOINT] cs-error', err);
        this.error = err.message;
        this.syncStatus = 'error';
        this.loading = false;
      }
    },
    
    /**
     * @action Créer/mettre à jour les design documents (RÈGLE #5)
     */
    async ensureDesignDocs() {
      for (const doc of CS_DESIGN_DOCS) {
        try {
          const existing = await this.localDB.get(doc._id);
          if (JSON.stringify(existing.views) !== JSON.stringify(doc.views)) {
            await this.localDB.put({
              ...doc,
              _rev: existing._rev
            });
            console.log('[DESIGN DOC] Mis à jour:', doc._id);
          }
        } catch (err) {
          if (err.status === 404) {
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
      
      this.syncHandler = this.localDB.sync(this.remoteDB, {
        live: CS_COUCHDB_CONFIG.options.live,
        retry: CS_COUCHDB_CONFIG.options.retry,
        heartbeat: CS_COUCHDB_CONFIG.options.heartbeat,
        timeout: CS_COUCHDB_CONFIG.options.timeout
      })
      .on('change', (info) => {
        console.log('[SYNC] Changement:', info);
        this.pendingChanges = info.change?.pending || 0;
        if (info.direction === 'pull' && info.change?.docs?.length > 0) {
          console.log('[SYNC] Données reçues du serveur:', info.change.docs.length);
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
      .on('complete', (info) => {
        console.log('[SYNC] Réplication complète:', info);
        this.syncStatus = 'complete';
        this.lastSync = new Date().toISOString();
      })
      .on('error', (err) => {
        console.error('[SYNC] Erreur réplication:', err);
        this.syncStatus = 'error';
        this.isOnline = false;
      });
    },
    
    // ========================================
    // WORKFLOW PRINCIPAL
    // ========================================
    
    /**
     * @action Exécuter le changement de séquence en mode restart
     * @checkpoint cs-init
     */
    async executeChangeSequence(impayeId, sequenceId) {
      this.impayeId = impayeId;
      this.sequenceId = sequenceId;
      this.loading = true;
      this.error = null;
      this.result = { success: false, relancesCreated: 0, relancesDeleted: 0 };
      
      console.log('[WORKFLOW] Démarrage change-sequence-restart');
      console.log('[PARAMS] Impayé:', impayeId, 'Nouvelle séquence:', sequenceId);
      
      try {
        // 1. Vérifier l'impayé (RÈGLE #2: db.get, RÈGLE #6: local-first)
        await this.verifyImpaye();
        console.log('[CHECKPOINT] cs-impaye-verified');
        
        // 2. Vérifier la séquence (RÈGLE #2: db.get)
        await this.verifySequence();
        console.log('[CHECKPOINT] cs-sequence-verified');
        
        // 3. Récupérer les anciennes relances non envoyées (RÈGLE #2: db.query)
        await this.fetchOldRelances();
        
        // 4. Supprimer les anciennes relances (RÈGLE #2: db.remove)
        await this.deleteOldRelances();
        console.log('[CHECKPOINT] cs-old-relances-deleted');
        
        // 5. Mettre à jour l'impayé avec la nouvelle séquence (RÈGLE #2: db.put)
        await this.updateImpaye();
        console.log('[CHECKPOINT] cs-impaye-updated');
        
        // 6. Générer les nouvelles relances (RÈGLE #2: db.put)
        await this.generateNewRelances();
        console.log('[CHECKPOINT] cs-relances-created');
        
        // 7. Créer un événement de log (RÈGLE #2: db.put)
        await this.createEvent();
        console.log('[CHECKPOINT] cs-event-logged');
        
        // 8. Synchroniser avec CouchDB (RÈGLE #3)
        await this.syncToRemote();
        console.log('[CHECKPOINT] cs-transaction-committed');
        
        this.result.success = true;
        this.successMessage = `Séquence mise à jour avec succès. ${this.result.relancesCreated} relance(s) créée(s), ${this.result.relancesDeleted} supprimée(s).`;
        
        console.log('[CHECKPOINT] cs-complete');
        
        return this.result;
        
      } catch (err) {
        console.error('[CHECKPOINT] cs-error:', err);
        this.error = err.message;
        
        // Gérer les conflits (RÈGLE #4)
        if (err.status === 409) {
          return await this.handleConflict(err);
        }
        
        return { success: false, error: err.message };
        
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * @action Vérifier que l'impayé existe (RÈGLE #2: db.get, RÈGLE #6: local-first)
     * @checkpoint cs-impaye-verified
     */
    async verifyImpaye() {
      this.currentStep = 'Vérification de l\'impayé...';
      
      try {
        // RÈGLE #6: Lecture depuis PouchDB local
        this.impaye = await this.localDB.get(this.impayeId, { conflicts: true });
        
        // Vérifier les conflits (RÈGLE #4)
        if (this.impaye._conflicts && this.impaye._conflicts.length > 0) {
          console.warn('[CONFLICT] Conflits détectés sur impayé:', this.impayeId);
        }
        
        console.log('[VERIFY] Impayé trouvé:', this.impaye._id);
        
      } catch (err) {
        if (err.status === 404) {
          throw new Error('Impayé non trouvé');
        }
        throw err;
      }
    },
    
    /**
     * @action Vérifier que la séquence existe et est active (RÈGLE #2: db.get)
     * @checkpoint cs-sequence-verified
     */
    async verifySequence() {
      this.currentStep = 'Vérification de la séquence...';
      
      try {
        // RÈGLE #2: db.get pour récupérer la séquence
        this.sequence = await this.localDB.get(this.sequenceId, { conflicts: true });
        
        // Vérifier que la séquence est active
        if (this.sequence.actif !== true) {
          throw new Error('Séquence invalide ou inactive');
        }
        
        // Vérifier qu'elle a des emails
        const emails = this.sequence.emails_json || [];
        if (!emails || emails.length === 0) {
          throw new Error('Séquence sans emails configurés');
        }
        
        // Vérifier les conflits (RÈGLE #4)
        if (this.sequence._conflicts && this.sequence._conflicts.length > 0) {
          console.warn('[CONFLICT] Conflits détectés sur séquence:', this.sequenceId);
        }
        
        console.log('[VERIFY] Séquence valide:', this.sequence.nom, '-', emails.length, 'emails');
        
      } catch (err) {
        if (err.status === 404) {
          throw new Error('Séquence invalide ou inactive');
        }
        throw err;
      }
    },
    
    /**
     * @action Récupérer les relances non envoyées liées à l'impayé (RÈGLE #2: db.query)
     */
    async fetchOldRelances() {
      this.currentStep = 'Récupération des anciennes relances...';
      
      try {
        // RÈGLE #2: Utiliser la vue Mango pour requêter
        const result = await this.localDB.query('changeSequence/relances_non_envoyees_by_impaye', {
          key: this.impayeId,
          include_docs: true,
          conflicts: true // RÈGLE #4
        });
        
        this.oldRelances = result.rows.map(row => ({
          ...row.doc,
          hasConflicts: !!(row.doc._conflicts && row.doc._conflicts.length > 0)
        }));
        
        console.log('[FETCH] Relances non envoyées trouvées:', this.oldRelances.length);
        
      } catch (err) {
        console.warn('[FETCH] Erreur vue, fallback sur allDocs:', err);
        
        // Fallback: requête manuelle sur tous les documents
        const allDocs = await this.localDB.allDocs({ include_docs: true });
        this.oldRelances = allDocs.rows
          .filter(row => {
            const doc = row.doc;
            return doc.type === 'relance' &&
                   doc.impaye_ids &&
                   doc.impaye_ids.includes(this.impayeId) &&
                   doc.statut !== 'Envoyée' &&
                   doc.statut !== 'annulee';
          })
          .map(row => ({
            ...row.doc,
            hasConflicts: !!(row.doc._conflicts && row.doc._conflicts.length > 0)
          }));
        
        console.log('[FETCH] Relances trouvées (fallback):', this.oldRelances.length);
      }
    },
    
    /**
     * @action Supprimer les anciennes relances (RÈGLE #2: db.remove)
     * @checkpoint cs-old-relances-deleted
     */
    async deleteOldRelances() {
      this.currentStep = 'Suppression des anciennes relances...';
      
      let deletedCount = 0;
      
      for (const relance of this.oldRelances) {
        try {
          // RÈGLE #2: db.remove supprime le document
          // RÈGLE #10: Utilise _id et _rev
          await this.localDB.remove({
            _id: relance._id,
            _rev: relance._rev
          });
          
          deletedCount++;
          console.log('[DELETE] Relance supprimée:', relance._id);
          
        } catch (err) {
          if (err.status === 409) {
            // Conflit lors de la suppression (RÈGLE #4)
            console.warn('[CONFLICT] Conflit lors suppression:', relance._id);
            // Tenter de récupérer la dernière révision et supprimer
            try {
              const latest = await this.localDB.get(relance._id);
              await this.localDB.remove({
                _id: latest._id,
                _rev: latest._rev
              });
              deletedCount++;
            } catch (retryErr) {
              console.error('[DELETE] Échec suppression après retry:', retryErr);
            }
          } else {
            console.error('[DELETE] Erreur suppression:', err);
          }
        }
      }
      
      this.result.relancesDeleted = deletedCount;
      console.log('[CHECKPOINT] cs-old-relances-deleted:', deletedCount, 'relances');
    },
    
    /**
     * @action Mettre à jour l'impayé avec la nouvelle séquence (RÈGLE #2: db.put, RÈGLE #10)
     * @checkpoint cs-impaye-updated
     */
    async updateImpaye() {
      this.currentStep = 'Mise à jour de l\'impayé...';
      
      // Préparer la mise à jour avec _id et _rev conservés (RÈGLE #10)
      const updatedImpaye = {
        ...this.impaye,
        sequence_id: this.sequenceId,
        updatedAt: new Date().toISOString()
        // _id et _rev sont conservés depuis this.impaye
      };
      
      try {
        // RÈGLE #2: db.put pour mise à jour
        const result = await this.localDB.put(updatedImpaye);
        
        // Mettre à jour l'impayé local avec la nouvelle révision
        this.impaye._rev = result.rev;
        
        console.log('[UPDATE] Impayé mis à jour:', this.impayeId, 'nouvelle rev:', result.rev);
        
      } catch (err) {
        if (err.status === 409) {
          // Conflit de révision (RÈGLE #4)
          throw new Error('Conflit de révision sur l\'impayé. Veuillez réessayer.');
        }
        throw err;
      }
    },
    
    /**
     * @action Générer les nouvelles relances (RÈGLE #2: db.put, RÈGLE #10)
     * @checkpoint cs-relances-created
     */
    async generateNewRelances() {
      this.currentStep = 'Génération des nouvelles relances...';
      
      const emails = this.sequence.emails_json || [];
      this.newRelances = [];
      
      for (const emailConfig of emails) {
        const emailIndex = emailConfig.email_index;
        const delai = emailConfig.delai;
        
        // Récupérer le scénario actif
        const scenarios = emailConfig.scenarios || [];
        const scenarioActif = scenarios.find(s => s.active) || scenarios[0];
        
        if (!scenarioActif) {
          console.warn('[GENERATE] Pas de scénario actif pour email_index:', emailIndex);
          continue;
        }
        
        // Calculer la date de programmation
        const dateProgrammation = this.calculateProgrammationDate(
          this.impaye.date_echeance,
          delai
        );
        
        // Créer l'ID CouchDB (RÈGLE #10)
        const relanceId = `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${emailIndex}`;
        
        const relanceDoc = {
          _id: relanceId, // RÈGLE #10: ID CouchDB
          type: 'relance',
          contact_id: this.impaye.payer_id,
          sequence_id: this.sequenceId,
          impaye_ids: [this.impayeId],
          statut: 'brouillon',
          date_programmation: dateProgrammation ? dateProgrammation.toISOString() : null,
          sujet: scenarioActif.objet,
          corps: scenarioActif.corps,
          scenario: scenarioActif.format,
          email_index: emailIndex,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        try {
          // RÈGLE #2: db.put pour créer
          const result = await this.localDB.put(relanceDoc);
          
          this.newRelances.push({
            ...relanceDoc,
            _rev: result.rev
          });
          
          console.log('[GENERATE] Relance créée:', relanceId, 'rev:', result.rev);
          
        } catch (err) {
          console.error('[GENERATE] Erreur création relance:', err);
        }
      }
      
      this.result.relancesCreated = this.newRelances.length;
      this.result.sequence = {
        id: this.sequenceId,
        nom: this.sequence.nom
      };
      
      console.log('[CHECKPOINT] cs-relances-created:', this.newRelances.length, 'relances');
    },
    
    /**
     * @action Créer un événement de log (RÈGLE #2: db.put, RÈGLE #10)
     * @checkpoint cs-event-logged
     */
    async createEvent() {
      this.currentStep = 'Création de l\'événement...';
      
      const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const eventDoc = {
        _id: eventId, // RÈGLE #10: ID CouchDB
        type: 'event',
        event_type: 'sequence',
        titre: `Changement de séquence : ${this.sequence.nom}`,
        description: `Séquence changée en mode 'restart'. ${this.result.relancesCreated} relance(s) créée(s). ${this.result.relancesDeleted} ancienne(s) supprimée(s).`,
        entity_type: 'impaye',
        entity_id: this.impayeId,
        metadata: {
          mode: 'restart',
          old_sequence_id: this.impaye.sequence_id,
          new_sequence_id: this.sequenceId,
          relances_created: this.result.relancesCreated,
          relances_deleted: this.result.relancesDeleted
        },
        icon: 'fa-exchange-alt',
        createdAt: new Date().toISOString()
      };
      
      try {
        await this.localDB.put(eventDoc);
        console.log('[EVENT] Événement créé:', eventId);
        
      } catch (err) {
        // L'événement n'est pas critique, on log juste l'erreur
        console.error('[EVENT] Erreur création événement:', err);
      }
    },
    
    /**
     * @action Synchroniser avec CouchDB (RÈGLE #3)
     * @checkpoint cs-transaction-committed
     */
    async syncToRemote() {
      this.currentStep = 'Synchronisation avec le serveur...';
      
      if (!this.isOnline) {
        console.log('[SYNC] Hors ligne, synchronisation différée');
        this.syncStatus = 'paused';
        return;
      }
      
      this.syncStatus = 'syncing';
      
      try {
        // Forcer une synchronisation immédiate
        const pushResult = await this.localDB.replicate.to(this.remoteDB);
        console.log('[SYNC] Push:', pushResult.docs_written, 'docs');
        
        const pullResult = await this.localDB.replicate.from(this.remoteDB);
        console.log('[SYNC] Pull:', pullResult.docs_written, 'docs');
        
        this.syncStatus = 'complete';
        this.lastSync = new Date().toISOString();
        
        console.log('[CHECKPOINT] cs-transaction-committed');
        
      } catch (err) {
        console.error('[SYNC] Erreur:', err);
        this.syncStatus = 'error';
        // On ne bloque pas le workflow si la sync échoue
      }
    },
    
    // ========================================
    // GESTION DES CONFLITS (RÈGLE #4)
    // ========================================
    
    /**
     * @action Gérer les conflits de réplication
     */
    async handleConflict(error) {
      console.log('[CONFLICT] Gestion du conflit...');
      
      try {
        // Récupérer l'impayé avec ses conflits
        const doc = await this.localDB.get(this.impayeId, { conflicts: true });
        
        if (!doc._conflicts || doc._conflicts.length === 0) {
          return { success: false, error: error.message };
        }
        
        // Stratégie: garder la version locale (dernière modification)
        const winningRev = doc._rev;
        
        // Supprimer les révisions en conflit
        for (const conflictRev of doc._conflicts) {
          try {
            await this.localDB.remove(this.impayeId, conflictRev);
            console.log('[CONFLICT] Révision supprimée:', conflictRev);
          } catch (err) {
            console.error('[CONFLICT] Erreur suppression révision:', err);
          }
        }
        
        // Réessayer l'opération
        return await this.executeChangeSequence(this.impayeId, this.sequenceId);
        
      } catch (err) {
        console.error('[CONFLICT] Erreur gestion conflit:', err);
        return { success: false, error: 'Conflit de réplication non résolu' };
      }
    },
    
    // ========================================
    // UTILITAIRES
    // ========================================
    
    /**
     * @action Calculer la date de programmation
     */
    calculateProgrammationDate(dateEcheanceStr, delaiJours) {
      if (!dateEcheanceStr) return null;
      
      try {
        const dateEcheance = new Date(dateEcheanceStr);
        const dateProg = new Date(dateEcheance);
        dateProg.setDate(dateProg.getDate() + delaiJours);
        return dateProg;
      } catch (err) {
        console.error('[CALC] Erreur calcul date:', err);
        return null;
      }
    },
    
    /**
     * @action Configurer les écouteurs réseau (RÈGLE #7)
     */
    setupNetworkListeners() {
      window.addEventListener('online', () => {
        console.log('[NETWORK] En ligne');
        this.isOnline = true;
        this.syncStatus = 'syncing';
        
        if (this.syncHandler) {
          this.restartReplication();
        }
      });
      
      window.addEventListener('offline', () => {
        console.log('[NETWORK] Hors ligne');
        this.isOnline = false;
        this.syncStatus = 'paused';
      });
    },
    
    /**
     * @action Redémarrer la réplication
     */
    async restartReplication() {
      if (this.syncHandler) {
        this.syncHandler.cancel();
      }
      await this.setupReplication();
    },
    
    /**
     * @action Forcer une synchronisation manuelle
     */
    async forceSync() {
      if (!this.isOnline) {
        return { success: false, error: 'Hors ligne' };
      }
      
      return await this.syncToRemote();
    },
    
    // ========================================
    // PROPRIÉTÉS CALCULÉES (RÈGLE #8: Alpine.js)
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
    
    get isOffline() {
      return !this.isOnline;
    },
    
    get hasError() {
      return !!this.error;
    },
    
    get hasSuccess() {
      return this.result.success;
    },
    
    // ========================================
    // NETTOYAGE
    // ========================================
    
    destroy() {
      if (this.syncHandler) {
        this.syncHandler.cancel();
      }
      console.log('[POUCHDB] ChangeSequence workflow détruit');
    }
  };
}

// ============================================
// EXPORT
// ============================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    changeSequenceRestartWorkflow,
    CS_COUCHDB_CONFIG,
    CS_DESIGN_DOCS
  };
}

// Exposer globalement pour Alpine.js (RÈGLE #8)
if (typeof window !== 'undefined') {
  window.changeSequenceRestartWorkflow = changeSequenceRestartWorkflow;
  window.CS_COUCHDB_CONFIG = CS_COUCHDB_CONFIG;
  window.CS_DESIGN_DOCS = CS_DESIGN_DOCS;
}
