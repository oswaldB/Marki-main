/**
 * Exemple d'utilisation du système d'authentification
 * Crée un contact en tant qu'utilisateur authentifié
 * 
 * Usage: node scripts/creer-contact.js <email> <password>
 * Exemple: node scripts/creer-contact.js admin@adti.fr admin123
 */

const path = require('path');
const AuthLocal = require('../lib/auth-local');
const FlatFileDB = require('../lib/flat-file-db');

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.log('Usage: node scripts/creer-contact.js <email> <password>');
    console.log('Exemple: node scripts/creer-contact.js admin@adti.fr admin123\n');
    process.exit(1);
  }

  const baseDir = path.join(__dirname, '..', 'data');
  const db = new FlatFileDB(baseDir);
  
  console.log('📂 Chargement de la base...');
  await db.loadAll();

  // Étape 1: Authentification
  console.log(`\n🔐 Tentative de connexion pour ${email}...`);
  const session = await AuthLocal.login(db, email, password);
  
  if (!session) {
    console.error('❌ Échec de l\'authentification');
    process.exit(1);
  }
  
  console.log(`✅ Connecté en tant que ${session.user.email} (${session.user.role})`);
  console.log(`🎫 Token JWT: ${session.token.substring(0, 30)}...\n`);

  // Étape 2: Exécution avec contexte utilisateur
  await AuthLocal.asUser(session.token, async () => {
    console.log('🔒 Contexte utilisateur actif\n');

    // Exemple 1: Créer un contact (nécessite auth)
    console.log('➕ Création d\'un contact...');
    try {
      const contact = await db.createSecure('contacts', {
        id: `contact_${Date.now()}`,
        nom: 'Société Exemple SARL',
        email: 'contact@exemple.fr',
        type: 'client',
        telephone: '+33 1 23 45 67 89',
        adresse: '123 Rue de Paris, 75000 Paris'
      });
      
      console.log(`✅ Contact créé: ${contact.nom}`);
      console.log(`   ID: ${contact.id}`);
      console.log(`   Owner: ${contact._acl.owner}\n`);
    } catch (err) {
      console.error(`❌ Erreur création contact: ${err.message}\n`);
    }

    // Exemple 2: Liste des contacts visibles
    console.log('📋 Liste des contacts accessibles:');
    try {
      const contacts = await db.querySecure('contacts', {});
      console.log(`   ${contacts.length} contact(s) trouvé(s):`);
      contacts.forEach(c => {
        console.log(`     - ${c.nom} (${c.email}) [owner: ${c._acl?.owner || 'N/A'}]`);
      });
    } catch (err) {
      console.error(`❌ Erreur lecture contacts: ${err.message}`);
    }

    // Exemple 3: Tentative d'accès non autorisé (si on n'est pas owner)
    console.log('\n🔍 Test de sécurité - Accès à un autre contact:');
    try {
      const allContacts = await db.search('contacts', {});
      if (allContacts.length > 0) {
        // Essayer de lire le premier contact (peut échouer si pas owner)
        const firstContact = allContacts[0];
        console.log(`   Tentative de lecture de ${firstContact.id}...`);
        const doc = await db.readSecure('contacts', firstContact.id);
        console.log(`   ✅ Accès autorisé: ${doc.nom}`);
      }
    } catch (err) {
      console.log(`   🚫 Accès refusé: ${err.message}`);
    }
  });

  // Étape 3: Après le contexte, plus d'accès
  console.log('\n🔓 Contexte utilisateur fermé');
  console.log('Tentative d\'accès sans auth:');
  try {
    await db.createSecure('contacts', {
      id: `contact_${Date.now()}`,
      nom: 'Contact Sans Auth',
      email: 'test@test.com'
    });
  } catch (err) {
    console.log(`   🚫 Refusé (normal): ${err.message}`);
  }

  console.log('\n✨ Démo terminée !');
}

main().catch(err => {
  console.error('❌ Erreur:', err.message);
  process.exit(1);
});
