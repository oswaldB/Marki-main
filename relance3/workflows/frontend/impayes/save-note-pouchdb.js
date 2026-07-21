/**
 * Workflow: Sauvegarder une note (PouchDB Version)
 * 
 * Architecture: Local-First avec réplication live vers CouchDB
 * - Toutes les lectures depuis PouchDB local (IndexedDB)
 * - Écritures vers PouchDB local, réplication async vers CouchDB
 * - Gestion des conflits et états offline/online
 * 
 * @screen impayes
 * @type frontend
 * @sync_mode live
 */

import { PouchDBService } from '../shared/pouchdb-service.js';

/**
 * @action Initialiser PouchDB et configurer la réplication live
 * @checkpoint pouchdb-initialized
 */
export function impayesPagePouchDB() {
  return {
    // === Données Alpine.js (conservées) ===
    impayes: [],
    selectedImpaye: null,
    noteContent: '',
    showNoteModal: false,
    loading: false,
    error: null,
    
    // === État de synchronisation PouchDB ===
    syncStatus: {
      status: 'initializing', // 'initializing' | 'connecting' | 'online' | 'offline' | 'syncing' | 'synced' | 'error'
      lastSync: null,
      pendingChanges: 0,
      error: null,
      isOnline: navigator.onLine,
      isSyncing: false
    },
    
    // === Instances PouchDB ===
    localDB: null,
    remoteDB: null,
    syncHandler: null,
    
    /**
     * @action Initialiser la connexion PouchDB et la réplication
     * @checkpoint sync-initialized
     */
    async init() {
      try {
        // Configuration CouchDB
        const COUCHDB_URL = window.env?.COUCHDB_URL || 'http://localhost:5984/impayes';
        const COUCHDB_AUTH = {
          username: window.env?.COUCHDB_USER || 'admin',
          password: window.env?.COUCHDB_PASS || 'password'
        };
        
        // Initialiser PouchDB local (IndexedDB)
        this.localDB = new PouchDB('impayes_local', {
          auto_compaction: true,
          revs_limit: 50
        });
        
        // Initialiser PouchDB remote (CouchDB)
        this.remoteDB = new PouchDB(COUCHDB_URL, {
          auth: COUCHDB_AUTH
        });
        
        // Créer les index Mango (_design documents)
        await this.createIndexes();
        
        // Démarrer la réplication live bidirectionnelle
        await this.startLiveSync();
        
        // Charger les données initiales depuis PouchDB local
        await this.loadImpayes();
        
        // Écouter les changements réseau
        window.addEventListener('online', () => this.handleNetworkChange(true));
        window.addEventListener('offline', () => this.handleNetworkChange(false));
        
        this.syncStatus.status = 'online';
        
      } catch (err) {
        console.error('[PouchDB] Init error:', err);
        this.syncStatus = {
          ...this.syncStatus,
          status: 'error',
          error: err.message
        };
      }
    },
    
    /**
     * @action Créer les index Mango pour les requêtes
     * @checkpoint mango-indexes-created
     */
    async createIndexes() {
      try {
        // Index sur type pour filtrer les impayés
        await this.localDB.createIndex({
          index: {
            fields: ['type'],
            name: 'idx-type',
            ddoc: 'impayes-indexes'
          }
        });
        
        // Index sur updated_at pour le tri
        await this.localDB.createIndex({
          index: {
            fields: ['updated_at'],
            name: 'idx-updated',
            ddoc: 'impayes-indexes'
          }
        });
        
        // Index sur is_suspended pour filtrer
        await this.localDB.createIndex({
          index: {
            fields: ['is_suspended'],
            name: 'idx-suspended',
            ddoc: 'impayes-indexes'
          }
        });
        
        // Index sur payeur_id pour les recherches
        await this.localDB.createIndex({
          index: {
            fields: ['payeur_id'],
            name: 'idx-payeurl',
            ddoc: 'impayes-indexes'
          }
        });
        
      } catch (err) {
        console.warn('[PouchDB] Index creation warning:', err);
        // Les index peuvent déjà exister, ce n'est pas critique
      }
    },
    
    /**
     * @action Démarrer la synchronisation live bidirectionnelle
     * @checkpoint live-sync-started
     */
    async startLiveSync() {
      const self = this;
      
      // Sync bidirectionnelle avec gestion des conflits
      this.syncHandler = this.localDB.sync(this.remoteDB, {
        live: true,
        retry: true,
        conflicts: true,  // IMPORTANT: Activer la gestion des conflits
        back_off_function: function (delay) {
          if (delay === 0) {
            return 1000;
          }
          return Math.min(delay * 2, 60000); // Max 60s
        }
      })
      .on('change', function (info) {
        // Changement reçu ou envoyé
        self.syncStatus.pendingChanges = info.change?.pending || 0;
        
        // Si des changements sont arrivés, recharger
        if (info.direction === 'pull') {
          self.loadImpayes();
        }
      })
      .on('paused', function (err) {
        // Réplication en pause (soit à jour, soit offline)
        self.syncStatus.isSyncing = false;
        
        if (err) {
          self.syncStatus.status = 'offline';
          self.syncStatus.error = err.message;
        } else {
          self.syncStatus.status = navigator.onLine ? 'synced' : 'offline';
          self.syncStatus.lastSync = new Date().toISOString();
          self.syncStatus.error = null;
        }
      })
      .on('active', function () {
        // Réplication active
        self.syncStatus.status = 'syncing';
        self.syncStatus.isSyncing = true;
        self.syncStatus.error = null;
      })
      .on('denied', function (err) {
        // Permission refusée
        console.error('[PouchDB] Sync denied:', err);
        self.syncStatus.status = 'error';
        self.syncStatus.error = 'Permission refusée: ' + err.message;
      })
      .on('complete', function (info) {
        // Sync terminée (normalement jamais avec live: true)
        self.syncStatus.isSyncing = false;
      })
      .on('error', function (err) {
        // Erreur de réplication
        console.error('[PouchDB] Sync error:', err);
        self.syncStatus.status = 'error';
        self.syncStatus.error = err.message;
      });
    },
    
    /**
     * @action Gérer les changements de connectivité
     */
    handleNetworkChange(isOnline) {
      this.syncStatus.isOnline = isOnline;
      this.syncStatus.status = isOnline ? 'syncing' : 'offline';
      
      if (isOnline) {
        Alpine.store('ui')?.addToast('Connexion rétablie - Synchronisation...', 'info');
      } else {
        Alpine.store('ui')?.addToast('Mode hors ligne - Les modifications seront synchronées plus tard', 'warning');
      }
    },
    
    /**
     * @action Charger les impayés depuis PouchDB local (local-first)
     * @checkpoint data-loaded-local
     */
    async loadImpayes() {
      try {
        // Requête Mango sur PouchDB local
        const result = await this.localDB.find({
          selector: {
            type: { $eq: 'impaye' }
          },
          sort: [{ updated_at: 'desc' }]
        });
        
        this.impayes = result.docs || [];
        
      } catch (err) {
        console.error('[PouchDB] Load error:', err);
        this.error = 'Erreur chargement: ' + err.message;
      }
    },
    
    /**
     * @action Sauvegarder une note (Pattern Local-First)
     * @checkpoint note-saved-local
     */
    async saveNote(impayeId, content) {
      // 1. Validation
      if (!content || !content.trim()) {
        Alpine.store('ui').addToast('La note ne peut pas être vide', 'error');
        return;
      }
      
      // 2. Set loading state
      this.loading = true;
      this.error = null;
      
      try {
        // 3. Récupérer le document depuis PouchDB local avec gestion des conflits
        const doc = await this.localDB.get(impayeId, { 
          conflicts: true  // IMPORTANT: Récupérer les conflits
        });
        
        // 4. Gérer les conflits s'ils existent
        if (doc._conflicts && doc._conflicts.length > 0) {
          await this.resolveConflicts(impayeId, doc);
          // Recharger le document après résolution
          const updatedDoc = await this.localDB.get(impayeId);
          Object.assign(doc, updatedDoc);
        }
        
        // 5. Créer la nouvelle note avec ID CouchDB
        const newNote = {
          _id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          content: content.trim(),
          created_by: Alpine.store('auth')?.user?.id || 'anonymous',
          created_by_name: Alpine.store('auth')?.user?.name || 'Utilisateur',
          created_at: new Date().toISOString(),
          type: 'note'
        };
        
        // 6. Fusionner avec les notes existantes
        const updatedNotes = [...(doc.notes || []), newNote];
        
        // 7. Préparer le document pour mise à jour (CouchDB _rev obligatoire)
        const updatedDoc = {
          ...doc,
          notes: updatedNotes,
          updated_at: new Date().toISOString(),
          // Conserver _id et _rev pour CouchDB
          _id: doc._id,
          _rev: doc._rev
        };
        
        // 8. Écrire dans PouchDB local (instantané)
        const putResult = await this.localDB.put(updatedDoc);
        
        if (!putResult.ok) {
          throw new Error('Échec de la sauvegarde locale');
        }
        
        // 9. Mettre à jour l'UI immédiatement (local-first)
        const index = this.impayes.findIndex(item => item._id === impayeId);
        if (index !== -1) {
          this.impayes[index] = {
            ...this.impayes[index],
            notes: updatedNotes,
            updated_at: updatedDoc.updated_at,
            _rev: putResult.rev  // Mettre à jour la révision
          };
        }
        
        // Mettre à jour selectedImpaye si ouvert
        if (this.selectedImpaye && this.selectedImpaye._id === impayeId) {
          this.selectedImpaye = {
            ...this.selectedImpaye,
            notes: updatedNotes,
            updated_at: updatedDoc.updated_at,
            _rev: putResult.rev
          };
        }
        
        // 10. Réinitialiser le formulaire
        this.showNoteModal = false;
        this.noteContent = '';
        
        // 11. Notification succès
        Alpine.store('ui').addToast('Note ajoutée (en attente de sync)', 'success');
        
        // 12. La réplication vers CouchDB se fait automatiquement en arrière-plan
        console.log('[PouchDB] Note saved locally, sync queued:', putResult);
        
      } catch (err) {
        // Gestion spécifique du conflit de révision (409)
        if (err.status === 409 || err.name === 'conflict') {
          this.error = 'Conflit de version détecté. Résolution automatique...';
          Alpine.store('ui').addToast('Conflit détecté, résolution en cours...', 'warning');
          
          // Réessayer après résolution
          await this.resolveConflicts(impayeId);
          return this.saveNote(impayeId, content);
        }
        
        console.error('[PouchDB] Save error:', err);
        this.error = err.message;
        Alpine.store('ui').addToast('Erreur: ' + err.message, 'error');
        
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * @action Résoudre les conflits de réplication (Stratégie LWW)
     * @checkpoint conflicts-resolved
     */
    async resolveConflicts(docId, doc = null) {
      try {
        // Récupérer le document avec toutes ses révisions conflictuelles
        const currentDoc = doc || await this.localDB.get(docId, { conflicts: true });
        
        if (!currentDoc._conflicts || currentDoc._conflicts.length === 0) {
          return; // Pas de conflits
        }
        
        console.log(`[PouchDB] Resolving ${currentDoc._conflicts.length} conflicts for`, docId);
        
        // Récupérer toutes les révisions conflictuelles
        const conflicts = await Promise.all(
          currentDoc._conflicts.map(rev => 
            this.localDB.get(docId, { rev: rev })
          )
        );
        
        // Stratégie: Last Write Wins (LWW) basé sur updated_at
        const allVersions = [currentDoc, ...conflicts];
        const winner = allVersions.reduce((latest, current) => {
          const latestDate = new Date(latest.updated_at || 0);
          const currentDate = new Date(current.updated_at || 0);
          return currentDate > latestDate ? current : latest;
        });
        
        // Fusionner les notes si nécessaire (pour ne pas perdre de données)
        const allNotes = allVersions.flatMap(v => v.notes || []);
        const uniqueNotes = [...new Map(allNotes.map(n => [n._id || n.id, n])).values()];
        
        winner.notes = uniqueNotes.sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
        );
        
        // Supprimer les révisions conflictuelles
        for (const conflictRev of currentDoc._conflicts) {
          try {
            await this.localDB.remove(docId, conflictRev);
          } catch (e) {
            console.warn('[PouchDB] Could not remove conflict:', e);
          }
        }
        
        // Sauvegarder la version gagnante
        await this.localDB.put(winner);
        
        console.log('[PouchDB] Conflicts resolved for', docId);
        
      } catch (err) {
        console.error('[PouchDB] Conflict resolution error:', err);
        throw err;
      }
    },
    
    /**
     * @action Ouvrir le modal de note
     */
    openNoteModal(impaye) {
      this.selectedImpaye = impaye;
      this.noteContent = '';
      this.showNoteModal = true;
    },
    
    /**
     * @action Fermer le modal de note
     */
    closeNoteModal() {
      this.showNoteModal = false;
      this.noteContent = '';
      this.selectedImpaye = null;
    },
    
    /**
     * @action Getter: Notes triées pour l'affichage
     */
    get sortedNotes() {
      const impaye = this.selectedImpaye;
      if (!impaye || !impaye.notes) return [];
      
      // Tri par date décroissante (plus récente en premier)
      return [...impaye.notes].sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
    },
    
    /**
     * @action Détruire proprement les ressources
     */
    destroy() {
      if (this.syncHandler) {
        this.syncHandler.cancel();
      }
      window.removeEventListener('online', this.handleNetworkChange);
      window.removeEventListener('offline', this.handleNetworkChange);
    }
  };
}

// Export pour utilisation directe
export default impayesPagePouchDB;
