/**
 * Workflow: Annuler suppression profil SMTP - Version PouchDB/CouchDB
 * 
 * Ce workflow gère l'annulation de la suppression d'un profil SMTP.
 * Architecture: Local-first avec réplication bidirectionnelle live.
 * 
 * @dependencies PouchDB, Alpine.js
 * @since 2026-07-21
 */

// Configuration CouchDB (partagée avec les autres workflows SMTP)
const COUCHDB_URL = 'http://localhost:5984';
const DB_NAME = 'smtp-profiles';
const REMOTE_DB_URL = `${COUCHDB_URL}/${DB_NAME}`;

/**
 * Annule la suppression du profil SMTP en cours
 * 
 * ACTION UI PURE - Pas d'interaction PouchDB requise
 * Ce workflow ne nécessite aucune opération PouchDB car il s'agit 
 * uniquement de réinitialiser l'état UI local (fermer modal, reset variable).
 * 
 * La propriété syncStatus est conservée pour la cohérence avec les autres
 * workflows de l'écran settings-smtp.
 * 
 * @returns {Object} Fonction cancelDeleteProfil pour Alpine.js
 */
export function cancelDeleteProfilPouchDB() {
  return {
    // === DONNÉES ===
    profils: [],
    deletingProfil: null,
    loading: false,
    error: null,
    
    // === POUCHDB SYNC STATE (cohérence architecture) ===
    db: null,
    syncHandler: null,
    syncStatus: 'active',         // 'initializing' | 'syncing' | 'active' | 'paused' | 'error' | 'offline'
    lastSyncedAt: null,
    pendingChanges: 0,
    isOnline: true,
    
    // === INITIALISATION ===
    async init() {
      console.log('[CHECKPOINT] Initialisation cancelDeleteProfil PouchDB');
      
      // Récupérer l'instance PouchDB existante si disponible globalement
      // ou créer une référence pour cohérence avec le reste du module
      if (window.smtpPouchDB) {
        this.db = window.smtpPouchDB.db;
        this.syncHandler = window.smtpPouchDB.syncHandler;
        this.syncStatus = window.smtpPouchDB.syncStatus || 'active';
      }
      
      // Écouter les événements de sync pour maintenir syncStatus à jour
      document.addEventListener('pouchdb:sync-active', () => {
        this.syncStatus = 'syncing';
        this.isOnline = true;
      });
      
      document.addEventListener('pouchdb:sync-paused', (e) => {
        this.syncStatus = e.detail.error ? 'offline' : 'active';
        this.isOnline = !e.detail.error;
      });
      
      document.addEventListener('pouchdb:sync-error', () => {
        this.syncStatus = 'error';
      });
      
      document.addEventListener('pouchdb:change', (e) => {
        this.lastSyncedAt = new Date().toLocaleTimeString();
      });
    },
    
    // === ACTION PRINCIPALE: Annuler suppression ===
    
    /**
     * Annule la suppression du profil en cours
     * 
     * Pattern: Action UI pure sans interaction PouchDB
     * - Ferme le modal de confirmation global
     * - Réinitialise deletingProfil à null
     * 
     * [CHECKPOINT] Action côté client uniquement
     */
    cancelDeleteProfil() {
      console.log('[CHECKPOINT] Annulation suppression profil SMTP');
      
      // 1. Fermer le modal de confirmation global via le store UI
      if (Alpine.store('ui') && Alpine.store('ui').modals) {
        Alpine.store('ui').modals.confirmation = {
          show: false,
          title: null,
          message: null,
          onConfirm: null
        };
      }
      
      // 2. Réinitialiser le profil en cours de suppression
      // Cette propriété est utilisée par confirmDeleteProfil() pour stocker
      // temporairement le profil avant confirmation
      this.deletingProfil = null;
      
      // 3. Réinitialiser les états d'erreur/loading si nécessaire
      this.error = null;
      
      // 4. Émettre événement pour notifier les composants éventuels
      document.dispatchEvent(new CustomEvent('smtp:delete-cancelled', {
        detail: { timestamp: new Date().toISOString() }
      }));
      
      console.log('[CHECKPOINT] Suppression annulée - état UI réinitialisé');
    },
    
    // === UTILITAIRES ===
    
    /**
     * Vérifie si une suppression est en cours
     * @returns {boolean} true si un profil est en attente de suppression
     */
    hasDeletingProfil() {
      return this.deletingProfil !== null && this.deletingProfil !== undefined;
    },
    
    /**
     * Récupère les infos du profil en cours de suppression
     * @returns {Object|null} Le profil ou null
     */
    getDeletingProfilInfo() {
      return this.deletingProfil ? {
        id: this.deletingProfil._id || this.deletingProfil.id,
        nom: this.deletingProfil.nom,
        email: this.deletingProfil.email
      } : null;
    },
    
    // === COMPUTED ===
    
    /**
     * Label du statut de synchronisation
     */
    get syncStatusLabel() {
      const labels = {
        'initializing': 'Initialisation...',
        'syncing': 'Synchronisation...',
        'active': 'À jour',
        'paused': 'En pause',
        'error': 'Erreur sync',
        'offline': 'Hors ligne'
      };
      return labels[this.syncStatus] || this.syncStatus;
    },
    
    /**
     * Classe CSS du statut de synchronisation
     */
    get syncStatusColor() {
      const colors = {
        'initializing': 'text-yellow-500',
        'syncing': 'text-blue-500',
        'active': 'text-green-500',
        'paused': 'text-gray-500',
        'error': 'text-red-500',
        'offline': 'text-orange-500'
      };
      return colors[this.syncStatus] || 'text-gray-500';
    },
    
    /**
     * Icône du statut de synchronisation
     */
    get syncStatusIcon() {
      const icons = {
        'initializing': '⏳',
        'syncing': '🔄',
        'active': '✅',
        'paused': '⏸️',
        'error': '❌',
        'offline': '📡'
      };
      return icons[this.syncStatus] || '❓';
    }
  };
}

/**
 * Version standalone de la fonction cancelDeleteProfil
 * À utiliser si besoin d'appel direct sans le data model complet
 */
export function cancelDeleteProfilStandalone() {
  console.log('[CHECKPOINT] Annulation suppression (standalone)');
  
  // Fermer le modal via Alpine store
  if (typeof Alpine !== 'undefined' && Alpine.store('ui')) {
    Alpine.store('ui').modals.confirmation = {
      show: false,
      title: null,
      message: null,
      onConfirm: null
    };
  }
  
  // Émettre événement
  document.dispatchEvent(new CustomEvent('smtp:delete-cancelled', {
    detail: { timestamp: new Date().toISOString() }
  }));
}

// Export pour usage module ES6
export default {
  cancelDeleteProfilPouchDB,
  cancelDeleteProfilStandalone
};

// Export global pour usage script tag (non-module)
if (typeof window !== 'undefined') {
  window.cancelDeleteProfilPouchDB = cancelDeleteProfilPouchDB;
  window.cancelDeleteProfilStandalone = cancelDeleteProfilStandalone;
}
