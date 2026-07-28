// transformer_smtp.js - Transformation des profils SMTP pour CouchDB
const fs = require('fs');
const path = require('path');

const EXPORT_FILE = path.join(__dirname, '..', 'export', 'marki_data.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'export', 'smtp_profiles.json');

// Charger les données
const data = JSON.parse(fs.readFileSync(EXPORT_FILE, 'utf8'));

console.log('🚀 Transformation des profils SMTP...');

// Fonction simple de chiffrement (placeholder - à remplacer par un vrai chiffrement)
function encrypt(password) {
  // En production, utiliser un vrai algorithme de chiffrement
  // Pour la migration, on peut stocker le mot de passe haché ou l'ignorer
  return '[ENCRYPTED]';
}

const smtpProfiles = data.smtp_profiles.map(s => {
  return {
    _id: `smtp:${s.id}`,
    type: 'smtp_profile',
    nom: s.nom || `SMTP ${s.id}`,
    host: s.host || '',
    port: s.port || 587,
    secure: s.secure === 1 || s.secure === true || s.secure === 'true',
    username: s.username || '',
    // Attention : mot de passe à sécuriser !
    // En production, utiliser un vrai chiffrement ou des variables d'environnement
    password_encrypted: s.password ? encrypt(s.password) : null,
    from_email: s.from_email || '',
    from_name: s.from_name || '',
    signature_html: s.signature_html || '',
    actif: s.actif === 1 || s.actif === true || s.actif === 'true',
    is_default: s.is_default === 1 || s.is_default === true || s.is_default === 'true',
    created_at: s.created_at || new Date().toISOString(),
    updated_at: s.updated_at || new Date().toISOString()
  };
});

// Exporter
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(smtpProfiles, null, 2));
console.log(`✅ Transformation terminée: ${OUTPUT_FILE}`);
console.log(`   ${smtpProfiles.length} documents 'smtp_profile' prêts pour CouchDB`);
console.log('⚠️  Note: Les mots de passe SMTP sont marqués comme [ENCRYPTED]');
console.log('    En production, implémentez un vrai chiffrement ou utilisez des variables d\'environnement');
