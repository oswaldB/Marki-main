#!/usr/bin/env node
/**
 * Vérification post-migration
 * Compare les comptages SQLite vs CouchDB
 */

const sqlite3 = require('sqlite3').verbose();
const nano = require('nano');
const path = require('path');

const COMPARISONS = [
  { table: 'contacts', view: 'contacts', viewName: 'by_type' },
  { table: 'impayes', view: 'impayes', viewName: 'by_statut' },
  { table: 'relances', view: 'relances', viewName: 'by_statut' },
  { table: 'sequences', view: 'sequences', viewName: 'actives' },
  { table: 'users', type: 'user' },
  { table: 'events', type: 'event' }
];

class Verifier {
  constructor(dbPath, couchUrl, dbName = 'marki') {
    this.sqlite = new sqlite3.Database(dbPath);
    this.db = nano(`${couchUrl}/${dbName}`);
  }

  async query(sql) {
    return new Promise((resolve, reject) => {
      this.sqlite.all(sql, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async verify() {
    console.log('🔍 Vérification de la migration\n');
    console.log('='.repeat(60));
    console.log('Entité'.padEnd(20), 'SQLite'.padEnd(10), 'CouchDB'.padEnd(10), 'Statut');
    console.log('-'.repeat(60));

    let allOk = true;

    for (const comp of COMPARISONS) {
      const sqliteCount = await this.getSqliteCount(comp.table);
      const couchCount = await this.getCouchCount(comp);
      const match = sqliteCount === couchCount;
      
      const status = match ? '✓ OK' : '✗ DIFF';
      if (!match) allOk = false;
      
      console.log(
        comp.table.padEnd(20),
        String(sqliteCount).padEnd(10),
        String(couchCount).padEnd(10),
        status
      );
    }

    console.log('='.repeat(60));

    // Tests supplémentaires
    console.log('\n📋 Tests fonctionnels:');
    await this.testViews();
    await this.testDocuments();

    this.sqlite.close();
    
    return allOk;
  }

  async getSqliteCount(table) {
    const result = await this.query(`SELECT COUNT(*) as count FROM ${table}`);
    return result[0].count;
  }

  async getCouchCount(comp) {
    try {
      if (comp.view) {
        const result = await this.db.view(comp.view, comp.viewName, { limit: 0 });
        return result.total_rows || 0;
      } else if (comp.type) {
        const result = await this.db.find({ selector: { type: comp.type } });
        return result.docs.length;
      }
    } catch(e) {
      return `ERR: ${e.message}`;
    }
  }

  async testViews() {
    const views = [
      ['impayes', 'by_contact'],
      ['contacts', 'by_email'],
      ['relances', 'by_statut'],
      ['dashboards', 'kpi_impayes']
    ];

    for (const [design, view] of views) {
      try {
        await this.db.view(design, view, { limit: 1 });
        console.log(`  ✓ ${design}/${view}`);
      } catch (e) {
        console.log(`  ✗ ${design}/${view}: ${e.message}`);
      }
    }
  }

  async testDocuments() {
    try {
      // Test structure document
      const contact = await this.db.find({ 
        selector: { type: 'contact' }, 
        limit: 1 
      });
      
      if (contact.docs.length > 0) {
        const doc = contact.docs[0];
        const checks = [
          ['_id', doc._id?.startsWith('contact:')],
          ['type', doc.type === 'contact'],
          ['created_at', !!doc.created_at],
          ['updated_at', !!doc.updated_at]
        ];
        
        console.log('\n  Structure document contact:');
        for (const [field, ok] of checks) {
          console.log(`    ${ok ? '✓' : '✗'} ${field}`);
        }
      }

      // Test impayé avec relations
      const impaye = await this.db.find({ 
        selector: { type: 'impaye' }, 
        limit: 1 
      });
      
      if (impaye.docs.length > 0) {
        const doc = impaye.docs[0];
        console.log('\n  Structure document impayé:');
        console.log(`    ✓ _id: ${doc._id}`);
        console.log(`    ${doc.contact ? '✓' : '✗'} contact embarqué`);
        console.log(`    ${doc.relations ? '✓' : '○'} relations`);
      }
    } catch (e) {
      console.log(`  ✗ Erreur test documents: ${e.message}`);
    }
  }
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const dbArg = args.find(a => a.startsWith('--db='))?.split('=')[1] || 'marki.db';
  const urlArg = args.find(a => a.startsWith('--url='))?.split('=')[1] || 'http://localhost:5984';
  
  new Verifier(path.resolve(dbArg), urlArg).verify().then(ok => {
    process.exit(ok ? 0 : 1);
  }).catch(err => {
    console.error('Erreur:', err);
    process.exit(1);
  });
}

module.exports = Verifier;
