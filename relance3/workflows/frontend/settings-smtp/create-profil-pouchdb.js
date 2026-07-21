/**
 * Workflow: Créer profil SMTP - Version PouchDB/CouchDB
 * Fichier: workflows/frontend/settings-smtp/create-profil-pouchdb.js
 * 
 * Architecture: Local-first avec PouchDB + réplication live CouchDB
 * - Lectures: depuis PouchDB local
 * - Écritures: vers PouchDB (réplication automatique vers CouchDB)
 * - Gestion des conflits: activée (conflicts: true)
 * - Sync bidirectionnelle: active avec suivi d'état
 */

/**
 * Configuration PouchDB/CouchDB
 * @typedef {Object} PouchConfig
 * @property {string} localDbName - Nom de la base PouchDB locale
 * @property {string} remoteUrl - URL de la base CouchDB distante
 * @property {Object} auth - Credentials CouchDB
 */
const POUCH_CONFIG = {
  localDbName: 'smtp_profiles',
  remoteUrl: 'https://couchdb.markidiags.com/smtp_profiles',
  auth: {
    username: 'admin',
    password: 'password' // À sécuriser via env variables
  }
};

/**
 * Design Document pour les vues Mango
 * _id: _design/smtp_profiles
 */
const DESIGN_DOC = {
  _id: '_design/smtp_profiles',
  views: {
    by_nom: {
      map: function(doc) {
        if (doc.type === 'smtp_profile') {
          emit(doc.nom, doc);
        }
      }.toString()
    },
    by_email: {
      map: function(doc) {
        if (doc.type === 'smtp_profile') {
          emit(doc.email, doc);
        }
      }.toString()
    },
    all_profiles: {
      map: function(doc) {
        if (doc.type === 'smtp_profile') {
          emit(doc._id, doc);
        }
      }.toString()
    }
  },
  indexes: {
    mango_idx_nom: {
      fields: ['nom', 'type']
    },
    mango_idx_email: {
      fields: ['email', 'type']
    }
  }
};

/**
 * Initialise la base PouchDB et la réplication
 * @returns {Object} { db: PouchDB, syncHandler: Object, syncStatus: Object }
 */
export function initPouchDB() {
  // Vérifier si PouchDB est disponible (chargé via CDN)
  if (typeof PouchDB === 'undefined') {
    throw new Error('PouchDB library not loaded. Add: <script src="https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.min.js"></script>');
  }

  // Créer la base locale
  const db = new PouchDB(POUCH_CONFIG.localDbName);

  // État de synchronisation réactif pour Alpine.js
  const syncStatus = {
    status: 'initializing', // 'initializing' | 'syncing' | 'paused' | 'error' | 'complete'
    direction: null,        // 'pull' | 'push' | 'both'
    lastError: null,
    lastSync: null,
    pending: 0,
    isOnline: navigator.onLine
  };

  // Configurer la réplication live
  const remoteDb = new PouchDB(POUCH_CONFIG.remoteUrl, {
    auth: POUCH_CONFIG.auth
  });

  // Sync bidirectionnelle live avec gestion des conflits
  const syncHandler = db.sync(remoteDb, {
    live: true,
    retry: true,
    conflicts: true,        // Important: gérer les conflits
    include_docs: true,
    batch_size: 100,
    batches_limit: 5,
    back_off_function: function(delay) {
      if (delay === 0) {
        return 1000;
      }
      return delay * 1.5; // Backoff exponentiel
    }
  });

  // Event handlers pour le suivi de sync
  syncHandler
    .on('change', function(info) {
      // Changement reçu ou envoyé
      syncStatus.status = 'syncing';
      syncStatus.direction = info.direction; // 'push' ou 'pull'
      syncStatus.lastSync = new Date().toISOString();
      
      // Mettre à jour le store Alpine si disponible
      if (Alpine && Alpine.store('ui')) {
        Alpine.store('ui').syncStatus = { ...syncStatus };
      }
    })
    .on('paused', function(err) {
      // Réplication en pause (généralement offline ou à jour)
      syncStatus.status = 'paused';
      syncStatus.isOnline = !err;
      syncStatus.lastError = err || null;
      
      if (Alpine && Alpine.store('ui')) {
        Alpine.store('ui').syncStatus = { ...syncStatus };
        
        if (err) {
          Alpine.store('ui').addToast('Synchronisation en pause (hors ligne)', 'warning');
        }
      }
    })
    .on('active', function() {
      // Réplication active
      syncStatus.status = 'syncing';
      syncStatus.isOnline = true;
      
      if (Alpine && Alpine.store('ui')) {
        Alpine.store('ui').syncStatus = { ...syncStatus };
      }
    })
    .on('denied', function(err) {
      // Document refusé (permissions)
      syncStatus.status = 'error';
      syncStatus.lastError = err;
      console.error('Sync denied:', err);
      
      if (Alpine && Alpine.store('ui')) {
        Alpine.store('ui').addToast('Erreur de permission lors de la sync', 'error');
      }
    })
    .on('error', function(err) {
      // Erreur de réplication
      syncStatus.status = 'error';
      syncStatus.lastError = err.message || err;
      console.error('Sync error:', err);
      
      if (Alpine && Alpine.store('ui')) {
        Alpine.store('ui').addToast('Erreur de synchronisation: ' + err.message, 'error');
      }
    })
    .on('complete', function() {
      // Sync complétée (rare avec live=true)
      syncStatus.status = 'complete';
      
      if (Alpine && Alpine.store('ui')) {
        Alpine.store('ui').syncStatus = { ...syncStatus };
      }
    });

  // Initialiser le design document si nécessaire
  initDesignDoc(db);

  // Gestion online/offline du navigateur
  window.addEventListener('online', () => {
    syncStatus.isOnline = true;
    // La réplication reprend automatiquement avec retry: true
  });

  window.addEventListener('offline', () => {
    syncStatus.isOnline = false;
    syncStatus.status = 'paused';
  });

  return { db, syncHandler, syncStatus };
}

/**
 * Initialise le design document pour les vues
 * @param {PouchDB} db - Instance PouchDB
 */
async function initDesignDoc(db) {
  try {
    const existing = await db.get('_design/smtp_profiles');
    DESIGN_DOC._rev = existing._rev;
    await db.put(DESIGN_DOC);
  } catch (err) {
    if (err.status === 404) {
      await db.put(DESIGN_DOC);
    } else {
      console.error('Error initializing design doc:', err);
    }
  }
}

/**
 * Génère un ID CouchDB unique pour les profils SMTP
 * @returns {string} ID unique (format: smtp_profile_{timestamp}_{random})
 */
function generateProfileId() {
  return `smtp_profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Gère les conflits de réplication
 * Récupère tous les conflits pour un document et les résout
 * Stratégie: dernier modifié gagne (last-write-wins)
 * 
 * @param {PouchDB} db - Instance PouchDB
 * @param {string} docId - ID du document en conflit
 */
export async function resolveConflicts(db, docId) {
  try {
    // Récupérer le document avec les révisions conflictuelles
    const doc = await db.get(docId, { conflicts: true });
    
    if (!doc._conflicts || doc._conflicts.length === 0) {
      return; // Pas de conflits
    }

    console.log(`Resolving ${doc._conflicts.length} conflicts for ${docId}`);

    // Pour chaque révision conflictuelle
    for (const rev of doc._conflicts) {
      // Récupérer la révision conflictuelle
      const conflictDoc = await db.get(docId, { rev: rev });
      
      // Stratégie: garder la version la plus récente (comparaison timestamps)
      const currentDate = new Date(doc.updatedAt || doc.createdAt || 0);
      const conflictDate = new Date(conflictDoc.updatedAt || conflictDoc.createdAt || 0);
      
      if (conflictDate > currentDate) {
        // La version conflictuelle est plus récente, la promouvoir
        doc._rev = rev;
        Object.assign(doc, conflictDoc);
        delete doc._conflicts;
      }
      
      // Supprimer la révision conflictuelle
      await db.remove(docId, rev);
    }

    // Sauvegarder le document résolu
    delete doc._conflicts;
    await db.put(doc);
    
    console.log(`Conflicts resolved for ${docId}`);
  } catch (err) {
    console.error('Error resolving conflicts:', err);
  }
}

/**
 * Structure x-data Alpine.js pour la page settings-smtp avec PouchDB
 * À utiliser dans: x-data="settingsSmtpPagePouchDB()"
 * 
 * @returns {Object} Data model Alpine.js
 */
export function settingsSmtpPagePouchDB() {
  return {
    // === Données du workflow ===
    profils: [],
    newProfil: {
      nom: '',
      email: '',
      host: '',
      port: 587,
      secure: true,
      username: '',
      password: '',
      from_email: '',
      from_name: ''
    },
    testingProfil: null,
    testResult: null,
    
    // === États UI ===
    loading: false,
    error: null,
    showNewProfilForm: false,
    
    // === État de synchronisation PouchDB ===
    syncStatus: {
      status: 'initializing',
      direction: null,
      lastError: null,
      lastSync: null,
      pending: 0,
      isOnline: navigator.onLine
    },
    
    // === Instances PouchDB ===
    db: null,
    syncHandler: null,
    
    /**
     * Initialisation au montage du composant
     */
    async init() {
      // Initialiser PouchDB et la réplication
      const { db, syncHandler, syncStatus } = initPouchDB();
      this.db = db;
      this.syncHandler = syncHandler;
      this.syncStatus = syncStatus;
      
      // Charger les profils existants depuis PouchDB local (local-first)
      await this.loadProfils();
      
      // Écouter les changements en temps réel
      this.setupChangesListener();
    },
    
    /**
     * Charge les profils depuis PouchDB local
     * Pattern: local-first - lecture toujours depuis la base locale
     */
    async loadProfils() {
      try {
        this.loading = true;
        
        // Utiliser la vue Mango pour récupérer tous les profils
        const result = await this.db.query('smtp_profiles/all_profiles', {
          include_docs: true,
          conflicts: true  // Important: inclure les conflits
        });
        
        // Mapper les documents et vérifier les conflits
        this.profils = result.rows.map(row => {
          const doc = row.doc;
          
          // Vérifier s'il y a des conflits à résoudre
          if (doc._conflicts) {
            resolveConflicts(this.db, doc._id);
          }
          
          return {
            _id: doc._id,
            _rev: doc._rev,
            ...doc
          };
        });
        
        // Trier par date de création (plus récent d'abord)
        this.profils.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB - dateA;
        });
        
      } catch (err) {
        console.error('Erreur chargement profils:', err);
        this.error = err.message;
        Alpine.store('ui').addToast('Erreur chargement profils: ' + err.message, 'error');
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Configure l'écoute des changements en temps réel
     * Permet de mettre à jour l'UI quand des changements arrivent de CouchDB
     */
    setupChangesListener() {
      const changes = this.db.changes({
        since: 'now',
        live: true,
        include_docs: true,
        conflicts: true
      });
      
      changes.on('change', (change) => {
        const doc = change.doc;
        
        if (!doc || doc.type !== 'smtp_profile') return;
        
        if (change.deleted) {
          // Document supprimé
          this.profils = this.profils.filter(p => p._id !== doc._id);
        } else {
          // Document créé ou mis à jour
          const index = this.profils.findIndex(p => p._id === doc._id);
          
          const profileData = {
            _id: doc._id,
            _rev: doc._rev,
            ...doc
          };
          
          if (index === -1) {
            // Nouveau profil
            this.profils.unshift(profileData);
          } else {
            // Mise à jour
            this.profils[index] = profileData;
          }
        }
      });
      
      changes.on('error', (err) => {
        console.error('Changes feed error:', err);
      });
    },
    
    /**
     * Validation du formulaire
     * @returns {boolean}
     */
    validateForm() {
      // Réinitialiser l'erreur
      this.error = null;
      
      // Validation des champs requis
      const required = ['nom', 'email', 'host', 'port', 'username', 'password', 'from_email'];
      
      for (const field of required) {
        if (!this.newProfil[field] || this.newProfil[field].toString().trim() === '') {
          this.error = `Le champ ${field} est requis`;
          return false;
        }
      }
      
      // Validation email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.newProfil.email)) {
        this.error = 'Email invalide';
        return false;
      }
      
      // Validation port
      const port = parseInt(this.newProfil.port);
      if (isNaN(port) || port < 1 || port > 65535) {
        this.error = 'Port invalide (1-65535)';
        return false;
      }
      
      return true;
    },
    
    /**
     * Crée un nouveau profil SMTP
     * Pattern local-first: écriture dans PouchDB local, réplication auto vers CouchDB
     */
    async createProfil() {
      // 1. Validation
      if (!this.validateForm()) {
        return;
      }
      
      // 2. Set loading state
      this.loading = true;
      this.error = null;
      
      try {
        // 3. Préparer le document CouchDB/PouchDB
        const profileDoc = {
          _id: generateProfileId(),
          type: 'smtp_profile',
          nom: this.newProfil.nom.trim(),
          email: this.newProfil.email.trim(),
          host: this.newProfil.host.trim(),
          port: parseInt(this.newProfil.port),
          secure: !!this.newProfil.secure,
          username: this.newProfil.username.trim(),
          password: this.newProfil.password, // Note: considérer le chiffrement côté serveur
          from_email: this.newProfil.from_email.trim(),
          from_name: (this.newProfil.from_name || '').trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // 4. Sauvegarder dans PouchDB local (déclenche la réplication live)
        const response = await this.db.put(profileDoc);
        
        // Vérifier si la sauvegarde a réussi
        if (!response.ok) {
          throw new Error('Erreur lors de la création du profil');
        }
        
        // Mettre à jour le document avec le _rev retourné
        profileDoc._rev = response.rev;
        
        // 5. Mettre à jour la liste locale (optimistic update)
        this.profils.unshift({ ...profileDoc });
        
        // 6. Fermer le formulaire
        this.showNewProfilForm = false;
        this.resetNewProfil();
        
        // 7. Notification succès
        Alpine.store('ui').addToast('Profil SMTP créé', 'success');
        
        // Note: La synchronisation vers CouchDB se fait automatiquement
        // via le handler db.sync() configuré dans initPouchDB()
        
      } catch (err) {
        // Gestion des erreurs spécifiques PouchDB/CouchDB
        let errorMessage = err.message;
        
        if (err.status === 409) {
          errorMessage = 'Conflit: ce profil existe déjà ou a été modifié';
          // Essayer de résoudre le conflit
          await resolveConflicts(this.db, this.newProfil._id);
        } else if (err.status === 401) {
          errorMessage = 'Erreur d\'authentification CouchDB';
        } else if (err.status === 403) {
          errorMessage = 'Permission refusée par CouchDB';
        } else if (!navigator.onLine) {
          errorMessage = 'Hors ligne - les modifications seront synchronées à la reconnexion';
        }
        
        this.error = errorMessage;
        Alpine.store('ui').addToast(errorMessage, 'error');
        console.error('Create profile error:', err);
        
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Réinitialise le formulaire
     */
    resetNewProfil() {
      this.newProfil = {
        nom: '',
        email: '',
        host: '',
        port: 587,
        secure: true,
        username: '',
        password: '',
        from_email: '',
        from_name: ''
      };
    },
    
    /**
     * Nettoyage à la destruction du composant
     */
    destroy() {
      if (this.syncHandler) {
        this.syncHandler.cancel();
      }
      if (this.db) {
        this.db.close();
      }
    }
  };
}

/**
 * Fonction standalone exportée pour compatibilité
 * À utiliser dans le contexte Alpine.js: @click="createProfil()"
 * 
 * Cette fonction suppose que le contexte Alpine.js est disponible via `this`
 */
export async function createProfil() {
  // Cette fonction est conçue pour être appelée dans le contexte x-data
  // Elle délègue à la méthode du data model
  if (this.createProfil) {
    return await this.createProfil();
  }
  throw new Error('createProfil() must be called within Alpine.js x-data context');
}

/**
 * Utilitaires pour la gestion avancée des conflits
 */
export const conflictUtils = {
  /**
   * Récupère toutes les révisions d'un document (y compris les conflits)
   */
  async getAllRevisions(db, docId) {
    try {
      const doc = await db.get(docId, { conflicts: true });
      const revisions = [doc];
      
      if (doc._conflicts) {
        for (const rev of doc._conflicts) {
          const conflict = await db.get(docId, { rev });
          revisions.push(conflict);
        }
      }
      
      return revisions;
    } catch (err) {
      console.error('Error getting revisions:', err);
      return [];
    }
  },
  
  /**
   * Fusion manuelle de deux versions en conflit
   * Stratégie: fusion des champs non-conflictuels
   */
  mergeConflicts(base, mine, theirs) {
    const merged = { ...base };
    
    for (const key of Object.keys(mine)) {
      if (key.startsWith('_')) continue; // Ignorer les métadonnées
      
      if (JSON.stringify(mine[key]) === JSON.stringify(theirs[key])) {
        // Pas de conflit
        merged[key] = mine[key];
      } else if (JSON.stringify(base[key]) === JSON.stringify(theirs[key])) {
        // Ils n'ont pas modifié, je garde ma version
        merged[key] = mine[key];
      } else if (JSON.stringify(base[key]) === JSON.stringify(mine[key])) {
        // Je n'ai pas modifié, je prends leur version
        merged[key] = theirs[key];
      } else {
        // Conflit réel: stratégie last-write-wins sur timestamp
        const mineDate = new Date(mine.updatedAt || 0);
        const theirsDate = new Date(theirs.updatedAt || 0);
        merged[key] = mineDate > theirsDate ? mine[key] : theirs[key];
      }
    }
    
    merged.updatedAt = new Date().toISOString();
    return merged;
  }
};

// Export par défaut pour compatibilité ES modules
export default {
  initPouchDB,
  settingsSmtpPagePouchDB,
  createProfil,
  resolveConflicts,
  conflictUtils,
  POUCH_CONFIG,
  DESIGN_DOC
};
