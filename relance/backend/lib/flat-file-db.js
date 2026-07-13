const loki = require('lokijs');
const yaml = require('js-yaml');
const fs = require('fs').promises;
const path = require('path');
const lockfile = require('proper-lockfile');

class FlatFileDB {
  constructor(baseDir) {
    this.baseDir = baseDir;
    this.db = new loki('db.json');
    this.collections = {};
    this.initCollections();
  }

  initCollections() {
    this.collections.contacts = this.db.addCollection('contacts', {
      indices: ['id', 'email', 'nom', 'type', 'is_blacklisted'],
      unique: ['id']
    });

    this.collections.impayes = this.db.addCollection('impayes', {
      indices: ['id', 'payer_id', 'contact_relance_id', 'nfacture', 
               'date_echeance', 'statut', 'is_blacklisted', 'facture_soldee',
               'apporteur_id', 'sequence_id'],
      unique: ['id']
    });

    this.collections.relances = this.db.addCollection('relances', {
      indices: ['id', 'contact_id', 'sequence_id', 'statut', 'date_envoi'],
      unique: ['id']
    });

    this.collections.sequences = this.db.addCollection('sequences', {
      indices: ['id', 'type_sequence', 'actif'],
      unique: ['id']
    });

    this.collections.smtp_profiles = this.db.addCollection('smtp_profiles', {
      indices: ['id', 'actif'],
      unique: ['id']
    });

    // Collection pour les liens de paiement (portail client)
    this.collections.payment_links = this.db.addCollection('payment_links', {
      indices: ['id', 'actif'],
      unique: ['id']
    });

    // Collections pour l'authentification
    this.collections.users = this.db.addCollection('users', {
      indices: ['id', 'username', 'email', 'role', 'is_active'],
      unique: ['id', 'username']  // username est l'identifiant unique
    });

    this.collections.sessions = this.db.addCollection('sessions', {
      indices: ['id', 'user_id', 'expires_at'],
      unique: ['id']
    });

    // Collection pour les suggestions Smart Marki (IA)
    this.collections.smart_marki = this.db.addCollection('smart_marki', {
      indices: ['id', 'type', 'status', 'created_at', 'read'],
      unique: ['id']
    });
  }

  _getPath(collection, id) {
    const dir = path.join(this.baseDir, collection);
    return path.join(dir, `${id}.yml`);
  }

  async create(collection, data) {
    if (!data.id) throw new Error('id requis');
    
    const filePath = this._getPath(collection, data.id);
    const coll = this.collections[collection];

    // Vérifier si existe déjà
    if (coll.findOne({ id: data.id })) {
      throw new Error(`${collection}/${data.id} existe déjà`);
    }

    // Créer répertoire
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    const dataToSave = {
      ...data,
      type: collection.slice(0, -1)
    };
    
    await fs.writeFile(filePath, yaml.dump(dataToSave, { sortKeys: true }));
    coll.insert(dataToSave);

    return dataToSave;
  }

  async read(collection, id) {
    const result = this.collections[collection].findOne({ id });
    if (!result) throw new Error(`${collection}/${id} non trouvé`);
    return result;
  }

  async update(collection, id, updates) {
    const filePath = this._getPath(collection, id);
    const coll = this.collections[collection];

    const existing = coll.findOne({ id });
    if (!existing) throw new Error(`${collection}/${id} non trouvé`);

    const updated = { 
      ...existing, 
      ...updates, 
      id,
      type: existing.type 
    };

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, yaml.dump(updated, { sortKeys: true }));
    coll.update(updated);

    return updated;
  }

  async delete(collection, id) {
    const filePath = this._getPath(collection, id);
    const coll = this.collections[collection];

    try {
      await fs.unlink(filePath);
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }

    const doc = coll.findOne({ id });
    if (doc) coll.remove(doc);

    return { deleted: true };
  }

  async search(collection, criteria) {
    const coll = this.collections[collection];
    return coll.find(criteria);
  }

  query(collection) {
    return this.collections[collection].chain();
  }

  async loadAll() {
    for (const collection of Object.keys(this.collections)) {
      const dir = path.join(this.baseDir, collection);
      try {
        const files = await fs.readdir(dir);
        for (const file of files.filter(f => f.endsWith('.yml'))) {
          try {
            const content = await fs.readFile(path.join(dir, file), 'utf-8');
            const data = yaml.load(content);
            if (data && data.id) {
              // Vérifier si le document existe déjà
              const existing = this.collections[collection].findOne({ id: data.id });
              if (!existing) {
                this.collections[collection].insert(data);
              }
            }
          } catch (fileErr) {
            // Ignorer les erreurs de doublons ou fichiers corrompus
            if (fileErr.message?.includes('already in collection')) {
              console.warn(`⚠️  Doublon ignoré dans ${collection}/${file}`);
            } else {
              console.error(`❌ Erreur fichier ${file}:`, fileErr.message);
            }
          }
        }
      } catch (e) {
        if (e.code !== 'ENOENT') throw e;
      }
    }
  }

  getCollection(name) {
    return this.collections[name];
  }

  // ==================== MÉTHODES SÉCURISÉES (Auth) ====================

  /**
   * Récupère le contexte utilisateur courant depuis AuthLocal
   * @private
   */
  _getCurrentUser() {
    // Import dynamique pour éviter les cycles
    const AuthLocal = require('./auth-local');
    return AuthLocal.getCurrentUser();
  }

  /**
   * Crée un document avec ACL (Access Control List)
   * @param {string} collection - Nom de la collection
   * @param {object} data - Données à créer
   * @param {object} userContext - Contexte utilisateur (optionnel, sinon utilise contexte global)
   */
  async createSecure(collection, data, userContext = null) {
    const AuthLocal = require('./auth-local');
    const user = userContext || this._getCurrentUser();

    // Vérifications de permissions
    if (collection === 'users') {
      // Seul un admin peut créer des utilisateurs
      if (!user || user.role !== 'admin') {
        throw new Error('Permission refusée : seuls les admins peuvent créer des utilisateurs');
      }
    }

    // Préparer les données avec ACL
    const dataWithAcl = {
      ...data,
      _acl: {
        owner: user ? user.sub : 'system',
        created_by: user ? user.sub : 'system',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        permissions: {
          owner: ['read', 'write', 'delete'],
          admin: ['read', 'write', 'delete'],
          user: collection === 'users' ? [] : ['read'] // Users sont privés
        }
      }
    };

    return this.create(collection, dataWithAcl);
  }

  /**
   * Lit un document avec vérification des permissions
   * @param {string} collection - Nom de la collection
   * @param {string} id - ID du document
   * @param {object} userContext - Contexte utilisateur (optionnel)
   */
  async readSecure(collection, id, userContext = null) {
    const user = userContext || this._getCurrentUser();
    const doc = await this.read(collection, id);

    // Admin voit tout
    if (user && user.role === 'admin') {
      return doc;
    }

    // Vérifier les permissions ACL
    if (doc._acl) {
      const isOwner = doc._acl.owner === (user ? user.sub : null);
      const ownerPerms = doc._acl.permissions?.owner || [];
      const userPerms = doc._acl.permissions?.user || [];

      // Owner ou permissions explicites
      if (isOwner && ownerPerms.includes('read')) {
        return doc;
      }
      if (user && userPerms.includes('read')) {
        return doc;
      }

      // Pas de permissions
      throw new Error('Accès refusé : vous n\'avez pas la permission de lire ce document');
    }

    // Document sans ACL : accessible en lecture si authentifié
    if (!user) {
      throw new Error('Authentification requise');
    }

    return doc;
  }

  /**
   * Met à jour un document avec vérification des permissions
   */
  async updateSecure(collection, id, updates, userContext = null) {
    const user = userContext || this._getCurrentUser();
    const doc = await this.read(collection, id);

    // Admin peut tout modifier
    if (user && user.role === 'admin') {
      const updatesWithMeta = {
        ...updates,
        '_acl.updated_at': new Date().toISOString()
      };
      return this.update(collection, id, updatesWithMeta);
    }

    // Vérifier les permissions
    if (doc._acl) {
      const isOwner = doc._acl.owner === (user ? user.sub : null);
      const ownerPerms = doc._acl.permissions?.owner || [];

      if (isOwner && ownerPerms.includes('write')) {
        const updatesWithMeta = {
          ...updates,
          '_acl.updated_at': new Date().toISOString()
        };
        return this.update(collection, id, updatesWithMeta);
      }

      throw new Error('Permission refusée : vous n\'avez pas la permission de modifier ce document');
    }

    throw new Error('Authentification requise');
  }

  /**
   * Supprime un document avec vérification des permissions
   */
  async deleteSecure(collection, id, userContext = null) {
    const user = userContext || this._getCurrentUser();
    
    // Empêcher la suppression des admins
    if (collection === 'users') {
      const targetUser = await this.read('users', id);
      if (targetUser.role === 'admin') {
        // Compter les admins restants
        const admins = await this.search('users', { role: 'admin', is_active: true });
        if (admins.length <= 1) {
          throw new Error('Impossible de supprimer le dernier administrateur');
        }
      }
    }

    const doc = await this.read(collection, id);

    // Admin peut tout supprimer
    if (user && user.role === 'admin') {
      return this.delete(collection, id);
    }

    // Vérifier les permissions
    if (doc._acl) {
      const isOwner = doc._acl.owner === (user ? user.sub : null);
      const ownerPerms = doc._acl.permissions?.owner || [];

      if (isOwner && ownerPerms.includes('delete')) {
        return this.delete(collection, id);
      }

      throw new Error('Permission refusée : vous n\'avez pas la permission de supprimer ce document');
    }

    throw new Error('Authentification requise');
  }

  /**
   * Recherche avec filtrage des permissions
   * Retourne uniquement les documents accessibles par l'utilisateur
   */
  async querySecure(collection, criteria = {}, userContext = null) {
    const user = userContext || this._getCurrentUser();
    const results = await this.search(collection, criteria);

    // Admin voit tout
    if (user && user.role === 'admin') {
      return results;
    }

    // Filtrer selon les ACL
    return results.filter(doc => {
      if (!doc._acl) {
        // Documents sans ACL : accessibles si authentifié
        return user !== null;
      }

      const isOwner = doc._acl.owner === (user ? user.sub : null);
      const ownerPerms = doc._acl.permissions?.owner || [];
      const userPerms = doc._acl.permissions?.user || [];

      if (isOwner && ownerPerms.includes('read')) return true;
      if (user && userPerms.includes('read')) return true;
      
      return false;
    });
  }

  /**
   * Chaîne de requête sécurisée (query builder)
   * Retourne les résultats filtrés selon les permissions
   */
  async queryChainSecure(collection, userContext = null) {
    const user = userContext || this._getCurrentUser();
    const chain = this.query(collection);
    
    // Si admin, pas de filtrage
    if (user && user.role === 'admin') {
      return chain;
    }

    // Filtre personnalisé pour les ACL
    return chain.where(doc => {
      if (!doc._acl) return user !== null;
      
      const isOwner = doc._acl.owner === (user ? user.sub : null);
      const ownerPerms = doc._acl.permissions?.owner || [];
      const userPerms = doc._acl.permissions?.user || [];

      if (isOwner && ownerPerms.includes('read')) return true;
      if (user && userPerms.includes('read')) return true;
      
      return false;
    });
  }
}

module.exports = FlatFileDB;
