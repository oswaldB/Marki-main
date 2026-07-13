/**
 * Changement de mot de passe
 * Usage: node scripts/change-password.js <email> [ancien_password] [nouveau_password]
 * Si ancien_password n'est pas fourni, l'admin peut changer sans vérification
 */

const path = require('path');
const AuthLocal = require('../lib/auth-local');
const FlatFileDB = require('../lib/flat-file-db');

async function changePassword() {
  const targetEmail = process.argv[2];
  const oldPassword = process.argv[3];
  const newPassword = process.argv[4] || process.argv[3]; // Si pas d'ancien, le nouveau est le 3ème arg

  if (!targetEmail || !newPassword) {
    console.log('Usage (utilisateur): node scripts/change-password.js <email> <ancien> <nouveau>');
    console.log('Usage (admin):      node scripts/change-password.js <email> <nouveau>');
    console.log('\nExemple: node scripts/change-password.js admin@adti.fr admin123 MonNouveauPass123!');
    process.exit(1);
  }

  if (newPassword.length < 6) {
    console.error('❌ Le nouveau mot de passe doit faire au moins 6 caractères');
    process.exit(1);
  }

  const baseDir = path.join(__dirname, '..', 'data');
  const db = new FlatFileDB(baseDir);
  await db.loadAll();

  // Trouver l'utilisateur
  const users = await db.search('users', { email: targetEmail });
  if (users.length === 0) {
    console.error(`❌ Utilisateur ${targetEmail} non trouvé`);
    process.exit(1);
  }

  const user = users[0];

  // Si ancien password fourni, vérifier qu'il est correct (mode user)
  if (oldPassword && oldPassword !== newPassword) {
    const valid = await AuthLocal.verifyPassword(oldPassword, user.password_hash);
    if (!valid) {
      console.error('❌ Ancien mot de passe incorrect');
      process.exit(1);
    }
    console.log('✅ Ancien mot de passe vérifié');
  } else {
    console.log('⚠️  Mode admin: pas de vérification de l\'ancien mot de passe');
  }

  try {
    await AuthLocal.changePassword(db, user.id, oldPassword || 'admin_skip', newPassword);
    console.log(`✅ Mot de passe changé pour ${targetEmail}`);
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  }
}

changePassword().catch(console.error);
