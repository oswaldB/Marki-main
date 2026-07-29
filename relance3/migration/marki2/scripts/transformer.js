// transformer.js - Transformation des impayes en documents demande pour CouchDB
// Nouvelle structure : demande avec dossiers[], missions complètes, factures avec payeur

const fs = require('fs');
const path = require('path');

const EXPORT_FILE = path.join(__dirname, '..', 'export', 'marki_data.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'export', 'demandes.json');

// Charger les données exportées
const data = JSON.parse(fs.readFileSync(EXPORT_FILE, 'utf8'));

console.log('🚀 Transformation des données avec nouvelle structure...');
console.log('Tables chargées:', Object.keys(data).join(', '));

// Créer une map des contacts pour référence rapide
const contactsMap = new Map();
if (data.contacts && data.contacts.length > 0) {
  data.contacts.forEach(c => {
    contactsMap.set(c.id, c);
  });
  console.log(`✓ ${contactsMap.size} contacts dans la map`);
}

// Grouper les impayés par client (payer_id)
// Une demande = un client (payeur) avec tous ses dossiers et factures
const impayesParClient = new Map();
const demandes = [];

if (data.impayes && data.impayes.length > 0) {
  // Grouper par client
  data.impayes.forEach(impaye => {
    const clientId = impaye.payer_id;
    
    if (!clientId) {
      console.warn(`⚠️ Impayé sans payer_id: ${impaye.id}`);
      return;
    }
    
    if (!impayesParClient.has(clientId)) {
      impayesParClient.set(clientId, []);
    }
    impayesParClient.get(clientId).push(impaye);
  });
  
  console.log(`✓ ${impayesParClient.size} clients identifiés`);

  // Créer les documents demande
  impayesParClient.forEach((impayes, clientId) => {
    const premier = impayes[0];
    const payer = contactsMap.get(clientId);
    const apporteur = contactsMap.get(premier.apporteur_id);
    
    // Générer un ID unique pour la demande
    const demandeId = `demande:${clientId}`;
    
    // Créer les dossiers uniques (un dossier = id_dossier unique)
    const dossiersMap = new Map();
    impayes.forEach(impaye => {
      const dossierIdExterne = impaye.id_dossier || `dossier_${impaye.id}`;
      
      if (!dossiersMap.has(dossierIdExterne)) {
        // Extraire le type d'intervention depuis cadre_mission ou autres champs
        const cadreMission = impaye.cadre_mission || '';
        const contexte = cadreMission.split('_')[0] || 'LOC'; // LOC, AVV, etc.
        const typeIntervention = cadreMission.split('_')[1] || 'diagnostic';
        
        dossiersMap.set(dossierIdExterne, {
          id: `dossier_${dossierIdExterne}`,
          id_externe: dossierIdExterne,
          reference: parseInt(impaye.numero_dossier) || parseInt(dossierIdExterne) || 0,
          mission: {
            contexte: contexte,
            type_intervention: typeIntervention,
            date_intervention: impaye.date_piece || null,
            intervenant: impaye.employe_intervention || null,
            personne_sur_place: null // Pas de champ direct dans SQLite
          },
          bien: {
            adresse: impaye.adresse_bien || '',
            code_postal: impaye.code_postal || '',
            ville: impaye.ville || '',
            etage: impaye.etage || null,
            porte: impaye.porte || null,
            lot: impaye.numero_lot || null
          }
        });
      }
    });
    
    // Créer le document demande
    const demande = {
      _id: demandeId,
      type: 'demande',
      reference: clientId,
      date_creation: premier.created_at || premier.date_creation || new Date().toISOString(),
      statut: impayes.some(i => i.solde !== 1 && i.facture_soldee !== 1) ? 'en_relance' : 'solde',
      
      // Client (snapshot)
      client: payer ? {
        id: `contact:${payer.id}`,
        nom: payer.nom || '',
        prenom: payer.prenom || '',
        email: payer.email || null,
        telephone: payer.telephone || null,
        type: payer.type || null
      } : null,
      
      // Apporteur (snapshot sans commission)
      apporteur: apporteur ? {
        id: `contact:${apporteur.id}`,
        nom: apporteur.nom || apporteur.prenom || 'Inconnu'
      } : null,
      
      // Apporteur est aussi le payeur (si même ID)
      apporteur_payeur: (apporteur && payer && apporteur.id === payer.id) ? true : false,
      
      // Dossiers (tableau)
      dossiers: Array.from(dossiersMap.values()),
      
      // Factures avec payeur snapshot
      factures: impayes.map((i) => ({
        id: `facture:${i.id}`,
        nfacture: i.nfacture || `FACT-${i.id}`,
        payeur: {
          nom: i.payeur_nom || payer?.nom || '',
          prenom: i.payeur_prenom || payer?.prenom || '',
          email: i.payeur_email || payer?.email || null,
          telephone: i.payeur_telephone || payer?.telephone || null,
          adresse: i.adresse_bien || null
        },
        date_facture: i.date_facture || null,
        date_echeance: i.date_echeance || null,
        montant_ttc: i.montant_ttc || 0,
        reste_a_payer: i.reste_a_payer || i.solde_du || i.montant_ttc || 0,
        created_at: i.created_at || null
      })),
      
      // Relances
      relances: [],
      
      // Events
      events: [],
      
      // Stats calculées
      stats: {
        nb_dossiers: dossiersMap.size,
        nb_factures: impayes.length,
        nb_factures_impayees: impayes.filter(i => i.solde !== 1 && i.facture_soldee !== 1).length,
        montant_total_du: impayes.reduce((sum, i) => sum + (i.reste_a_payer || i.solde_du || i.montant_ttc || 0), 0),
        nb_relances: 0,
        date_derniere_relance: null
      },
      
      created_at: premier.created_at || premier.date_creation || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Ajouter les relances liées à ce client
    if (data.relances && data.relances.length > 0) {
      const relancesLiees = data.relances.filter(r => 
        r.contact_id === clientId
      );
      
      demande.relances = relancesLiees.map(r => ({
        id: `relance:${r.id}`,
        dossier_id: null, // Peut être enrichi si on a le lien
        sequence_id: r.sequence_id || null,
        date_envoi: r.date_envoi || r.created_at || null,
        date_creation: r.created_at || r.date_programmation || null,
        statut: r.email_sent ? 'envoyee' : 'programme',
        sujet: r.sujet || '',
        corps: r.corps || '',
        mode: r.manuelle ? 'manuel' : 'automatique'
      }));
      
      demande.stats.nb_relances = relancesLiees.length;
      if (relancesLiees.length > 0) {
        const derniereRelance = relancesLiees
          .filter(r => r.date_envoi)
          .sort((a, b) => new Date(b.date_envoi) - new Date(a.date_envoi))[0];
        demande.stats.date_derniere_relance = derniereRelance?.date_envoi || null;
      }
    }
    
    // Ajouter les events liés
    if (data.events && data.events.length > 0) {
      const eventsLies = data.events.filter(e => 
        e.who_id === clientId || impayes.some(i => e.entity_id === i.id)
      );
      
      demande.events = eventsLies.map(e => ({
        type: e.type || '',
        date: e.created_at || e.date || null,
        description: e.description || e.titre || '',
        user_id: e.who_id || e.by_user || ''
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
console.log(`\nNouvelle structure:`);
console.log('   - demande regroupe les factures par client (payer)');
console.log('   - dossiers[] avec mission complète (contexte, type, date, intervenant)');
console.log('   - factures[] avec payeur snapshot');
console.log('   - relances[] avec corps, mode, date_creation');
