/**
 * WORKFLOW : Éditer Profil SMTP (PouchDB + CouchDB)
 * ================================================
 * Adaptation du workflow frontend edit-profil pour PouchDB local-first
 * 
 * RÈGLES IMPLÉMENTÉES:
 * ✓ PouchDB local-first, réplication bidirectionnelle live
 * ✓ Remplacement des lectures par db.get, db.query
 * ✓ Synchronisation bidirectionnelle avec db.sync()
 * ✓ Gestion des conflits (conflicts: true)
 * ✓ Design documents pour vues Mango
 * ✓ Pattern local-first: lectures locales, écritures locales → réplication
 * ✓ Gestion offline/online (events paused/active)
 * ✓ Structure Alpine.js x-data préservée
 * ✓ Propriété syncStatus pour suivre l'état
 * ✓ IDs CouchDB (_id) et révisions (_rev) gérés
 * 
 * @checkpoint wf-init
 * @checkpoint wf-db-ready
 * @checkpoint wf-design-docs
 * @checkpoint wf-sync-active
 * @checkpoint wf-profil-loaded
 * @checkpoint wf-profil-saved
 * @checkpoint wf-complete
 * @checkpoint wf-error
 */

// ============================================
// CONFIGURATION COUCHDB
// ============================================
const COUCHDB_CONFIG = {
  url: window.location.hostname === 'localhost' 
    ? 'http://admin:admin@localhost:5984'
    : 'https://admin:admin@dev.markidiags.com/data',
  dbName: 'marki_database',
  options: {
    live: true,        // Réplication continue
    retry: true,       // Reconnexion automatique
    heartbeat: 10000,  // Ping toutes les 10s
    timeout: 30000     // Timeout de 30s
  }
};

// ============================================
// DESIGN DOCUMENTS (Vues Mango pour Profils SMTP)
// ============================================
const DESIGN_DOCS = [
  {
    _id: '_design/smtp_profiles',
    views: {
      // Vue: tous les profils SMTP
      all: {
        map: function(doc) {
          if (doc.type === 'smtp_profile') {
            emit(doc._id, doc);
          }
        }.toString()
      },
      // Vue: profils par nom
      by_name: {
        map: function(doc) {
          if (doc.type === 'smtp_profile' && doc.name) {
            emit(doc.name.toLowerCase(), doc);
          }
        }.toString()
      },
      // Vue: profils actifs uniquement
      active: {
        map: function(doc) {
          if (doc.type === 'smtp_profile' && doc.active === true) {
            emit(doc.name, doc);
          }
        }.toString()
      },
      // Vue: profils par fournisseur
      by_provider: {
        map: function(doc) {
          if (doc.type === 'smtp_profile' && doc.provider) {
            emit(doc.provider, doc);
          }
        }.toString()
      }
    }
  },
  {
    _id: '_design/logs',
    views: {
      // Vue: logs par entité
      by_entity: {
        map: function(doc) {
          if (doc.type === 'log' && doc.entity_type && doc.entity_id) {
            emit([doc.entity_type, doc.entity_id, doc.createdAt], doc);
          }
        }.toString()
      },
      // Vue: logs par action
      by_action: {
        map: function(doc) {
          if (doc.type === 'log' && doc.action) {
            emit(doc.action, doc);
          }
        }.toString()
      }
    }
  }
];

// ============================================
// WORKFLOW ÉDITER PROFIL SMTP - POUCHDB
// ============================================
function editProfilSmtpWorkflow() {
  return {
    // ========================================
    // ÉTAT: Données (RÈGLE #8: Alpine.js x-data)
    // ========================================
    profil: null,              // Profil SMTP en cours d'édition
    profilId: null,            // ID du profil (_id CouchDB)
    profilOriginal: null,      // Copie du profil avant édition (pour annuler)
    profils: [],               // Liste de tous les profils
    
    // Données du formulaire
    newProfil: {               // Formulaire d'édition/création
      _id: null,               // RÈGLE #10: ID CouchDB
      _rev: null,              // RÈGLE #10: Révision CouchDB
      type: 'smtp_profile',    // Type pour filtrage vues
      name: '',
      host: '',
      port: 587,
      secure: false,
      auth: {
        user: '',
        pass: ''
      },
      from: '',
      active: true,
      provider: '',
      description: '',
      createdAt: null,
      updatedAt: null
    },
    
    // Test SMTP
    testingProfil: false,      // Test en cours
    testResult: null,          // Résultat du test
    testError: null,           // Erreur de test
    
    // ========================================
    // ÉTAT: Synchronisation (RÈGLE #9)
    // ========================================
    syncStatus: 'initial',     // 'initial' | 'syncing' | 'paused' | 'error' | 'complete'
    isOnline: navigator.onLine,
    lastSync: null,
    pendingChanges: 0,
    conflicts: [],             // Documents en conflit
    
    // ========================================
    // ÉTAT: UI
    // ========================================
    loading: true,
    saving: false,             // Sauvegarde en cours
    error: null,
    successMessage: null,
    showNewProfilForm: false,  // Modal formulaire visible
    isEditing: false,          // Mode édition vs création
    
    // ========================================
    // INSTANCES POUCHDB (RÈGLE #1)
    // ========================================
    localDB: null,             // PouchDB local (IndexedDB)
    remoteDB: null,            // PouchDB remote (CouchDB)
    syncHandler: null,         // Handler de réplication
    
    // ========================================
    // INITIALISATION
    // ========================================
    
    /**
     * @action Initialiser PouchDB et démarrer la réplication
     * @checkpoint wf-init
     */
    async init() {
      console.log('[CHECKPOINT] wf-init');
      this.loading = true;
      this.error = null;
      
      try {
        // 1. Initialiser PouchDB local (RÈGLE #1)
        this.localDB = new PouchDB(COUCHDB_CONFIG.dbName);
        console.log('[POUCHDB] Base locale initialisée:', COUCHDB_CONFIG.dbName);
        
        // 2. Initialiser PouchDB remote (RÈGLE #1)
        const remoteUrl = `${COUCHDB_CONFIG.url}/${COUCHDB_CONFIG.dbName}`;
        this.remoteDB = new PouchDB(remoteUrl, { skip_setup: true });
        console.log('[POUCHDB] Base remote initialisée:', remoteUrl);
        
        console.log('[CHECKPOINT] wf-db-ready');
        
        // 3. Créer les design documents (RÈGLE #5)
        await this.ensureDesignDocs();
        console.log('[CHECKPOINT] wf-design-docs');
        
        // 4. Configurer la réplication bidirectionnelle (RÈGLE #3)
        await this.setupReplication();
        console.log('[CHECKPOINT] wf-sync-active');
        
        // 5. Charger la liste des profils (RÈGLE #6)
        await this.loadProfils();
        
        // 6. Configurer les écouteurs réseau (RÈGLE #7)
        this.setupNetworkListeners();
        
        this.loading = false;
        console.log('[CHECKPOINT] wf-complete');
        
      } catch (err) {
        console.error('[CHECKPOINT] wf-error', err);
        this.error = err.message;
        this.syncStatus = 'error';
        this.loading = false;
      }
    },
    
    /**
     * @action Créer/mettre à jour les design documents (RÈGLE #5)
     */
    async ensureDesignDocs() {
      for (const doc of DESIGN_DOCS) {
        try {
          const existing = await this.localDB.get(doc._id);
          // Mettre à jour si les vues ont changé
          if (JSON.stringify(existing.views) !== JSON.stringify(doc.views)) {
            await this.localDB.put({
              ...doc,
              _rev: existing._rev
            });
            console.log('[DESIGN DOC] Mis à jour:', doc._id);
          }
        } catch (err) {
          if (err.status === 404) {
            // Créer le design document
            await this.localDB.put(doc);
            console.log('[DESIGN DOC] Créé:', doc._id);
          } else {
            throw err;
          }
        }
      }
    },
    
    /**
     * @action Configurer la réplication bidirectionnelle (RÈGLE #3)
     */
    async setupReplication() {
      console.log('[SYNC] Démarrage réplication bidirectionnelle...');
      this.syncStatus = 'syncing';
      
      // Réplication bidirectionnelle avec sync (RÈGLE #3)
      this.syncHandler = this.localDB.sync(this.remoteDB, {
        live: COUCHDB_CONFIG.options.live,
        retry: COUCHDB_CONFIG.options.retry,
        heartbeat: COUCHDB_CONFIG.options.heartbeat,
        timeout: COUCHDB_CONFIG.options.timeout
      })
      .on('change', (info) => {
        // Changement reçu (push ou pull)
        console.log('[SYNC] Changement:', info);
        this.pendingChanges = info.change?.pending || 0;
        
        // Si des données arrivent du serveur, recharger les profils
        if (info.direction === 'pull' && info.change?.docs?.length > 0) {
          console.log('[SYNC] Données reçues du serveur:', info.change.docs.length);
          const hasSmtpDocs = info.change.docs.some(d => d.type === 'smtp_profile');
          if (hasSmtpDocs) {
            this.loadProfils();
          }
        }
      })
      .on('paused', (err) => {
        // Réplication en pause (RÈGLE #7)
        console.log('[SYNC] Réplication en pause');
        this.syncStatus = err ? 'error' : 'paused';
        this.lastSync = new Date().toISOString();
        
        if (err) {
          console.log('[SYNC] Pause due à une erreur:', err);
        }
      })
      .on('active', () => {
        // Réplication active (RÈGLE #7)
        console.log('[SYNC] Réplication active');
        this.syncStatus = 'syncing';
        this.isOnline = true;
      })
      .on('denied', (err) => {
        // Document rejeté (permissions)
        console.error('[SYNC] Document rejeté:', err);
        this.syncStatus = 'error';
      })
      .on('complete', (info) => {
        // Réplication terminée (si live: false)
        console.log('[SYNC] Réplication complète:', info);
        this.syncStatus = 'complete';
        this.lastSync = new Date().toISOString();
      })
      .on('error', (err) => {
        // Erreur de réplication
        console.error('[SYNC] Erreur réplication:', err);
        this.syncStatus = 'error';
        this.isOnline = false;
      });
    },
    
    // ========================================
    // OPÉRATIONS CRUD (RÈGLE #2)
    // ========================================
    
    /**
     * @action Charger tous les profils SMTP depuis PouchDB local (RÈGLE #6)
     * Utilise la vue Mango pour récupérer les documents
     */
    async loadProfils() {
      console.log('[DATA] Chargement profils SMTP...');
      
      try {
        // RÈGLE #2: Utiliser db.query avec vue Mango (RÈGLE #5)
        const result = await this.localDB.query('smtp_profiles/all', {
          include_docs: true,
          conflicts: true  // RÈGLE #4: Détecter les conflits
        });
        
        this.profils = result.rows.map(row => {
          const doc = row.doc;
          // Détecter les conflits
          if (doc._conflicts && doc._conflicts.length > 0) {
            console.warn('[CONFLICT] Conflit sur profil:', doc._id, doc._conflicts);
            this.conflicts.push({
              type: 'smtp_profile',
              id: doc._id,
              rev: doc._rev,
              conflictRevs: doc._conflicts
            });
          }
          
          return {
            ...doc,
            id: doc._id,  // Alias pour compatibilité
            hasConflicts: !!(doc._conflicts && doc._conflicts.length > 0)
          };
        });
        
        console.log('[DATA] Profils chargés:', this.profils.length);
        return this.profils;
        
      } catch (err) {
        console.error('[DATA] Erreur chargement profils:', err);
        // Si la vue n'existe pas encore, essayer allDocs
        if (err.status === 404) {
          return await this.loadProfilsWithAllDocs();
        }
        this.error = err.message;
        return [];
      }
    },
    
    /**
     * @action Fallback: Charger les profils avec allDocs (sans vue)
     * Utilisé si les design docs ne sont pas encore créés
     */
    async loadProfilsWithAllDocs() {
      console.log('[DATA] Chargement profils via allDocs...');
      
      try {
        const result = await this.localDB.allDocs({
          include_docs: true,
          conflicts: true,
          startkey: 'smtp_profile_',
          endkey: 'smtp_profile_\ufff0'
        });
        
        this.profils = result.rows
          .filter(row => row.doc && row.doc.type === 'smtp_profile')
          .map(row => ({
            ...row.doc,
            id: row.doc._id,
            hasConflicts: !!(row.doc._conflicts && row.doc._conflicts.length > 0)
          }));
        
        console.log('[DATA] Profils chargés (allDocs):', this.profils.length);
        return this.profils;
        
      } catch (err) {
        console.error('[DATA] Erreur chargement allDocs:', err);
        this.error = err.message;
        return [];
      }
    },
    
    /**
     * @action Charger un profil spécifique par ID (RÈGLE #2: db.get)
     * @param {string} id - _id CouchDB du profil
     * @checkpoint wf-profil-loaded
     */
    async loadProfil(id) {
      console.log('[DATA] Chargement profil:', id);
      
      try {
        // RÈGLE #6: Lecture depuis PouchDB local (RÈGLE #2: db.get)
        const doc = await this.localDB.get(id, { conflicts: true });
        
        // Vérifier que c'est bien un profil SMTP
        if (doc.type !== 'smtp_profile') {
          throw new Error('Ce document n\'est pas un profil SMTP');
        }
        
        this.profil = {
          ...doc,
          id: doc._id,
          hasConflicts: !!(doc._conflicts && doc._conflicts.length > 0)
        };
        
        // Alerte si conflits détectés (RÈGLE #4)
        if (doc._conflicts && doc._conflicts.length > 0) {
          console.warn('[CONFLICT] Conflits sur profil:', id, doc._conflicts);
          this.conflicts.push({
            type: 'smtp_profile',
            id: doc._id,
            rev: doc._rev,
            conflictRevs: doc._conflicts
          });
        }
        
        console.log('[CHECKPOINT] wf-profil-loaded:', this.profil._id);
        return this.profil;
        
      } catch (err) {
        console.error('[DATA] Erreur chargement profil:', err);
        this.error = err.status === 404 ? 'Profil non trouvé' : err.message;
        return null;
      }
    },
    
    /**
     * @action Ouvrir le formulaire d'édition d'un profil (adaptation du workflow original)
     * @param {Object} profil - Le profil à éditer (avec _id, _rev)
     * @checkpoint wf-profil-loaded
     * 
     * Cette méthode remplace l'original:
     * editProfil(profil) { this.newProfil = { ...profil }; this.showNewProfilForm = true; }
     */
    async editProfil(profil) {
      console.log('[WORKFLOW] Ouverture édition profil:', profil._id || profil.id);
      
      // Si le profil n'a pas de _rev, le charger depuis PouchDB pour avoir la révision
      if (!profil._rev && (profil._id || profil.id)) {
        const id = profil._id || profil.id;
        const fullProfil = await this.loadProfil(id);
        if (!fullProfil) {
          this.error = 'Impossible de charger le profil pour édition';
          return;
        }
        profil = fullProfil;
      }
      
      // Sauvegarder une copie du profil original (pour annuler)
      this.profilOriginal = JSON.parse(JSON.stringify(profil));
      this.profilId = profil._id || profil.id;
      
      // Cloner dans le formulaire (RÈGLE #10: Conserver _id et _rev)
      this.newProfil = {
        _id: profil._id || profil.id,
        _rev: profil._rev,
        type: 'smtp_profile',
        name: profil.name || '',
        host: profil.host || '',
        port: profil.port || 587,
        secure: profil.secure !== undefined ? profil.secure : false,
        auth: {
          user: profil.auth?.user || '',
          pass: profil.auth?.pass || ''
        },
        from: profil.from || '',
        active: profil.active !== undefined ? profil.active : true,
        provider: profil.provider || '',
        description: profil.description || '',
        createdAt: profil.createdAt || new Date().toISOString(),
        updatedAt: profil.updatedAt || new Date().toISOString()
      };
      
      this.isEditing = true;
      this.showNewProfilForm = true;
      this.error = null;
      this.successMessage = null;
      
      console.log('[CHECKPOINT] wf-profil-loaded (formulaire prêt)');
    },
    
    /**
     * @action Sauvegarder le profil (création ou mise à jour) (RÈGLE #2, #6, #10)
     * @checkpoint wf-profil-saved
     */
    async saveProfil() {
      console.log('[WORKFLOW] Sauvegarde profil:', this.newProfil._id);
      this.saving = true;
      this.error = null;
      
      try {
        // Validation
        if (!this.newProfil.name || !this.newProfil.host) {
          throw new Error('Le nom et l\'hôte SMTP sont requis');
        }
        
        // Préparer le document
        const doc = {
          ...this.newProfil,
          type: 'smtp_profile',
          updatedAt: new Date().toISOString()
        };
        
        // Pour une création, pas de _rev
        if (!this.isEditing) {
          delete doc._rev;
          doc._id = `smtp_profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          doc.createdAt = new Date().toISOString();
        }
        
        // RÈGLE #2: db.put pour création/mise à jour
        const result = await this.localDB.put(doc);
        
        console.log('[DATA] Profil sauvegardé:', result.id, 'rev:', result.rev);
        console.log('[CHECKPOINT] wf-profil-saved');
        
        // Mettre à jour l'objet formulaire avec la nouvelle révision
        this.newProfil._rev = result.rev;
        
        // Recharger la liste
        await this.loadProfils();
        
        // Créer un log de l'action
        await this.creerLog(this.isEditing ? 'update' : 'create', result.id);
        
        this.successMessage = this.isEditing 
          ? 'Profil modifié avec succès' 
          : 'Profil créé avec succès';
        
        // Fermer le formulaire après un délai
        setTimeout(() => {
          this.closeForm();
        }, 1500);
        
        return {
          success: true,
          id: result.id,
          rev: result.rev  // RÈGLE #10: Nouvelle révision
        };
        
      } catch (err) {
        if (err.status === 409) {
          // Conflit de révision (RÈGLE #4)
          console.error('[CONFLICT] Conflit de révision sur profil:', this.newProfil._id);
          return await this.handleProfilConflict();
        }
        
        console.error('[DATA] Erreur sauvegarde:', err);
        this.error = err.message;
        console.log('[CHECKPOINT] wf-error');
        return { success: false, error: err.message };
        
      } finally {
        this.saving = false;
      }
    },
    
    /**
     * @action Supprimer un profil SMTP
     * @param {string} id - ID du profil à supprimer
     */
    async deleteProfil(id) {
      console.log('[WORKFLOW] Suppression profil:', id);
      
      try {
        // Récupérer la révision actuelle
        const doc = await this.localDB.get(id);
        
        // RÈGLE #2: db.remove pour suppression
        const result = await this.localDB.remove(doc);
        
        console.log('[DATA] Profil supprimé:', result.id);
        
        // Recharger la liste
        await this.loadProfils();
        
        // Créer un log
        await this.creerLog('delete', id);
        
        this.successMessage = 'Profil supprimé avec succès';
        return { success: true };
        
      } catch (err) {
        console.error('[DATA] Erreur suppression:', err);
        this.error = err.message;
        return { success: false, error: err.message };
      }
    },
    
    /**
     * @action Créer un log de l'action (RÈGLE #2)
     */
    async creerLog(action, entityId) {
      console.log('[DATA] Création log:', action);
      
      const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const logDoc = {
        _id: logId,
        type: 'log',
        action: `smtp_profile_${action}`,
        entity_type: 'smtp_profile',
        entity_id: entityId,
        details: {
          profile_name: this.newProfil?.name,
          user_agent: navigator.userAgent
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      try {
        await this.localDB.put(logDoc);
        console.log('[DATA] Log créé:', logId);
      } catch (err) {
        // Log non critique, on ignore les erreurs
        console.warn('[DATA] Erreur création log (ignorée):', err);
      }
    },
    
    /**
     * @action Tester la connexion SMTP
     * @param {Object} profil - Profil à tester (optionnel, utilise newProfil par défaut)
     */
    async testProfil(profil = null) {
      const profilToTest = profil || this.newProfil;
      console.log('[WORKFLOW] Test SMTP:', profilToTest.host);
      
      this.testingProfil = true;
      this.testResult = null;
      this.testError = null;
      
      try {
        // Appel API pour tester le SMTP (cette partie reste une API car c'est une action serveur)
        const response = await fetch('/api/smtp/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host: profilToTest.host,
            port: profilToTest.port,
            secure: profilToTest.secure,
            auth: profilToTest.auth,
            from: profilToTest.from
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          this.testResult = result;
          this.successMessage = 'Connexion SMTP réussie';
        } else {
          this.testError = result.error || 'Test échoué';
        }
        
        return result;
        
      } catch (err) {
        console.error('[TEST] Erreur:', err);
        this.testError = err.message;
        return { success: false, error: err.message };
        
      } finally {
        this.testingProfil = false;
      }
    },
    
    // ========================================
    // GESTION DES CONFLITS (RÈGLE #4)
    // ========================================
    
    /**
     * @action Gérer les conflits sur le profil (RÈGLE #4)
     */
    async handleProfilConflict() {
      console.log('[CONFLICT] Résolution conflit pour profil:', this.profilId);
      
      try {
        // Récupérer toutes les révisions en conflit
        const doc = await this.localDB.get(this.profilId, { conflicts: true });
        const conflictRevs = doc._conflicts || [];
        
        if (conflictRevs.length === 0) {
          // Pas de conflit, réessayer simplement
          return await this.saveProfil();
        }
        
        // Stratégie: prendre la dernière version (notre édition actuelle)
        // mais fusionner avec les données importantes
        const mergedDoc = {
          ...this.newProfil,
          _rev: doc._rev,
          // Conserver les timestamps les plus récents
          updatedAt: new Date().toISOString()
        };
        
        // Supprimer les révisions en conflit
        for (const conflictRev of conflictRevs) {
          await this.localDB.remove(this.profilId, conflictRev);
          console.log('[CONFLICT] Révision supprimée:', conflictRev);
        }
        
        // Sauvegarder le document fusionné
        const result = await this.localDB.put(mergedDoc);
        
        // Mettre à jour la révision dans le formulaire
        this.newProfil._rev = result.rev;
        
        console.log('[CONFLICT] Conflit résolu sur profil:', this.profilId);
        
        // Recharger la liste
        await this.loadProfils();
        
        this.successMessage = 'Profil modifié (conflit résolu)';
        
        return {
          success: true,
          id: result.id,
          rev: result.rev,
          resolved: true
        };
        
      } catch (err) {
        console.error('[CONFLICT] Erreur résolution:', err);
        this.error = 'Conflit de révision. Rechargez la page et réessayez.';
        return { success: false, error: err.message };
      }
    },
    
    /**
     * @action Résoudre manuellement un conflit (sélectionner quelle version garder)
     * @param {string} docId - ID du document en conflit
     * @param {string} chosenRev - Révision choisie
     */
    async resolveConflictManually(docId, chosenRev) {
      console.log('[CONFLICT] Résolution manuelle:', docId, '->', chosenRev);
      
      try {
        const doc = await this.localDB.get(docId, { conflicts: true });
        
        // Supprimer toutes les révisions non choisies
        for (const rev of doc._conflicts || []) {
          if (rev !== chosenRev) {
            await this.localDB.remove(docId, rev);
            console.log('[CONFLICT] Révision supprimée:', rev);
          }
        }
        
        // Si la révision choisie est différente de l'actuelle, récupérer et sauvegarder
        if (chosenRev !== doc._rev) {
          const chosenDoc = await this.localDB.get(docId, { rev: chosenRev });
          chosenDoc._rev = doc._rev; // Mettre à jour la révision
          await this.localDB.put(chosenDoc);
        }
        
        // Retirer des conflits listés
        this.conflicts = this.conflicts.filter(c => c.id !== docId);
        
        // Recharger
        await this.loadProfils();
        
        return { success: true };
        
      } catch (err) {
        console.error('[CONFLICT] Erreur résolution manuelle:', err);
        return { success: false, error: err.message };
      }
    },
    
    // ========================================
    // SYNCHRONISATION MANUELLE
    // ========================================
    
    /**
     * @action Forcer une synchronisation manuelle
     */
    async forceSync() {
      if (!this.isOnline) {
        return { success: false, error: 'Hors ligne' };
      }
      
      this.syncStatus = 'syncing';
      
      try {
        // Push vers CouchDB
        const pushResult = await this.localDB.replicate.to(this.remoteDB);
        console.log('[SYNC] Push:', pushResult);
        
        // Pull depuis CouchDB
        const pullResult = await this.localDB.replicate.from(this.remoteDB);
        console.log('[SYNC] Pull:', pullResult);
        
        // Recharger les profils
        await this.loadProfils();
        
        this.syncStatus = 'complete';
        this.lastSync = new Date().toISOString();
        this.successMessage = 'Synchronisation terminée';
        
        return {
          success: true,
          pushed: pushResult.docs_written,
          pulled: pullResult.docs_written
        };
        
      } catch (err) {
        console.error('[SYNC] Erreur:', err);
        this.syncStatus = 'error';
        return { success: false, error: err.message };
      }
    },
    
    /**
     * @action Annuler la réplication
     */
    cancelReplication() {
      if (this.syncHandler) {
        this.syncHandler.cancel();
        this.syncStatus = 'paused';
        console.log('[SYNC] Réplication annulée');
      }
    },
    
    /**
     * @action Redémarrer la réplication
     */
    async restartReplication() {
      this.cancelReplication();
      await this.setupReplication();
    },
    
    // ========================================
    // GESTION RÉSEAU (RÈGLE #7)
    // ========================================
    
    /**
     * @action Configurer les écouteurs réseau (RÈGLE #7)
     */
    setupNetworkListeners() {
      window.addEventListener('online', () => {
        console.log('[NETWORK] En ligne');
        this.isOnline = true;
        this.syncStatus = 'syncing';
        
        // Redémarrer la réplication si nécessaire
        if (this.syncHandler && this.syncHandler.cancel) {
          this.restartReplication();
        }
      });
      
      window.addEventListener('offline', () => {
        console.log('[NETWORK] Hors ligne');
        this.isOnline = false;
        this.syncStatus = 'paused';
      });
    },
    
    // ========================================
    // UI / FORMULAIRE
    // ========================================
    
    /**
     * @action Ouvrir le formulaire de création
     */
    openCreateForm() {
      this.resetForm();
      this.isEditing = false;
      this.showNewProfilForm = true;
      this.error = null;
      this.successMessage = null;
    },
    
    /**
     * @action Fermer le formulaire
     */
    closeForm() {
      this.showNewProfilForm = false;
      this.profilOriginal = null;
    },
    
    /**
     * @action Réinitialiser le formulaire
     */
    resetForm() {
      this.newProfil = {
        _id: null,
        _rev: null,
        type: 'smtp_profile',
        name: '',
        host: '',
        port: 587,
        secure: false,
        auth: {
          user: '',
          pass: ''
        },
        from: '',
        active: true,
        provider: '',
        description: '',
        createdAt: null,
        updatedAt: null
      };
      this.profilId = null;
      this.isEditing = false;
      this.testResult = null;
      this.testError = null;
    },
    
    /**
     * @action Annuler l'édition et restaurer l'original
     */
    cancelEdit() {
      if (this.profilOriginal) {
        this.editProfil(this.profilOriginal);
      } else {
        this.closeForm();
      }
    },
    
    // ========================================
    // PROPRIÉTÉS CALCULÉES (RÈGLE #8: Alpine.js)
    // ========================================
    
    // Classe CSS pour l'indicateur de sync (RÈGLE #9)
    get syncStatusClass() {
      const classes = {
        initial: 'bg-gray-400',
        syncing: 'bg-blue-500 animate-pulse',
        paused: this.isOnline ? 'bg-green-500' : 'bg-gray-500',
        error: 'bg-red-500',
        complete: 'bg-green-500'
      };
      return classes[this.syncStatus] || classes.initial;
    },
    
    // Libellé du statut de sync (RÈGLE #9)
    get syncStatusLabel() {
      const labels = {
        initial: 'Initialisation...',
        syncing: 'Synchronisation...',
        paused: this.isOnline ? 'À jour' : 'Hors ligne',
        error: 'Erreur de sync',
        complete: 'Synchronisé'
      };
      return labels[this.syncStatus] || 'Inconnu';
    },
    
    // Icone du statut
    get syncStatusIcon() {
      const icons = {
        initial: '⏳',
        syncing: '🔄',
        paused: this.isOnline ? '✓' : '⚠️',
        error: '❌',
        complete: '✅'
      };
      return icons[this.syncStatus] || '❓';
    },
    
    // Format de la dernière sync
    get lastSyncFormatted() {
      if (!this.lastSync) return 'Jamais';
      const date = new Date(this.lastSync);
      return date.toLocaleString('fr-FR');
    },
    
    // Peut-on sauvegarder?
    get canSave() {
      return this.newProfil?.name && 
             this.newProfil?.host && 
             !this.saving;
    },
    
    // Profils actifs uniquement
    get profilsActifs() {
      return this.profils.filter(p => p.active);
    },
    
    // Profils avec conflits
    get profilsEnConflit() {
      return this.profils.filter(p => p.hasConflicts);
    },
    
    // Mode création ou édition
    get formTitle() {
      return this.isEditing ? 'Modifier le profil SMTP' : 'Nouveau profil SMTP';
    },
    
    // ========================================
    // NETTOYAGE
    // ========================================
    
    /**
     * @action Détruire les instances (appeler au démontage)
     */
    destroy() {
      this.cancelReplication();
      console.log('[POUCHDB] Workflow edit-profil détruit');
    },
    
    /**
     * @action Réinitialiser tout l'état
     */
    reset() {
      this.profil = null;
      this.profilId = null;
      this.profilOriginal = null;
      this.profils = [];
      this.resetForm();
      this.conflicts = [];
      this.error = null;
      this.successMessage = null;
      this.testResult = null;
      this.testError = null;
    }
  };
}

// ============================================
// EXPORT
// ============================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    editProfilSmtpWorkflow,
    COUCHDB_CONFIG,
    DESIGN_DOCS
  };
}

// Exposer globalement pour Alpine.js (RÈGLE #8)
if (typeof window !== 'undefined') {
  window.editProfilSmtpWorkflow = editProfilSmtpWorkflow;
  window.COUCHDB_CONFIG = COUCHDB_CONFIG;
  window.DESIGN_DOCS = DESIGN_DOCS;
}
