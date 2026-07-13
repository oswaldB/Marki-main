#!/usr/bin/env node
/**
 * Script de migration Parse → Flat-Files YAML
 * Usage: node migrate-from-parse.js
 */

const Parse = require('parse/node');
const FlatFileDB = require('../lib/flat-file-db');
const path = require('path');
require('dotenv').config({ path: '/home/ubuntu/prod/adti/.env' });

// Config Parse
const PARSE_APP_ID = process.env.PARSE_APP_ID;
const PARSE_SERVER_URL = process.env.PARSE_SERVER_URL;
const PARSE_MASTER_KEY = process.env.PARSE_MASTER_KEY;

if (!PARSE_APP_ID || !PARSE_SERVER_URL || !PARSE_MASTER_KEY) {
  console.error('❌ Variables Parse manquantes dans .env');
  process.exit(1);
}

Parse.initialize(PARSE_APP_ID, null, PARSE_MASTER_KEY);
Parse.serverURL = PARSE_SERVER_URL;

// DB locale
const DATA_DIR = path.join(__dirname, '..', 'data');
const db = new FlatFileDB(DATA_DIR);

// Compteurs
const stats = {
  contacts: { created: 0, errors: 0 },
  sequences: { created: 0, errors: 0 },
  smtpProfiles: { created: 0, errors: 0 },
  impayes: { created: 0, errors: 0 },
  relances: { created: 0, errors: 0 }
};

async function migrateContacts() {
  console.log('\n📋 Migration des Contacts...');
  const Contact = Parse.Object.extend('Contact');
  const query = new Parse.Query(Contact);
  query.limit(999999);
  
  try {
    const contacts = await query.find({ useMasterKey: true });
    console.log(`   Trouvé ${contacts.length} contacts`);
    
    for (const c of contacts) {
      try {
        const data = {
          id: `cont_${c.id}`,
          code: c.get('code') || null,
          nom: c.get('nom') || '',
          prenom: c.get('prenom') || '',
          civilite: c.get('civilite') || null,
          email: c.get('email') || null,
          telephone: c.get('telephone') || null,
          societe: c.get('societe') || null,
          type_personne: c.get('type_personne') || 'Particulier',
          activite_societe: c.get('activite_societe') || null,
          adresse_rue: c.get('adresse') || null,
          adresse_code_postal: c.get('code_postal') || null,
          adresse_ville: c.get('ville') || null,
          adresse_pays: c.get('pays') || 'France',
          statut: c.get('statut') || 'actif',
          is_blacklisted: c.get('isBlacklisted') || false,
          blacklist_motif: c.get('blacklistMotif') || null,
          blacklist_date: c.get('blacklistDate')?.toISOString() || null,
          impaye_ids: [],
          relance_ids: [],
          created_at: c.createdAt?.toISOString() || new Date().toISOString(),
          updated_at: c.updatedAt?.toISOString() || new Date().toISOString()
        };
        
        await db.create('contacts', data);
        stats.contacts.created++;
      } catch (err) {
        console.error(`   ❌ Erreur contact ${c.id}: ${err.message}`);
        stats.contacts.errors++;
      }
    }
  } catch (err) {
    console.error(`   ❌ Erreur globale: ${err.message}`);
  }
  
  console.log(`   ✅ ${stats.contacts.created} contacts créés`);
}

async function migrateSequences() {
  console.log('\n📋 Migration des Séquences...');
  const Sequence = Parse.Object.extend('Sequence');
  const query = new Parse.Query(Sequence);
  query.limit(999999);
  
  try {
    const sequences = await query.find({ useMasterKey: true });
    console.log(`   Trouvé ${sequences.length} séquences`);
    
    for (const s of sequences) {
      try {
        const emails = s.get('emails') || [];
        const formattedEmails = emails.map((e, idx) => ({
          email_index: idx + 1,
          delai: e.delai || 0,
          objet: e.objet || '',
          corps: e.corps || '',
          cc: e.cc || '',
          scenarios: (e.scenarios || []).map(sc => ({
            format: sc.format || 'single',
            active: sc.active || false,
            smtp_profile_id: sc.smtp ? `smtp_${sc.smtp.objectId || sc.smtp}` : null,
            objet: sc.objet || '',
            corps: sc.corps || ''
          }))
        }));
        
        const data = {
          id: `seq_${s.id}`,
          nom: s.get('nom') || 'Sans nom',
          type_sequence: s.get('type') || 'relances',
          validation_obligatoire: s.get('validation_obligatoire') || false,
          actif: s.get('actif') !== false,
          emails: formattedEmails,
          created_at: s.createdAt?.toISOString() || new Date().toISOString(),
          updated_at: s.updatedAt?.toISOString() || new Date().toISOString()
        };
        
        await db.create('sequences', data);
        stats.sequences.created++;
      } catch (err) {
        console.error(`   ❌ Erreur séquence ${s.id}: ${err.message}`);
        stats.sequences.errors++;
      }
    }
  } catch (err) {
    console.error(`   ❌ Erreur globale: ${err.message}`);
  }
  
  console.log(`   ✅ ${stats.sequences.created} séquences créées`);
}

async function migrateSmtpProfiles() {
  console.log('\n📋 Migration des SMTP Profiles...');
  const SmtpProfile = Parse.Object.extend('SmtpProfile');
  const query = new Parse.Query(SmtpProfile);
  query.limit(999999);
  
  try {
    const profiles = await query.find({ useMasterKey: true });
    console.log(`   Trouvé ${profiles.length} profiles SMTP`);
    
    for (const p of profiles) {
      try {
        const data = {
          id: `smtp_${p.id}`,
          nom: p.get('nom') || 'SMTP',
          description: p.get('description') || '',
          host: p.get('host') || 'localhost',
          port: p.get('port') || 587,
          secure: p.get('secure') || false,
          require_tls: p.get('requireTLS') !== false,
          username: p.get('username') || '',
          password: p.get('password') ? `[encrypted:${p.get('password').substring(0, 3)}...]` : '',
          from_email: p.get('from') || p.get('username') || '',
          from_name: p.get('fromName') || '',
          actif: p.get('actif') !== false,
          max_per_hour: p.get('maxPerHour') || 100,
          reply_to: p.get('replyTo') || '',
          display_name: p.get('displayName') || '',
          created_at: p.createdAt?.toISOString() || new Date().toISOString(),
          updated_at: p.updatedAt?.toISOString() || new Date().toISOString()
        };
        
        await db.create('smtp_profiles', data);
        stats.smtpProfiles.created++;
      } catch (err) {
        console.error(`   ❌ Erreur SMTP ${p.id}: ${err.message}`);
        stats.smtpProfiles.errors++;
      }
    }
  } catch (err) {
    console.error(`   ❌ Erreur globale: ${err.message}`);
  }
  
  console.log(`   ✅ ${stats.smtpProfiles.created} profiles SMTP créés`);
}

async function migrateImpayes() {
  console.log('\n📋 Migration des Impayés...');
  const Impaye = Parse.Object.extend('Impaye');
  const query = new Parse.Query(Impaye);
  query.limit(999999);
  query.include(['sequence', 'contact_relance', 'payeur', 'apporteur', 'proprietaire', 'donneur_ordre']);
  
  try {
    const impayes = await query.find({ useMasterKey: true });
    console.log(`   Trouvé ${impayes.length} impayés`);
    
    // Map pour stocker les relations contact -> impayes
    const contactImpayes = new Map();
    
    for (const i of impayes) {
      try {
        const payer = i.get('payeur');
        const contactRelance = i.get('contact_relance');
        const apporteur = i.get('apporteur');
        const proprietaire = i.get('proprietaire');
        const donneurOrdre = i.get('donneur_ordre');
        const sequence = i.get('sequence');
        
        const payerId = payer ? `cont_${payer.id}` : null;
        const contactRelanceId = contactRelance ? `cont_${contactRelance.id}` : payerId;
        
        const data = {
          id: `imp_${i.id}`,
          nfacture: i.get('nfacture') || '',
          reference: i.get('reference') || null,
          ref_piece: i.get('ref_piece') || null,
          numero_dossier: i.get('numero_dossier') || null,
          id_dossier: i.get('id_dossier') || null,
          
          date_piece: i.get('date_piece')?.toISOString().split('T')[0] || null,
          date_echeance: i.get('date_echeance')?.toISOString().split('T')[0] || null,
          date_import: i.get('date_import')?.toISOString() || new Date().toISOString(),
          
          total_ht: i.get('total_ht') || 0,
          total_ttc: i.get('total_ttc') || 0,
          montant_total: i.get('montant_total') || 0,
          reste_a_payer: i.get('reste_a_payer') || 0,
          
          facture_soldee: i.get('facture_soldee') || false,
          statut: i.get('statut') || 'non_payee',
          
          payer_id: payerId,
          contact_relance_id: contactRelanceId,
          apporteur_id: apporteur ? `cont_${apporteur.id}` : null,
          proprietaire_id: proprietaire ? `cont_${proprietaire.id}` : null,
          donneur_ordre_id: donneurOrdre ? `cont_${donneurOrdre.id}` : null,
          sequence_id: sequence ? `seq_${sequence.id}` : null,
          
          payeur_nom: i.get('payeur_nom') || payer?.get('nom') || '',
          payeur_prenom: i.get('payeur_prenom') || payer?.get('prenom') || '',
          payeur_email: i.get('payeur_email') || payer?.get('email') || '',
          payeur_telephone: i.get('payeur_telephone') || payer?.get('telephone') || '',
          payeur_civilite: i.get('payeur_civilite') || payer?.get('civilite') || '',
          payeur_type: i.get('payeur_type') || payer?.get('type_personne') || '',
          
          apporteur_nom: i.get('apporteur_nom') || apporteur?.get('nom') || null,
          apporteur_prenom: i.get('apporteur_prenom') || apporteur?.get('prenom') || null,
          apporteur_societe: i.get('apporteur_societe') || apporteur?.get('societe') || null,
          
          proprietaire_nom: i.get('proprietaire_nom') || proprietaire?.get('nom') || null,
          proprietaire_prenom: i.get('proprietaire_prenom') || proprietaire?.get('prenom') || null,
          
          donneur_ordre_nom: i.get('donneur_ordre_nom') || donneurOrdre?.get('nom') || null,
          donneur_ordre_prenom: i.get('donneur_ordre_prenom') || donneurOrdre?.get('prenom') || null,
          
          adresse_bien: i.get('adresse_bien') || '',
          ville: i.get('ville') || '',
          code_postal: i.get('code_postal') || '',
          
          url_pdf: i.get('url_pdf') || null,
          url_pdf_token: i.get('url_pdf_token') || null,
          
          email_index: i.get('email_index') || 0,
          
          is_blacklisted: i.get('isBlacklisted') || false,
          blacklist_motif: i.get('blacklistMotif') || null,
          blacklist_date: i.get('blacklistDate')?.toISOString() || null,
          
          commentaire_piece: i.get('commentaire_piece') || '',
          
          created_at: i.createdAt?.toISOString() || new Date().toISOString(),
          updated_at: i.updatedAt?.toISOString() || new Date().toISOString()
        };
        
        await db.create('impayes', data);
        stats.impayes.created++;
        
        // Tracker les relations pour mise à jour des contacts
        if (contactRelanceId) {
          if (!contactImpayes.has(contactRelanceId)) {
            contactImpayes.set(contactRelanceId, []);
          }
          contactImpayes.get(contactRelanceId).push(data.id);
        }
        
      } catch (err) {
        console.error(`   ❌ Erreur impaye ${i.id}: ${err.message}`);
        stats.impayes.errors++;
      }
    }
    
    // Mettre à jour les contacts avec leurs impayes
    console.log(`   📝 Mise à jour des relations contacts...`);
    for (const [contactId, impayeIds] of contactImpayes) {
      try {
        await db.update('contacts', contactId, { impaye_ids: impayeIds });
      } catch (e) {
        // Contact peut ne pas exister
      }
    }
    
  } catch (err) {
    console.error(`   ❌ Erreur globale: ${err.message}`);
  }
  
  console.log(`   ✅ ${stats.impayes.created} impayés créés`);
}

async function migrateRelances() {
  console.log('\n📋 Migration des Relances...');
  const Relance = Parse.Object.extend('Relance');
  const query = new Parse.Query(Relance);
  query.limit(999999);
  query.include(['contact', 'sequence', 'impayes']);
  
  try {
    const relances = await query.find({ useMasterKey: true });
    console.log(`   Trouvé ${relances.length} relances`);
    
    // Map pour les relations
    const contactRelances = new Map();
    
    for (const r of relances) {
      try {
        const contact = r.get('contact');
        const sequence = r.get('sequence');
        const impayes = r.get('impayes') || [];
        const smtpProfile = r.get('smtpProfil');
        
        const contactId = contact ? `cont_${contact.id}` : null;
        
        const data = {
          id: `rel_${r.id}`,
          contact_id: contactId,
          sequence_id: sequence ? `seq_${sequence.id}` : null,
          
          impaye_ids: impayes.map(i => `imp_${i.id || i.objectId}`),
          
          scenario: r.get('scenario') || 'single',
          email_index: r.get('email_index') || 1,
          
          objet: r.get('objet') || '',
          corps: r.get('corps') || '',
          corps_html: r.get('corpsHtml') || null,
          
          statut: r.get('statut') || 'brouillon',
          manuelle: r.get('manuelle') || false,
          valide: r.get('valide') !== false,
          
          date_creation: r.createdAt?.toISOString() || new Date().toISOString(),
          date_envoi: r.get('dateEnvoi')?.toISOString() || r.get('envoye_le')?.toISOString() || null,
          planifiee_le: r.get('planifiee_le')?.toISOString() || null,
          
          smtp_profile_id: smtpProfile ? `smtp_${smtpProfile.id || smtpProfile.objectId}` : null,
          cc: r.get('cc') || null,
          bcc: r.get('bcc') || null,
          
          erreur_count: r.get('erreur_count') || 0,
          derniere_erreur: r.get('derniere_erreur') || null,
          derniere_tentative: r.get('derniere_tentative')?.toISOString() || null,
          
          message_id: r.get('messageId') || null,
          ouvert: r.get('ouvert') || false,
          date_ouverture: r.get('dateOuverture')?.toISOString() || null,
          clicks: r.get('clicks') || 0,
          
          updated_at: r.updatedAt?.toISOString() || new Date().toISOString()
        };
        
        await db.create('relances', data);
        stats.relances.created++;
        
        // Tracker relations
        if (contactId) {
          if (!contactRelances.has(contactId)) {
            contactRelances.set(contactId, []);
          }
          contactRelances.get(contactId).push(data.id);
        }
        
      } catch (err) {
        console.error(`   ❌ Erreur relance ${r.id}: ${err.message}`);
        stats.relances.errors++;
      }
    }
    
    // Mettre à jour les contacts avec leurs relances
    console.log(`   📝 Mise à jour des relations relances...`);
    for (const [contactId, relanceIds] of contactRelances) {
      try {
        const contact = await db.read('contacts', contactId);
        await db.update('contacts', contactId, { 
          relance_ids: [...(contact.relance_ids || []), ...relanceIds]
        });
      } catch (e) {
        // Contact peut ne pas exister
      }
    }
    
  } catch (err) {
    console.error(`   ❌ Erreur globale: ${err.message}`);
  }
  
  console.log(`   ✅ ${stats.relances.created} relances créées`);
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  Migration Parse → Flat-Files YAML');
  console.log('═══════════════════════════════════════════');
  console.log(`Source: ${PARSE_SERVER_URL}`);
  console.log(`Destination: ${DATA_DIR}`);
  
  const startTime = Date.now();
  
  // Ordre de migration important (relations)
  await migrateContacts();
  await migrateSequences();
  await migrateSmtpProfiles();
  await migrateImpayes();
  await migrateRelances();
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('\n═══════════════════════════════════════════');
  console.log('  RÉSULTATS');
  console.log('═══════════════════════════════════════════');
  console.log(`Contacts:      ${stats.contacts.created} créés, ${stats.contacts.errors} erreurs`);
  console.log(`Séquences:     ${stats.sequences.created} créées, ${stats.sequences.errors} erreurs`);
  console.log(`SMTP Profiles: ${stats.smtpProfiles.created} créés, ${stats.smtpProfiles.errors} erreurs`);
  console.log(`Impayés:       ${stats.impayes.created} créés, ${stats.impayes.errors} erreurs`);
  console.log(`Relances:      ${stats.relances.created} créées, ${stats.relances.errors} erreurs`);
  console.log(`\nDurée: ${duration}s`);
  console.log('═══════════════════════════════════════════');
  
  // Compter les fichiers YAML créés
  const fs = require('fs');
  let totalFiles = 0;
  const collections = ['contacts', 'sequences', 'smtp_profiles', 'impayes', 'relances'];
  
  for (const coll of collections) {
    const dir = path.join(DATA_DIR, coll);
    try {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.yml'));
      totalFiles += files.length;
    } catch (e) {}
  }
  
  console.log(`Total fichiers YAML créés: ${totalFiles}`);
  console.log('✅ Migration terminée!');
}

main().catch(err => {
  console.error('💥 Erreur fatale:', err);
  process.exit(1);
});
