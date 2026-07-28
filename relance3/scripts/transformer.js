// transformer.js - Transformation des impayes en documents demande pour CouchDB
const fs = require('fs');
const path = require('path');

const EXPORT_FILE = path.join(__dirname, '..', 'export', 'marki_data.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'export', 'demandes.json');

// Charger les données exportées
const data = JSON.parse(fs.readFileSync(EXPORT_FILE, 'utf8'));

console.log('🚀 Transformation des données...');
console.log('Tables chargées:', Object.keys(data).join(', '));

// Créer une map des contacts pour référence rapide
const contactsMap = new Map();
if (data.contacts && data.contacts.length > 0) {
  data.contacts.forEach(c => {
    contactsMap.set(c.id, c);
  });
  console.log(`✓ ${contactsMap.size} contacts dans la map`);
}

// Grouper les impayés par dossier
const impayesParDossier = new Map();
const demandes = [];

if (data.impayes && data.impayes.length > 0) {
  data.impayes.forEach(impaye => {
    // Utiliser id_dossier ou payer_id comme clé de dossier
    const dossierKey = impaye.id_dossier || impaye.payer_id;
    
    if (!dossierKey) {
      console.warn(`⚠️ Impayé sans dossier_key: ${impaye.id}`);
      return;
    }
    
    if (!impayesParDossier.has(dossierKey)) {
      impayesParDossier.set(dossierKey, []);
    }
    impayesParDossier.get(dossierKey).push(impaye);
  });
  
  console.log(`✓ ${impayesParDossier.size} dossiers identifiés`);

  // Créer les documents demande
  impayesParDossier.forEach((impayes, dossierKey) => {
    const premier = impayes[0];
    const payer = contactsMap.get(premier.payer_id);
    const apporteur = contactsMap.get(premier.apporteur_id);
    
    // Créer le document demande
    const demande = {
      _id: `demande:${dossierKey}`,
      type: 'demande',
      reference: dossierKey,
      date_creation: premier.created_at || premier.date_creation || new Date().toISOString(),
      statut: impayes.some(i => i.statut !== 'solde') ? 'en_relance' : 'solde',
      
      // Client (snapshot)
      client: payer ? {
        id: `contact:${payer.id}`,
        nom: payer.nom,
        prenom: payer.prenom,
        email: payer.email,
        telephone: payer.telephone,
        type: payer.type
      } : null,
      
      // Apporteur (snapshot)
      apporteur: apporteur ? {
        id: `contact:${apporteur.id}`,
        nom: apporteur.nom || apporteur.prenom || 'Inconnu',
        commission: impayes.reduce((sum, i) => sum + (i.montant_ttc * 0.1), 0), // 10%
        commission_payee: false
      } : null,
      
      // Bien (depuis le premier impayé)
      bien: {
        adresse: premier.adresse_bien || '',
        code_postal: premier.code_postal || '',
        ville: premier.ville || ''
      },
      
      // Factures (anciens impayés)
      factures: impayes.map((i) => ({
        id: `facture:${i.id}`,
        nfacture: i.nfacture || `FACT-${i.id}`,
        date_facture: i.date_facture || '',
        date_echeance: i.date_echeance || '',
        montant_ttc: i.montant_ttc || 0,
        reste_a_payer: i.reste_a_payer || i.montant_ttc || 0,
        statut: i.statut === 'solde' ? 'solde' : (i.email_sent ? 'en_relance' : 'impaye'),
        created_at: i.created_at || ''
      })),
      
      // Relances (filtrer celles liées à ces impayés)
      relances: [],
      
      // Events (filtrer)
      events: [],
      
      // Stats calculées
      stats: {
        nb_factures: impayes.length,
        nb_factures_impayees: impayes.filter(i => i.statut !== 'solde').length,
        montant_total_du: impayes.reduce((sum, i) => sum + (i.reste_a_payer || i.montant_ttc || 0), 0),
        nb_relances: 0,
        date_derniere_relance: null
      },
      
      created_at: premier.created_at || premier.date_creation || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Ajouter les relances liées
    if (data.relances && data.relances.length > 0) {
      const relancesLiees = data.relances.filter(r => 
        impayes.some(i => r.impaye_id === i.id) || r.contact_id === premier.payer_id
      );
      
      demande.relances = relancesLiees.map(r => ({
        id: `relance:${r.id}`,
        sequence_id: r.sequence_id,
        date_envoi: r.date_envoi || r.created_at || '',
        statut: r.email_sent ? 'envoyee' : 'programme',
        sujet: r.sujet || ''
      }));
      
      demande.stats.nb_relances = relancesLiees.length;
      if (relancesLiees.length > 0) {
        demande.stats.date_derniere_relance = relancesLiees[relancesLiees.length - 1].date_envoi || 
                                                   relancesLiees[relancesLiees.length - 1].created_at || 
                                                   null;
      }
    }
    
    // Ajouter les events liés
    if (data.events && data.events.length > 0) {
      const eventsLies = data.events.filter(e => 
        e.entity_id && impayes.some(i => e.entity_id === i.id)
      );
      
      demande.events = eventsLies.map(e => ({
        type: e.type || '',
        date: e.created_at || e.date || '',
        description: e.description || '',
        user_id: e.who_id || e.user_id || ''
      }));
    }
    
    demandes.push(demande);
  });
  
  console.log(`✓ ${demandes.length} demandes créées`);
} else {
  console.warn('⚠️ Aucune donnée impayés trouvée');
}

// Exporter les documents transformés
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(demandes, null, 2));
console.log(`\n✅ Transformation terminée: ${OUTPUT_FILE}`);
console.log(`   ${demandes.length} documents 'demande' prêts pour CouchDB`);
