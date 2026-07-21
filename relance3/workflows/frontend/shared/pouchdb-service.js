/**
 * Service PouchDB partagé pour tous les workflows
 * 
 * Gestion centralisée de :
 * - Connexion PouchDB local + CouchDB remote
 * - Réplication bidirectionnelle
 * - État de synchronisation
 * - File d'attente offline
 * 
 * Usage: const dbService = await PouchDBService.getInstance(config);
 */

class PouchDBService {
  static instance = null;
  
  constructor(config) {
    this.config = {
      url: 'http://localhost:5984',
      dbName: 'default',
      live: true,
      retry: true,
      heartbeat: 10000,
      timeout: 30000,
      ...config
    };
    
    this.localDB = null;
    this.remoteDB = null;
    this.syncHandler = null;
    
    // État réactif (observable)
    this.state = {
      syncStatus: 'initial', // initial | syncing | paused | error | complete
      isOnline: navigator.onLine,
      lastSync: null,
      pendingChanges: 0,
      conflicts: [],
      error: null
    };
    
    // Callbacks
    this.listeners = new Map();
    this.saveQueue = [];
    
    // Initialisation
    this.init();
  }
  
  /**
   * Singleton - obtenir l'instance
   */
  static async getInstance(config = {}) {
    if (!PouchDBService.instance) {
      PouchDBService.instance = new PouchDBService(config);
      await PouchDBService.instance.ready;
    }
    return PouchDBService.instance;
  }
  
  /**
   * Initialisation
   */
  async init() {
    const initPromise = (async () => {
      // PouchDB local
      this.localDB = new PouchDB(this.config.dbName);
      
      // PouchDB remote
      const remoteUrl = `${this.config.url}/${this.config.dbName}`;
      this.remoteDB = new PouchDB(remoteUrl, { skip_setup: true });
      
      // Setup réplication
      await this.setupReplication();
      
      // Listeners réseau
      this.setupNetworkListeners();
      
      return this;
    })();
    
    this.ready = initPromise;
    return initPromise;
  }
  
  /**
   * Configurer la réplication bidirectionnelle
   */
  async setupReplication() {
    if (this.syncHandler) {
      this.syncHandler.cancel();
    }
    
    this.syncHandler = this.localDB.sync(this.remoteDB, {
      live: this.config.live,
      retry: this.config.retry,
      heartbeat: this.config.heartbeat,
      timeout: this.config.timeout
    })
    .on('change', (info) => {
      this.state.pendingChanges = info.change?.pending || 0;
      this.emit('change', info);
      
      if (info.direction === 'pull') {
        this.state.lastSync = new Date().toISOString();
      }
    })
    .on('paused', (err) => {
      this.state.syncStatus = err ? 'error' : 'paused';
      this.state.lastSync = new Date().toISOString();
      this.emit('paused', err);
    })
    .on('active', () => {
      this.state.syncStatus = 'syncing';
      this.state.isOnline = true;
      this.emit('active');
    })
    .on('denied', (err) => {
      this.state.syncStatus = 'error';
      this.state.error = err;
      this.emit('denied', err);
    })
    .on('complete', (info) => {
      this.state.syncStatus = 'complete';
      this.state.lastSync = new Date().toISOString();
      this.emit('complete', info);
    })
    .on('error', (err) => {
      this.state.syncStatus = 'error';
      this.state.error = err;
      this.state.isOnline = false;
      this.emit('error', err);
    });
  }
  
  /**
   * Écouteurs réseau
   */
  setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.state.isOnline = true;
      this.emit('online');
      this.processSaveQueue();
    });
    
    window.addEventListener('offline', () => {
      this.state.isOnline = false;
      this.emit('offline');
    });
  }
  
  // ==================== CRUD OPERATIONS ====================
  
  /**
   * Créer un document
   */
  async create(doc, options = {}) {
    const id = options.id || `${this.config.dbName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const document = {
      _id: id,
      ...doc,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const result = await this.localDB.put(document);
    
    if (!this.state.isOnline) {
      this.saveQueue.push(result.id);
    }
    
    return { ...result, doc: document };
  }
  
  /**
   * Lire un document
   */
  async read(id, options = {}) {
    return await this.localDB.get(id, options);
  }
  
  /**
   * Mettre à jour un document
   */
  async update(id, updates, options = {}) {
    const doc = await this.localDB.get(id, { conflicts: true });
    
    // Gérer les conflits si demandé
    if (doc._conflicts?.length && options.resolveConflicts) {
      await this.resolveConflicts(id, doc._conflicts, updates);
      return this.update(id, updates, { ...options, resolveConflicts: false });
    }
    
    const updated = {
      ...doc,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    const result = await this.localDB.put(updated);
    
    if (!this.state.isOnline) {
      this.saveQueue.push(id);
    }
    
    return result;
  }
  
  /**
   * Supprimer un document
   */
  async delete(id) {
    const doc = await this.localDB.get(id);
    const result = await this.localDB.remove(doc);
    
    if (!this.state.isOnline) {
      this.saveQueue.push(id);
    }
    
    return result;
  }
  
  /**
   * Query avec Mango
   */
  async find(selector, options = {}) {
    return await this.localDB.find({
      selector,
      ...options
    });
  }
  
  /**
   * Vue CouchDB
   */
  async view(designDoc, viewName, options = {}) {
    return await this.localDB.query(`${designDoc}/${viewName}`, {
      include_docs: true,
      ...options
    });
  }
  
  /**
   * All docs
   */
  async allDocs(options = {}) {
    return await this.localDB.allDocs({
      include_docs: true,
      ...options
    });
  }
  
  // ==================== SYNCHRONISATION ====================
  
  /**
   * Forcer une sync manuelle
   */
  async forceSync() {
    this.state.syncStatus = 'syncing';
    
    try {
      const pushResult = await this.localDB.replicate.to(this.remoteDB);
      const pullResult = await this.localDB.replicate.from(this.remoteDB);
      
      this.state.syncStatus = 'complete';
      this.state.lastSync = new Date().toISOString();
      
      return { push: pushResult, pull: pullResult };
    } catch (err) {
      this.state.syncStatus = 'error';
      throw err;
    }
  }
  
  /**
   * Traiter la file d'attente
   */
  async processSaveQueue() {
    if (this.saveQueue.length === 0) return;
    
    console.log('[SYNC] Traitement file d\'attente:', this.saveQueue.length);
    
    try {
      this.state.syncStatus = 'syncing';
      await this.localDB.replicate.to(this.remoteDB);
      this.saveQueue = [];
      this.state.syncStatus = 'complete';
    } catch (err) {
      this.state.syncStatus = 'error';
      console.error('[SYNC] Erreur file d\'attente:', err);
    }
  }
  
  // ==================== GESTION DES CONFLITS ====================
  
  /**
   * Résoudre les conflits pour un document
   */
  async resolveConflicts(id, conflictRevs, localUpdates) {
    // Stratégie par défaut: garder les données locales
    for (const rev of conflictRevs) {
      await this.localDB.remove(id, rev);
    }
  }
  
  /**
   * Obtenir tous les documents en conflit
   */
  async getConflicts() {
    const result = await this.localDB.allDocs({ conflicts: true });
    return result.rows.filter(row => row.value.conflicts?.length > 0);
  }
  
  // ==================== DESIGN DOCS ====================
  
  /**
   * Créer/mettre à jour un design document
   */
  async ensureDesignDoc(designDoc) {
    try {
      const existing = await this.localDB.get(designDoc._id);
      if (JSON.stringify(existing.views) !== JSON.stringify(designDoc.views)) {
        await this.localDB.put({
          ...designDoc,
          _rev: existing._rev
        });
      }
    } catch (err) {
      if (err.status === 404) {
        await this.localDB.put(designDoc);
      }
    }
  }
  
  // ==================== EVENTS ====================
  
  /**
   * S'abonner aux événements
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    
    // Retourner fonction de désabonnement
    return () => this.off(event, callback);
  }
  
  /**
   * Se désabonner
   */
  off(event, callback) {
    const callbacks = this.listeners.get(event) || [];
    const index = callbacks.indexOf(callback);
    if (index > -1) callbacks.splice(index, 1);
  }
  
  /**
   * Émettre un événement
   */
  emit(event, data) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(cb => {
      try { cb(data); } catch (e) { console.error(e); }
    });
  }
  
  // ==================== UTILITAIRES ====================
  
  /**
   * Info de la base
   */
  async info() {
    return await this.localDB.info();
  }
  
  /**
   * Compacter la base
   */
  async compact() {
    return await this.localDB.compact();
  }
  
  /**
   * Détruire la base locale
   */
  async destroy() {
    if (this.syncHandler) {
      this.syncHandler.cancel();
    }
    return await this.localDB.destroy();
  }
  
  /**
   * Cancel sync
   */
  cancelSync() {
    if (this.syncHandler) {
      this.syncHandler.cancel();
      this.state.syncStatus = 'paused';
    }
  }
  
  /**
   * Réinitialiser l'instance
   */
  static reset() {
    if (PouchDBService.instance) {
      PouchDBService.instance.cancelSync();
    }
    PouchDBService.instance = null;
  }
}

// Export pour différents environnements
if (typeof window !== 'undefined') {
  window.PouchDBService = PouchDBService;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PouchDBService;
}
