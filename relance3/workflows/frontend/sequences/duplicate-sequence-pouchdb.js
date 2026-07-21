/**
 * Workflow: duplicate-sequence
 * Adapté pour PouchDB avec réplication CouchDB en temps réel
 * 
 * Pattern local-first : duplication côté client puis réplication vers CouchDB
 * 
 * @checkpoint wf-duplicate-sequence-init
 * @checkpoint wf-duplicate-sequence-confirmed
 * @checkpoint wf-duplicate-sequence-doc-copied
 * @checkpoint wf-duplicate-sequence-saved
 * @checkpoint wf-duplicate-sequence-synced
 * @checkpoint wf-duplicate-sequence-complete
 * @checkpoint wf-duplicate-sequence-error
 */

// ============================================
// CONFIGURATION COUCHDB (partagée)
// ============================================
const COUCHDB_CONFIG = {
  url: window.location.hostname === 'localhost' 
    ? 'http://admin:admin@localhost:5984'
    : 'https://admin:admin@dev.markidiags.com/data',
  dbName: 'marki_sequences',
  options: {
    live: true,
    retry: true,
    heartbeat: 10000,
    timeout: 30000
  }
};

// ============================================
// WORKFLOW DUPLICATE SÉQUENCE - VERSION POUCHDB
// ============================================
function duplicateSequencePouchDBManager() {
  return {
    // ========================================
    // ÉTAT
    // ========================================
    loading: false,
    error: null,
    syncStatus: 'initial', // 'initial' | 'syncing' | 'complete' | 'error'
    isOnline: navigator.onLine,
    
    // ========================================
    // INSTANCES POUCHDB (RÈGLE #1)
    // ========================================
    localDB: null,
    remoteDB: null,
    
    // ========================================
    // INITIALISATION
    // ========================================
    
    /**
     * @action Initialiser PouchDB
     * @checkpoint wf-duplicate-sequence-init
     */
    async init() {
      console.log('[CHECKPOINT] wf-duplicate-sequence-init');
      
      // Initialiser PouchDB local (RÈGLE #1)
      this.localDB = new PouchDB(COUCHDB_CONFIG.dbName);
      
      // Initialiser PouchDB remote pour vérifier la connexion
      const remoteUrl = `${COUCHDB_CONFIG.url}/${COUCHDB_CONFIG.dbName}`;
      this.remoteDB = new PouchDB(remoteUrl, { skip_setup: true });
      
      // Configurer les écouteurs réseau (RÈGLE #7)
      this.setupNetworkListeners();
    },
    
    // ========================================
    // DUPLICATION (RÈGLE #2, #6, #10)
    // ========================================
    
    /**
     * @action Dupliquer une séquence existante
     * @checkpoint wf-duplicate-sequence-confirmed
     * @checkpoint wf-duplicate-sequence-doc-copied
     * @checkpoint wf-duplicate-sequence-saved
     * @checkpoint wf-duplicate-sequence-synced
     * @checkpoint wf-duplicate-sequence-complete
     * @checkpoint wf-duplicate-sequence-error
     * 
     * @param {Object} sequence - La séquence à dupliquer (avec _id et _rev)
     * @param {Function} onSuccess - Callback appelé après succès (reçoit le nouvel ID)
     * @param {Function} onError - Callback appelé en cas d'erreur
     */
    async duplicateSequence(sequence, onSuccess, onError) {
      console.log('[CHECKPOINT] wf-duplicate-sequence-confirmed');
      
      this.loading = true;
      this.error = null;
      this.syncStatus = 'syncing';
      
      try {
        // 1. Récupérer le document complet depuis PouchDB (RÈGLE #2: db.get)
        // RÈGLE #4: Inclure les conflits si présents
        const originalDoc = await this.localDB.get(sequence._id || sequence.id, {
          conflicts: true
        });
        
        console.log('[DUPLICATE] Document original récupéré:', originalDoc._id);
        console.log('[CHECKPOINT] wf-duplicate-sequence-doc-copied');
        
        // 2. Préparer le nouveau document (RÈGLE #10: nouvel _id, pas de _rev)
        const newDoc = {
          ...originalDoc,
          _id: this.generateSequenceId(), // Nouvel ID CouchDB
          _rev: undefined,               // Pas de révision (nouveau doc)
          nom: `Copie de ${originalDoc.nom || originalDoc.name || 'Séquence'}`,
          actif: false,                  // Inactif par défaut
          type_sequence: originalDoc.type_sequence || originalDoc.sequence_type || 'relances',
          emails: originalDoc.emails ? [...originalDoc.emails] : [], // Copie profonde
          validation_obligatoire: originalDoc.validation_obligatoire || false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          duplicated_from: originalDoc._id, // Traçabilité
          duplicated_at: new Date().toISOString()
        };
        
        // Nettoyer les propriétés internes PouchDB/CouchDB
        delete newDoc._rev;
        delete newDoc._conflicts;
        delete newDoc._attachments;
        
        // 3. Sauvegarder dans PouchDB local (RÈGLE #2: db.put, RÈGLE #6)
        const result = await this.localDB.put(newDoc);
        
        console.log('[DUPLICATE] Nouvelle séquence sauvegardée:', result.id);
        console.log('[CHECKPOINT] wf-duplicate-sequence-saved');
        
        // 4. Forcer la synchronisation si online (RÈGLE #3)
        if (this.isOnline) {
          try {
            await this.localDB.replicate.to(this.remoteDB);
            console.log('[SYNC] Duplication synchronisée vers CouchDB');
            this.syncStatus = 'complete';
            console.log('[CHECKPOINT] wf-duplicate-sequence-synced');
          } catch (syncErr) {
            console.warn('[SYNC] Erreur synchro (non bloquant):', syncErr);
            // La réplication live s'en occupera plus tard
          }
        } else {
          console.log('[DUPLICATE] Mode hors ligne - sync différée');
          this.syncStatus = 'paused';
        }
        
        // 5. Construire l'objet résultat
        const duplicatedSequence = {
          ...newDoc,
          id: result.id,
          _rev: result.rev
        };
        
        this.loading = false;
        console.log('[CHECKPOINT] wf-duplicate-sequence-complete');
        
        // 6. Notification succès
        if (typeof Alpine !== 'undefined' && Alpine.store('ui')) {
          Alpine.store('ui').addToast('Séquence dupliquée avec succès', 'success');
        }
        
        // 7. Callback succès
        if (onSuccess && typeof onSuccess === 'function') {
          onSuccess(duplicatedSequence);
        }
        
        return {
          success: true,
          data: duplicatedSequence,
          id: result.id,
          rev: result.rev
        };
        
      } catch (err) {
        console.error('[CHECKPOINT] wf-duplicate-sequence-error', err);
        
        this.loading = false;
        this.syncStatus = 'error';
        this.error = err.message;
        
        // Notification erreur
        if (typeof Alpine !== 'undefined' && Alpine.store('ui')) {
          Alpine.store('ui').addToast(`Erreur: ${err.message}`, 'error');
        }
        
        // Callback erreur
        if (onError && typeof onError === 'function') {
          onError(err);
        }
        
        return {
          success: false,
          error: err.message,
          status: err.status
        };
      }
    },
    
    /**
     * @action Générer un ID CouchDB unique (RÈGLE #10)
     */
    generateSequenceId() {
      // Format: sequence_<timestamp>_<random>
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 9);
      return `sequence_${timestamp}_${random}`;
    },
    
    /**
     * @action Dupliquer avec confirmation utilisateur
     */
    async duplicateSequenceWithConfirm(sequence, onSuccess, onError) {
      const nom = sequence.nom || sequence.name || 'cette séquence';
      
      if (!confirm(`Dupliquer la séquence "${nom}" ?`)) {
        return { success: false, cancelled: true };
      }
      
      return await this.duplicateSequence(sequence, onSuccess, onError);
    },
    
    /**
     * @action Dupliquer et rediriger vers l'édition
     */
    async duplicateAndEdit(sequence) {
      return await this.duplicateSequence(
        sequence,
        (newSequence) => {
          // Redirection vers la page d'édition
          const editUrl = `/sequences-relance-detail.html?id=${newSequence.id}`;
          console.log('[DUPLICATE] Redirection vers:', editUrl);
          window.location.href = editUrl;
        },
        (err) => {
          console.error('[DUPLICATE] Échec:', err);
        }
      );
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
    
    /**
     * @action Vérifier si une séquence existe
     */
    async sequenceExists(id) {
      try {
        await this.localDB.get(id);
        return true;
      } catch (err) {
        if (err.status === 404) return false;
        throw err;
      }
    },
    
    /**
     * @action Récupérer une séquence par ID
     */
    async getSequence(id) {
      try {
        const doc = await this.localDB.get(id);
        return { ...doc, id: doc._id };
      } catch (err) {
        console.error('[GET] Erreur:', err);
        return null;
      }
    }
  };
}

// ============================================
// VERSION ALPINE.JS INTÉGRÉE (RÈGLE #8)
// ============================================

/**
 * Fonction utilitaire pour Alpine.js x-data
 * Usage: x-data="duplicateSequenceComponent()"
 */
function duplicateSequenceComponent() {
  const manager = duplicateSequencePouchDBManager();
  
  return {
    // État Alpine.js
    loading: false,
    error: null,
    syncStatus: 'initial',
    
    // Initialisation
    async init() {
      await manager.init();
      this.syncStatus = manager.syncStatus;
    },
    
    /**
     * @action Dupliquer une séquence (intégration Alpine.js)
     */
    async duplicateSequence(sequence) {
      // Mettre à jour l'état local
      this.loading = true;
      this.error = null;
      
      const result = await manager.duplicateSequence(
        sequence,
        (newSequence) => {
          // Succès : rediriger
          window.location.href = `/sequences-relance-detail.html?id=${newSequence.id}`;
        },
        (err) => {
          // Erreur : afficher
          this.error = err.message;
          this.loading = false;
        }
      );
      
      // Mettre à jour l'état si pas de redirection
      if (!result.success || result.cancelled) {
        this.loading = false;
      }
      this.syncStatus = manager.syncStatus;
      
      return result;
    },
    
    /**
     * @action Dupliquer avec confirmation
     */
    async duplicateSequenceWithConfirm(sequence) {
      const nom = sequence.nom || sequence.name || 'cette séquence';
      
      if (!confirm(`Dupliquer la séquence "${nom}" ?`)) {
        return;
      }
      
      return await this.duplicateSequence(sequence);
    },
    
    // Propriétés calculées
    get isLoading() {
      return this.loading;
    },
    
    get hasError() {
      return this.error !== null;
    },
    
    get syncStatusLabel() {
      const labels = {
        initial: 'Prêt',
        syncing: 'Synchronisation...',
        complete: 'Synchronisé',
        paused: 'Hors ligne',
        error: 'Erreur'
      };
      return labels[this.syncStatus] || 'Inconnu';
    }
  };
}

// ============================================
// EXPORT (RÈGLE #8)
// ============================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    duplicateSequencePouchDBManager,
    duplicateSequenceComponent,
    COUCHDB_CONFIG
  };
}

if (typeof window !== 'undefined') {
  window.duplicateSequencePouchDBManager = duplicateSequencePouchDBManager;
  window.duplicateSequenceComponent = duplicateSequenceComponent;
  window.COUCHDB_CONFIG = COUCHDB_CONFIG;
}
