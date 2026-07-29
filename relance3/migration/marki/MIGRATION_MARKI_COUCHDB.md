# Procédure de Migration : Marki.db (SQLite) → CouchDB

## Vue d'ensemble

Cette procédure décrit la migration de la base SQLite `marki.db` vers l'architecture CouchDB avec documents `demande` (agrégats).

---

## Architecture Cible

```
Avant (SQLite) :                    Après (CouchDB) :
┌─────────────┐                    ┌─────────────────────┐
│  contacts   │                    │  demande:DOS-001    │
│  impayes    │  ───────────────→  │    ├── client       │
│  relances   │     Transformation │    ├── factures[]    │
│  suivis     │                    │    ├── relances[]   │
│  events     │                    │    └── events[]      │
│  sequences  │                    │  contact:client-001 │
│  smtp...    │                    │  sequence:niveau-1  │
└─────────────┘                    └─────────────────────┘
    10 tables                          4 types de documents
```

---

## Étape 1 : Export depuis SQLite

### 1.1 Extraire les données de référence

```bash
# Export contacts (CSV)
sqlite3 marki.db -header -csv "SELECT * FROM contacts" > export/contacts.csv

# Export impayés avec leurs relations
sqlite3 marki.db -header -csv "
SELECT i.*, 
       c1.nom as payer_nom, c1.email as payer_email,
       c2.nom as apporteur_nom,
       s.nom as sequence_nom
FROM impayes i
LEFT JOIN contacts c1 ON i.payer_id = c1.id
LEFT JOIN contacts c2 ON i.apporteur_id = c2.id
LEFT JOIN sequences s ON i.sequence_id = s.id
" > export/impayes.csv

# Export relances
sqlite3 marki.db -header -csv "
SELECT r.*, c.nom as contact_nom, c.email as contact_email
FROM relances r
LEFT JOIN contacts c ON r.contact_id = c.id
" > export/relances.csv

# Export events
sqlite3 marki.db -header -csv "SELECT * FROM events" > export/events.csv

# Export séquences et SMTP (config)
sqlite3 marki.db -header -csv "SELECT * FROM sequences" > export/sequences.csv
sqlite3 marki.db -header -csv "SELECT * FROM smtp_profiles" > export/smtp_profiles.csv
```

### 1.2 Exporter en JSON (plus facile pour la transformation)

```bash
# Alternative : export JSON avec Node.js
node export_sqlite.js
```

```javascript
// export_sqlite.js
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const db = new sqlite3.Database('marki.db');

async function exportTable(table) {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM ${table}`, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function main() {
  const data = {
    contacts: await exportTable('contacts'),
    impayes: await exportTable('impayes'),
    relances: await exportTable('relances'),
    suivis: await exportTable('suivis'),
    events: await exportTable('events'),
    sequences: await exportTable('sequences'),
    smtp_profiles: await exportTable('smtp_profiles')
  };
  
  fs.writeFileSync('export/marki_data.json', JSON.stringify(data, null, 2));
  console.log('Export terminé');
  db.close();
}

main();
```

---

## Étape 2 : Transformation des Données

### 2.1 Logique de regroupement par Demande

**Règle** : Créer un document `demande` pour chaque dossier (groupe d'impayés liés).

```javascript
// transformer.js
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('export/marki_data.json'));

const demandes = [];
const contactsMap = new Map(data.contacts.map(c => [c.id, c]));

// Grouper les impayés par dossier (ex: par payer_id + id_dossier)
const impayesParDossier = new Map();

data.impayes.forEach(impaye => {
  const dossierKey = impaye.id_dossier || impaye.payer_id;
  
  if (!impayesParDossier.has(dossierKey)) {
    impayesParDossier.set(dossierKey, []);
  }
  impayesParDossier.get(dossierKey).push(impaye);
});

// Créer les documents demande
impayesParDossier.forEach((impayes, dossierKey) => {
  const premier = impayes[0];
  const payer = contactsMap.get(premier.payer_id);
  const apporteur = contactsMap.get(premier.apporteur_id);
  
  const demande = {
    _id: `demande:${dossierKey}`,
    type: 'demande',
    reference: dossierKey,
    date_creation: premier.created_at || new Date().toISOString(),
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
      nom: apporteur.nom,
      commission: impayes.reduce((sum, i) => sum + (i.montant_ttc * 0.1), 0), // 10%
      commission_payee: false
    } : null,
    
    // Bien (depuis impaye)
    bien: {
      adresse: premier.adresse_bien,
      code_postal: premier.code_postal,
      ville: premier.ville
    },
    
    // Factures (anciens impayes)
    factures: impayes.map((i, idx) => ({
      id: `facture:${i.id}`,
      nfacture: i.nfacture,
      date_facture: i.date_facture,
      date_echeance: i.date_echeance,
      montant_ttc: i.montant_ttc,
      reste_a_payer: i.reste_a_payer,
      statut: i.statut === 'solde' ? 'solde' : (i.email_sent ? 'en_relance' : 'impaye'),
      created_at: i.created_at
    })),
    
    // Relances (filtrer celles liées à ces impayes)
    relances: [], // Rempli ensuite
    
    // Events (filtrer)
    events: [], // Rempli ensuite
    
    // Stats calculées
    stats: {
      nb_factures: impayes.length,
      nb_factures_impayees: impayes.filter(i => i.statut !== 'solde').length,
      montant_total_du: impayes.reduce((sum, i) => sum + i.reste_a_payer, 0),
      nb_relances: 0,
      date_derniere_relance: null
    },
    
    created_at: premier.created_at,
    updated_at: new Date().toISOString()
  };
  
  // Ajouter les relances liées
  const relancesLiees = data.relances.filter(r => 
    impayes.some(i => r.impaye_id === i.id) || r.contact_id === premier.payer_id
  );
  
  demande.relances = relancesLiees.map(r => ({
    id: `relance:${r.id}`,
    sequence_id: r.sequence_id,
    date_envoi: r.date_envoi,
    statut: r.email_sent ? 'envoyee' : 'programme',
    sujet: r.sujet
  }));
  
  demande.stats.nb_relances = relancesLiees.length;
  if (relancesLiees.length > 0) {
    demande.stats.date_derniere_relance = relancesLiees[relancesLiees.length - 1].date_envoi;
  }
  
  // Ajouter les events liés
  const eventsLies = data.events.filter(e => 
    e.entity_id && impayes.some(i => e.entity_id === i.id)
  );
  
  demande.events = eventsLies.map(e => ({
    type: e.type,
    date: e.created_at,
    description: e.description,
    user_id: e.who_id
  }));
  
  demandes.push(demande);
});

// Exporter les documents transformés
fs.writeFileSync('export/demandes.json', JSON.stringify(demandes, null, 2));
console.log(`${demandes.length} demandes créées`);
```

---

## Étape 3 : Transformation des Contacts

```javascript
// transformer_contacts.js
const contacts = data.contacts.map(c => ({
  _id: `contact:${c.id}`,
  type: 'contact',
  nom: c.nom,
  prenom: c.prenom,
  email: c.email,
  telephone: c.telephone,
  type_contact: c.type || 'client',
  adresse: {
    rue: c.adresse_rue,
    ville: c.adresse_ville,
    code_postal: c.adresse_code_postal,
    pays: c.adresse_pays
  },
  // Compteurs à recalculer
  nb_demandes_actives: demandes.filter(d => 
    d.client && d.client.id === `contact:${c.id}` && d.statut === 'en_relance'
  ).length,
  created_at: c.created_at,
  updated_at: c.updated_at
}));

fs.writeFileSync('export/contacts.json', JSON.stringify(contacts, null, 2));
```

---

## Étape 3 : Transformation des Tables de Configuration

Les tables `sequences`, `smtp_profiles` et `users` sont des **données de référence** (configuration). Elles ne sont pas intégrées dans les documents `demande` mais migrées comme documents indépendants.

### 3.1 Transformation des Séquences

```javascript
// transformer_sequences.js
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('export/marki_data.json'));

const sequences = data.sequences.map(s => ({
  _id: `sequence:${s.id}`,
  type: 'sequence',
  nom: s.nom,
  type_sequence: s.type_sequence || 'relances',
  niveau: s.niveau || 1,
  actif: s.actif === 1,
  validation_obligatoire: s.validation_obligatoire === 1,
  attribution_automatique: s.attribution_automatique === 1,
  scenario: s.scenario,
  // Parser les JSON stockés comme texte dans SQLite
  emails: s.emails_json ? JSON.parse(s.emails_json) : [],
  regles: s.regles_json ? JSON.parse(s.regles_json) : {},
  groupes_regles: s.groupes_regles_json ? JSON.parse(s.groupes_regles_json) : [],
  created_at: s.created_at,
  updated_at: s.updated_at
}));

fs.writeFileSync('export/sequences.json', JSON.stringify(sequences, null, 2));
console.log(`${sequences.length} séquences transformées`);
```

### 3.2 Transformation des Profils SMTP

```javascript
// transformer_smtp.js
const smtpProfiles = data.smtp_profiles.map(s => ({
  _id: `smtp:${s.id}`,
  type: 'smtp_profile',
  nom: s.nom,
  host: s.host,
  port: s.port || 587,
  secure: s.secure === 1,
  username: s.username,
  // Attention : mot de passe à sécuriser !
  password_encrypted: s.password ? encrypt(s.password) : null,
  from_email: s.from_email,
  from_name: s.from_name,
  signature_html: s.signature_html,
  actif: s.actif === 1,
  is_default: s.is_default === 1,
  created_at: s.created_at,
  updated_at: s.updated_at
}));

fs.writeFileSync('export/smtp_profiles.json', JSON.stringify(smtpProfiles, null, 2));
```

**Note sécurité** : Les mots de passe SMTP doivent être **chiffrés** ou **externalisés** (variables d'environnement, vault).

### 3.3 Transformation des Utilisateurs

```javascript
// transformer_users.js
const users = data.users.map(u => ({
  _id: `user:${u.id}`,
  type: 'user',
  username: u.username,
  email: u.email,
  // Ne PAS migrer le password_hash tel quel !
  // Soit : re-hachage avec algorithme plus fort
  // Soit : forcer réinitialisation mot de passe
  password_hash: '[MIGRATION_REQUISE]',
  role: u.role || 'user',
  is_active: u.is_active === 1,
  last_login: u.last_login,
  login_count: u.login_count || 0,
  created_at: u.created_at,
  updated_at: u.updated_at,
  // Forcer changement mdp à première connexion
  must_reset_password: true
}));

fs.writeFileSync('export/users.json', JSON.stringify(users, null, 2));
```

**⚠️ Important** : La migration des utilisateurs nécessite une stratégie de mot de passe :
1. **Option A** : Forcer réinitialisation (tous les users recréent leur mdp)
2. **Option B** : Migration avec re-hachage (si algo compatible)
3. **Option C** : Utiliser système auth externe (JWT, OAuth)

---

### Différence avec les Données Métier

| Aspect | `demande`, `contact` | `sequence`, `smtp_profile`, `user` |
|--------|---------------------|-----------------------------------|
| **Volume** | Milliers | Dizaines (rare) |
| **Fréquence modif** | Quotidienne | Rare (config) |
| **Sync PouchDB** | ✅ Oui (essentiel) | ❌ Non (optionnel) |
| **Réplication** | Bidirectionnelle | Unidirectionnelle (serveur→client) |
| **Cache** | Oui | En mémoire (petit volume) |

**Stratégie de sync** :
- `demande` et `contact` : Sync bidirectionnelle (changes importants)
- `sequence`, `smtp_profile` : Chargés une fois au démarrage, pas de sync live

---

### Configuration sans Sync

Pour ces tables, vous pouvez aussi **ne pas les synchroniser** avec PouchDB :

```javascript
// frontend/config.js
// Charger une fois au démarrage (fetch HTTP)
export async function loadConfig() {
  const [sequences, smtpProfiles] = await Promise.all([
    fetch('http://couchdb:5984/marki/sequence:niveau-1').then(r => r.json()),
    fetch('http://couchdb:5984/marki/smtp:default').then(r => r.json())
  ]);
  
  window.APP_CONFIG = { sequences, smtpProfiles };
}

// Ou les inclure dans le build (si statiques)
// sequences.json → importé statiquement
```

**Avantage** : 
- Moins de données dans PouchDB (allégé)
- Config versionnée avec l'application

**Inconvénient** :
- Modification config nécessite redéploiement

---

## Étape 4 : Import vers CouchDB (Complet)

### 4.1 Créer les Design Documents

```bash
# Créer les design docs avant l'import
curl -X PUT http://admin:password@localhost:5984/marki
curl -X PUT http://admin:password@localhost:5984/marki/_design/demandes \
  -H "Content-Type: application/json" \
  -d @designs/demandes_design.json
```

### 4.2 Import par lots (Bulk)

```javascript
// importer.js
const Nano = require('nano');
const fs = require('fs');

const couch = Nano('http://admin:password@localhost:5984');
const db = couch.db.use('marki');

async function importer() {
  // 1. Importer les séquences (configuration)
  console.log('Import des séquences...');
  const sequences = JSON.parse(fs.readFileSync('export/sequences.json'));
  for (const seq of sequences) {
    await db.insert(seq);
  }
  console.log(`✓ ${sequences.length} séquences importées`);
  
  // 2. Importer les profils SMTP
  console.log('Import des profils SMTP...');
  const smtpProfiles = JSON.parse(fs.readFileSync('export/smtp_profiles.json'));
  for (const smtp of smtpProfiles) {
    await db.insert(smtp);
  }
  console.log(`✓ ${smtpProfiles.length} profils SMTP importés`);
  
  // 3. Importer les utilisateurs (avec vérification)
  console.log('Import des utilisateurs...');
  const users = JSON.parse(fs.readFileSync('export/users.json'));
  for (const user of users) {
    try {
      await db.insert(user);
    } catch (e) {
      console.warn(`Utilisateur ${user._id} ignoré (peut-être déjà existant)`);
    }
  }
  console.log(`✓ ${users.length} utilisateurs importés`);
  
  // 4. Importer les contacts (référentiel)
  console.log('Import des contacts...');
  const contacts = JSON.parse(fs.readFileSync('export/contacts.json'));
  for (const contact of contacts) {
    await db.insert(contact);
  }
  console.log(`✓ ${contacts.length} contacts importés`);
  
  // 5. Importer les demandes (par lots de 100)
  console.log('Import des demandes...');
  const demandes = JSON.parse(fs.readFileSync('export/demandes.json'));
  for (let i = 0; i < demandes.length; i += 100) {
    const lot = demandes.slice(i, i + 100);
    await db.bulk({ docs: lot });
    console.log(`  Importé ${i + lot.length}/${demandes.length} demandes`);
  }
  
  console.log('\n=== Migration terminée avec succès ===');
  console.log('Résumé:');
  console.log(`  - ${sequences.length} séquences`);
  console.log(`  - ${smtpProfiles.length} profils SMTP`);
  console.log(`  - ${users.length} utilisateurs`);
  console.log(`  - ${contacts.length} contacts`);
  console.log(`  - ${demandes.length} demandes`);
}

importer().catch(console.error);
```

### 4.3 Vérifier l'import des configurations

```bash
# Vérifier les séquences
curl http://admin:password@localhost:5984/marki/sequence:niveau-1 | jq '.'

# Vérifier les SMTP
curl http://admin:password@localhost:5984/marki/smtp:default | jq '.'

# Lister tous les documents par type
curl "http://admin:password@localhost:5984/marki/_all_docs?include_docs=true" | \
  jq '.rows[] | select(.doc.type == "sequence") | .doc.nom'
```

### 4.3 Ou utiliser couchimport (outil CLI)

```bash
# Installation
npm install -g couchimport

# Import CSV
cat export/demandes.json | couchimport --url http://admin:password@localhost:5984 --db marki
```

---

## Étape 5 : Vérification

### 5.1 Vérifier le nombre de documents

```bash
# Compter les documents
curl http://admin:password@localhost:5984/marki/_all_docs | jq '.total_rows'

# Vérifier une demande spécifique
curl http://admin:password@localhost:5984/marki/demande:DOS-001 | jq '.'
```

### 5.2 Tester les vues

```bash
# Tester la vue par statut
curl "http://admin:password@localhost:5984/marki/_design/demandes/_view/par_statut?key=\"en_relance\""

# Tester la vue par client
curl "http://admin:password@localhost:5984/marki/_design/demandes/_view/par_client?key=\"contact:client-001\""
```

### 5.3 Vérifier les configurations

```javascript
// verification.js
const db = new PouchDB('http://admin:password@localhost:5984/marki');

async function verifier() {
  console.log('=== Vérification post-migration ===\n');
  
  // 1. Vérifier les configurations
  const configs = await db.allDocs({
    include_docs: true,
    keys: ['sequence:niveau-1', 'sequence:niveau-2', 'smtp:default']
  });
  
  console.log('Configurations:');
  configs.rows.forEach(({ doc }) => {
    if (doc) {
      console.log(`  ✓ ${doc.type}: ${doc.nom || doc._id}`);
    }
  });
  
  // 2. Vérifier les demandes
  const demandes = await db.allDocs({ 
    include_docs: true,
    startkey: 'demande:',
    endkey: 'demande:\uffff'
  });
  
  console.log(`\nDemandes: ${demandes.rows.length} documents`);
  
  const stats = {
    avecFactures: 0,
    avecRelances: 0,
    avecEvents: 0,
    montantTotal: 0
  };
  
  demandes.rows.forEach(({ doc }) => {
    if (doc.factures && doc.factures.length > 0) stats.avecFactures++;
    if (doc.relances && doc.relances.length > 0) stats.avecRelances++;
    if (doc.events && doc.events.length > 0) stats.avecEvents++;
    if (doc.stats) stats.montantTotal += doc.stats.montant_total_du || 0;
  });
  
  console.log('Stats demandes:', stats);
  
  // 3. Vérifier les contacts
  const contacts = await db.allDocs({
    include_docs: true,
    startkey: 'contact:',
    endkey: 'contact:\uffff'
  });
  
  console.log(`\nContacts: ${contacts.rows.length} documents`);
  
  // 4. Vérifier les utilisateurs
  const users = await db.allDocs({
    include_docs: true,
    startkey: 'user:',
    endkey: 'user:\uffff'
  });
  
  console.log(`Utilisateurs: ${users.rows.length} documents`);
  console.log('\n=== Vérification terminée ===');
}

verifier();
```

---

## Scripts Récapitulatifs

### Script complet de migration

```bash
#!/bin/bash
# migrate.sh

echo "=== Migration Marki.db → CouchDB ==="

# 1. Export SQLite
echo "Export des données SQLite..."
node export_sqlite.js

# 2. Transformation
echo "Transformation des données..."
node transformer.js
node transformer_contacts.js

# 3. Créer la base CouchDB
echo "Création de la base CouchDB..."
curl -X PUT http://admin:password@localhost:5984/marki 2>/dev/null || true

# 4. Import Design Docs
echo "Import des Design Documents..."
curl -X PUT http://admin:password@localhost:5984/marki/_design/demandes \
  -H "Content-Type: application/json" \
  -d @designs/demandes_design.json

# 5. Import données
echo "Import des données..."
node importer.js

echo "=== Migration terminée ==="
```

---

## Points d'Attention

### Conflits de _id

Si des IDs existent déjà dans CouchDB :
```javascript
// Vérifier avant insertion
try {
  await db.get(doc._id);
  console.log(`Document ${doc._id} existe déjà, ignoré`);
} catch (e) {
  await db.insert(doc);
}
```

### Gestion des relations

- Les `contact_id` dans SQLite deviennent `contact:${id}` dans CouchDB
- Les relations sont "snapshotées" (copie des données au moment de la migration)
- Les contacts restent dans leur propre document de référence

### Données manquantes

Si certains champs sont NULL dans SQLite :
```javascript
// Valeurs par défaut
const demande = {
  statut: impaye.statut || 'impaye',
  montant_ttc: impaye.montant_ttc || 0,
  apporteur: apporteur || { id: null, nom: 'Inconnu' }
};
```

---

## Post-Migration : Stratégie de Sync

### Configuration Frontend (PouchDB)

Les tables de configuration sont gérées différemment des données métier :

```javascript
// frontend/sync-config.js

// 1. Données métier (sync bidirectionnelle)
const db = new PouchDB('marki-local');
db.sync('http://couchdb:5984/marki', {
  live: true,
  retry: true,
  filter: function(doc) {
    // Sync uniquement demandes et contacts
    return doc.type === 'demande' || doc.type === 'contact';
  }
});

// 2. Configurations (chargement ponctuel, pas de sync)
export async function loadConfig() {
  // Charger depuis CouchDB une fois
  const sequences = await fetch('http://couchdb:5984/marki/_design/sequences/_view/actives')
    .then(r => r.json());
  
  const smtp = await fetch('http://couchdb:5984/marki/smtp:default')
    .then(r => r.json());
  
  // Stocker en mémoire (pas dans PouchDB)
  window.APP_CONFIG = { sequences, smtp };
  
  return { sequences, smtp };
}

// 3. Utilisateurs (auth via API, pas stocké dans PouchDB)
export async function login(username, password) {
  const response = await fetch('http://couchdb:5984/_session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: username, password })
  });
  
  if (response.ok) {
    const { userCtx } = await response.json();
    return userCtx;
  }
  throw new Error('Login failed');
}
```

### Résumé des Types

| Type | Document ID | Sync PouchDB | Usage |
|------|-------------|--------------|-------|
| `demande` | `demande:DOS-001` | ✅ Oui (bidirectionnel) | Données métier principales |
| `contact` | `contact:client-001` | ✅ Oui (bidirectionnel) | Référentiel clients/agences |
| `sequence` | `sequence:niveau-1` | ❌ Non (fetch ponctuel) | Config relances |
| `smtp_profile` | `smtp:default` | ❌ Non (fetch ponctuel) | Config email |
| `user` | `user:001` | ❌ Non (auth via _session) | Authentification |

**Pourquoi cette différence ?**
- **Données métier** : Changent souvent, nécessitent sync temps réel
- **Configuration** : Stable, chargée au démarrage
- **Users** : Gérés par CouchDB auth, pas dans PouchDB local

---

## Fichiers générés

Après migration, vous devez avoir :

```
export/
├── marki_data.json          # Export brut SQLite
├── demandes.json            # Documents transformés
├── contacts.json            # Contacts transformés
└── sequences_smtp.json      # Configurations

designs/
└── demandes_design.json     # Design Documents CouchDB

scripts/
├── export_sqlite.js         # Export
├── transformer.js           # Transformation
├── importer.js              # Import
└── verification.js          # Vérification
```

---

## Post-Migration

1. **Configurer la réplication** PouchDB ↔ CouchDB
2. **Tester les vues** (performance)
3. **Valider les droits** (authentification CouchDB)
4. **Backup** la base CouchDB
5. **Mettre à jour l'application** frontend pour utiliser PouchDB

---

*Document créé pour la migration Marki SQLite → CouchDB*
