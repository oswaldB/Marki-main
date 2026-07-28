// transformer_contacts.js - Transformation des contacts pour CouchDB
const fs = require('fs');
const path = require('path');

const EXPORT_FILE = path.join(__dirname, '..', 'export', 'marki_data.json');
const DEMANDES_FILE = path.join(__dirname, '..', 'export', 'demandes.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'export', 'contacts.json');

// Charger les données
const data = JSON.parse(fs.readFileSync(EXPORT_FILE, 'utf8'));
const demandes = JSON.parse(fs.readFileSync(DEMANDES_FILE, 'utf8'));

console.log('🚀 Transformation des contacts...');

const contacts = data.contacts.map(c => {
  // Calculer le nombre de demandes actives pour ce contact
  const nb_demandes_actives = demandes.filter(d => 
    d.client && d.client.id === `contact:${c.id}` && d.statut === 'en_relance'
  ).length;
  
  return {
    _id: `contact:${c.id}`,
    type: 'contact',
    nom: c.nom || '',
    prenom: c.prenom || '',
    email: c.email || '',
    telephone: c.telephone || '',
    type_contact: c.type || 'client',
    adresse: {
      rue: c.adresse_rue || c.adresse || '',
      ville: c.adresse_ville || c.ville || '',
      code_postal: c.adresse_code_postal || c.code_postal || '',
      pays: c.adresse_pays || c.pays || 'France'
    },
    nb_demandes_actives: nb_demandes_actives,
    created_at: c.created_at || new Date().toISOString(),
    updated_at: c.updated_at || new Date().toISOString()
  };
});

// Exporter
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(contacts, null, 2));
console.log(`✅ Transformation terminée: ${OUTPUT_FILE}`);
console.log(`   ${contacts.length} documents 'contact' prêts pour CouchDB`);
