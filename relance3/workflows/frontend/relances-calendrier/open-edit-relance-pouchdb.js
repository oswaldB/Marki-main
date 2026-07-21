/**
 * WORKFLOW: Éditer une relance calendrier - PouchDB + CouchDB
 * ==================================================================
 * Adaptation PouchDB du workflow open-edit-relance
 * 
 * RÈGLES IMPLÉMENTÉES:
 * ✓ PouchDB local-first avec réplication bidirectionnelle live
 * ✓ Remplacement des appels API par db.get, db.put
 * ✓ Synchronisation bidirectionnelle avec db.sync()
 * ✓ Gestion des conflits (conflicts: true)
 * ✓ Design documents pour vues Mango
 * ✓ Pattern local-first : lectures depuis PouchDB local
 * ✓ Gestion des états offline/online (events paused/active)
 * ✓ Structure Alpine.js x-data conservée
 * ✓ Propriété syncStatus pour suivre l'état de la sync
 * ✓ IDs CouchDB (_id) et révisions (_rev) gérés
 * 
 * @checkpoint wf-init
 * @checkpoint wf-db-ready
 * @checkpoint wf-design-docs
 * @checkpoint wf-sync-active
 * @checkpoint wf-relance-loaded
 * @checkpoint wf-modal-opened
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
// DESIGN DOCUMENTS (Vues Mango pour les relances)
// ============================================
const DESIGN_DOCS = [
  {
    _id: '_design/relances',
    views: {
      // Vue: toutes les relances par type
      by_type: {
        map: function(doc) {
          if (doc.type === 'relance') {
            emit(doc._id, doc);
          }
        }.toString()
      },
      // Vue: relances par date programmée
      by_date_programmee: {
        map: function(doc) {
          if (doc.type === 'relance' && doc.dateProgrammee) {
            emit(doc.dateProgrammee, doc);
          }
        }.toString()
      },
      // Vue: relances par statut
      by_statut: {
        map: function(doc) {
          if (doc.type === 'relance' && doc.statut) {
            emit(doc.statut, doc);
          }
        }.toString()
      },
      // Vue: relances par contact
      by_contact: {
        map: function(doc) {
          if (doc.type === 'relance' && doc.contactId) {
            emit(doc.contactId, doc);
          }
        }.toString()
      }
    }
  }
];

// ============================================
// WORKFLOW: Ouvrir l'édition d'une relance
// ============================================
function openEditRelanceWorkflow() {
  return {
    // ========================================
    // ÉTAT: Données de la relance
    // ========================================
    relance: null,           // Document relance en cours d'édition
    relanceOriginal: null,   // Copie pour annulation
    
    // ========================================
    // ÉTAT: Synchronisation (RÈGLE #9)
    // ========================================
    syncStatus: 'initial',   // 'initial' | 'syncing' | 'paused' | 'error' | 'complete'
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
    showModal: false,
    
    // ========================================
    // ÉTAT: Données du formulaire
    // ========================================
    formData: {
      dateProgrammee: '',
      contenu: '',
      statut: ''
    },
    
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
     * @action Initialiser PouchDB et la réplication
     * @checkpoint wf-init
     */
    async init() {
      console.log('[CHECKPOINT] wf-init');
      
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
        
        // 5. Configurer les écouteurs réseau (RÈGLE #7)
        this.setupNetworkListeners();
        
      } catch (err) {
        console.error('[CHECKPOINT] wf-error', err);
        this.error = err.message;
        this.syncStatus = 'error';
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
        
        if (info.direction === 'pull' && info.change?.docs?.length > 0) {
          console.log('[SYNC] Données reçues du serveur');
        }
      })
      .on('paused', (err) => {
        // Réplication en pause (RÈGLE #7)
        console.log('[SYNC] Réplication en pause');
        this.syncStatus = err ? 'error' : 'paused';
        this.lastSync = new Date().toISOString();
      })
      .on('active', () => {
        // Réplication active (RÈGLE #7)
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
    // WORKFLOW PRINCIPAL: Ouvrir l'édition
    // ========================================
    
    /**
     * @action Ouvrir le modal d'édition d'une relance
     * @param {Object} relanceItem - La relance à éditer (peut contenir _id ou id)
     * @checkpoint wf-relance-loaded
     * @checkpoint wf-modal-opened
     */
    async openEditRelance(relanceItem) {
      console.log('[WORKFLOW] Ouvrir édition relance:', relanceItem);
      
      this.loading = true;
      this.error = null;
      this.clearMessages();
      
      try {
        // RÈGLE #6: Lecture depuis PouchDB local
        // RÈGLE #2: Utilisation de db.get
        const relanceId = relanceItem._id || relanceItem.id;
        
        if (!relanceId) {
          throw new Error('ID de relance manquant');
        }
        
        // Charger la relance depuis PouchDB (RÈGLE #2, #6)
        const doc = await this.localDB.get(relanceId, { conflicts: true });
        
        // RÈGLE #10: Gérer les IDs et révisions CouchDB
        this.relance = {
          ...doc,
          id: doc._id,  // Alias pour compatibilité
          hasConflicts: !!(doc._conflicts && doc._conflicts.length > 0)
        };
        
        // Copie pour annulation
        this.relanceOriginal = { ...this.relance };
        
        // RÈGLE #4: Détecter les conflits
        if (doc._conflicts && doc._conflicts.length > 0) {
          console.warn('[CONFLICT] Conflits détectés sur la relance:', doc._conflicts);
          this.conflicts = [{
            id: doc._id,
            rev: doc._rev,
            conflictRevs: doc._conflicts
          }];
        }
        
        console.log('[CHECKPOINT] wf-relance-loaded');
        
        // Initialiser les données du formulaire
        this.formData = {
          dateProgrammee: this.relance.dateProgrammee || '',
          contenu: this.relance.contenu || '',
          statut: this.relance.statut || 'brouillon'
        };
        
        // Ouvrir le modal
        this.showModal = true;
        
        console.log('[CHECKPOINT] wf-modal-opened');
        console.log('[WORKFLOW] Modal ouvert, relance chargée:', this.relance.id);
        
      } catch (err) {
        console.error('[CHECKPOINT] wf-error', err);
        
        if (err.status === 404) {
          this.error = 'Relance non trouvée dans la base locale. Synchronisation en cours...';
          
          // Tentative de rechargement depuis le serveur
          await this.forceSync();
          
          // Réessayer une fois
          try {
            const relanceId = relanceItem._id || relanceItem.id;
            const doc = await this.localDB.get(relanceId);
            this.relance = { ...doc, id: doc._id };
            this.relanceOriginal = { ...this.relance };
            this.formData = {
              dateProgrammee: this.relance.dateProgrammee || '',
              contenu: this.relance.contenu || '',
              statut: this.relance.statut || 'brouillon'
            };
            this.showModal = true;
            this.error = null;
          } catch (retryErr) {
            this.error = 'Impossible de charger la relance. Veuillez réessayer.';
          }
        } else {
          this.error = 'Erreur lors du chargement: ' + err.message;
        }
      } finally {
        this.loading = false;
      }
    },
    
    // ========================================
    // ACTIONS DU MODAL
    // ========================================
    
    /**
     * @action Fermer le modal
     */
    closeModal() {
      this.showModal = false;
      this.relance = null;
      this.relanceOriginal = null;
      this.formData = { dateProgrammee: '', contenu: '', statut: '' };
      this.error = null;
      this.conflicts = [];
      console.log('[WORKFLOW] Modal fermé');
    },
    
    /**
     * @action Annuler les modifications
     */
    cancelEdit() {
      // Restaurer les données originales
      if (this.relanceOriginal) {
        this.formData = {
          dateProgrammee: this.relanceOriginal.dateProgrammee || '',
          contenu: this.relanceOriginal.contenu || '',
          statut: this.relanceOriginal.statut || 'brouillon'
        };
      }
      this.closeModal();
    },
    
    /**
     * @action Sauvegarder les modifications (RÈGLE #2, #6, #10)
     * @checkpoint wf-save-start
     * @checkpoint wf-save-complete
     */
    async saveRelance() {
      if (!this.relance) return;
      
      console.log('[WORKFLOW] Sauvegarde relance...');
      this.loading = true;
      this.error = null;
      
      try {
        console.log('[CHECKPOINT] wf-save-start');
        
        // RÈGLE #6: Lire depuis PouchDB local
        const doc = await this.localDB.get(this.relance._id, { conflicts: true });
        
        // Préparer le document mis à jour
        const updatedDoc = {
          ...doc,
          dateProgrammee: this.formData.dateProgrammee,
          contenu: this.formData.contenu,
          statut: this.formData.statut,
          _id: doc._id,           // RÈGLE #10: Conserver l'ID
          _rev: doc._rev,         // RÈGLE #10: Conserver la révision
          updatedAt: new Date().toISOString(),
          type: 'relance'
        };
        
        // RÈGLE #2: db.put pour mise à jour
        const result = await this.localDB.put(updatedDoc);
        
        console.log('[DATA] Relance mise à jour:', result.id, 'nouvelle rev:', result.rev);
        console.log('[CHECKPOINT] wf-save-complete');
        
        // Mettre à jour l'objet local
        this.relance = {
          ...updatedDoc,
          _rev: result.rev,
          id: result.id
        };
        
        this.successMessage = 'Relance mise à jour avec succès';
        
        // La synchronisation vers CouchDB se fait automatiquement (RÈGLE #3)
        
        // Fermer le modal après un court délai
        setTimeout(() => {
          this.closeModal();
          // Émettre un événement pour rafraîchir le calendrier
          this.emitRefreshEvent();
        }, 500);
        
        return {
          success: true,
          id: result.id,
          rev: result.rev
        };
        
      } catch (err) {
        console.error('[CHECKPOINT] wf-error', err);
        
        if (err.status === 409) {
          // Conflit de révision (RÈGLE #4)
          console.error('[CONFLICT] Conflit de révision sur:', this.relance._id);
          return await this.handleConflictSave();
        }
        
        this.error = 'Erreur lors de la sauvegarde: ' + err.message;
        return { success: false, error: err.message };
        
      } finally {
        this.loading = false;
      }
    },
    
    // ========================================
    // GESTION DES CONFLITS (RÈGLE #4)
    // ========================================
    
    /**
     * @action Gérer les conflits lors de la sauvegarde
     */
    async handleConflictSave() {
      console.log('[CONFLICT] Résolution conflit pour la relance');
      
      try {
        const doc = await this.localDB.get(this.relance._id, { conflicts: true });
        const conflictRevs = doc._conflicts || [];
        
        if (conflictRevs.length === 0) {
          // Pas de conflit détecté, réessayer
          return await this.saveRelance();
        }
        
        // Récupérer les révisions en conflit
        const conflictingDocs = await Promise.all(
          conflictRevs.map(rev => this.localDB.get(this.relance._id, { rev }))
        );
        
        console.log('[CONFLICT] Révisions en conflit:', conflictRevs);
        
        // Stratégie: fusionner en gardant les données du formulaire
        const mergedDoc = {
          ...doc,
          dateProgrammee: this.formData.dateProgrammee,
          contenu: this.formData.contenu,
          statut: this.formData.statut,
          updatedAt: new Date().toISOString(),
          _conflicts: undefined
        };
        
        // Supprimer les révisions en conflit
        for (const rev of conflictRevs) {
          await this.localDB.remove(this.relance._id, rev);
        }
        
        // Sauvegarder le document fusionné
        mergedDoc._rev = doc._rev;
        const result = await this.localDB.put(mergedDoc);
        
        console.log('[CONFLICT] Conflit résolu');
        
        this.successMessage = 'Relance mise à jour (conflit résolu)';
        setTimeout(() => this.closeModal(), 500);
        
        return { success: true, id: result.id, rev: result.rev, resolved: true };
        
      } catch (err) {
        console.error('[CONFLICT] Erreur résolution:', err);
        this.error = 'Conflit de synchronisation. Veuillez rafraîchir et réessayer.';
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
        const pushResult = await this.localDB.replicate.to(this.remoteDB);
        const pullResult = await this.localDB.replicate.from(this.remoteDB);
        
        this.syncStatus = 'complete';
        this.lastSync = new Date().toISOString();
        
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
      }
    },
    
    // ========================================
    // GESTION RÉSEAU (RÈGLE #7)
    // ========================================
    
    /**
     * @action Configurer les écouteurs réseau
     */
    setupNetworkListeners() {
      window.addEventListener('online', () => {
        console.log('[NETWORK] En ligne');
        this.isOnline = true;
        this.syncStatus = 'syncing';
        if (this.syncHandler?.cancel) {
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
    // ÉVÉNEMENTS
    // ========================================
    
    /**
     * @action Émettre un événement de rafraîchissement
     */
    emitRefreshEvent() {
      window.dispatchEvent(new CustomEvent('relance-updated', {
        detail: { relanceId: this.relance?.id }
      }));
    },
    
    // ========================================
    // UTILITAIRES
    // ========================================
    
    clearMessages() {
      this.error = null;
      this.successMessage = null;
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
    
    get isDirty() {
      if (!this.relanceOriginal) return false;
      return (
        this.formData.dateProgrammee !== this.relanceOriginal.dateProgrammee ||
        this.formData.contenu !== this.relanceOriginal.contenu ||
        this.formData.statut !== this.relanceOriginal.statut
      );
    },
    
    get canSave() {
      return this.isDirty && !this.loading && this.formData.dateProgrammee;
    },
    
    get hasError() {
      return !!this.error;
    },
    
    get lastSyncFormatted() {
      if (!this.lastSync) return 'Jamais';
      return new Date(this.lastSync).toLocaleString('fr-FR');
    },
    
    // ========================================
    // NETTOYAGE
    // ========================================
    
    destroy() {
      this.cancelReplication();
      console.log('[POUCHDB] Workflow détruit');
    }
  };
}

// ============================================
// INTEGRATION ALPINE.JS (RÈGLE #8)
// ============================================

/**
 * Utilisation dans le HTML:
 * 
 * <div x-data="openEditRelanceWorkflow()" x-init="init()">
 *   <!-- Indicateur de sync -->
 *   <div :class="syncStatusClass" class="px-2 py-1 rounded text-white text-sm">
 *     <span x-text="syncStatusIcon"></span>
 *     <span x-text="syncStatusLabel"></span>
 *   </div>
 *   
 *   <!-- Bouton d'édition -->
 *   <button 
 *     @click="openEditRelance(relance)" 
 *     :disabled="loading"
 *     class="btn-edit">
 *     Éditer
 *   </button>
 *   
 *   <!-- Modal d'édition -->
 *   <div x-show="showModal" class="modal">
 *     <div x-show="loading" class="loading">Chargement...</div>
 *     
 *     <div x-show="error" class="error" x-text="error"></div>
 *     
 *     <form @submit.prevent="saveRelance()" x-show="relance">
 *       <input type="date" x-model="formData.dateProgrammee" required />
 *       <textarea x-model="formData.contenu"></textarea>
 *       <select x-model="formData.statut">
 *         <option value="brouillon">Brouillon</option>
 *         <option value="programmee">Programmée</option>
 *         <option value="envoyee">Envoyée</option>
 *       </select>
 *       
 *       <button type="button" @click="cancelEdit()">Annuler</button>
 *       <button type="submit" :disabled="!canSave">Sauvegarder</button>
 *     </form>
 *   </div>
 * </div>
 */

// ============================================
// EXPORT
// ============================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    openEditRelanceWorkflow,
    COUCHDB_CONFIG,
    DESIGN_DOCS
  };
}

// Exposer globalement pour Alpine.js (RÈGLE #8)
if (typeof window !== 'undefined') {
  window.openEditRelanceWorkflow = openEditRelanceWorkflow;
  window.COUCHDB_CONFIG_RELANCE = COUCHDB_CONFIG;
  window.DESIGN_DOCS_RELANCE = DESIGN_DOCS;
}
