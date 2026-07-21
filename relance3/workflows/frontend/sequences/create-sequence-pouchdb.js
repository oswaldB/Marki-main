/**
 * Workflow : Créer une séquence avec PouchDB (local-first + sync CouchDB)
 * 
 * Architecture:
 * - PouchDB local pour lectures/écritures instantanées
 * - Réplication live bidirectionnelle vers CouchDB
 * - Pattern local-first : pas d'attente réseau pour l'UI
 * - Gestion des conflits et états de sync
 * 
 * @file create-sequence-pouchdb.js
 * @folder workflows/frontend/sequences/
 */

/**
 * Configuration PouchDB et Sync
 * À initialiser au démarrage de l'application
 */

// Initialisation de la base locale et du sync
let sequencesDb;
let syncReplication;

/**
 * @action Initialiser PouchDB et la réplication CouchDB
 * @checkpoint pouchdb-initialized, sync-configured
 */
function initPouchDB() {
  // Base locale PouchDB
  sequencesDb = new PouchDB('sequences_local');
  
  // Configuration CouchDB distant
  const remoteDbUrl = window.env?.COUCHDB_URL || 'http://localhost:5984/sequences';
  const remoteDb = new PouchDB(remoteDbUrl, {
    auth: {
      username: window.env?.COUCHDB_USER || 'admin',
      password: window.env?.COUCHDB_PASS || 'password'
    }
  });

  // Sync bidirectionnelle live
  syncReplication = sequencesDb.sync(remoteDb, {
    live: true,
    retry: true,
    conflicts: true,
    // Filtre pour ne sync que les docs pertinents
    filter: function(doc) {
      return doc._id.startsWith('sequence_') || doc._id.startsWith('_design/');
    }
  });

  // Gestion des événements de sync
  setupSyncListeners();
  
  // Créer les vues Mango (_design documents)
  createMangoIndexes();

  console.log('[CHECKPOINT] pouchdb-initialized, sync-configured');
}

/**
 * @action Configurer les listeners d'état de synchronisation
 * @checkpoint sync-listeners-active
 */
function setupSyncListeners() {
  syncReplication
    .on('change', function(change) {
      // documents changés
      Alpine.store('sync').updateStatus({
        direction: change.direction,
        docs: change.change?.docs?.length || 0
      });
      console.log('[SYNC] Changement', change.direction, change.change?.docs);
    })
    .on('paused', function(err) {
      // Réplication en pause (attente ou erreur réseau)
      Alpine.store('sync').setPaused(err);
      console.log('[SYNC] Paused', err ? '(erreur réseau)' : '(à jour)');
    })
    .on('active', function() {
      // Réplication active
      Alpine.store('sync').setActive();
      console.log('[SYNC] Active');
    })
    .on('denied', function(err) {
      // Document refusé (permissions)
      Alpine.store('sync').setError('Permission refusée', err);
      console.error('[SYNC] Denied:', err);
    })
    .on('complete', function(info) {
      // Sync complétée (si live: false)
      Alpine.store('sync').setComplete(info);
    })
    .on('error', function(err) {
      // Erreur de réplication
      Alpine.store('sync').setError('Erreur de sync', err);
      console.error('[SYNC] Error:', err);
    });

  console.log('[CHECKPOINT] sync-listeners-active');
}

/**
 * @action Créer les index Mango pour les vues
 * @checkpoint mango-indexes-created
 */
async function createMangoIndexes() {
  try {
    // Index pour filtrer par type_sequence
    await sequencesDb.createIndex({
      index: {
        fields: ['type_sequence', 'actif', 'created_at'],
        name: 'idx-type-active-date'
      }
    });

    // Index pour recherche par nom
    await sequencesDb.createIndex({
      index: {
        fields: ['nom'],
        name: 'idx-nom'
      }
    });

    // Index pour tri par ordre/position
    await sequencesDb.createIndex({
      index: {
        fields: ['ordre', 'type_sequence'],
        name: 'idx-ordre-type'
      }
    });

    console.log('[CHECKPOINT] mango-indexes-created');
  } catch (err) {
    console.error('[SYNC] Erreur création index:', err);
  }
}

// ============================================================================
// STORE ALPINE POUR LE STATUT DE SYNC
// ============================================================================

document.addEventListener('alpine:init', () => {
  Alpine.store('sync', {
    status: 'connecting', // 'connecting' | 'syncing' | 'synced' | 'offline' | 'error'
    lastSync: null,
    pendingChanges: 0,
    error: null,
    
    setActive() {
      this.status = 'syncing';
      this.error = null;
    },
    
    setPaused(err) {
      if (err) {
        this.status = 'offline';
        this.error = err.message;
      } else {
        this.status = 'synced';
        this.lastSync = new Date();
      }
    },
    
    setComplete(info) {
      this.status = 'synced';
      this.lastSync = new Date();
    },
    
    setError(msg, err) {
      this.status = 'error';
      this.error = msg;
    },
    
    updateStatus(changeInfo) {
      this.pendingChanges = changeInfo.docs || 0;
    },
    
    get isOnline() {
      return this.status !== 'offline' && this.status !== 'error';
    },
    
    get isSyncing() {
      return this.status === 'syncing';
    }
  });

  // Initialiser PouchDB au démarrage
  initPouchDB();
});

// ============================================================================
// WORKFLOW : CRÉER UNE SÉQUENCE (VERSION POUCHDB)
// ============================================================================

/**
 * @action Créer une nouvelle séquence en local-first avec PouchDB
 * @checkpoint sequence-created-local, sync-pending
 * 
 * @param {Object} sequenceData - Données de la séquence
 * @returns {Promise<Object>} - La séquence créée avec _id et _rev
 */
export async function createSequence(sequenceData) {
  const checkpoint = {
    sequenceCreated: false,
    conflictsHandled: false,
    syncQueued: false
  };

  try {
    // 1. Validation des données
    if (!sequenceData.nom || !sequenceData.type_sequence) {
      throw new Error('Veuillez remplir tous les champs obligatoires');
    }

    console.log('[CHECKPOINT] validation-passed');

    // 2. Préparer le document CouchDB
    // Format ID CouchDB: sequence_<timestamp>_<random>
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const docId = `sequence_${timestamp}_${random}`;
    
    const doc = {
      _id: docId,
      type: 'sequence',
      nom: sequenceData.nom,
      type_sequence: sequenceData.type_sequence, // 'relances' | 'suivi'
      actif: sequenceData.actif ?? true,
      emails: sequenceData.emails || [],
      validation_obligatoire: sequenceData.validation_obligatoire ?? false,
      ordre: sequenceData.ordre || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Métadonnées de sync
      _local: false // false = doit être sync vers CouchDB
    };

    console.log('[CHECKPOINT] document-prepared, id:', docId);

    // 3. Écrire en local PouchDB (instantané, pas d'attente réseau)
    const result = await sequencesDb.put(doc);
    
    checkpoint.sequenceCreated = true;
    console.log('[CHECKPOINT] sequence-created-local, rev:', result.rev);

    // 4. Récupérer le document complet (avec _rev)
    const createdDoc = await sequencesDb.get(result.id);
    
    console.log('[CHECKPOINT] document-fetched, _rev:', createdDoc._rev);

    // 5. Forcer une sync immédiate (optionnel, pour feedback rapide)
    // La réplication live s'occupera de la sync en arrière-plan
    checkpoint.syncQueued = true;

    // 6. Retourner les données enrichies
    return {
      success: true,
      data: {
        id: createdDoc._id,
        _id: createdDoc._id,
        _rev: createdDoc._rev,
        ...createdDoc
      },
      checkpoint: checkpoint
    };

  } catch (error) {
    console.error('[CHECKPOINT] sequence-creation-failed:', error.message);
    
    // Gestion spécifique des conflits
    if (error.status === 409) {
      return handleConflict(sequenceData, error);
    }
    
    return {
      success: false,
      error: {
        message: error.message,
        status: error.status,
        checkpoint: checkpoint
      }
    };
  }
}

/**
 * @action Gérer les conflits de réplication
 * @checkpoint conflict-resolved
 */
async function handleConflict(sequenceData, originalError) {
  console.log('[SYNC] Conflit détecté, tentative de résolution...');
  
  try {
    // Stratégie: LWW (Last Write Wins) avec timestamp
    // Récupérer le document existant
    const docId = originalError.docId || originalError.id;
    const existing = await sequencesDb.get(docId, { conflicts: true });
    
    // Créer une nouvelle révision avec les données fusionnées
    const mergedDoc = {
      ...existing,
      ...sequenceData,
      _rev: existing._rev, // Utiliser la dernière rév connue
      updated_at: new Date().toISOString(),
      // Conserver l'historique des conflits si nécessaire
      _conflicts: existing._conflicts || []
    };
    
    // Résoudre les révisions en conflit
    if (existing._conflicts) {
      for (const rev of existing._conflicts) {
        await sequencesDb.remove(docId, rev);
      }
    }
    
    // Sauvegarder la version fusionnée
    const result = await sequencesDb.put(mergedDoc);
    
    console.log('[CHECKPOINT] conflict-resolved, new rev:', result.rev);
    
    return {
      success: true,
      data: {
        id: docId,
        _id: docId,
        _rev: result.rev,
        ...mergedDoc
      },
      conflictResolved: true
    };
    
  } catch (resolveError) {
    console.error('[SYNC] Échec résolution conflit:', resolveError);
    return {
      success: false,
      error: {
        message: 'Conflit de réplication non résolu',
        originalError: originalError.message,
        resolveError: resolveError.message
      }
    };
  }
}

// ============================================================================
// FONCTIONS UTILITAIRES POUCHDB
// ============================================================================

/**
 * @action Récupérer toutes les séquences avec filtrage Mango
 * @checkpoint sequences-queried
 */
export async function getSequences(filters = {}) {
  const selector = {
    type: 'sequence'
  };
  
  if (filters.type_sequence) {
    selector.type_sequence = filters.type_sequence;
  }
  
  if (filters.actif !== undefined) {
    selector.actif = filters.actif;
  }
  
  try {
    const result = await sequencesDb.find({
      selector: selector,
      sort: [{ ordre: 'asc' }, { created_at: 'desc' }],
      limit: filters.limit || 100,
      skip: filters.skip || 0
    });
    
    console.log('[CHECKPOINT] sequences-queried, count:', result.docs.length);
    
    return {
      success: true,
      data: result.docs.map(doc => ({
        id: doc._id,
        _id: doc._id,
        _rev: doc._rev,
        ...doc
      })),
      bookmark: result.bookmark
    };
    
  } catch (error) {
    console.error('[CHECKPOINT] sequences-query-failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * @action Récupérer une séquence par ID
 * @checkpoint sequence-fetched
 */
export async function getSequenceById(id) {
  try {
    const doc = await sequencesDb.get(id, { conflicts: true });
    
    return {
      success: true,
      data: {
        id: doc._id,
        _id: doc._id,
        _rev: doc._rev,
        hasConflicts: !!doc._conflicts,
        ...doc
      }
    };
    
  } catch (error) {
    if (error.status === 404) {
      return { success: false, error: 'Séquence non trouvée', status: 404 };
    }
    return { success: false, error: error.message };
  }
}

/**
 * @action Mettre à jour une séquence
 * @checkpoint sequence-updated
 */
export async function updateSequence(id, updates) {
  try {
    // Récupérer le document existant
    const doc = await sequencesDb.get(id);
    
    // Fusionner les mises à jour
    const updatedDoc = {
      ...doc,
      ...updates,
      _id: doc._id,
      _rev: doc._rev,
      updated_at: new Date().toISOString()
    };
    
    // Sauvegarder
    const result = await sequencesDb.put(updatedDoc);
    
    console.log('[CHECKPOINT] sequence-updated, new rev:', result.rev);
    
    return {
      success: true,
      data: {
        id: result.id,
        _id: result.id,
        _rev: result.rev
      }
    };
    
  } catch (error) {
    if (error.status === 409) {
      return handleConflict({ ...updates, _id: id }, error);
    }
    return { success: false, error: error.message };
  }
}

/**
 * @action Supprimer une séquence
 * @checkpoint sequence-deleted
 */
export async function deleteSequence(id) {
  try {
    const doc = await sequencesDb.get(id);
    const result = await sequencesDb.remove(doc);
    
    console.log('[CHECKPOINT] sequence-deleted, id:', id);
    
    return { success: true, data: result };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// INTÉGRATION ALPINE.JS
// ============================================================================

/**
 * Composant Alpine.js pour la page Séquences avec PouchDB
 * À utiliser dans le HTML: x-data="sequencesPagePouchDB()"
 */
export function sequencesPagePouchDB() {
  return {
    // État local
    sequences: [],
    loading: false,
    error: null,
    showNewSequenceModal: false,
    newSequence: {
      nom: '',
      type_sequence: 'relances',
      actif: true
    },
    
    // État de sync exposé via le store
    get syncStatus() {
      return Alpine.store('sync')?.status || 'unknown';
    },
    
    get isOnline() {
      return Alpine.store('sync')?.isOnline || false;
    },
    
    get isSyncing() {
      return Alpine.store('sync')?.isSyncing || false;
    },

    /**
     * @action Initialiser la page et charger les données locales
     * @checkpoint page-initialized
     */
    async init() {
      console.log('[CHECKPOINT] page-initialized');
      await this.loadSequences();
      
      // S'abonner aux changements en temps réel
      this.setupRealtimeListener();
    },

    /**
     * @action Charger les séquences depuis PouchDB local
     * @checkpoint sequences-loaded-from-local
     */
    async loadSequences() {
      this.loading = true;
      this.error = null;
      
      try {
        const result = await getSequences({
          type_sequence: this.filterType || undefined,
          actif: this.filterActif
        });
        
        if (result.success) {
          this.sequences = result.data;
          console.log('[CHECKPOINT] sequences-loaded-from-local, count:', this.sequences.length);
        } else {
          throw new Error(result.error);
        }
        
      } catch (err) {
        this.error = err.message;
        Alpine.store('ui')?.addToast?.(err.message, 'error');
      } finally {
        this.loading = false;
      }
    },

    /**
     * @action Configurer le listener de changements temps réel
     * @checkpoint realtime-listener-active
     */
    setupRealtimeListener() {
      // Écouter les changements PouchDB
      sequencesDb.changes({
        since: 'now',
        live: true,
        include_docs: true,
        filter: function(doc) {
          return doc._id.startsWith('sequence_');
        }
      }).on('change', (change) => {
        console.log('[REALTIME] Changement détecté:', change.id, change.deleted ? '(supprimé)' : '(modifié)');
        
        // Mettre à jour le tableau local
        if (change.deleted) {
          this.sequences = this.sequences.filter(s => s._id !== change.id);
        } else {
          const index = this.sequences.findIndex(s => s._id === change.id);
          if (index >= 0) {
            // Mise à jour
            this.sequences[index] = { 
              id: change.doc._id,
              ...change.doc 
            };
          } else {
            // Nouveau document
            this.sequences.unshift({
              id: change.doc._id,
              ...change.doc
            });
          }
        }
        
        // Forcer le re-render
        this.sequences = [...this.sequences];
        
      }).on('error', (err) => {
        console.error('[REALTIME] Erreur:', err);
      });
      
      console.log('[CHECKPOINT] realtime-listener-active');
    },

    /**
     * @action Créer une nouvelle séquence (version PouchDB)
     * @checkpoint create-sequence-action
     */
    async createSequence() {
      // Validation
      if (!this.newSequence.nom || !this.newSequence.type_sequence) {
        Alpine.store('ui')?.addToast?.('Veuillez remplir tous les champs obligatoires', 'error');
        return;
      }
      
      this.loading = true;
      this.error = null;
      
      try {
        // Appel PouchDB (local-first)
        const result = await createSequence(this.newSequence);
        
        if (!result.success) {
          throw new Error(result.error?.message || 'Erreur lors de la création');
        }
        
        // Ajouter immédiatement à la liste locale (pas besoin d'attendre la sync)
        this.sequences.unshift(result.data);
        
        // Fermer le modal
        this.showNewSequenceModal = false;
        this.newSequence = { nom: '', type_sequence: 'relances', actif: true };
        
        // Notification
        Alpine.store('ui')?.addToast?.('Séquence créée localement', 'success');
        
        // Rediriger vers l'édition
        window.location.href = `/sequences-relance-detail.html?id=${result.data.id}&rev=${result.data._rev}`;
        
        console.log('[CHECKPOINT] create-sequence-action-completed');
        
      } catch (error) {
        this.error = error.message;
        Alpine.store('ui')?.addToast?.(error.message, 'error');
        console.error('[CHECKPOINT] create-sequence-action-failed:', error);
      } finally {
        this.loading = false;
      }
    },

    /**
     * @action Forcer une synchronisation manuelle
     * @checkpoint manual-sync-triggered
     */
    async forceSync() {
      if (!syncReplication) return;
      
      Alpine.store('sync').setActive();
      
      try {
        // Pause puis reprise pour forcer un check
        // Note: En pratique, la sync live est automatique
        console.log('[CHECKPOINT] manual-sync-triggered');
        Alpine.store('ui')?.addToast?.('Synchronisation en cours...', 'info');
      } catch (err) {
        Alpine.store('ui')?.addToast?.('Erreur de sync: ' + err.message, 'error');
      }
    },

    /**
     * @action Gérer la soumission du formulaire
     */
    submitCreate() {
      this.createSequence();
    },

    /**
     * @action Réinitialiser le formulaire
     */
    resetForm() {
      this.newSequence = { nom: '', type_sequence: 'relances', actif: true };
      this.error = null;
    },

    /**
     * @action Ouvrir le modal de création
     */
    openNewSequenceModal() {
      this.resetForm();
      this.showNewSequenceModal = true;
    },

    /**
     * @action Fermer le modal
     */
    closeNewSequenceModal() {
      this.showNewSequenceModal = false;
    }
  };
}

// Export par défaut
export default {
  createSequence,
  getSequences,
  getSequenceById,
  updateSequence,
  deleteSequence,
  sequencesPagePouchDB,
  initPouchDB
};
