/**
 * Workflow: Supprimer profil SMTP - Version PouchDB/CouchDB
 * 
 * Ce workflow gère la suppression d'un profil SMTP avec synchronisation live.
 * Architecture: Local-first avec réplication bidirectionnelle.
 * 
 * @dependencies PouchDB, Alpine.js
 */

// Configuration CouchDB
const COUCHDB_URL = 'http://localhost:5984';
const DB_NAME = 'smtp-profiles';
const REMOTE_DB_URL = `${COUCHDB_URL}/${DB_NAME}`;

/**
 * Initialise PouchDB local avec réplication live vers CouchDB
 * @returns {Object} Instance PouchDB et contrôleur de sync
 */
function initPouchDB() {
  // Création de la base locale
  const db = new PouchDB(DB_NAME);
  
  // Configuration de la réplication bidirectionnelle live
  const syncOptions = {
    live: true,
    retry: true,
    conflicts: true,           // Active la gestion des conflits
    include_docs: true,
    back_off_function: (delay) => {
      // Backoff exponentiel max 60s
      return Math.min(delay * 2, 60000);
    }
  };
  
  // État de synchronisation réactif pour Alpine.js
  const syncState = {
    status: 'initializing',   // 'initializing' | 'syncing' | 'active' | 'paused' | 'error' | 'offline'
    lastSyncedAt: null,
    pendingChanges: 0,
    direction: null,          // 'pull' | 'push' | 'both'
    error: null
  };
  
  // Démarrer la synchronisation bidirectionnelle
  const syncHandler = db.sync(REMOTE_DB_URL, syncOptions)
    .on('change', (info) => {
      // Changements reçus ou envoyés
      syncState.direction = info.direction; // 'push' ou 'pull'
      syncState.lastSyncedAt = new Date().toISOString();
      
      // Émettre événement pour rafraîchissement automatique
      document.dispatchEvent(new CustomEvent('pouchdb:change', { 
        detail: { direction: info.direction, change: info.change } 
      }));
    })
    .on('paused', (err) => {
      // Réplication en pause (attente de changements ou erreur réseau)
      syncState.status = err ? 'error' : 'paused';
      syncState.error = err || null;
      
      if (err) {
        console.log('[PouchDB] Réplication en pause - erreur réseau:', err);
        syncState.status = 'offline';
      } else {
        console.log('[PouchDB] Réplication active (à jour)');
        syncState.status = 'active';
      }
      
      document.dispatchEvent(new CustomEvent('pouchdb:sync-paused', { 
        detail: { error: err } 
      }));
    })
    .on('active', () => {
      // Réplication reprend
      syncState.status = 'syncing';
      syncState.error = null;
      console.log('[PouchDB] Réplication active en cours...');
      
      document.dispatchEvent(new CustomEvent('pouchdb:sync-active'));
    })
    .on('denied', (err) => {
      // Accès refusé par CouchDB (permissions)
      syncState.status = 'error';
      syncState.error = { type: 'denied', message: err.message };
      console.error('[PouchDB] Accès refusé:', err);
      
      document.dispatchEvent(new CustomEvent('pouchdb:sync-denied', { 
        detail: { error: err } 
      }));
    })
    .on('complete', (info) => {
      // Synchronisation terminée (normalement jamais avec live: true sauf cancel)
      syncState.status = 'complete';
      console.log('[PouchDB] Synchronisation terminée:', info);
    })
    .on('error', (err) => {
      // Erreur irrécupérable
      syncState.status = 'error';
      syncState.error = err;
      console.error('[PouchDB] Erreur de synchronisation:', err);
      
      document.dispatchEvent(new CustomEvent('pouchdb:sync-error', { 
        detail: { error: err } 
      }));
    });
  
  return { db, syncHandler, syncState };
}

/**
 * Récupère un document avec gestion des conflits
 * @param {Object} db - Instance PouchDB
 * @param {string} id - ID du document
 * @returns {Promise<Object>} Document avec métadonnées de conflit si applicable
 */
async function getWithConflicts(db, id) {
  try {
    const doc = await db.get(id, { conflicts: true });
    
    // Vérifier s'il y a des conflits
    if (doc._conflicts && doc._conflicts.length > 0) {
      console.warn(`[PouchDB] Conflits détectés pour ${id}:`, doc._conflicts);
      
      // Récupérer toutes les révisions en conflit
      const conflictRevs = await Promise.all(
        doc._conflicts.map(rev => db.get(id, { rev }))
      );
      
      doc._conflictRevisions = conflictRevs;
    }
    
    return doc;
  } catch (error) {
    if (error.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Supprime un document avec gestion des conflits (soft delete via _deleted)
 * @param {Object} db - Instance PouchDB
 * @param {string} id - ID du document à supprimer
 * @returns {Promise<Object>} Résultat de la suppression
 */
async function deleteDocument(db, id) {
  const doc = await getWithConflicts(db, id);
  
  if (!doc) {
    throw new Error('Document non trouvé');
  }
  
  // Suppression logique (flag deleted) pour pouvoir restaurer si conflit
  // ou suppression physique avec _deleted: true
  const deletionDoc = {
    _id: doc._id,
    _rev: doc._rev,
    _deleted: true,
    deletedAt: new Date().toISOString(),
    deletedBy: 'current-user' // À remplacer par l'utilisateur authentifié
  };
  
  const result = await db.put(deletionDoc);
  
  // Si conflits existent, les résoudre automatiquement (supprimer aussi)
  if (doc._conflicts && doc._conflicts.length > 0) {
    await Promise.all(
      doc._conflicts.map(rev => 
        db.remove(id, rev).catch(err => 
          console.warn(`[PouchDB] Impossible de supprimer conflit ${rev}:`, err)
        )
      )
    );
  }
  
  return {
    success: true,
    id: result.id,
    rev: result.rev,
    deleted: true
  };
}

/**
 * Crée un _design document pour les vues Mango Query si nécessaire
 * @param {Object} db - Instance PouchDB
 */
async function setupDesignDocuments(db) {
  const designDoc = {
    _id: '_design/smtp-profiles',
    views: {
      'by-name': {
        map: function(doc) {
          if (doc.type === 'smtp-profile' && !doc._deleted) {
            emit(doc.nom, doc);
          }
        }.toString()
      },
      'by-created-at': {
        map: function(doc) {
          if (doc.type === 'smtp-profile' && !doc._deleted) {
            emit(doc.createdAt, doc);
          }
        }.toString()
      }
    },
    filters: {
      'no-deleted': function(doc, req) {
        return !doc._deleted;
      }.toString()
    }
  };
  
  try {
    const existing = await db.get('_design/smtp-profiles');
    designDoc._rev = existing._rev;
    await db.put(designDoc);
    console.log('[PouchDB] Design document mis à jour');
  } catch (err) {
    if (err.status === 404) {
      await db.put(designDoc);
      console.log('[PouchDB] Design document créé');
    }
  }
}

/**
 * Récupère tous les profils non supprimés depuis PouchDB local
 * Pattern local-first: lecture toujours depuis la base locale
 * @param {Object} db - Instance PouchDB
 * @returns {Promise<Array>} Liste des profils SMTP
 */
async function getAllProfils(db) {
  // Utilisation de Mango Query (requête find) pour filtrer les _deleted
  try {
    const result = await db.find({
      selector: {
        type: 'smtp-profile',
        _deleted: { $exists: false }
      },
      sort: [{ nom: 'asc' }]
    });
    
    return result.docs || [];
  } catch (error) {
    // Fallback sur allDocs si find n'est pas disponible
    const result = await db.allDocs({ 
      include_docs: true, 
      conflicts: true 
    });
    
    return result.rows
      .map(row => row.doc)
      .filter(doc => doc.type === 'smtp-profile' && !doc._deleted);
  }
}

// ============================================================================
// ALPINE.JS INTEGRATION
// ============================================================================

/**
 * Data model pour la page settings-smtp avec PouchDB
 * À utiliser dans x-data="settingsSmtpPagePouchDB()"
 */
export function settingsSmtpPagePouchDB() {
  return {
    // === DONNÉES ===
    profils: [],
    deletingProfil: null,
    loading: false,
    error: null,
    
    // === POUCHDB SYNC STATE ===
    db: null,
    syncHandler: null,
    syncStatus: 'initializing',     // 'initializing' | 'syncing' | 'active' | 'paused' | 'error' | 'offline'
    lastSyncedAt: null,
    pendingChanges: 0,
    isOnline: true,
    
    // === INITIALISATION ===
    async init() {
      console.log('[CHECKPOINT] Initialisation Settings SMTP avec PouchDB');
      
      // Initialiser PouchDB avec sync live
      const { db, syncHandler, syncState } = initPouchDB();
      this.db = db;
      this.syncHandler = syncHandler;
      
      // Synchroniser l'état de sync avec Alpine (réactivité)
      this.$watch('syncStatus', () => {});
      
      // Écouter les changements de sync
      document.addEventListener('pouchdb:sync-active', () => {
        this.syncStatus = 'syncing';
        this.isOnline = true;
      });
      
      document.addEventListener('pouchdb:sync-paused', (e) => {
        if (e.detail.error) {
          this.syncStatus = 'offline';
          this.isOnline = false;
        } else {
          this.syncStatus = 'active';
        }
      });
      
      document.addEventListener('pouchdb:change', (e) => {
        this.lastSyncedAt = new Date().toLocaleTimeString();
        // Rafraîchir la liste si changement externe
        if (e.detail.direction === 'pull') {
          this.loadProfils();
        }
      });
      
      // Charger les données locales (local-first)
      await this.loadProfils();
      
      // Setup les design documents pour les vues
      await setupDesignDocuments(db);
      
      // Écouter les changements PouchDB pour mises à jour en temps réel
      const changes = this.db.changes({
        since: 'now',
        live: true,
        include_docs: true,
        conflicts: true
      }).on('change', (change) => {
        console.log('[PouchDB] Changement détecté:', change);
        
        // Rafraîchir la liste si changement sur un profil
        if (change.doc && change.doc.type === 'smtp-profile') {
          this.loadProfils();
        }
        
        // Gérer les conflits si détectés
        if (change.doc && change.doc._conflicts) {
          console.warn('[PouchDB] Conflit détecté:', change.doc._conflicts);
          this.handleConflict(change.doc);
        }
      });
      
      // Cleanup on destroy
      this.$cleanup = () => {
        changes.cancel();
        if (this.syncHandler) {
          this.syncHandler.cancel();
        }
      };
    },
    
    // === CRUD OPERATIONS ===
    
    /**
     * Charge les profils depuis PouchDB local (pattern local-first)
     */
    async loadProfils() {
      this.loading = true;
      try {
        // Lecture toujours depuis la base locale
        this.profils = await getAllProfils(this.db);
        console.log('[CHECKPOINT] Profils chargés depuis PouchDB local:', this.profils.length);
      } catch (error) {
        console.error('[PouchDB] Erreur chargement:', error);
        this.error = error.message;
        this.$store.ui?.addToast?.('Erreur chargement profils', 'error');
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Affiche la modale de confirmation de suppression
     * Stocke le profil à supprimer localement
     * @param {Object} profil - Profil à supprimer
     */
    confirmDeleteProfil(profil) {
      console.log('[CHECKPOINT] Affichage confirmation suppression:', profil._id || profil.id);
      
      // Stocker le profil à supprimer (avec _id PouchDB)
      this.deletingProfil = profil;
      
      // Afficher modal confirmation via store UI global
      Alpine.store('ui').modals.confirmation = {
        show: true,
        title: 'Supprimer le profil SMTP',
        message: `Confirmer la suppression de "${profil.nom}" ?`,
        onConfirm: () => this.deleteProfilPouchDB()
      };
    },
    
    /**
     * Exécute la suppression effective via PouchDB
     * Pattern: Suppression locale d'abord, réplication automatique vers CouchDB
     */
    async deleteProfilPouchDB() {
      if (!this.deletingProfil) {
        console.error('[CHECKPOINT] Aucun profil à supprimer');
        return;
      }
      
      this.loading = true;
      this.error = null;
      
      // Utiliser _id CouchDB/PouchDB
      const docId = this.deletingProfil._id || this.deletingProfil.id;
      
      console.log('[CHECKPOINT] Suppression PouchDB - ID:', docId);
      
      try {
        // 1. Supprimer dans PouchDB local (avec réplication live vers CouchDB)
        const result = await deleteDocument(this.db, docId);
        
        if (!result.success) {
          throw new Error('Échec de la suppression');
        }
        
        console.log('[CHECKPOINT] Document supprimé:', result);
        
        // 2. Mettre à jour la liste locale immédiatement (optimistic UI)
        // Le changement event va aussi rafraîchir, mais on accélère l'UI
        this.profils = this.profils.filter(p => 
          (p._id || p.id) !== docId
        );
        
        // 3. Fermer la modale
        Alpine.store('ui').modals.confirmation.show = false;
        
        // 4. Reset
        this.deletingProfil = null;
        
        // 5. Notification succès
        Alpine.store('ui').addToast('Profil SMTP supprimé', 'success');
        
        // La suppression est déjà répliquée vers CouchDB automatiquement
        // grâce à la sync live configurée dans init()
        
      } catch (error) {
        console.error('[CHECKPOINT] Erreur suppression PouchDB:', error);
        this.error = error.message;
        Alpine.store('ui').addToast(error.message, 'error');
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Gestion des conflits de réplication
     * Stratégie: Conserver la suppression si le document est marqué _deleted
     * @param {Object} doc - Document en conflit
     */
    async handleConflict(doc) {
      if (!doc._conflicts || doc._conflicts.length === 0) return;
      
      console.log('[PouchDB] Résolution conflit pour:', doc._id);
      
      try {
        // Pour une suppression, on supprime toutes les révisions alternatives
        await Promise.all(
          doc._conflicts.map(rev => 
            this.db.remove(doc._id, rev).catch(err => 
              console.warn(`[PouchDB] Impossible de résoudre conflit ${rev}:`, err)
            )
          )
        );
        
        console.log('[PouchDB] Conflits résolus pour:', doc._id);
      } catch (error) {
        console.error('[PouchDB] Erreur résolution conflit:', error);
      }
    },
    
    /**
     * Force une synchronisation manuelle (utile après reconnexion)
     */
    async forceSync() {
      this.syncStatus = 'syncing';
      try {
        await this.db.sync(REMOTE_DB_URL, { 
          retry: true, 
          conflicts: true 
        });
        this.syncStatus = 'active';
        this.$store.ui?.addToast?.('Synchronisation effectuée', 'success');
      } catch (error) {
        this.syncStatus = 'error';
        console.error('[PouchDB] Erreur sync forcée:', error);
      }
    },
    
    /**
     * Annule la suppression en cours
     */
    cancelDelete() {
      this.deletingProfil = null;
      Alpine.store('ui').modals.confirmation.show = false;
      console.log('[CHECKPOINT] Suppression annulée');
    },
    
    // === COMPUTED ===
    
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
    
    // === UTILITAIRES ===
    
    /**
     * Vérifie si un document existe en local
     * @param {string} id - ID du document
     */
    async exists(id) {
      try {
        await this.db.get(id);
        return true;
      } catch (error) {
        return false;
      }
    }
  };
}

// Export pour usage module
export {
  initPouchDB,
  getAllProfils,
  deleteDocument,
  getWithConflicts,
  setupDesignDocuments
};

// Export global pour usage script tag
if (typeof window !== 'undefined') {
  window.settingsSmtpPagePouchDB = settingsSmtpPagePouchDB;
}
