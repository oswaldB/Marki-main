/**
 * Workflow : Sélectionner type Relance avec PouchDB
 * 
 * Architecture:
 * - Action côté client simple (pas d'appel API)
 * - Persistance optionnelle du draft en PouchDB local
 * - Le type_sequence est indexé pour les vues Mango
 * 
 * @file set-type-relance-pouchdb.js
 * @folder workflows/frontend/sequences/
 */

/**
 * Configuration PouchDB
 * Réutilise la connexion existante ou crée une nouvelle instance
 */
let sequencesDb;

function getSequencesDb() {
  if (!sequencesDb) {
    sequencesDb = new PouchDB('sequences_local');
  }
  return sequencesDb;
}

// ============================================================================
// WORKFLOW PRINCIPAL : SET TYPE RELANCE
// ============================================================================

/**
 * @action Définir le type de séquence à "relance" (côté client)
 * @checkpoint type-set-client-side
 * 
 * Cette action est purement côté client - pas d'appel API ni PouchDB requis
 * pour le simple changement de type dans le formulaire.
 */
export function setTypeRelance() {
  console.log('[CHECKPOINT] type-set-client-side');
  
  return {
    type_sequence: 'relances',
    description: 'Séquence de relance d\'impayés',
    icon: 'mail',
    color: 'red'
  };
}

/**
 * @action Définir le type de séquence à "suivi" (côté client)
 * @checkpoint type-set-s-client-side
 */
export function setTypeSuivi() {
  console.log('[CHECKPOINT] type-set-suivi-client-side');
  
  return {
    type_sequence: 'suivi',
    description: 'Séquence de suivi post-règlement',
    icon: 'check-circle',
    color: 'green'
  };
}

/**
 * @action Sauvegarder le brouillon de séquence en local PouchDB
 * @checkpoint draft-saved-locally
 * 
 * Utile pour persister le formulaire en cours si l'utilisateur
 * quitte la page et revient plus tard.
 */
export async function saveDraftToPouchDB(draftData) {
  const db = getSequencesDb();
  
  try {
    // ID spécial pour les brouillons (un seul brouillon actif)
    const draftId = '_local/sequence_draft';
    
    let doc;
    try {
      // Récupérer le brouillon existant si présent
      doc = await db.get(draftId);
    } catch (err) {
      if (err.status !== 404) throw err;
      // Pas de brouillon existant
    }
    
    const draftDoc = {
      _id: draftId,
      type: 'draft',
      ...draftData,
      updated_at: new Date().toISOString(),
      // Les documents _local ne sont pas sync vers CouchDB
      _local: true
    };
    
    if (doc) {
      draftDoc._rev = doc._rev;
    }
    
    const result = await db.put(draftDoc);
    
    console.log('[CHECKPOINT] draft-saved-locally, rev:', result.rev);
    
    return {
      success: true,
      data: { _id: draftId, _rev: result.rev },
      timestamp: draftDoc.updated_at
    };
    
  } catch (error) {
    console.error('[CHECKPOINT] draft-save-failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * @action Charger le brouillon depuis PouchDB local
 * @checkpoint draft-loaded-from-local
 */
export async function loadDraftFromPouchDB() {
  const db = getSequencesDb();
  
  try {
    const draft = await db.get('_local/sequence_draft');
    
    console.log('[CHECKPOINT] draft-loaded-from-local, type:', draft.type_sequence);
    
    return {
      success: true,
      data: draft,
      age: Date.now() - new Date(draft.updated_at).getTime()
    };
    
  } catch (error) {
    if (error.status === 404) {
      return { success: true, data: null, message: 'No draft found' };
    }
    return { success: false, error: error.message };
  }
}

/**
 * @action Supprimer le brouillon après création réussie
 * @checkpoint draft-cleared
 */
export async function clearDraftFromPouchDB() {
  const db = getSequencesDb();
  
  try {
    const draft = await db.get('_local/sequence_draft');
    await db.remove(draft);
    
    console.log('[CHECKPOINT] draft-cleared');
    return { success: true };
    
  } catch (error) {
    if (error.status === 404) {
      return { success: true, message: 'No draft to clear' };
    }
    return { success: false, error: error.message };
  }
}

// ============================================================================
// VUES MANGO : TYPE_SEQUENCE
// ============================================================================

/**
 * @action Requête Mango pour filtrer par type_sequence
 * @checkpoint mango-query-by-type
 * 
 * Utilise l'index créé dans create-sequence-pouchdb.js
 */
export async function getSequencesByType(type_sequence, options = {}) {
  const db = getSequencesDb();
  
  try {
    const result = await db.find({
      selector: {
        type: 'sequence',
        type_sequence: type_sequence, // 'relances' | 'suivi'
        ...(options.actif !== undefined && { actif: options.actif })
      },
      sort: [{ ordre: 'asc' }],
      limit: options.limit || 100
    });
    
    console.log('[CHECKPOINT] mango-query-by-type, count:', result.docs.length);
    
    return {
      success: true,
      data: result.docs.map(doc => ({
        id: doc._id,
        _id: doc._id,
        _rev: doc._rev,
        ...doc
      })),
      type: type_sequence
    };
    
  } catch (error) {
    console.error('[CHECKPOINT] mango-query-failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * @action Compter les séquences par type
 * @checkpoint mango-count-by-type
 */
export async function countSequencesByType() {
  const db = getSequencesDb();
  
  try {
    // Requête pour les relances
    const relancesResult = await db.find({
      selector: {
        type: 'sequence',
        type_sequence: 'relances',
        actif: true
      },
      fields: ['_id'] // Minimal fields pour performance
    });
    
    // Requête pour les suivis
    const suivisResult = await db.find({
      selector: {
        type: 'sequence',
        type_sequence: 'suivi',
        actif: true
      },
      fields: ['_id']
    });
    
    const stats = {
      relances: relancesResult.docs.length,
      suivis: suivisResult.docs.length,
      total: relancesResult.docs.length + suivisResult.docs.length
    };
    
    console.log('[CHECKPOINT] mango-count-by-type:', stats);
    
    return { success: true, data: stats };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// INTÉGRATION ALPINE.JS
// ============================================================================

/**
 * Actions pour le composant de sélection de type
 * À utiliser dans le HTML: @click="setType('relances')"
 */
export function typeSelectorActions() {
  return {
    // État local
    selectedType: 'relances',
    draftLoaded: false,
    draftAge: null,
    
    // Configuration des types
    typeConfig: {
      relances: {
        label: 'Relance d\'impayés',
        description: 'Envoi automatique d\'emails de relance pour les factures impayées',
        icon: 'mail-alert',
        color: 'red',
        sequenceEmojis: ['📧', '⏰', '⚠️', '📞'],
        maxEmails: 5
      },
      suivi: {
        label: 'Suivi client',
        description: 'Communication post-règlement pour fidélisation',
        icon: 'check-circle',
        color: 'green',
        sequenceEmojis: ['✅', '🙏', '🎉'],
        maxEmails: 3
      }
    },
    
    /**
     * @action Changer le type de séquence
     * @checkpoint type-changed-ui
     */
    setType(type) {
      if (!['relances', 'suivi'].includes(type)) {
        console.error('[CHECKPOINT] invalid-type:', type);
        return;
      }
      
      this.selectedType = type;
      
      // Sauvegarder automatiquement le brouillon
      this.saveDraft();
      
      console.log('[CHECKPOINT] type-changed-ui, type:', type);
    },
    
    /**
     * @action Sauvegarder le brouillon en local
     * @checkpoint auto-draft-saved
     */
    async saveDraft() {
      const draftData = {
        type_sequence: this.selectedType,
        // Autres champs du formulaire si présents
        timestamp: new Date().toISOString()
      };
      
      await saveDraftToPouchDB(draftData);
    },
    
    /**
     * @action Charger le brouillon au démarrage
     * @checkpoint draft-restored
     */
    async loadDraft() {
      const result = await loadDraftFromPouchDB();
      
      if (result.success && result.data) {
        this.selectedType = result.data.type_sequence || 'relances';
        this.draftLoaded = true;
        this.draftAge = result.age;
        
        console.log('[CHECKPOINT] draft-restored, type:', this.selectedType);
        
        // Notification si brouillon ancien
        if (this.draftAge > 24 * 60 * 60 * 1000) { // > 24h
          Alpine.store('ui')?.addToast?.(
            'Brouillon chargé (créé il y a ' + Math.floor(this.draftAge / 3600000) + 'h)',
            'info'
          );
        }
      }
    },
    
    /**
     * @action Vérifier si un brouillon existe
     * @checkpoint draft-status-checked
     */
    async hasDraft() {
      const result = await loadDraftFromPouchDB();
      return result.success && result.data !== null;
    },
    
    // Getters pour le template
    get currentTypeConfig() {
      return this.typeConfig[this.selectedType];
    },
    
    get isRelance() {
      return this.selectedType === 'relances';
    },
    
    get isSuivi() {
      return this.selectedType === 'suivi';
    }
  };
}

/**
 * Composant Alpine.js complet pour la page Séquences
 * Intègre le sélecteur de type avec PouchDB
 */
export function sequencesPageWithTypeSelector() {
  return {
    // Compose avec le sélecteur de type
    ...typeSelectorActions(),
    
    // État de la page
    sequences: [],
    loading: false,
    error: null,
    showNewSequenceModal: false,
    
    // Sync status (depuis le store global)
    get syncStatus() {
      return Alpine.store('sync')?.status || 'unknown';
    },
    
    /**
     * @action Initialiser la page
     * @checkpoint page-with-type-initialized
     */
    async init() {
      console.log('[CHECKPOINT] page-with-type-initialized');
      
      // Charger le brouillon si présent
      await this.loadDraft();
      
      // Charger les séquences filtrées par type
      await this.loadSequencesByType();
    },
    
    /**
     * @action Charger les séquences depuis PouchDB local
     * @checkpoint sequences-loaded-by-type
     */
    async loadSequencesByType() {
      this.loading = true;
      
      try {
        const result = await getSequencesByType(this.selectedType, {
          actif: true,
          limit: 100
        });
        
        if (result.success) {
          this.sequences = result.data;
          console.log('[CHECKPOINT] sequences-loaded-by-type, count:', this.sequences.length);
        }
        
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * @action Surveiller les changements de type
     * @checkpoint type-change-watcher
     */
    onTypeChange() {
      // Recharger les séquences quand le type change
      this.$watch('selectedType', () => {
        this.loadSequencesByType();
        this.saveDraft();
      });
    }
  };
}

// ============================================================================
// CHANGES FEED : SYNCHRONISATION TEMPS RÉEL
// ============================================================================

/**
 * @action Écouter les changements de type_sequence
 * @checkpoint type-changes-feed-active
 * 
 * Permet de mettre à jour l'UI si un autre utilisateur change le type
 * d'une séquence (sync depuis CouchDB).
 */
export function setupTypeChangeListener(callback) {
  const db = getSequencesDb();
  
  const changes = db.changes({
    since: 'now',
    live: true,
    include_docs: true,
    filter: function(doc) {
      // Écouter uniquement les changements de type_sequence
      return doc._id.startsWith('sequence_') && doc.type_sequence;
    }
  });
  
  changes.on('change', (change) => {
    if (change.doc && change.doc.type_sequence) {
      console.log('[REALTIME] Type changé:', change.doc._id, '→', change.doc.type_sequence);
      
      if (callback) {
        callback({
          id: change.doc._id,
          type_sequence: change.doc.type_sequence,
          deleted: change.deleted
        });
      }
    }
  });
  
  console.log('[CHECKPOINT] type-changes-feed-active');
  
  return changes; // Pour pouvoir cancel() si besoin
}

// Export par défaut
export default {
  setTypeRelance,
  setTypeSuivi,
  saveDraftToPouchDB,
  loadDraftFromPouchDB,
  clearDraftFromPouchDB,
  getSequencesByType,
  countSequencesByType,
  typeSelectorActions,
  sequencesPageWithTypeSelector,
  setupTypeChangeListener
};
