/**
 * Workflow: Nouveau profil SMTP (PouchDB Version)
 * 
 * Architecture: Local-First avec réplication live vers CouchDB
 * Ce workflow est purement UI (pas d'appel API) mais suit le pattern PouchDB
 * pour cohérence avec les autres workflows de l'application.
 * 
 * @screen settings-smtp
 * @type frontend
 * @sync_mode live
 */

/**
 * @action Afficher le formulaire de création de profil SMTP
 * @checkpoint form-displayed
 * 
 * - Réinitialise le formulaire avec des valeurs par défaut
 * - Affiche le modal/formulaire
 * - Met le focus sur le premier champ
 */
export function newProfilPouchDB() {
  return {
    // === Données du formulaire ===
    newProfil: {
      _id: null,           // Sera généré lors de la création (format: smtpprofil_<timestamp>_<random>)
      _rev: null,          // Révision CouchDB (null pour nouveau document)
      type: 'smtpprofil',  // Type pour filtrage CouchDB
      nom: '',
      email: '',
      serveur: '',
      port: 587,
      securite: 'tls',     // 'tls' | 'ssl' | 'none'
      username: '',
      password: '',
      actif: true,
      is_default: false,   // Profil par défaut
      created_at: null,    // Sera défini lors de la création
      updated_at: null     // Sera défini lors de la création
    },
    
    // === États UI ===
    showNewProfilForm: false,
    loading: false,
    error: null,
    
    // === État de synchronisation PouchDB (pour cohérence) ===
    syncStatus: {
      status: 'initializing',
      lastSync: null,
      pendingChanges: 0,
      error: null,
      isOnline: navigator.onLine,
      isSyncing: false
    },
    
    /**
     * @action Initialiser le formulaire de nouveau profil
     * @checkpoint form-initialized
     * 
     * Réinitialise toutes les valeurs du formulaire avec les valeurs par défaut.
     * Prépare le document au format CouchDB avec _id et type.
     */
    initNewProfilForm() {
      // Générer un ID CouchDB pour le nouveau profil
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 9);
      
      this.newProfil = {
        _id: `smtpprofil_${timestamp}_${random}`,
        _rev: null,
        type: 'smtpprofil',
        nom: '',
        email: '',
        serveur: '',
        port: 587,
        securite: 'tls',
        username: '',
        password: '',
        actif: true,
        is_default: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      this.error = null;
      
      // Log pour debug
      console.log('[PouchDB] New profil form initialized with ID:', this.newProfil._id);
    },
    
    /**
     * @action Afficher le formulaire de création
     * @checkpoint new-profil-form-shown
     * 
     * - Réinitialise le formulaire
     * - Affiche le modal
     * - Met le focus sur le premier champ
     */
    newProfil() {
      // 1. Réinitialiser le formulaire avec un nouvel ID CouchDB
      this.initNewProfilForm();
      
      // 2. Afficher le formulaire
      this.showNewProfilForm = true;
      
      // 3. Focus sur le premier input après le rendu
      this.$nextTick(() => {
        this.$refs.firstInput?.focus();
        this.$refs.nomInput?.focus();
      });
      
      // 4. Émettre checkpoint
      this.emitCheckpoint('new-profil-form-shown', {
        profilId: this.newProfil._id,
        timestamp: new Date().toISOString()
      });
    },
    
    /**
     * @action Fermer le formulaire sans sauvegarder
     * @checkpoint form-closed-cancelled
     */
    cancelNewProfil() {
      this.showNewProfilForm = false;
      this.newProfil = {
        _id: null,
        _rev: null,
        type: 'smtpprofil',
        nom: '',
        email: '',
        serveur: '',
        port: 587,
        securite: 'tls',
        username: '',
        password: '',
        actif: true,
        is_default: false,
        created_at: null,
        updated_at: null
      };
      this.error = null;
    },
    
    /**
     * @action Helper: Émettre un checkpoint pour le logger
     */
    emitCheckpoint(checkpointName, data = {}) {
      if (typeof Alpine !== 'undefined' && Alpine.store('logger')) {
        Alpine.store('logger').checkpoint(checkpointName, data);
      } else {
        console.log(`[CHECKPOINT] ${checkpointName}`, data);
      }
    },
    
    /**
     * @action Getter: Vérifier si le formulaire est valide
     */
    get isNewProfilValid() {
      return this.newProfil.nom?.trim() &&
             this.newProfil.email?.trim() &&
             this.newProfil.serveur?.trim() &&
             this.newProfil.port > 0 &&
             this.newProfil.port <= 65535;
    },
    
    /**
     * @action Getter: Libellé du statut de sync pour l'UI
     */
    get syncStatusLabel() {
      const labels = {
        initializing: 'Initialisation...',
        connecting: 'Connexion...',
        online: 'En ligne',
        offline: 'Hors ligne',
        syncing: 'Synchronisation...',
        synced: 'Synchronisé',
        error: 'Erreur de sync'
      };
      return labels[this.syncStatus.status] || this.syncStatus.status;
    }
  };
}

// Export pour utilisation directe
export default newProfilPouchDB;
