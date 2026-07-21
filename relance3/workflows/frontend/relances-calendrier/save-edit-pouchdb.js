/**
 * Workflow: save-edit (relances-calendrier)
 * Adapté pour PouchDB avec réplication CouchDB en temps réel
 * 
 * Pattern local-first : lectures depuis PouchDB local, écritures vers PouchDB
 * Synchronisation bidirectionnelle live avec gestion des conflits
 * 
 * @checkpoint wf-save-edit-init
 * @checkpoint wf-save-edit-validation
 * @checkpoint wf-save-edit-pouchdb-ready
 * @checkpoint wf-save-edit-local-update
 * @checkpoint wf-save-edit-sync-remote
 * @checkpoint wf-save-edit-calendar-refresh
 * @checkpoint wf-save-edit-complete
 * @checkpoint wf-save-edit-error
 * @checkpoint wf-save-edit-conflict
 */

// ============================================
// CONFIGURATION COUCHDB
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
// DESIGN DOCUMENTS (Vues Mango pour les relances)
// ============================================
const DESIGN_DOCS = [
  {
    _id: '_design/relances',
    views: {
      // Toutes les relances
      all: {
        map: function(doc) {
          if (doc.type === 'relance') {
            emit(doc._id, doc);
          }
        }.toString()
      },
      // Par date d'envoi (pour le calendrier)
      by_date_envoi: {
        map: function(doc) {
          if (doc.type === 'relance' && doc.date_envoi) {
            emit(doc.date_envoi, doc);
          }
        }.toString()
      },
      // Par statut
      by_statut: {
        map: function(doc) {
          if (doc.type === 'relance' && doc.statut) {
            emit(doc.statut, doc);
          }
        }.toString()
      },
      // Par mois/année (pour le calendrier)
      by_month: {
        map: function(doc) {
          if (doc.type === 'relance' && doc.date_envoi) {
            const date = new Date(doc.date_envoi);
            const monthKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
            emit(monthKey, doc);
          }
        }.toString()
      },
      // Relances programmées (futures)
      programmees: {
        map: function(doc) {
          if (doc.type === 'relance' && doc.date_envoi) {
            const now = new Date().toISOString();
            if (doc.date_envoi >= now && doc.statut !== 'annulee') {
              emit(doc.date_envoi, doc);
            }
          }
        }.toString()
      }
    }
  },
  {
    _id: '_design/relances_stats',
    views: {
      stats: {
        map: function(doc) {
          if (doc.type === 'relance') {
            emit('total', 1);
            if (doc.statut) emit('statut_' + doc.statut, 1);
            
            const now = new Date().toISOString();
            if (doc.date_envoi >= now) emit('futures', 1);
            if (doc.date_envoi < now) emit('passees', 1);
          }
        }.toString(),
        reduce: '_count'
      }
    }
  }
];

// ============================================
// WORKFLOW SAVE EDIT - VERSION POUCHDB
// ============================================
function relancesSaveEditManager() {
  return {
    // ========================================
    // ÉTAT: Données
    // ========================================
    relances: [],
    relancesProgrammees: [],
    relancesDuJour: [],
    
    // ========================================
    // ÉTAT: Édition
    // ========================================
    editingItem: null,
    selectedRelance: null,
    
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
    saving: false,
    error: null,
    
    // ========================================
    // ÉTAT: Calendrier
    // ========================================
    currentDate: new Date(),
    viewMode: 'month', // 'month', 'week', 'day'
    selectedDate: null,
    
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
     * @action Initialiser PouchDB
     * @checkpoint wf-save-edit-init
     */
    async init() {
      console.log('[CHECKPOINT] wf-save-edit-init');
      
      try {
        // Initialiser PouchDB local (RÈGLE #1)
        this.localDB = new PouchDB(COUCHDB_CONFIG.dbName);
        
        // Initialiser PouchDB remote (RÈGLE #1)
        const remoteUrl = `${COUCHDB_CONFIG.url}/${COUCHDB_CONFIG.dbName}`;
        this.remoteDB = new PouchDB(remoteUrl, { skip_setup: true });
        
        console.log('[CHECKPOINT] wf-save-edit-pouchdb-ready');
        
        // Créer les design documents (RÈGLE #5)
        await this.ensureDesignDocs();
        
        // Configurer la réplication (RÈGLE #3)
        await this.setupReplication();
        
        // Charger les données
        await this.loadRelances();
        
        // Configurer les écouteurs réseau (RÈGLE #7)
        this.setupNetworkListeners();
        
      } catch (err) {
        console.error('[CHECKPOINT] wf-save-edit-error', err);
        this.error = err.message;
        this.syncStatus = 'error';
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
            await this.localDB.put({
              ...doc,
              _rev: existing._rev
            });
          }
        } catch (err) {
          if (err.status === 404) {
            await this.localDB.put(doc);
          }
        }
      }
    },
    
    /**
     * @action Configurer la réplication (RÈGLE #3)
     */
    async setupReplication() {
      this.syncStatus = 'syncing';
      
      this.syncHandler = this.localDB.sync(this.remoteDB, {
        live: COUCHDB_CONFIG.options.live,
        retry: COUCHDB_CONFIG.options.retry,
        heartbeat: COUCHDB_CONFIG.options.heartbeat,
        timeout: COUCHDB_CONFIG.options.timeout
      })
      .on('change', (info) => {
        this.pendingChanges = info.change?.pending || 0;
        
        // Recharger si des changements arrivent du serveur
        if (info.direction === 'pull' && info.change?.docs?.length > 0) {
          this.loadRelances();
          this.refreshCalendar();
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
        this.syncStatus = 'error';
      })
      .on('complete', () => {
        this.syncStatus = 'complete';
        this.lastSync = new Date().toISOString();
      })
      .on('error', (err) => {
        this.syncStatus = 'error';
        this.isOnline = false;
      });
    },
    
    /**
     * @action Charger les relances depuis PouchDB (RÈGLE #2, #6)
     */
    async loadRelances() {
      try {
        // Utiliser db.query avec vue Mango (RÈGLE #2)
        const result = await this.localDB.query('relances/by_date_envoi', {
          include_docs: true,
          conflicts: true // RÈGLE #4
        });
        
        // Mapper avec _id et _rev (RÈGLE #10)
        this.relances = result.rows.map(row => ({
          ...row.doc,
          id: row.doc._id,
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
        
        // Mettre à jour les relances programmées
        this.updateRelancesProgrammees();
        
      } catch (err) {
        console.error('Erreur chargement relances:', err);
        // Fallback: allDocs
        const allDocs = await this.localDB.allDocs({
          include_docs: true,
          conflicts: true
        });
        
        this.relances = allDocs.rows
          .filter(row => row.doc.type === 'relance')
          .map(row => ({
            ...row.doc,
            id: row.doc._id,
            hasConflicts: !!(row.doc._conflicts && row.doc._conflicts.length > 0)
          }));
        
        this.updateRelancesProgrammees();
      }
    },
    
    /**
     * @action Mettre à jour les relances programmées
     */
    updateRelancesProgrammees() {
      const now = new Date().toISOString();
      this.relancesProgrammees = this.relances.filter(r => 
        r.date_envoi >= now && r.statut !== 'annulee'
      );
    },
    
    // ========================================
    // SAUVEGARDE (RÈGLE #2, #6)
    // ========================================
    
    /**
     * @action Sauvegarder les modifications de la relance
     * @checkpoint wf-save-edit-validation
     * @checkpoint wf-save-edit-local-update
     * @checkpoint wf-save-edit-sync-remote
     * @checkpoint wf-save-edit-complete
     */
    async saveEdit() {
      console.log('[CHECKPOINT] wf-save-edit-init');
      
      // 1. Validation (RÈGLE #8: structure Alpine.js)
      if (!this.validateForm()) {
        console.log('[CHECKPOINT] wf-save-edit-validation: failed');
        return;
      }
      
      console.log('[CHECKPOINT] wf-save-edit-validation: success');
      
      // 2. Set saving state
      this.saving = true;
      this.loading = true;
      this.error = null;
      
      try {
        // 3. Préparer les données
        const id = this.editingItem._id || this.editingItem.id;
        
        if (!id) {
          throw new Error('ID de relance manquant');
        }
        
        console.log('[CHECKPOINT] wf-save-edit-local-update', { id });
        
        // 4. Récupérer le document existant (RÈGLE #2: db.get)
        const doc = await this.localDB.get(id, { conflicts: true });
        
        // 5. Vérifier les conflits (RÈGLE #4)
        if (doc._conflicts && doc._conflicts.length > 0) {
          console.warn('[CONFLICT] Conflits détectés:', doc._conflicts);
          // Résoudre les conflits automatiquement
          const result = await this.handleConflict(id, this.editingItem);
          if (result.success) {
            this.editingItem._rev = result.rev;
          }
        }
        
        // 6. Préparer le document mis à jour (RÈGLE #10)
        const updatedDoc = {
          ...doc,
          ...this.editingItem,
          _id: doc._id,           // RÈGLE #10: conserver l'ID
          _rev: doc._rev,         // RÈGLE #10: conserver la révision
          type: 'relance',
          updated_at: new Date().toISOString()
        };
        
        // Nettoyer les propriétés ajoutées par Alpine
        delete updatedDoc.id;
        delete updatedDoc.hasConflicts;
        
        // 7. Sauvegarder dans PouchDB local (RÈGLE #2: db.put, RÈGLE #6)
        const result = await this.localDB.put(updatedDoc);
        
        console.log('[CHECKPOINT] wf-save-edit-local-update: success', {
          id: result.id,
          rev: result.rev
        });
        
        // 8. Synchroniser vers CouchDB si en ligne (RÈGLE #3)
        if (this.isOnline) {
          console.log('[CHECKPOINT] wf-save-edit-sync-remote');
          await this.syncToRemote();
        }
        
        // 9. Mettre à jour le tableau local
        const index = this.relances.findIndex(r => r._id === result.id);
        if (index !== -1) {
          this.relances[index] = {
            ...this.relances[index],
            ...this.editingItem,
            _rev: result.rev,
            updated_at: updatedDoc.updated_at
          };
        }
        
        // 10. Rafraîchir le calendrier
        this.updateRelancesProgrammees();
        this.refreshCalendar();
        
        console.log('[CHECKPOINT] wf-save-edit-calendar-refresh');
        
        // 11. Fermer le modal
        this.selectedRelance = false;
        this.editingItem = null;
        
        // 12. Notification (Alpine store)
        if (typeof Alpine !== 'undefined' && Alpine.store('ui')) {
          Alpine.store('ui').addToast('Modifications sauvegardées', 'success');
        }
        
        console.log('[CHECKPOINT] wf-save-edit-complete');
        
      } catch (error) {
        console.error('[CHECKPOINT] wf-save-edit-error', error);
        
        // Gestion spécifique des conflits (RÈGLE #4)
        if (error.status === 409) {
          console.log('[CHECKPOINT] wf-save-edit-conflict');
          this.error = 'Le document a été modifié par ailleurs. Rechargement...';
          await this.handleConflictAndReload(this.editingItem._id || this.editingItem.id);
        } else {
          this.error = error.message;
          if (typeof Alpine !== 'undefined' && Alpine.store('ui')) {
            Alpine.store('ui').addToast(error.message, 'error');
          }
        }
        
      } finally {
        this.saving = false;
        this.loading = false;
      }
    },
    
    /**
     * @action Valider le formulaire
     * @checkpoint wf-save-edit-validation
     */
    validateForm() {
      if (!this.editingItem) return false;
      
      // Validation des champs obligatoires
      if (!this.editingItem.objet || this.editingItem.objet.trim() === '') {
        this.error = 'L\'objet est obligatoire';
        return false;
      }
      
      if (!this.editingItem.date_envoi) {
        this.error = 'La date d\'envoi est obligatoire';
        return false;
      }
      
      return true;
    },
    
    /**
     * @action Synchroniser vers CouchDB (RÈGLE #3)
     * @checkpoint wf-save-edit-sync-remote
     */
    async syncToRemote() {
      try {
        this.syncStatus = 'syncing';
        
        const result = await this.localDB.replicate.to(this.remoteDB, {
          timeout: 30000
        });
        
        console.log('[SYNC] Push vers CouchDB:', result);
        this.syncStatus = 'complete';
        this.lastSync = new Date().toISOString();
        
        return result;
      } catch (err) {
        console.error('[SYNC] Erreur push:', err);
        this.syncStatus = 'error';
        throw err;
      }
    },
    
    /**
     * @action Gestion des conflits (RÈGLE #4)
     */
    async handleConflict(docId, localUpdates) {
      console.log('[CONFLICT] Résolution conflit pour:', docId);
      
      try {
        const doc = await this.localDB.get(docId, { conflicts: true });
        const conflictRevs = doc._conflicts || [];
        
        if (conflictRevs.length === 0) {
          return { success: true, noConflict: true };
        }
        
        // Récupérer les révisions en conflit
        const conflictingDocs = await Promise.all(
          conflictRevs.map(rev => this.localDB.get(docId, { rev }))
        );
        
        // Stratégie de fusion: garder les données locales avec timestamp
        const mergedDoc = {
          ...doc,
          ...localUpdates,
          _rev: doc._rev,
          resolved_at: new Date().toISOString(),
          _conflicts: undefined
        };
        
        // Supprimer les anciennes révisions
        for (const conflictRev of conflictRevs) {
          await this.localDB.remove(docId, conflictRev);
        }
        
        // Sauvegarder la version fusionnée
        const result = await this.localDB.put(mergedDoc);
        
        console.log('[CONFLICT] Conflit résolu:', docId);
        
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
    
    /**
     * @action Recharger après conflit
     */
    async handleConflictAndReload(docId) {
      try {
        const doc = await this.localDB.get(docId, { conflicts: true });
        
        // Mettre à jour editingItem avec les données du serveur
        this.editingItem = {
          ...doc,
          id: doc._id,
          hasConflicts: !!(doc._conflicts && doc._conflicts.length > 0)
        };
        
        this.error = 'Document rechargé avec la dernière version. Veuillez vérifier vos modifications.';
        
      } catch (err) {
        this.error = 'Impossible de résoudre le conflit: ' + err.message;
      }
    },
    
    // ========================================
    // CALENDRIER
    // ========================================
    
    /**
     * @action Rafraîchir l'affichage du calendrier
     * @checkpoint wf-save-edit-calendar-refresh
     */
    refreshCalendar() {
      // Filtrer les relances pour le mois/la vue courante
      this.updateRelancesProgrammees();
      
      // Mettre à jour les relances du jour sélectionné
      if (this.selectedDate) {
        this.selectDate(this.selectedDate);
      }
      
      // Forcer le re-render
      this.currentDate = new Date(this.currentDate);
    },
    
    /**
     * @action Sélectionner une date
     */
    selectDate(date) {
      this.selectedDate = date;
      
      const dateStr = new Date(date).toISOString().split('T')[0];
      
      this.relancesDuJour = this.relances.filter(r => {
        if (!r.date_envoi) return false;
        const relanceDate = r.date_envoi.split('T')[0];
        return relanceDate === dateStr;
      });
    },
    
    /**
     * @action Ouvrir le modal d'édition
     */
    openEditModal(relance) {
      this.selectedRelance = relance;
      this.editingItem = { ...relance };
    },
    
    /**
     * @action Fermer le modal
     */
    closeEditModal() {
      this.selectedRelance = false;
      this.editingItem = null;
      this.error = null;
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
    // PROPRIÉTÉS CALCULÉES (RÈGLE #8)
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
        error: 'Erreur de sync',
        complete: 'Synchronisé'
      };
      return labels[this.syncStatus] || 'Inconnu';
    },
    
    get canSave() {
      return !this.saving && !this.loading && this.editingItem;
    },
    
    get hasConflicts() {
      return this.conflicts.length > 0;
    },
    
    get isEditing() {
      return this.selectedRelance !== false && this.selectedRelance !== null;
    }
  };
}

// ============================================
// EXPORT (RÈGLE #8)
// ============================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    relancesSaveEditManager,
    COUCHDB_CONFIG,
    DESIGN_DOCS
  };
}

if (typeof window !== 'undefined') {
  window.relancesSaveEditManager = relancesSaveEditManager;
  window.COUCHDB_CONFIG = COUCHDB_CONFIG;
  window.DESIGN_DOCS = DESIGN_DOCS;
}
