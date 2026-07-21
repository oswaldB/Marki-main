/**
 * Workflow: close-modal-pouchdb
 * Description: Fermer le modal avec gestion du contexte PouchDB/CouchDB
 * Screen: sequences
 * Architecture: Local-first avec sync bidirectionnelle
 */

// ============================================
// CLOSE MODAL WORKFLOW - POUCHDB VERSION
// ============================================

/**
 * @action closeModal
 * @description Ferme le modal et réinitialise l'état avec gestion PouchDB
 * @checkpoint modal-close-pouchdb-initiated
 *
 * RÈGLES POUCHDB:
 * - Vérifie l'état de synchronisation avant fermeture
 * - Réinitialise les IDs CouchDB (_id, _rev)
 * - Gère le contexte offline/online
 * - Nettoie les changements non sauvegardés
 */

export function closeModal() {
  return {
    // ============================================
    // ÉTAT POUCHDB
    // ============================================
    
    /**
     * @action Vérifier les changements non synchronisés avant fermeture
     * @checkpoint checking-pending-changes
     */
    checkPendingChanges() {
      // Si en mode offline avec changements non synchronisés
      if (this.hasUnsavedChanges && this.syncStatus === 'offline') {
        console.warn('[CHECKPOINT] unsaved-changes-detected-offline', {
          syncStatus: this.syncStatus,
          hasUnsavedChanges: this.hasUnsavedChanges,
          timestamp: new Date().toISOString()
        });
        
        // Retourner false pour bloquer la fermeture
        // Le composant peut alors afficher une confirmation
        return false;
      }
      
      // Vérifier également si une réplication est en cours
      if (this.syncStatus === 'syncing') {
        console.log('[CHECKPOINT] sync-in-progress', {
          pendingChanges: this.pendingChanges
        });
      }
      
      return true;
    },
    
    /**
     * @action Exécuter la fermeture du modal avec contexte PouchDB
     * @checkpoint modal-close-executed
     */
    executeClose() {
      // 1. Masquer tous les modals
      this.showNewSequenceModal = false;
      this.showEditSequenceModal = false;
      this.showDeleteModal = false;
      console.log('[CHECKPOINT] modals-hidden');
      
      // 2. Réinitialiser les séquences en édition/suppression
      this.editingSequence = null;
      this.deletingSequence = null;
      this.selectedSequence = null;
      console.log('[CHECKPOINT] editing-sequence-reset');
      
      // 3. Réinitialiser le formulaire avec structure CouchDB complète
      // IMPORTANT: Préserver le type pour le filtrage PouchDB
      this.newSequence = {
        // IDs CouchDB - null pour nouvelle entité
        _id: null,
        _rev: null,
        
        // Type obligatoire pour les vues Mango
        type: 'sequence',
        
        // Champs métier
        nom: '',
        description: '',
        delai_jours: 15,
        niveau: 1,
        active: true,
        statut: 'brouillon',
        
        // Timestamps CouchDB
        date_creation: null,
        date_modification: null,
        
        // Métadonnées de réplication
        _replication_status: null,
        _replication_errors: []
      };
      console.log('[CHECKPOINT] new-sequence-reset-with-couchdb-ids');
      
      // 4. Nettoyer les erreurs de validation
      this.validationErrors = {};
      this.error = null;
      this.dbError = null;
      console.log('[CHECKPOINT] validation-cleared');
      
      // 5. Réinitialiser l'état de synchronisation local
      this.hasUnsavedChanges = false;
      this.lastLocalChange = null;
      this.isDirty = false;
      console.log('[CHECKPOINT] local-sync-state-reset');
      
      // 6. Nettoyer les conflits en mémoire
      this.pendingConflicts = [];
      this.conflictResolutionInProgress = false;
      console.log('[CHECKPOINT] conflicts-memory-cleared');
      
      // 7. Réinitialiser l'état de chargement
      this.saving = false;
      this.deleting = false;
      console.log('[CHECKPOINT] loading-states-reset');
      
      // Log final avec contexte PouchDB
      console.log('[CHECKPOINT] modal-closed-pouchdb-complete', {
        syncStatus: this.syncStatus,
        lastSyncAt: this.lastSyncAt,
        dbName: this.db?.name || 'not-initialized',
        timestamp: new Date().toISOString()
      });
      
      // Émettre un événement pour notifier les autres composants
      this.emitModalClosed();
    },
    
    /**
     * @action Fermeture complète du workflow avec confirmation si nécessaire
     * @checkpoint modal-close-workflow-completed
     */
    closeModal() {
      // Vérifier s'il faut demander confirmation
      const canClose = this.checkPendingChanges();
      
      if (!canClose) {
        // Le composant appelant doit gérer la confirmation
        // Retourner un état pour indiquer qu'une confirmation est nécessaire
        this.needsConfirmation = true;
        this.confirmationMessage = 'Des modifications n\'ont pas été synchronisées (mode hors ligne). Fermer quand même ?';
        
        console.log('[CHECKPOINT] modal-close-needs-confirmation', {
          message: this.confirmationMessage
        });
        
        return { needsConfirmation: true, confirmed: false };
      }
      
      // Exécution directe
      this.executeClose();
      this.needsConfirmation = false;
      
      return { needsConfirmation: false, confirmed: true };
    },
    
    /**
     * @action Fermeture forcée (après confirmation utilisateur)
     * @checkpoint modal-close-forced
     */
    closeModalForce() {
      console.log('[CHECKPOINT] modal-close-forced-by-user');
      this.hasUnsavedChanges = false; // Forcer la fermeture
      this.executeClose();
      this.needsConfirmation = false;
    },
    
    /**
     * @action Émettre événement de fermeture
     * @checkpoint modal-close-event-emitted
     */
    emitModalClosed() {
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('sequence-modal-closed', {
          detail: {
            syncStatus: this.syncStatus,
            timestamp: new Date().toISOString(),
            hasPendingChanges: this.pendingChanges > 0
          }
        }));
      }
    }
  };
}

// ============================================
// STORE ALPINE.JS COMPLET AVEC CLOSE MODAL
// ============================================

document.addEventListener('alpine:init', () => {
  Alpine.data('sequencesPagePouchDB', () => ({
    
    // ============================================
    // POUCHDB INSTANCE
    // ============================================
    db: null,
    remoteDb: null,
    syncHandler: null,
    
    // ============================================
    // SYNC STATUS (RÈGLE: propriété 'syncStatus')
    // ============================================
    syncStatus: 'initializing', // 'initializing' | 'connected' | 'syncing' | 'paused' | 'error' | 'offline'
    lastSyncAt: null,
    pendingChanges: 0,
    replicationErrors: [],
    
    // ============================================
    // ÉTAT LOCAL POUCHDB
    // ============================================
    hasUnsavedChanges: false,
    lastLocalChange: null,
    isDirty: false,
    pendingConflicts: [],
    conflictResolutionInProgress: false,
    
    // ============================================
    // DONNÉES
    // ============================================
    sequences: [],
    searchQuery: '',
    filterType: 'all', // 'all' | 'relance' | 'suivi'
    
    // ============================================
    // ÉTATS UI
    // ============================================
    loading: false,
    saving: false,
    deleting: false,
    error: null,
    dbError: null,
    
    // Modals
    showNewSequenceModal: false,
    showEditSequenceModal: false,
    showDeleteModal: false,
    
    // Édition
    editingSequence: null,
    deletingSequence: null,
    selectedSequence: null,
    
    // Confirmation
    needsConfirmation: false,
    confirmationMessage: '',
    
    // Validation
    validationErrors: {},
    
    // ============================================
    // NEW SEQUENCE (Structure CouchDB)
    // ============================================
    newSequence: {
      // IDs CouchDB (RÈGLE: utiliser _id et _rev)
      _id: null,
      _rev: null,
      
      // Type pour filtrage Mango
      type: 'sequence',
      
      // Champs métier
      nom: '',
      description: '',
      delai_jours: 15,
      niveau: 1,
      active: true,
      statut: 'brouillon',
      
      // Timestamps
      date_creation: null,
      date_modification: null,
      
      // Métadonnées réplication
      _replication_status: null,
      _replication_errors: []
    },
    
    // ============================================
    // INITIALISATION POUCHDB
    // ============================================
    
    async init() {
      console.log('[CHECKPOINT] sequences-page-pouchdb-initializing');
      
      try {
        // Initialiser PouchDB local
        this.db = new PouchDB('adti_sequences');
        
        // Configurer la réplication
        await this.initReplication();
        
        // Charger les données
        await this.loadSequences();
        
        this.syncStatus = 'initialized';
        console.log('[CHECKPOINT] sequences-page-ready', {
          dbName: this.db.name,
          syncStatus: this.syncStatus
        });
        
      } catch (err) {
        console.error('[CHECKPOINT] sequences-page-init-error', err);
        this.error = err.message;
        this.syncStatus = 'error';
      }
    },
    
    /**
     * @action Initialiser la réplication live vers CouchDB
     * @checkpoint replication-initialized
     */
    async initReplication() {
      const remoteUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:5984/adti_sequences'
        : 'https://couchdb.markidiags.com/adti_sequences';
      
      this.remoteDb = new PouchDB(remoteUrl, {
        // Auth si nécessaire
        // auth: { username: 'user', password: 'pass' }
      });
      
      // Sync bidirectionnelle live (RÈGLE: live avec retry)
      this.syncHandler = this.db.sync(this.remoteDb, {
        live: true,
        retry: true,
        heartbeat: 10000,
        timeout: 30000,
        conflicts: true // RÈGLE: gérer les conflits
      })
      .on('change', (info) => {
        this.pendingChanges = info.change ? info.change.docs.length : 0;
        
        // Recharger si changements entrants
        if (info.direction === 'pull' && info.change?.docs.length > 0) {
          this.handleIncomingChanges(info.change.docs);
        }
        
        console.log('[CHECKPOINT] sync-change', {
          direction: info.direction,
          docs: info.change?.docs.length || 0
        });
      })
      .on('paused', (err) => {
        // RÈGLE: gérer les états paused (offline/online)
        this.syncStatus = err ? 'offline' : 'connected';
        this.lastSyncAt = new Date().toISOString();
        console.log('[CHECKPOINT] sync-paused', { offline: !!err });
      })
      .on('active', () => {
        this.syncStatus = 'syncing';
        console.log('[CHECKPOINT] sync-active');
      })
      .on('denied', (err) => {
        console.error('[CHECKPOINT] sync-denied', err);
        this.replicationErrors.push({ type: 'denied', error: err, time: new Date().toISOString() });
      })
      .on('error', (err) => {
        this.syncStatus = 'error';
        this.dbError = err.message;
        console.error('[CHECKPOINT] sync-error', err);
      });
      
      console.log('[CHECKPOINT] replication-started');
    },
    
    /**
     * @action Charger les séquences depuis PouchDB local (RÈGLE: local-first)
     * @checkpoint sequences-loaded-local
     */
    async loadSequences() {
      this.loading = true;
      
      try {
        // Utiliser allDocs ou une vue Mango si disponible
        const result = await this.db.allDocs({
          include_docs: true,
          conflicts: true,
          startkey: 'sequence_',
          endkey: 'sequence_\ufff0'
        });
        
        this.sequences = result.rows
          .map(row => row.doc)
          .filter(doc => doc.type === 'sequence');
        
        // Gérer les conflits détectés
        const conflicts = result.rows.filter(row => row.doc._conflicts?.length > 0);
        if (conflicts.length > 0) {
          await this.handleConflicts(conflicts.map(c => c.doc));
        }
        
        console.log('[CHECKPOINT] sequences-loaded-local', this.sequences.length);
        
      } catch (err) {
        console.error('[CHECKPOINT] load-sequences-error', err);
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * @action Gérer les changements entrants
     * @checkpoint incoming-changes-handled
     */
    async handleIncomingChanges(docs) {
      const sequenceChanges = docs.filter(doc => doc.type === 'sequence');
      if (sequenceChanges.length > 0) {
        await this.loadSequences();
        this.showSyncNotification(`${sequenceChanges.length} séquence(s) synchronisée(s)`);
      }
    },
    
    /**
     * @action Afficher notification de sync
     * @checkpoint sync-notification-shown
     */
    showSyncNotification(message) {
      // Intégration avec système de notification existant
      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('sync-notification', {
          detail: { message, status: this.syncStatus }
        }));
      }
    },
    
    // ============================================
    // CLOSE MODAL - IMPLÉMENTATION POUCHDB
    // ============================================
    
    /**
     * @action closeModal - Fermer le modal avec gestion PouchDB
     * @checkpoint modal-close-pouchdb
     */
    closeModal() {
      const workflow = closeModal.call(this);
      return workflow.closeModal();
    },
    
    /**
     * @action closeModalForce - Fermeture forcée
     * @checkpoint modal-close-forced
     */
    closeModalForce() {
      const workflow = closeModal.call(this);
      workflow.closeModalForce();
    },
    
    // ============================================
    // CRUD OPÉRATIONS POUCHDB
    // ============================================
    
    /**
     * @action Créer une séquence (écrit dans PouchDB local, réplique auto)
     * @checkpoint sequence-created-pouchdb
     */
    async createSequence() {
      this.saving = true;
      
      try {
        // Générer l'ID CouchDB
        const doc = {
          ...this.newSequence,
          _id: `sequence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          date_creation: new Date().toISOString(),
          date_modification: new Date().toISOString()
        };
        
        // Écrire dans PouchDB local (RÈGLE: écriture vers PouchDB)
        const result = await this.db.put(doc);
        
        // Mettre à jour le state local
        this.sequences.push({ ...doc, _rev: result.rev });
        
        // Marquer comme sauvegardé
        this.hasUnsavedChanges = false;
        
        // Fermer le modal
        this.closeModal();
        
        console.log('[CHECKPOINT] sequence-created-pouchdb', result.id);
        
      } catch (err) {
        console.error('[CHECKPOINT] create-sequence-error', err);
        this.error = err.message;
      } finally {
        this.saving = false;
      }
    },
    
    /**
     * @action Mettre à jour une séquence
     * @checkpoint sequence-updated-pouchdb
     */
    async updateSequence(id, changes) {
      try {
        const doc = await this.db.get(id, { conflicts: true });
        
        const updated = {
          ...doc,
          ...changes,
          _id: id,
          _rev: doc._rev,
          date_modification: new Date().toISOString()
        };
        
        const result = await this.db.put(updated);
        
        // Update local state
        const index = this.sequences.findIndex(s => s._id === id);
        if (index !== -1) {
          this.sequences[index] = { ...updated, _rev: result.rev };
        }
        
        console.log('[CHECKPOINT] sequence-updated-pouchdb', result.rev);
        
      } catch (err) {
        if (err.status === 409) {
          // Conflit de révision
          console.warn('[CHECKPOINT] update-conflict-detected');
          await this.resolveConflictAndUpdate(id, changes);
        } else {
          throw err;
        }
      }
    },
    
    /**
     * @action Résoudre le conflit et mettre à jour
     * @checkpoint conflict-resolved-update
     */
    async resolveConflictAndUpdate(id, changes) {
      const doc = await this.db.get(id, { conflicts: true });
      const merged = { ...doc, ...changes };
      
      const result = await this.db.put({
        ...merged,
        _id: id,
        _rev: doc._rev,
        date_modification: new Date().toISOString(),
        _conflicts_resolved: true
      });
      
      console.log('[CHECKPOINT] conflict-resolved-and-updated', result.rev);
    },
    
    /**
     * @action Gérer les conflits de réplication
     * @checkpoint conflicts-handled
     */
    async handleConflicts(sequencesWithConflicts) {
      for (const seq of sequencesWithConflicts) {
        if (seq._conflicts?.length > 0) {
          await this.resolveSequenceConflict(seq);
        }
      }
    },
    
    /**
     * @action Résoudre un conflit spécifique (last-write-wins)
     * @checkpoint sequence-conflict-resolved
     */
    async resolveSequenceConflict(sequence) {
      const conflictRevs = sequence._conflicts || [];
      
      const revisions = await Promise.all(
        conflictRevs.map(rev => this.db.get(sequence._id, { rev }))
      );
      
      const allVersions = [sequence, ...revisions];
      
      // Stratégie: garder la version avec date_modification la plus récente
      const winner = allVersions.reduce((latest, current) => {
        const latestDate = new Date(latest.date_modification || 0);
        const currentDate = new Date(current.date_modification || 0);
        return currentDate > latestDate ? current : latest;
      });
      
      // Supprimer les révisions en conflit
      for (const rev of conflictRevs) {
        await this.db.remove(sequence._id, rev);
      }
      
      // Mettre à jour avec la version gagnante
      await this.db.put({
        ...winner,
        _rev: sequence._rev,
        date_modification: new Date().toISOString()
      });
      
      console.log('[CHECKPOINT] sequence-conflict-resolved', sequence._id);
    },
    
    /**
     * @action Forcer la synchronisation manuelle
     * @checkpoint manual-sync-triggered
     */
    async forceSync() {
      this.syncStatus = 'syncing';
      
      try {
        await this.db.replicate.to(this.remoteDb);
        await this.db.replicate.from(this.remoteDb);
        
        this.syncStatus = 'connected';
        this.lastSyncAt = new Date().toISOString();
        
        console.log('[CHECKPOINT] manual-sync-completed');
        this.showSyncNotification('Synchronisation manuelle terminée');
        
        await this.loadSequences();
        
      } catch (err) {
        this.syncStatus = 'error';
        console.error('[CHECKPOINT] manual-sync-error', err);
      }
    },
    
    /**
     * @action Détruire proprement
     * @checkpoint store-destroyed
     */
    destroy() {
      if (this.syncHandler) {
        this.syncHandler.cancel();
      }
      if (this.db) {
        this.db.close();
      }
      console.log('[CHECKPOINT] sequences-store-destroyed');
    }
  }));
});

// ============================================
// TEMPLATE HTML DE RÉFÉRENCE
// ============================================
/*
<div x-data="sequencesPagePouchDB" x-init="init()">
  
  <!-- Indicateur de sync PouchDB -->
  <div 
    x-show="syncStatus !== 'connected'"
    :class="{
      'bg-green-100 text-green-800': syncStatus === 'connected',
      'bg-yellow-100 text-yellow-800': syncStatus === 'syncing',
      'bg-red-100 text-red-800': syncStatus === 'error',
      'bg-gray-100 text-gray-800': syncStatus === 'offline'
    }"
    class="px-3 py-2 mb-4 rounded text-sm"
  >
    <span x-text="{
      'connected': '✅ Synchronisé',
      'syncing': '🔄 Synchronisation...',
      'error': '❌ Erreur de sync',
      'offline': '📵 Hors ligne',
      'initializing': '⏳ Initialisation...'
    }[syncStatus]"></span>
    <span x-show="pendingChanges > 0" 
          x-text="' (' + pendingChanges + ' en attente)'"
          class="text-xs ml-2"></span>
  </div>
  
  <!-- Modal Nouvelle Séquence -->
  <div x-show="showNewSequenceModal" 
       x-transition
       class="fixed inset-0 bg-black bg-opacity-50 z-50"
       @keydown.escape.window="closeModal()">
    <div class="bg-white rounded-lg p-6 max-w-md mx-auto mt-20">
      <h2>Nouvelle Séquence</h2>
      
      <input x-model="newSequence.nom" 
             @input="hasUnsavedChanges = true"
             placeholder="Nom" />
      
      <textarea x-model="newSequence.description"
                @input="hasUnsavedChanges = true"
                placeholder="Description"></textarea>
      
      <!-- Bouton fermer avec workflow PouchDB -->
      <button @click="closeModal()" class="btn-secondary">
        Annuler
      </button>
      
      <button @click="createSequence()" 
              :disabled="saving"
              class="btn-primary">
        <span x-show="!saving">Enregistrer</span>
        <span x-show="saving">Sauvegarde...</span>
      </button>
    </div>
  </div>
  
  <!-- Modal de confirmation si modifications non synchronées -->
  <div x-show="needsConfirmation" class="fixed inset-0 bg-black bg-opacity-50 z-50">
    <div class="bg-white rounded-lg p-6 max-w-md mx-auto mt-20">
      <p x-text="confirmationMessage"></p>
      <button @click="closeModalForce()">Oui, fermer</button>
      <button @click="needsConfirmation = false">Annuler</button>
    </div>
  </div>
  
</div>
*/
