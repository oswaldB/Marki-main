// export_sqlite.js - Export des données depuis SQLite marki.db vers JSON
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'marki.db');
const OUTPUT_DIR = path.join(__dirname, '..', 'export');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'marki_data.json');

// S'assurer que le dossier export existe
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH);

// Liste des tables à exporter
const tablesToExport = [
  'contacts',
  'impayes',
  'relances',
  'suivis',
  'events',
  'sequences',
  'smtp_profiles'
];

async function exportTable(table) {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM ${table}`, [], (err, rows) => {
      if (err) {
        console.error(`Erreur lors de l'export de la table ${table}:`, err);
        reject(err);
      } else {
        console.log(`✓ Table ${table}: ${rows.length} enregistrements`);
        resolve(rows);
      }
    });
  });
}

async function main() {
  console.log('🚀 Début de l\'export SQLite...');
  console.log(`Base: ${DB_PATH}`);
  
  try {
    const data = {};
    
    for (const table of tablesToExport) {
      try {
        data[table] = await exportTable(table);
      } catch (err) {
        console.warn(`⚠️ Table ${table} ignorée (n'existe pas ou vide)`);
        data[table] = [];
      }
    }
    
    // Écrire le fichier JSON
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));
    console.log(`\n✅ Export terminé: ${OUTPUT_FILE}`);
    console.log('Résumé:');
    for (const [table, rows] of Object.entries(data)) {
      console.log(`  - ${table}: ${rows.length} enregistrements`);
    }
    
    db.close();
  } catch (err) {
    console.error('❌ Erreur lors de l\'export:', err);
    db.close();
    process.exit(1);
  }
}

main();
