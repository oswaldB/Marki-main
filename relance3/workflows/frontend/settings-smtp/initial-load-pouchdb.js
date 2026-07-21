/**
 * settings-smtp-initial-load-pouchdb.js
 * 
 * Workflow de chargement initial des profils SMTP avec PouchDB
 * Pattern local-first avec synchronisation live vers CouchDB
 * 
 * @checkpoint loading-shown - Spinner de chargement affiché
 * @checkpoint pouchdb-initialized - Base PouchDB locale prête
 * @checkpoint sync-started - Synchronisation live démarrée
 * @checkpoint profils-loaded - Profils chargés depuis PouchDB local
 * @checkpoint data-stored - Données stockées dans Alpine.store
 * @checkpoint list-rendered - Liste rendue avec indicateurs de statut
 * @checkpoint sync-active - Synchronisation active (online)
 * @checkpoint sync-paused - Synchronisation en pause (offline)
 */

// ============================================
// CONFIGURATION POUCHDB
// ============================================

const POUCHDB_CONFIG = {
  // Nom de la base locale
  localDbName: 'adti_smtp_profiles',
  
  // URL du CouchDB distant (à adapter selon l'environnement)
  remoteUrl: window.location.hostname === 'localhost' 
    ? 'http://localhost:5984/adti_smtp_profiles'
    : 'https://couchdb.markidiags.com/adti_smtp_profiles',
  
  // Options de réplication
  replicationOptions: {
    live: true,
    retry: true,
    continuous: true,
    conflicts: true  // Important: gérer les conflits
  }
};

// ============================================
// DESIGN DOCUMENTS (Vues Mango/CouchDB)
// ============================================

const DESIGN_DOCS = {
  // Vue pour lister tous les profils SMTP actifs
  _design_smtp_profiles: {
    _id: '_design/smtp_profiles',
    views: {
      all_profiles: {
        map: function(doc) {
          if (doc.type === 'smtp_profile') {
            emit(doc._id, {
              id: doc._id,
              name: doc.name,
              host: doc.host,
              port: doc.port,
              username: doc.username,
              isActive: doc.isActive,
              isDefault: doc.isDefault,
              updatedAt: doc.updatedAt
            });
          }
        }.toString()
      },
      active_profiles: {
        map: function(doc) {
          if (doc.type === 'smtp_profile' && doc.isActive === true) {
            emit(doc._id, doc);
          }
        }.toString()
      },
      by_name: {
        map: function(doc) {
          if (doc.type === 'smtp_profile') {
            emit(doc.name.toLowerCase(), doc);
          }
        }.toString()
      }
    }
  },
  
  // Index Mango pour requêtes rapides
  _design_indexes: {
    _id: '_design/indexes',
    indexes: {
      idx_type: {
        index: { fields: ['type'] }
      },
      idx_active: {
        index: { fields: ['type', 'isActive'] }
      },
      idx_updated: {
        index: { fields: ['type', 'updatedAt'] }
      }
    }
  }
};

// ============================================
// SERVICE POUCHDB SMTP
// ============================================

const SmtpPouchDBService = {
  db: null,
  sync: null,
  syncStatus: 'initializing', // 'initializing' | 'active' | 'paused' | 'error' | 'complete'
  listeners: [],
  
  /**
   * Initialise la base PouchDB locale
   * @checkpoint pouchdb-initialized
   */
  async init() {
    if (this.db) return this.db;
    
    // Créer la base locale
    this.db = new PouchDB(POUCHDB_CONFIG.localDbName);
    
    // Créer les indexes Mango si nécessaire
    await this.createIndexes();
    
    // Vérifier et créer les design documents
    await this.setupDesignDocs();
    
    console.log('[CHECKPOINT] pouchdb-initialized - Base PouchDB SMTP prête');
    return this.db;
  },
  
  /**
   * Crée les indexes Mango pour les requêtes performantes
   */
  async createIndexes() {
    try {
      await this.db.createIndex({
        index: { fields: ['type'] },
        name: 'idx_type'
      });
      await this.db.createIndex({
        index: { fields: ['type', 'isActive'] },
        name: 'idx_active'
      });
      await this.db.createIndex({
        index: { fields: ['type', 'updatedAt'] },
        name: 'idx_updated'
      });
    } catch (err) {
      console.warn('Index creation warning (may already exist):', err.message);
    }
  },
  
  /**
   * Configure les design documents pour les vues
   */
  async setupDesignDocs() {
    for (const [name, doc] of Object.entries(DESIGN_DOCS)) {
      try {
        const existing = await this.db.get(doc._id);
        doc._rev = existing._rev;
      } catch (err) {
        // Doc n'existe pas encore
      }
      try {
        await this.db.put(doc);
      } catch (err) {
        console.warn(`Design doc ${doc._id}:`, err.message);
      }
    }
  },
  
  /**
   * Démarre la synchronisation live avec CouchDB
   * @checkpoint sync-started
   */
  startSync() {
    if (this.sync) return;
    
    const remoteDb = new PouchDB(POUCHDB_CONFIG.remoteUrl);
    
    // bidirectionnelle avec db.sync()
    this.sync = this.db.sync(remoteDb, POUCHDB_CONFIG.replicationOptions)
      .on('change', (info) => {
        // Changements reçus ou envoyés
        console.log('[SYNC] Changes:', info);
        this.syncStatus = 'active';
        this.notifyListeners('change', info);
      })
      .on('paused', (err) => {
        // Réplication mise en pause (généralement offline)
        console.log('[SYNC] Paused - offline or rate limited');
        this.syncStatus = err ? 'error' : 'paused';
        this.notifyListeners('paused', err);
      })
      .on('active', () => {
        // Reprise de la réplication
        console.log('[SYNC] Active - replication resumed');
        this.syncStatus = 'active';
        this.notifyListeners('active');
      })
      .on('denied', (err) => {
        // Document refusé (permissions)
        console.error('[SYNC] Denied:', err);
        this.syncStatus = 'error';
        this.notifyListeners('denied', err);
      })
      .on('complete', (info) => {
        // Synchronisation terminée (rare avec continuous)
        console.log('[SYNC] Complete:', info);
        this.syncStatus = 'complete';
        this.notifyListeners('complete', info);
      })
      .on('error', (err) => {
        console.error('[SYNC] Error:', err);
        this.syncStatus = 'error';
        this.notifyListeners('error', err);
      });
    
    console.log('[CHECKPOINT] sync-started - Synchronisation live démarrée');
  },
  
  /**
   * Arrête la synchronisation
   */
  stopSync() {
    if (this.sync) {
      this.sync.cancel();
      this.sync = null;
      this.syncStatus = 'stopped';
    }
  },
  
  /**
   * Récupère tous les profils SMTP depuis PouchDB local
   * Pattern local-first : lecture toujours depuis local
   * @checkpoint profils-loaded
   */
  async getAllProfiles() {
    try {
      // Utiliser l'index Mango pour une requête performante
      const result = await this.db.find({
        selector: {
          type: 'smtp_profile'
        },
        sort: [{ updatedAt: 'desc' }]
      });
      
      console.log(`[CHECKPOINT] profils-loaded - ${result.docs.length} profils chargés depuis PouchDB local`);
      
      // Transformer les documents CouchDB (_id, _rev) en format applicatif
      return result.docs.map(doc => this.transformDocToProfile(doc));
    } catch (err) {
      console.error('Erreur chargement profils:', err);
      throw err;
    }
  },
  
  /**
   * Récupère un profil par son ID
   */
  async getProfile(id) {
    try {
      const doc = await this.db.get(id);
      return this.transformDocToProfile(doc);
    } catch (err) {
      if (err.status === 404) return null;
      throw err;
    }
  },
  
  /**
   * Crée ou met à jour un profil SMTP
   * Écriture vers PouchDB local qui réplique vers CouchDB
   */
  async saveProfile(profile) {
    const doc = {
      ...this.transformProfileToDoc(profile),
      type: 'smtp_profile',
      updatedAt: new Date().toISOString()
    };
    
    // Si c'est une mise à jour, récupérer le _rev existant
    if (profile.id) {
      try {
        const existing = await this.db.get(profile.id);
        doc._id = existing._id;
        doc._rev = existing._rev;
      } catch (err) {
        if (err.status !== 404) throw err;
      }
    } else {
      // Nouveau document : générer un ID CouchDB
      doc._id = `smtp_profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    const response = await this.db.put(doc);
    return { ...profile, id: response.id, rev: response.rev };
  },
  
  /**
   * Supprime un profil SMTP
   */
  async deleteProfile(id) {
    const doc = await this.db.get(id);
    return await this.db.remove(doc);
  },
  
  /**
   * Récupère les conflits pour résolution manuelle
   */
  async getConflicts() {
    const result = await this.db.find({
      selector: {
        _conflicts: { $exists: true }
      }
    });
    return result.docs;
  },
  
  /**
   * Résout un conflit en gardant une version
   */
  async resolveConflict(docId, winningRev, losingRevs) {
    const doc = await this.db.get(docId, { conflicts: true });
    
    // Supprimer les versions conflictuelles
    for (const rev of losingRevs) {
      await this.db.remove(docId, rev);
    }
    
    return winningRev;
  },
  
  /**
   * Transforme un document CouchDB en profil applicatif
   * Supprime _rev pour le stockage, garde id (alias de _id)
   */
  transformDocToProfile(doc) {
    const { _id, _rev, ...data } = doc;
    return {
      ...data,
      id: _id,
      couchRev: _rev  // Garder la révision pour debug si nécessaire
    };
  },
  
  /**
   * Transforme un profil applicatif en document CouchDB
   */
  transformProfileToDoc(profile) {
    const { id, couchRev, ...data } = profile;
    const doc = { ...data };
    if (id) doc._id = id;
    return doc;
  },
  
  /**
   * Abonne un listener aux événements de synchronisation
   */
  onSyncEvent(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  },
  
  notifyListeners(event, data) {
    this.listeners.forEach(cb => {
      try {
        cb(event, data);
      } catch (err) {
        console.error('Sync listener error:', err);
      }
    });
  },
  
  /**
   * Force une synchronisation manuelle (pull/push)
   */
  async forceSync() {
    const remoteDb = new PouchDB(POUCHDB_CONFIG.remoteUrl);
    
    // Pull: remote -> local
    await this.db.replicate.from(remoteDb, { conflicts: true });
    
    // Push: local -> remote
    await this.db.replicate.to(remoteDb, { conflicts: true });
  }
};

// ============================================
// WORKFLOW ALPINE.JS - Initial Load SMTP
// ============================================

document.addEventListener('alpine:init', () => {
  
  /**
   * Store Alpine global pour les profils SMTP
   * Accessible via Alpine.store('smtp')
   */
  Alpine.store('smtp', {
    profiles: [],
    loading: false,
    syncStatus: 'initializing',
    lastSync: null,
    error: null,
    conflicts: [],
    
    // Méthode d'initialisation appelée au chargement
    async init() {
      await this.loadProfiles();
      
      // S'abonner aux événements de sync
      SmtpPouchDBService.onSyncEvent((event, data) => {
        this.syncStatus = SmtpPouchDBService.syncStatus;
        
        if (event === 'change') {
          this.lastSync = new Date().toISOString();
          // Recharger si des changements concernent les profils
          if (data.direction === 'pull' && data.change && data.change.docs) {
            const hasSmtpChanges = data.change.docs.some(doc => doc.type === 'smtp_profile');
            if (hasSmtpChanges) {
              this.loadProfiles();
            }
          }
        }
      });
    },
    
    /**
     * Charge les profils depuis PouchDB (local-first)
     * @checkpoint loading-shown
     * @checkpoint profils-loaded
     * @checkpoint data-stored
     */
    async loadProfiles() {
      this.loading = true;
      console.log('[CHECKPOINT] loading-shown - Chargement des profils SMTP...');
      
      try {
        // Initialiser PouchDB si nécessaire
        await SmtpPouchDBService.init();
        
        // Démarrer la synchronisation live
        SmtpPouchDBService.startSync();
        
        // Récupérer les profils depuis PouchDB local
        const profiles = await SmtpPouchDBService.getAllProfiles();
        
        // Stocker dans le store Alpine
        this.profiles = profiles;
        this.error = null;
        
        console.log('[CHECKPOINT] data-stored - Profils stockés dans Alpine.store(smtp)');
        
      } catch (err) {
        console.error('Erreur chargement profils SMTP:', err);
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Rafraîchit manuellement les données
     */
    async refresh() {
      await this.loadProfiles();
    },
    
    /**
     * Force une synchronisation manuelle
     */
    async forceSync() {
      await SmtpPouchDBService.forceSync();
      await this.loadProfiles();
    },
    
    /**
     * Récupère les profils actifs
     */
    get activeProfiles() {
      return this.profiles.filter(p => p.isActive);
    },
    
    /**
     * Récupère le profil par défaut
     */
    get defaultProfile() {
      return this.profiles.find(p => p.isDefault);
    },
    
    /**
     * Vérifie s'il y a des conflits
     */
    async checkConflicts() {
      this.conflicts = await SmtpPouchDBService.getConflicts();
      return this.conflicts;
    }
  });
  
  /**
   * Component Alpine pour la page Settings SMTP
   * Utilisation: <div x-data="smtpSettings()">
   */
  Alpine.data('smtpSettings', () => ({
    // État local
    loading: false,
    profiles: [],
    selectedProfile: null,
    syncStatus: 'initializing',
    isOffline: false,
    showSyncIndicator: true,
    
    // Computed depuis le store
    get storeProfiles() {
      return Alpine.store('smtp').profiles;
    },
    
    get activeProfiles() {
      return this.storeProfiles.filter(p => p.isActive);
    },
    
    get inactiveProfiles() {
      return this.storeProfiles.filter(p => !p.isActive);
    },
    
    /**
     * Initialisation du component
     * @checkpoint loading-shown
     */
    async init() {
      this.loading = true;
      console.log('[CHECKPOINT] loading-shown - Initialisation du component SMTP...');
      
      // Initialiser PouchDB
      await SmtpPouchDBService.init();
      
      // Démarrer la sync live
      SmtpPouchDBService.startSync();
      
      // S'abonner aux changements de statut
      SmtpPouchDBService.onSyncEvent((event, data) => {
        this.syncStatus = SmtpPouchDBService.syncStatus;
        this.isOffline = (event === 'paused' && !data);
        
        // Si des changements arrivent, mettre à jour la liste
        if (event === 'change' && data.direction === 'pull') {
          this.loadProfiles();
        }
      });
      
      // Charger les profils
      await this.loadProfiles();
      
      this.syncStatus = SmtpPouchDBService.syncStatus;
    },
    
    /**
     * Charge les profils depuis PouchDB local
     * @checkpoint profils-loaded
     * @checkpoint list-rendered
     */
    async loadProfiles() {
      try {
        // Récupérer depuis PouchDB local (local-first)
        this.profiles = await SmtpPouchDBService.getAllProfiles();
        
        console.log('[CHECKPOINT] profils-loaded - Profils chargés:', this.profiles.length);
        console.log('[CHECKPOINT] list-rendered - Liste prête pour le rendu');
        
      } catch (err) {
        console.error('Erreur chargement:', err);
        this.showError('Impossible de charger les profils SMTP');
      }
    },
    
    /**
     * Sélectionne un profil pour édition
     */
    selectProfile(profile) {
      this.selectedProfile = profile ? { ...profile } : null;
    },
    
    /**
     * Sauvegarde un profil (création ou mise à jour)
     */
    async saveProfile(profileData) {
      try {
        const saved = await SmtpPouchDBService.saveProfile(profileData);
        await this.loadProfiles();
        return saved;
      } catch (err) {
        console.error('Erreur sauvegarde:', err);
        this.showError('Erreur lors de la sauvegarde');
        throw err;
      }
    },
    
    /**
     * Supprime un profil
     */
    async deleteProfile(profileId) {
      if (!confirm('Supprimer ce profil SMTP ?')) return;
      
      try {
        await SmtpPouchDBService.deleteProfile(profileId);
        await this.loadProfiles();
        
        if (this.selectedProfile?.id === profileId) {
          this.selectedProfile = null;
        }
      } catch (err) {
        console.error('Erreur suppression:', err);
        this.showError('Erreur lors de la suppression');
      }
    },
    
    /**
     * Teste la connexion SMTP
     */
    async testProfile(profileId) {
      try {
        const profile = await SmtpPouchDBService.getProfile(profileId);
        if (!profile) {
          this.showError('Profil non trouvé');
          return;
        }
        
        // Appel API pour tester (nécessite backend)
        const response = await fetch('/api/smtp-profiles/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile })
        });
        
        if (response.ok) {
          this.showSuccess('Connexion SMTP OK');
        } else {
          const error = await response.json();
          this.showError(`Échec: ${error.message}`);
        }
      } catch (err) {
        this.showError(`Erreur: ${err.message}`);
      }
    },
    
    /**
     * Force une synchronisation manuelle
     */
    async syncNow() {
      this.syncStatus = 'syncing';
      try {
        await SmtpPouchDBService.forceSync();
        await this.loadProfiles();
        this.showSuccess('Synchronisation terminée');
      } catch (err) {
        this.showError('Erreur de synchronisation');
      }
    },
    
    /**
     * Affiche une notification d'erreur
     */
    showError(message) {
      // Intégration avec votre système de notifications
      console.error('[ERROR]', message);
      if (window.Alpine.store('notifications')) {
        Alpine.store('notifications').add({ type: 'error', message });
      }
    },
    
    /**
     * Affiche une notification de succès
     */
    showSuccess(message) {
      console.log('[SUCCESS]', message);
      if (window.Alpine.store('notifications')) {
        Alpine.store('notifications').add({ type: 'success', message });
      }
    },
    
    /**
     * Destruction du component
     */
    destroy() {
      // Optionnel: arrêter la sync si ce n'est plus nécessaire
      // SmtpPouchDBService.stopSync();
    }
  }));
});

// ============================================
// EXPORT pour utilisation module/commonJS
// ============================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SmtpPouchDBService, POUCHDB_CONFIG, DESIGN_DOCS };
}
