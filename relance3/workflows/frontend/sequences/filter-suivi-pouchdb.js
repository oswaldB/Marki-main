/**
 * Workflow: filter-suivi-pouchdb
 * Description: Filtrer les séquences de suivi avec PouchDB (local-first)
 * 
 * Ce workflow ne fait pas d'appel API - filtrage client-side sur les données PouchDB locales
 */

// ============================================
// ALPINE.JS COMPONENT - Filter Suivi PouchDB
// ============================================

document.addEventListener('alpine:init', () => {
  
  Alpine.data('sequencesFilterPouchDB', () => ({
    // ========================================
    // ÉTAT (State)
    // ========================================
    
    // Référence à la base PouchDB (injectée depuis le composant parent)
    db: null,
    
    // Données locales (chargées depuis PouchDB)
    sequences: [],
    
    // Filtres
    filterType: 'all',        // 'all' | 'suivi' | 'relance'
    searchQuery: '',
    
    // État UI
    loading: false,
    error: null,
    syncStatus: 'initializing', // État de synchronisation PouchDB
    
    // Modals
    showNewSequenceModal: false,
    showEditSequenceModal: false,
    showDeleteModal: false,
    editingSequence: null,
    deletingSequence: null,
    
    // ========================================
    // INITIALISATION
    // ========================================
    
    async init() {
      /**
       * @action Initialiser le composant et charger les séquences depuis PouchDB
       * @checkpoint pouchdb-sequences-loaded
       * 
       * Le filtrage se fait sur les données locales, pas besoin d'appel API
       */
      console.log('[CHECKPOINT] filter-component-initialized');
      
      // La db est injectée depuis le parent ou récupérée du store global
      this.db = Alpine.store('pouchdb')?.db || this.db;
      
      if (this.db) {
        await this.loadSequences();
      }
    },
    
    // ========================================
    // CHARGEMENT DONNÉES POUCHDB
    // ========================================
    
    async loadSequences() {
      /**
       * @action Charger toutes les séquences depuis PouchDB local
       * @checkpoint sequences-loaded-from-pouchdb
       * 
       * Pas d'appel API - lecture instantanée depuis IndexedDB
       */
      try {
        this.loading = true;
        
        // Utiliser allDocs pour récupérer toutes les séquences
        // Les données sont déjà synchronisées depuis CouchDB en arrière-plan
        const result = await this.db.allDocs({
          include_docs: true,
          startkey: 'sequence_',
          endkey: 'sequence_\ufff0'
        });
        
        this.sequences = result.rows
          .filter(row => row.doc.type === 'sequence')
          .map(row => row.doc);
        
        console.log('[CHECKPOINT] sequences-loaded-from-pouchdb,', this.sequences.length, 'séquences');
        
      } catch (err) {
        console.error('[ERROR] Chargement séquences:', err);
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },
    
    // ========================================
    // FILTRAGE (Client-side, pas d'appel API)
    // ========================================
    
    /**
     * @action Définir le filtre sur les séquences de suivi
     * @checkpoint filter-suivi-applied
     * 
     * Pas d'appel API - filtrage purement client-side sur les données PouchDB locales
     */
    filterSuivi() {
      this.filterType = 'suivi';
      console.log('[CHECKPOINT] filter-suivi-applied, type=suivi');
      
      // Le computed filteredSequences se met à jour automatiquement
    },
    
    /**
     * @action Réinitialiser le filtre (toutes les séquences)
     * @checkpoint filter-reset
     */
    resetFilter() {
      this.filterType = 'all';
      this.searchQuery = '';
      console.log('[CHECKPOINT] filter-reset');
    },
    
    /**
     * @action Filtrer par type relance
     * @checkpoint filter-relance-applied
     */
    filterRelance() {
      this.filterType = 'relance';
      console.log('[CHECKPOINT] filter-relance-applied, type=relance');
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
      
      // 1. Filtre par type (suivi/relance)
      if (this.filterType && this.filterType !== 'all') {
        result = result.filter(seq => seq.sequence_type === this.filterType);
        console.log(`[CHECKPOINT] client-filter-applied, type=${this.filterType}, ${result.length} résultats`);
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
    
    get suiviCount() {
      /** Nombre de séquences de suivi (pour affichage badge) */
      return this.sequences.filter(seq => seq.sequence_type === 'suivi').length;
    },
    
    get relanceCount() {
      /** Nombre de séquences de relance (pour affichage badge) */
      return this.sequences.filter(seq => seq.sequence_type === 'relance').length;
    },
    
    // ========================================
    // POUCHDB WRITE (pour modifications)
    // ========================================
    
    async saveSequence(sequenceData) {
      /**
       * @action Sauvegarder une séquence (création ou modification)
       * @checkpoint sequence-saved-to-pouchdb
       * 
       * Écriture locale PouchDB, réplication automatique vers CouchDB
       */
      try {
        const doc = sequenceData._id 
          ? await this.db.get(sequenceData._id)
          : { _id: `sequence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` };
        
        const updatedDoc = {
          ...doc,
          ...sequenceData,
          type: 'sequence',
          updated_at: new Date().toISOString()
        };
        
        const response = await this.db.put(updatedDoc);
        
        console.log('[CHECKPOINT] sequence-saved-to-pouchdb,', response.id);
        
        // Mettre à jour le tableau local
        if (sequenceData._id) {
          const index = this.sequences.findIndex(s => s._id === sequenceData._id);
          if (index !== -1) {
            this.sequences[index] = { ...updatedDoc, _rev: response.rev };
          }
        } else {
          this.sequences.push({ ...updatedDoc, _rev: response.rev });
        }
        
        return { success: true, id: response.id, rev: response.rev };
        
      } catch (err) {
        if (err.status === 409) {
          // Conflit - récupérer la dernière révision et réessayer
          const latest = await this.db.get(sequenceData._id);
          sequenceData._rev = latest._rev;
          return this.saveSequence(sequenceData);
        }
        throw err;
      }
    },
    
    async deleteSequence(sequenceId) {
      /**
       * @action Supprimer une séquence (soft delete avec flag)
       * @checkpoint sequence-deleted-from-pouchdb
       */
      try {
        const doc = await this.db.get(sequenceId);
        doc._deleted = true;
        doc.deleted_at = new Date().toISOString();
        
        await this.db.put(doc);
        
        console.log('[CHECKPOINT] sequence-deleted-from-pouchdb,', sequenceId);
        
        // Mettre à jour le tableau local
        this.sequences = this.sequences.filter(s => s._id !== sequenceId);
        
        return { success: true };
        
      } catch (err) {
        console.error('[ERROR] Suppression séquence:', err);
        return { success: false, error: err.message };
      }
    }
  }));
  
  console.log('[CHECKPOINT] alpine-filter-component-registered');
});

// ============================================
// FONCTION UTILITAIRE STANDALONE
// ============================================

/**
 * Fonction utilitaire pour filtrer les séquences
 * Peut être utilisée hors Alpine.js si nécessaire
 * 
 * @param {Array} sequences - Liste des séquences (depuis PouchDB)
 * @param {string} filterType - 'all' | 'suivi' | 'relance'
 * @param {string} searchQuery - Texte de recherche
 * @returns {Array} Séquences filtrées
 */
export function filterSequencesClientSide(sequences, filterType = 'all', searchQuery = '') {
  /**
   * @utility Filtrage client-side sans appel API
   * @checkpoint client-side-filter-executed
   */
  let result = [...sequences];
  
  // Filtre par type
  if (filterType && filterType !== 'all') {
    result = result.filter(seq => seq.sequence_type === filterType);
  }
  
  // Filtre par recherche
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    result = result.filter(seq => 
      seq.name?.toLowerCase().includes(query) ||
      seq.description?.toLowerCase().includes(query)
    );
  }
  
  console.log('[CHECKPOINT] client-side-filter-executed,', result.length, 'résultats');
  return result;
}

// Export pour usage dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    filterSequencesClientSide
  };
}
