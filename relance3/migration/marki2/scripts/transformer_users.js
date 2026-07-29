// transformer_users.js - Transformation des utilisateurs pour CouchDB
const fs = require('fs');
const path = require('path');

const EXPORT_FILE = path.join(__dirname, '..', 'export', 'marki_data.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'export', 'users.json');

// Charger les données
const data = JSON.parse(fs.readFileSync(EXPORT_FILE, 'utf8'));

console.log('🚀 Transformation des utilisateurs...');

// Si la table users n'existe pas, créer un utilisateur admin par défaut
const users = data.users && data.users.length > 0 ? data.users.map(u => ({
  _id: `user:${u.id}`,
  type: 'user',
  username: u.username || u.email || `user${u.id}`,
  email: u.email || '',
  // Ne PAS migrer le password_hash tel quel !
  // Soit : re-hachage avec algorithme plus fort
  // Soit : forcer réinitialisation mot de passe
  password_hash: '[MIGRATION_REQUISE]', // À remplacer par un vrai hash
  role: u.role || 'user',
  is_active: u.is_active === 1 || u.is_active === true || u.is_active === 'true',
  last_login: u.last_login || null,
  login_count: u.login_count || 0,
  created_at: u.created_at || new Date().toISOString(),
  updated_at: u.updated_at || new Date().toISOString(),
  // Forcer changement mdp à première connexion
  must_reset_password: true
})) : [
  {
    _id: 'user:admin',
    type: 'user',
    username: 'admin',
    email: 'admin@marki.local',
    password_hash: '[MIGRATION_REQUISE]',
    role: 'admin',
    is_active: true,
    last_login: null,
    login_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    must_reset_password: true
  }
];

// Exporter
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(users, null, 2));
console.log(`✅ Transformation terminée: ${OUTPUT_FILE}`);
console.log(`   ${users.length} documents 'user' prêts pour CouchDB`);
console.log('⚠️  Important: La migration des utilisateurs nécessite une stratégie de mot de passe:');
console.log('   1. Option A: Forcer réinitialisation (tous les users recréent leur mdp)');
console.log('   2. Option B: Migration avec re-hachage (si algo compatible)');
console.log('   3. Option C: Utiliser système auth externe (JWT, OAuth)');
