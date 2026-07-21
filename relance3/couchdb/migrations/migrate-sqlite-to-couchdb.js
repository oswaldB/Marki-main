#!/usr/bin/env node
/**
 * Migration SQLite → CouchDB simplifiée
 * Usage: node migrate-sqlite-to-couchdb.js --db marki.db --url http://admin:pass@localhost:5984
 */

const sqlite3 = require('sqlite3').verbose();
const nano = require('nano');
const path = require('path');
const https = require('https');

// Tables à migrer avec leur type de document
const MIGRATION_MAP = {
  users: { type: 'user', relations: [] },
  contacts: { type: 'contact', relations: ['contact_relations'] },
  sequences: { type: 'sequence', embedded: ['sequences_emails', 'sequences_scenarios'] },
  smtp_profiles: { type: 'smtp', relations: [] },
  impayes: { type: 'impaye', relations: ['relance_impayes'] },
  relances: { type: 'relance', relations: ['relance_impayes'] },
  suivis: { type: 'suivi', relations: ['suivi_impayes'] },
  events: { type: 'event', relations: [] },
  sessions: { type: 'session', relations: [] },
  lien_paiements: { type: 'lien_paiement', relations: [] },
  options_dynamiques: { type: 'config', relations: [] },
  contact_relation_types: { type: 'config', relations: [] },
  contact_relations: { type: 'contact_relation', relations: [] }
};

class Migration {
  constructor(dbPath, couchUrl, dbName = 'marki') {
    this.sqlite = new sqlite3.Database(dbPath);
    this.couchUrl = couchUrl; // Stocker l'URL originale
    this.couch = nano(couchUrl);
    this.dbName = dbName;
    this.db = null;
    this.stats = { inserted: 0, errors: 0, tables: {} };
    this.cache = {};
  }

  async init() {
    console.log('🚀 Initialisation...');
    
    // Créer ou recréer la base (avec gestion des chemins personnalisés)
    const couchUrl = this.couch.config.url;
    const dbUrl = `${couchUrl}/${this.dbName}`;
    
    try {
      // Essayer de supprimer la base
      await this.httpRequest('DELETE', `/${this.dbName}`);
      console.log(`  Base ${this.dbName} supprimée`);
    } catch(e) { /* ignore */ }
    
    try {
      // Créer la base
      await this.httpRequest('PUT', `/${this.dbName}`);
      console.log(`✓ Base ${this.dbName} créée\n`);
    } catch(e) {
      console.error(`✗ Erreur création base: ${e.message}`);
      throw e;
    }
    
    this.db = nano(`${this.couchUrl}/${this.dbName}`);
  }

  // Méthode helper pour les requêtes HTTP
  httpRequest(method, path) {
    return new Promise((resolve, reject) => {
      const url = new URL(this.couchUrl); // Utiliser l'URL originale
      const fullPath = (url.pathname + path).replace(/\/+/g, '/');
      
      
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: fullPath,
        method: method,
        headers: {
          'Authorization': 'Basic ' + Buffer.from(url.username + ':' + url.password).toString('base64'),
          'Accept': 'application/json'
        }
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          // Accepter 200-299 et 412 (file_exists)
          if ((res.statusCode >= 200 && res.statusCode < 300) || res.statusCode === 412) {
            try { resolve(JSON.parse(data)); } catch(e) { resolve(data); }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });
      
      req.on('error', reject);
      req.end();
    });
  }

  async preload() {
    console.log('📥 Préchargement des données liées...');
    
    // Contacts pour référence rapide
    this.cache.contacts = {};
    const contacts = await this.query('SELECT * FROM contacts');
    contacts.forEach(c => this.cache.contacts[c.id] = c);
    console.log(`  ${contacts.length} contacts chargés`);
    
    // Tables de liaison
    this.cache.relance_impayes = await this.loadJunctionTable('relance_impayes', 'relance_id');
    this.cache.suivi_impayes = await this.loadJunctionTable('suivi_impayes', 'suivi_id');
    this.cache.sequences_emails = await this.loadEmbeddedTable('sequences_emails', 'sequence_id');
    this.cache.sequences_scenarios = await this.loadEmbeddedTable('sequences_scenarios', 'sequence_id');
    this.cache.contact_relations = await this.loadJunctionTable('contact_relations', 'contact_source_id');
    
    console.log('✓ Préchargement terminé\n');
  }

  async loadJunctionTable(table, keyField) {
    const data = {};
    const rows = await this.query(`SELECT * FROM ${table}`);
    rows.forEach(r => {
      if (!data[r[keyField]]) data[r[keyField]] = [];
      data[r[keyField]].push(r);
    });
    return data;
  }

  async loadEmbeddedTable(table, parentField) {
    const data = {};
    const rows = await this.query(`SELECT * FROM ${table}`);
    rows.forEach(r => {
      if (!data[r[parentField]]) data[r[parentField]] = [];
      data[r[parentField]].push(r);
    });
    return data;
  }

  async migrateTable(tableName, config) {
    console.log(`📦 Migration ${tableName}...`);
    const startTime = Date.now();
    
    const rows = await this.query(`SELECT * FROM ${tableName}`);
    const docs = [];
    let tableStats = { inserted: 0, errors: 0 };

    for (const row of rows) {
      try {
        const doc = this.transformRow(tableName, config, row);
        if (doc) {
          docs.push(doc);
          tableStats.inserted++;
        }
      } catch (err) {
        console.error(`  ✗ Erreur ligne ${row.id}:`, err.message);
        tableStats.errors++;
      }
    }

    // Insertion par batches
    if (docs.length > 0) {
      await this.insertBatch(docs);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  ✓ ${tableStats.inserted} documents (${duration}s)`);
    
    this.stats.tables[tableName] = tableStats;
    this.stats.inserted += tableStats.inserted;
    this.stats.errors += tableStats.errors;
  }

  transformRow(tableName, config, row) {
    const id = `${config.type}:${row.id}`;
    const doc = {
      _id: id,
      type: config.type,
      ...this.cleanFields(row)
    };

    // Traitements spécifiques par table
    switch(tableName) {
      case 'contacts':
        this.enhanceContact(doc, row);
        break;
      case 'impayes':
        this.enhanceImpaye(doc, row);
        break;
      case 'relances':
        this.enhanceRelance(doc, row);
        break;
      case 'sequences':
        this.enhanceSequence(doc, row);
        break;
      case 'suivis':
        this.enhanceSuivi(doc, row);
        break;
      case 'contact_relations':
        doc.contact_source_id = `contact:${row.contact_source_id}`;
        doc.contact_cible_id = `contact:${row.contact_cible_id}`;
        break;
    }

    return doc;
  }

  enhanceContact(doc, row) {
    // Relations
    if (this.cache.contact_relations[row.id]) {
      doc.relations = this.cache.contact_relations[row.id].map(r => ({
        contact_id: `contact:${r.contact_cible_id}`,
        type: r.type_relation,
        est_actif: r.est_actif === 1
      }));
    }
  }

  enhanceImpaye(doc, row) {
    // Embed contact payeur
    const contact = this.cache.contacts[row.payer_id];
    if (contact) {
      doc.contact = {
        _id: `contact:${contact.id}`,
        nom: contact.nom,
        prenom: contact.prenom,
        email: contact.email
      };
    }

    // Relations (références)
    const relations = {};
    if (row.proprietaire_id) relations.proprietaire_id = `contact:${row.proprietaire_id}`;
    if (row.apporteur_id) relations.apporteur_id = `contact:${row.apporteur_id}`;
    if (row.syndic_id) relations.syndic_id = `contact:${row.syndic_id}`;
    if (row.notaire_id) relations.notaire_id = `contact:${row.notaire_id}`;
    if (Object.keys(relations).length > 0) doc.relations = relations;
  }

  enhanceRelance(doc, row) {
    doc.contact_id = `contact:${row.contact_id}`;
    doc.sequence_id = `sequence:${row.sequence_id}`;
    if (row.smtp_profile_id) {
      doc.smtp_profile_id = `smtp:${row.smtp_profile_id}`;
    }
    
    // Impayés liés
    if (this.cache.relance_impayes[row.id]) {
      doc.impaye_ids = this.cache.relance_impayes[row.id].map(
        r => `impaye:${r.impaye_id}`
      );
    }
  }

  enhanceSequence(doc, row) {
    // Embed emails et scénarios
    if (this.cache.sequences_emails[row.id]) {
      doc.emails = this.cache.sequences_emails[row.id];
    }
    if (this.cache.sequences_scenarios[row.id]) {
      doc.scenarios = this.cache.sequences_scenarios[row.id];
    }
    
    // Parser JSONs
    if (row.emails_json) {
      try { doc.emails_config = JSON.parse(row.emails_json); } catch(e) {}
    }
    if (row.regles_json) {
      try { doc.regles = JSON.parse(row.regles_json); } catch(e) {}
    }
    if (row.groupes_regles_json) {
      try { doc.groupes_regles = JSON.parse(row.groupes_regles_json); } catch(e) {}
    }
  }

  enhanceSuivi(doc, row) {
    if (row.contact_id) doc.contact_id = `contact:${row.contact_id}`;
    if (row.sequence_id) doc.sequence_id = `sequence:${row.sequence_id}`;
    if (row.smtp_profile_id) doc.smtp_profile_id = `smtp:${row.smtp_profile_id}`;
    
    if (this.cache.suivi_impayes[row.id]) {
      doc.impaye_ids = this.cache.suivi_impayes[row.id].map(
        r => `impaye:${r.impaye_id}`
      );
    }
  }

  cleanFields(row) {
    const cleaned = {};
    for (const [key, value] of Object.entries(row)) {
      if (key === 'id') continue;
      
      // Convertir boolean SQLite
      if (key.startsWith('is_') || ['actif', 'valide', 'manuelle', 'email_sent'].includes(key)) {
        cleaned[key] = value === 1;
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }

  async insertBatch(docs) {
    const BATCH_SIZE = 100;
    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch = docs.slice(i, i + BATCH_SIZE);
      try {
        await this.db.bulk({ docs: batch });
      } catch (err) {
        console.error(`  ✗ Erreur batch:`, err.message);
        this.stats.errors += batch.length;
      }
    }
  }

  async createViews() {
    console.log('\n📐 Création des vues...');
    
    const views = require('../design-docs/couchdb-design-docs.json');
    
    for (const view of views) {
      try {
        await this.db.insert(view);
        console.log(`  ✓ ${view._id}`);
      } catch (err) {
        console.error(`  ✗ ${view._id}:`, err.message);
      }
    }
  }

  async verify() {
    console.log('\n🔍 Vérification...');
    
    const info = await this.db.info();
    console.log(`  Documents total: ${info.doc_count}`);
    
    // Test quelques vues
    try {
      const contacts = await this.db.view('contacts', 'by_type', { limit: 0 });
      console.log(`  Vue contacts/by_type: OK (${contacts.total_rows} rows)`);
    } catch(e) {
      console.log(`  ✗ Vue contacts/by_type: ${e.message}`);
    }
  }

  async query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.sqlite.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async run() {
    const start = Date.now();
    
    await this.init();
    await this.preload();
    
    // Migration des tables
    for (const [table, config] of Object.entries(MIGRATION_MAP)) {
      await this.migrateTable(table, config);
    }
    
    await this.createViews();
    await this.verify();
    
    this.sqlite.close();
    
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Migration terminée');
    console.log(`   Temps total: ${duration}s`);
    console.log(`   Documents: ${this.stats.inserted}`);
    console.log(`   Erreurs: ${this.stats.errors}`);
    console.log('='.repeat(50));
  }
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const dbArg = args.find(a => a.startsWith('--db='))?.split('=')[1] || 'marki.db';
  const urlArg = args.find(a => a.startsWith('--url='))?.split('=')[1] || 'http://localhost:5984';
  
  const dbPath = path.resolve(dbArg);
  
  new Migration(dbPath, urlArg).run().catch(err => {
    console.error('Erreur fatale:', err);
    process.exit(1);
  });
}

module.exports = Migration;
