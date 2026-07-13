/**
 * Création d'un utilisateur (admin uniquement)
 * Usage: node scripts/create-user.js <email> <password> [role]
 * Role par défaut: user
 */

const path = require('path');
const AuthLocal = require('../lib/auth-local');
const FlatFileDB = require('../lib/flat-file-db');

async function createUser() {
  const email = process.argv[2];
  const password = process.argv[3];
  const role = process.argv[4] || 'user';

  if (!email || !password) {
    console.log('Usage: node scripts/create-user.js <email> <password> [role]');
    console.log('  role: user (défaut) | admin | readonly');
    process.exit(1);
  }

  if (!email.includes('@')) {
    console.error('❌ Email invalide');
    process.exit(1);
  }

  if (password.length < 6) {
    console.error('❌ Le mot de passe doit faire au moins 6 caractères');
    process.exit(1);
  }

  const validRoles = ['admin', 'user', 'readonly'];
  if (!validRoles.includes(role)) {
    console.error(`❌ Role invalide. Valeurs possibles: ${validRoles.join(', ')}`);
    process.exit(1);
  }

  const baseDir = path.join(__dirname, '..', 'data');
  const db = new FlatFileDB(baseDir);
  await db.loadAll();

  // Vérifier si email existe déjà
  const existing = await db.search('users', { email });
  if (existing.length > 0) {
    console.error(`❌ L'utilisateur ${email} existe déjà`);
    process.exit(1);
  }

  try {
    const hash = await AuthLocal.hashPassword(password);
    
    const user = await db.createSecure('users', {
      id: `user_${Date.now()}`,
      email: email,
      password_hash: hash,
      role: role,
      is_active: true,
      created_at: new Date().toISOString(),
      last_login: null,
      login_count: 0
    });

    console.log(`✅ Utilisateur créé: ${user.email} (rôle: ${role})`);
    
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  }
}

createUser().catch(console.error);
