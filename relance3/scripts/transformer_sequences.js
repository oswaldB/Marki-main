// transformer_sequences.js - Transformation des séquences pour CouchDB
const fs = require('fs');
const path = require('path');

const EXPORT_FILE = path.join(__dirname, '..', 'export', 'marki_data.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'export', 'sequences.json');

// Charger les données
const data = JSON.parse(fs.readFileSync(EXPORT_FILE, 'utf8'));

console.log('🚀 Transformation des séquences...');

const sequences = data.sequences.map(s => {
  // Parser les champs JSON stockés comme texte dans SQLite
  let emails = [];
  let regles = {};
  let groupes_regles = [];
  
  try {
    if (s.emails_json) {
      emails = typeof s.emails_json === 'string' ? JSON.parse(s.emails_json) : s.emails_json;
    }
    if (s.regles_json) {
      regles = typeof s.regles_json === 'string' ? JSON.parse(s.regles_json) : s.regles_json;
    }
    if (s.groupes_regles_json) {
      groupes_regles = typeof s.groupes_regles_json === 'string' ? JSON.parse(s.groupes_regles_json) : s.groupes_regles_json;
    }
  } catch (e) {
    console.warn(`⚠️ Erreur de parsing JSON pour séquence ${s.id}: ${e.message}`);
  }
  
  return {
    _id: `sequence:${s.id}`,
    type: 'sequence',
    nom: s.nom || `Séquence ${s.id}`,
    type_sequence: s.type_sequence || 'relances',
    niveau: s.niveau || 1,
    actif: s.actif === 1 || s.actif === true || s.actif === 'true',
    validation_obligatoire: s.validation_obligatoire === 1 || s.validation_obligatoire === true,
    attribution_automatique: s.attribution_automatique === 1 || s.attribution_automatique === true,
    scenario: s.scenario || '',
    emails: emails,
    regles: regles,
    groupes_regles: groupes_regles,
    created_at: s.created_at || new Date().toISOString(),
    updated_at: s.updated_at || new Date().toISOString()
  };
});

// Exporter
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(sequences, null, 2));
console.log(`✅ Transformation terminée: ${OUTPUT_FILE}`);
console.log(`   ${sequences.length} documents 'sequence' prêts pour CouchDB`);
