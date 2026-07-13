/**
 * Script d'initialisation du premier administrateur
 * Usage: node scripts/init-admin.js [email] [password]
 * Par défaut: admin@adti.fr / admin123
 */

const path = require('path');
const AuthLocal = require('../lib/auth-local');
const FlatFileDB = require('../lib/flat-file-db');

async function init() {
  const baseDir = path.join(__dirname, '..', 'data');
  const db = new FlatFileDB(baseDir);
  
  console.log('📂 Chargement de la base de données...');
  await db.loadAll();
  
  // Vérifier si des admins existent déjà
  const existingAdmins = await db.search('users', { role: 'admin' });
  if (existingAdmins.length > 0) {
    console.log('⚠️  Des administrateurs existent déjà:');
    existingAdmins.forEach(admin => {
      console.log(`   - ${admin.email} (${admin.id})`);
    });
    console.log('\nPour créer un nouvel admin, utilisez le script create-user.js');
    process.exit(0);
  }
  
  // Paramètres par défaut ou depuis les arguments
  const email = process.argv[2] || 'admin@adti.fr';
  const password = process.argv[3] || 'admin123';
  
  // Validation basique
  if (password.length < 6) {
    console.error('❌ Le mot de passe doit faire au moins 6 caractères');
    process.exit(1);
  }
  
  if (!email.includes('@')) {
    console.error('❌ Email invalide');
    process.exit(1);
  }
  
  console.log(`\n👤 Création de l'administrateur: ${email}`);
  
  try {
    const hash = await AuthLocal.hashPassword(password);
    
    const user = await db.create('users', {
      id: `user_${Date.now()}`,
      email: email,
      password_hash: hash,
      role: 'admin',
      is_active: true,
      created_at: new Date().toISOString(),
      last_login: null,
      login_count: 0,
      _acl: {
        owner: 'system',
        created_by: 'system',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        permissions: {
          owner: ['read', 'write', 'delete'],
          admin: ['read', 'write', 'delete'],
          user: []
        }
      }
    });
    
    console.log('\n✅ Administrateur créé avec succès !');
    console.log('═══════════════════════════════════════════════');
    console.log(`  ID:       ${user.id}`);
    console.log(`  Email:    ${user.email}`);
    console.log(`  Rôle:     ${user.role}`);
    console.log(`  Mot de passe: ${password}`);
    console.log('═══════════════════════════════════════════════');
    console.log('\n⚠️  IMPORTANT: Changez le mot de passe par défaut !');
    console.log('   Exécutez: node scripts/change-password.js\n');
    
  } catch (err) {
    console.error('❌ Erreur lors de la création:', err.message);
    process.exit(1);
  }
}

init().catch(err => {
  console.error('❌ Erreur fatale:', err);
  process.exit(1);
});
