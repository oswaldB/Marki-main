/**
 * CouchDB Client Wrapper
 * Wrapper Nano.js avec gestion d'erreurs et retry
 */

const nano = require('nano');

class CouchClient {
  constructor(url, dbName = 'marki') {
    this.nano = nano(url);
    this.dbName = dbName;
    this.db = this.nano.use(dbName);
  }

  /**
   * Récupérer un document par ID
   */
  async get(id, options = {}) {
    try {
      return await this.db.get(id, options);
    } catch (err) {
      if (err.statusCode === 404) return null;
      throw this.wrapError(err, `get(${id})`);
    }
  }

  /**
   * Recherche Mango (CouchDB 2.0+)
   */
  async find(selector, options = {}) {
    try {
      const query = {
        selector,
        limit: options.limit || 50,
        skip: options.skip || 0,
        ...(options.sort && { sort: options.sort }),
        ...(options.fields && { fields: options.fields }),
        ...(options.use_index && { use_index: options.use_index })
      };
      return await this.db.find(query);
    } catch (err) {
      throw this.wrapError(err, 'find()');
    }
  }

  /**
   * Requête via View (Map/Reduce)
   */
  async view(designName, viewName, options = {}) {
    try {
      return await this.db.view(designName, viewName, {
        include_docs: options.include_docs !== false,
        ...options
      });
    } catch (err) {
      throw this.wrapError(err, `view(${designName}/${viewName})`);
    }
  }

  /**
   * Insérer un nouveau document
   */
  async insert(doc, id = null) {
    try {
      const docToInsert = {
        ...doc,
        created_at: doc.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      if (id) docToInsert._id = id;
      
      return await this.db.insert(docToInsert);
    } catch (err) {
      throw this.wrapError(err, 'insert()');
    }
  }

  /**
   * Mettre à jour un document existant
   */
  async update(doc) {
    try {
      if (!doc._id) throw new Error('Document must have _id');
      if (!doc._rev) {
        const existing = await this.get(doc._id);
        if (!existing) throw new Error(`Document ${doc._id} not found`);
        doc._rev = existing._rev;
      }
      
      doc.updated_at = new Date().toISOString();
      return await this.db.insert(doc);
    } catch (err) {
      throw this.wrapError(err, `update(${doc._id})`);
    }
  }

  /**
   * Supprimer un document
   */
  async delete(id, rev = null) {
    try {
      if (!rev) {
        const doc = await this.get(id);
        if (!doc) return false;
        rev = doc._rev;
      }
      await this.db.destroy(id, rev);
      return true;
    } catch (err) {
      throw this.wrapError(err, `delete(${id})`);
    }
  }

  /**
   * Opération bulk (batch insert/update/delete)
   */
  async bulk(docs, options = {}) {
    try {
      const now = new Date().toISOString();
      const preparedDocs = docs.map(doc => ({
        ...doc,
        updated_at: now,
        ...(doc.created_at || { created_at: now })
      }));
      
      return await this.db.bulk({ docs: preparedDocs, ...options });
    } catch (err) {
      throw this.wrapError(err, 'bulk()');
    }
  }

  /**
   * Créer ou mettre à jour un design document
   */
  async upsertDesignDoc(designDoc) {
    try {
      const existing = await this.get(designDoc._id);
      if (existing) {
        designDoc._rev = existing._rev;
      }
      return await this.db.insert(designDoc);
    } catch (err) {
      throw this.wrapError(err, `upsertDesignDoc(${designDoc._id})`);
    }
  }

  /**
   * Compter les documents par type
   */
  async countByType(type) {
    try {
      const result = await this.find({ type: { $eq: type } }, { limit: 0 });
      return result.warning ? 0 : (result.docs ? result.docs.length : 0);
    } catch (err) {
      return 0;
    }
  }

  /**
   * Liste paginée de tous les documents d'un type
   */
  async listByType(type, options = {}) {
    const { page = 1, perPage = 50, sort = 'created_at' } = options;
    
    try {
      return await this.find(
        { type: { $eq: type } },
        { 
          limit: perPage,
          skip: (page - 1) * perPage,
          sort: [{ [sort]: 'desc' }]
        }
      );
    } catch (err) {
      throw this.wrapError(err, `listByType(${type})`);
    }
  }

  /**
   * Recherche texte simple
   */
  async search(type, field, term, options = {}) {
    const regex = { $regex: `(?i)${term}` }; // case insensitive
    
    return this.find({
      type: { $eq: type },
      [field]: regex
    }, options);
  }

  /**
   * Info base de données
   */
  async info() {
    return this.db.info();
  }

  /**
   * Ping / Health check
   */
  async ping() {
    try {
      const info = await this.db.info();
      return { ok: true, db_name: info.db_name, doc_count: info.doc_count };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  /**
   * Réplication vers une base locale (PouchDB)
   */
  async replicateTo(targetUrl, options = {}) {
    try {
      return await this.nano.db.replicate(this.dbName, targetUrl, {
        continuous: false,
        ...options
      });
    } catch (err) {
      throw this.wrapError(err, 'replicateTo()');
    }
  }

  /**
   * Réplication depuis une base distante
   */
  async replicateFrom(sourceUrl, options = {}) {
    try {
      return await this.nano.db.replicate(sourceUrl, this.dbName, {
        continuous: false,
        ...options
      });
    } catch (err) {
      throw this.wrapError(err, 'replicateFrom()');
    }
  }

  /**
   * Wrapper d'erreur
   */
  wrapError(err, context) {
    return new Error(`CouchDB ${context}: ${err.message || err.description}`);
  }
}

module.exports = CouchClient;
