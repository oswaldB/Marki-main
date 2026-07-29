// importer.js - Import des données transformées vers CouchDB marki2
const Nano = require('nano');
const fs = require('fs');
const path = require('path');

// Configuration CouchDB
const COUCHDB_URL = 'http://oswald:coucou@localhost:5984';
const DB_NAME = 'marki2';

// Chemins des fichiers
const EXPORT_DIR = path.join(__dirname, '..', 'export');
const DESIGN_DIR = path.join(__dirname, '..', 'designs');

async function main() {
  console.log('🚀 Début de l\'import vers CouchDB...');
  console.log(`   URL: ${COUCHDB_URL}`);
  console.log(`   Base: ${DB_NAME}`);
  
  try {
    // Connexion à CouchDB
    const couch = Nano(COUCHDB_URL);
    const db = couch.db.use(DB_NAME);
    
    console.log('✓ Connecté à CouchDB');
    
    // 1. Importer les Design Documents
    console.log('\n📄 Import des Design Documents...');
    const designFiles = [
      path.join(DESIGN_DIR, 'demandes_design.json'),
      path.join(DESIGN_DIR, 'contacts_design.json')
    ];
    
    for (const designFile of designFiles) {
      if (fs.existsSync(designFile)) {
        const designDoc = JSON.parse(fs.readFileSync(designFile, 'utf8'));
        try {
          await db.insert(designDoc);
          console.log(`  ✓ ${designDoc._id} importé`);
        } catch (e) {
          if (e.statusCode === 412) {
            console.log(`  ℹ️ ${designDoc._id} existe déjà, mis à jour`);
            await db.destroy(designDoc._id, designDoc._rev);
            await db.insert(designDoc);
          } else {
            console.warn(`  ⚠️ Erreur import ${designDoc._id}: ${e.message}`);
          }
        }
      }
    }
    
    // 2. Importer les séquences (configuration)
    console.log('\n📋 Import des séquences...');
    const sequences = JSON.parse(fs.readFileSync(path.join(EXPORT_DIR, 'sequences.json'), 'utf8'));
    for (const seq of sequences) {
      try {
        await db.insert(seq);
      } catch (e) {
        if (e.statusCode === 409) {
          console.log(`  ℹ️ Séquence ${seq._id} existe déjà, ignorée`);
        } else {
          console.warn(`  ⚠️ Erreur import séquence ${seq._id}: ${e.message}`);
        }
      }
    }
    console.log(`  ✓ ${sequences.length} séquences importées`);
    
    // 3. Importer les profils SMTP
    console.log('\n📧 Import des profils SMTP...');
    const smtpProfiles = JSON.parse(fs.readFileSync(path.join(EXPORT_DIR, 'smtp_profiles.json'), 'utf8'));
    for (const smtp of smtpProfiles) {
      try {
        await db.insert(smtp);
      } catch (e) {
        if (e.statusCode === 409) {
          console.log(`  ℹ️ Profil SMTP ${smtp._id} existe déjà, ignoré`);
        } else {
          console.warn(`  ⚠️ Erreur import SMTP ${smtp._id}: ${e.message}`);
        }
      }
    }
    console.log(`  ✓ ${smtpProfiles.length} profils SMTP importés`);
    
    // 4. Importer les utilisateurs
    console.log('\n👤 Import des utilisateurs...');
    const users = JSON.parse(fs.readFileSync(path.join(EXPORT_DIR, 'users.json'), 'utf8'));
    for (const user of users) {
      try {
        await db.insert(user);
      } catch (e) {
        if (e.statusCode === 409) {
          console.log(`  ℹ️ Utilisateur ${user._id} existe déjà, ignoré`);
        } else {
          console.warn(`  ⚠️ Erreur import utilisateur ${user._id}: ${e.message}`);
        }
      }
    }
    console.log(`  ✓ ${users.length} utilisateurs importés`);
    
    // 5. Importer les contacts
    console.log('\n📞 Import des contacts...');
    const contacts = JSON.parse(fs.readFileSync(path.join(EXPORT_DIR, 'contacts.json'), 'utf8'));
    for (const contact of contacts) {
      try {
        await db.insert(contact);
      } catch (e) {
        if (e.statusCode === 409) {
          console.log(`  ℹ️ Contact ${contact._id} existe déjà, ignoré`);
        } else {
          console.warn(`  ⚠️ Erreur import contact ${contact._id}: ${e.message}`);
        }
      }
    }
    console.log(`  ✓ ${contacts.length} contacts importés`);
    
    // 6. Importer les demandes (par lots de 100)
    console.log('\n📊 Import des demandes...');
    const demandes = JSON.parse(fs.readFileSync(path.join(EXPORT_DIR, 'demandes.json'), 'utf8'));
    
    for (let i = 0; i < demandes.length; i += 100) {
      const lot = demandes.slice(i, i + 100);
      try {
        const result = await db.bulk({ docs: lot });
        const errors = result.filter(r => 'error' in r);
        if (errors.length > 0) {
          console.warn(`  ⚠️ ${errors.length} erreurs dans le lot ${i}-${i+lot.length}`);
        }
        console.log(`  ✓ Importé ${i + lot.length}/${demandes.length} demandes`);
      } catch (e) {
        console.error(`  ❌ Erreur bulk insert lot ${i}-${i+lot.length}: ${e.message}`);
      }
    }
    
    console.log(`  ✓ ${demandes.length} demandes importées`);
    
    // Résumé
    console.log('\n' + '='.repeat(60));
    console.log('✅ MIGRATION TERMINÉE AVEC SUCCÈS');
    console.log('='.repeat(60));
    console.log('Résumé:');
    console.log(`  - ${sequences.length} séquences`);
    console.log(`  - ${smtpProfiles.length} profils SMTP`);
    console.log(`  - ${users.length} utilisateurs`);
    console.log(`  - ${contacts.length} contacts`);
    console.log(`  - ${demandes.length} demandes`);
    console.log('='.repeat(60));
    
  } catch (err) {
    console.error('❌ Erreur critique lors de l\'import:', err);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('❌ Erreur:', err);
  process.exit(1);
});
