# Stratégie de Migration Marki.db → CouchDB

**Date:** 21 Juillet 2026  
**Source:** SQLite (marki.db)  
**Cible:** CouchDB 3.x  
**Volume estimé:** ~15 000 documents, ~50MB données

---

## 1. Vue d'ensemble

### 1.1 Objectifs
- Migrer la base SQLite relationnelle vers CouchDB NoSQL document
- Préserver l'intégrité des relations (contacts, impayés, relances)
- Maintenir la compatibilité avec l'architecture flat-files existante
- Permettre la réplication offline-first pour les agents de recouvrement

### 1.2 Différences clés SQLite → CouchDB

| Aspect | SQLite | CouchDB |
|--------|--------|---------|
| Modèle | Relationnel (tables) | Documents JSON |
| Clés | UUIDs manuels | `_id` auto ou custom |
| Relations | FK + JOINs | Émbedding ou références |
| Requêtes | SQL | Map/Reduce (views) |
| Réplication | N/A | Native (master-master) |
| Conflits | Verrouillage | Gestion automatique |

---

## 2. Modélisation des Documents

### 2.1 Types de Documents

Chaque entité devient un document JSON avec un `_id` préfixé:

```
user:{uuid}           → Utilisateurs
contact:{uuid}        → Contacts (anciennement payeurs)
impaye:{uuid}         → Factures impayées
relance:{uuid}        → Relances envoyées
sequence:{uuid}       → Séquences de relances
smtp:{uuid}           → Profils SMTP
event:{uuid}          → Événements/activité
config:{key}          → Configuration globale
```

### 2.2 Stratégie de Relations

**Embedding** (document dans document):
- `impaye.contact` → infos du contact embeddées (denormalisées)
- `relance.impayes[]` → IDs des impayés liés
- `sequence.emails[]` → emails de la séquence embeddés

**Références** (liens par ID):
- `relance.contact_id` → référence vers contact:{uuid}
- `relance.sequence_id` → référence vers sequence:{uuid}

### 2.3 Exemple de Structure

```json
{
  "_id": "impaye:550e8400-e29b-41d4-a716-446655440000",
  "_rev": "1-abc123",
  "type": "impaye",
  "numero_facture": "FAC-2026-001",
  "montant_ttc": 1250.00,
  "reste_a_payer": 1250.00,
  "date_echeance": "2026-03-15",
  "statut": "impaye",
  
  "contact": {
    "_id": "contact:550e8400...",
    "nom": "Dupont",
    "prenom": "Jean",
    "email": "jean@example.com"
  },
  
  "adresse_bien": {
    "rue": "12 rue de Paris",
    "ville": "Lyon",
    "code_postal": "69001"
  },
  
  "relations": {
    "proprietaire_id": "contact:...",
    "apporteur_id": "contact:...",
    "syndic_id": "contact:..."
  },
  
  "created_at": "2026-01-15T10:30:00Z",
  "updated_at": "2026-01-15T10:30:00Z",
  
  "_attachments": {
    "facture.pdf": {
      "content_type": "application/pdf",
      "data": "base64..."
    }
  }
}
```

---

## 3. Vues CouchDB (Design Documents)

### 3.1 Fichier: `_design/impayes`

```javascript
{
  "_id": "_design/impayes",
  "views": {
    "by_contact": {
      "map": "function(doc) { if(doc.type === 'impaye' && doc.contact) emit(doc.contact._id, doc); }"
    },
    "by_statut": {
      "map": "function(doc) { if(doc.type === 'impaye') emit(doc.statut, doc); }"
    },
    "by_date_echeance": {
      "map": "function(doc) { if(doc.type === 'impaye' && doc.date_echeance) emit(doc.date_echeance, doc); }"
    },
    "by_montant": {
      "map": "function(doc) { if(doc.type === 'impaye') emit(doc.reste_a_payer, doc); }"
    },
    "blacklistes": {
      "map": "function(doc) { if(doc.type === 'impaye' && doc.is_blacklisted) emit(doc.blacklist_date, doc); }"
    }
  }
}
```

### 3.2 Fichier: `_design/contacts`

```javascript
{
  "_id": "_design/contacts",
  "views": {
    "by_email": {
      "map": "function(doc) { if(doc.type === 'contact' && doc.email) emit(doc.email.toLowerCase(), doc); }"
    },
    "by_type": {
      "map": "function(doc) { if(doc.type === 'contact' && doc.type_personne) emit(doc.type_personne, doc); }"
    },
    "by_blacklist": {
      "map": "function(doc) { if(doc.type === 'contact') emit(doc.is_blacklisted || false, doc); }"
    },
    "all_relations": {
      "map": "function(doc) { if(doc.type === 'contact_relation') { emit([doc.contact_source_id, doc.type_relation], doc); emit([doc.contact_cible_id, 'inverse:' + doc.type_relation], doc); } }"
    }
  }
}
```

### 3.3 Fichier: `_design/relances`

```javascript
{
  "_id": "_design/relances",
  "views": {
    "by_contact": {
      "map": "function(doc) { if(doc.type === 'relance') emit(doc.contact_id, doc); }"
    },
    "by_sequence": {
      "map": "function(doc) { if(doc.type === 'relance') emit(doc.sequence_id, doc); }"
    },
    "by_statut": {
      "map": "function(doc) { if(doc.type === 'relance') emit(doc.statut, doc); }"
    },
    "by_date_programmation": {
      "map": "function(doc) { if(doc.type === 'relance' && doc.date_programmation) emit(doc.date_programmation, doc); }"
    },
    "en_erreur": {
      "map": "function(doc) { if(doc.type === 'relance' && doc.erreur_count > 0) emit(doc.erreur_count, doc); }"
    }
  }
}
```

### 3.4 Fichier: `_design/sequences`

```javascript
{
  "_id": "_design/sequences",
  "views": {
    "actives": {
      "map": "function(doc) { if(doc.type === 'sequence' && doc.actif) emit(doc.nom, doc); }"
    },
    "by_type": {
      "map": "function(doc) { if(doc.type === 'sequence') emit(doc.type_sequence, doc); }"
    }
  }
}
```

### 3.5 Fichier: `_design/dashboards`

```javascript
{
  "_id": "_design/dashboards",
  "views": {
    "kpi_impayes": {
      "map": "function(doc) { if(doc.type === 'impaye') { emit('total', doc.reste_a_payer || 0); emit(doc.statut, doc.reste_a_payer || 0); } }",
      "reduce": "_sum"
    },
    "impayes_par_mois": {
      "map": "function(doc) { if(doc.type === 'impaye' && doc.date_facture) { var d = doc.date_facture.substring(0,7); emit(d, doc.reste_a_payer || 0); } }",
      "reduce": "_sum"
    },
    "relances_par_statut": {
      "map": "function(doc) { if(doc.type === 'relance') emit(doc.statut, 1); }",
      "reduce": "_sum"
    }
  }
}
```

---

## 4. Script de Migration

### 4.1 Dépendances

```bash
npm install nano commander sqlite3 progress
```

### 4.2 Script: `migrate-to-couchdb.js`

```javascript
#!/usr/bin/env node
/**
 * Migration Marki.db → CouchDB
 * Usage: node migrate-to-couchdb.js --source marki.db --target http://user:pass@localhost:5984/marki
 */

const sqlite3 = require('sqlite3').verbose();
const nano = require('nano');
const { program } = require('commander');
const ProgressBar = require('progress');

program
  .requiredOption('-s, --source <path>', 'Chemin vers marki.db')
  .requiredOption('-t, --target <url>', 'URL CouchDB (avec auth)')
  .option('-b, --batch-size <n>', 'Taille des batches', '100')
  .parse();

const options = program.opts();
const BATCH_SIZE = parseInt(options.batchSize);

// Mapping des tables vers types de documents
const TABLE_MAPPING = {
  'contacts': 'contact',
  'impayes': 'impaye',
  'relances': 'relance',
  'sequences': 'sequence',
  'sequences_emails': null, // Embeddé dans sequence
  'sequences_scenarios': null, // Embeddé dans sequence
  'smtp_profiles': 'smtp',
  'users': 'user',
  'sessions': 'session',
  'events': 'event',
  'suivis': 'suivi',
  'lien_paiements': 'lien_paiement',
  'options_dynamiques': 'config',
  'contact_relation_types': 'config',
  'contact_relations': 'contact_relation',
  'relance_impayes': null, // Table de liaison
  'suivi_impayes': null // Table de liaison
};

class MigrationRunner {
  constructor(sourceDb, couchUrl) {
    this.sqlite = new sqlite3.Database(sourceDb);
    this.couch = nano(couchUrl);
    this.db = null;
    this.stats = { inserted: 0, errors: 0, skipped: 0 };
  }

  async init() {
    const dbName = this.couch.config.db || 'marki';
    try {
      await this.couch.db.destroy(dbName);
    } catch(e) { /* ignore */ }
    await this.couch.db.create(dbName);
    this.db = this.couch.use(dbName);
    console.log(`✓ Base CouchDB "${dbName}" créée`);
  }

  async migrateTable(tableName, docType) {
    const rows = await this.all(`SELECT * FROM ${tableName}`);
    const bar = new ProgressBar(
      `${tableName} [:bar] :current/:total :percent`,
      { total: rows.length, width: 30 }
    );

    // Précharger les données liées
    const relatedData = await this.preloadRelated(tableName);

    const docs = [];
    for (const row of rows) {
      try {
        const doc = this.transformRow(tableName, row, relatedData);
        if (doc) docs.push(doc);
        bar.tick();
      } catch (err) {
        console.error(`\nErreur sur ${tableName}/${row.id}:`, err.message);
        this.stats.errors++;
      }
    }

    // Insertion par batches
    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch = docs.slice(i, i + BATCH_SIZE);
      try {
        await this.db.bulk({ docs: batch });
        this.stats.inserted += batch.length;
      } catch (err) {
        console.error(`\nErreur batch ${i}:`, err.message);
        this.stats.errors += batch.length;
      }
    }
  }

  transformRow(tableName, row, relatedData) {
    const type = TABLE_MAPPING[tableName];
    if (!type) return null;

    const doc = {
      _id: `${type}:${row.id}`,
      type: type,
      ...this.cleanRow(row)
    };

    // Transformations spécifiques par table
    switch(tableName) {
      case 'impayes':
        this.transformImpaye(doc, row, relatedData);
        break;
      case 'relances':
        this.transformRelance(doc, row, relatedData);
        break;
      case 'sequences':
        this.transformSequence(doc, row, relatedData);
        break;
      case 'contacts':
        this.transformContact(doc, row, relatedData);
        break;
    }

    return doc;
  }

  transformImpaye(doc, row, relatedData) {
    // Embed contact simplifié
    const contact = relatedData.contacts[row.payer_id];
    if (contact) {
      doc.contact = {
        _id: `contact:${contact.id}`,
        nom: contact.nom,
        prenom: contact.prenom,
        email: contact.email,
        telephone: contact.telephone
      };
    }

    // Relations sous forme de références
    doc.relations = {
      proprietaire_id: row.proprietaire_id ? `contact:${row.proprietaire_id}` : null,
      apporteur_id: row.apporteur_id ? `contact:${row.apporteur_id}` : null,
      syndic_id: row.syndic_id ? `contact:${row.syndic_id}` : null,
      notaire_id: row.notaire_id ? `contact:${row.notaire_id}` : null,
      donneur_ordre_id: row.donneur_ordre_id ? `contact:${row.donneur_ordre_id}` : null
    };

    // Nettoyer les champs null
    doc.relations = Object.fromEntries(
      Object.entries(doc.relations).filter(([_, v]) => v !== null)
    );

    // Ajouter les impayés liés (via table de liaison)
    if (relatedData.relance_impayes[doc._id]) {
      doc.impaye_ids = relatedData.relance_impayes[doc._id].map(
        r => `impaye:${r.impaye_id}`
      );
    }
  }

  transformRelance(doc, row, relatedData) {
    doc.contact_id = `contact:${row.contact_id}`;
    doc.sequence_id = `sequence:${row.sequence_id}`;
    if (row.smtp_profile_id) {
      doc.smtp_profile_id = `smtp:${row.smtp_profile_id}`;
    }

    // Impayés liés
    if (relatedData.relance_impayes[row.id]) {
      doc.impaye_ids = relatedData.relance_impayes[row.id].map(
        r => `impaye:${r.impaye_id}`
      );
    }
  }

  transformSequence(doc, row, relatedData) {
    // Embed les emails
    doc.emails = relatedData.sequences_emails[row.id] || [];
    doc.scenarios = relatedData.sequences_scenarios[row.id] || [];

    // Parser les JSONs stockés comme strings
    if (row.emails_json) {
      try { doc.emails_config = JSON.parse(row.emails_json); } catch(e) {}
    }
    if (row.regles_json) {
      try { doc.regles = JSON.parse(row.regles_json); } catch(e) {}
    }
  }

  transformContact(doc, row, relatedData) {
    // Relations
    if (relatedData.contact_relations[row.id]) {
      doc.relations = relatedData.contact_relations[row.id].map(r => ({
        contact_id: `contact:${r.contact_cible_id}`,
        type: r.type_relation,
        est_actif: r.est_actif === 1,
        notes: r.notes
      }));
    }
  }

  async preloadRelated(tableName) {
    const data = {
      contacts: {},
      sequences_emails: {},
      sequences_scenarios: {},
      contact_relations: {},
      relance_impayes: {}
    };

    // Charger contacts pour référence
    const contacts = await this.all('SELECT * FROM contacts');
    contacts.forEach(c => data.contacts[c.id] = c);

    // Charger relations many-to-many
    const emails = await this.all('SELECT * FROM sequences_emails');
    emails.forEach(e => {
      if (!data.sequences_emails[e.sequence_id]) data.sequences_emails[e.sequence_id] = [];
      data.sequences_emails[e.sequence_id].push(e);
    });

    const scenarios = await this.all('SELECT * FROM sequences_scenarios');
    scenarios.forEach(s => {
      if (!data.sequences_scenarios[s.sequence_id]) data.sequences_scenarios[s.sequence_id] = [];
      data.sequences_scenarios[s.sequence_id].push(s);
    });

    const relImpayes = await this.all('SELECT * FROM relance_impayes');
    relImpayes.forEach(r => {
      if (!data.relance_impayes[r.relance_id]) data.relance_impayes[r.relance_id] = [];
      data.relance_impayes[r.relance_id].push(r);
    });

    const relations = await this.all('SELECT * FROM contact_relations');
    relations.forEach(r => {
      if (!data.contact_relations[r.contact_source_id]) {
        data.contact_relations[r.contact_source_id] = [];
      }
      data.contact_relations[r.contact_source_id].push(r);
    });

    return data;
  }

  cleanRow(row) {
    const cleaned = {};
    for (const [key, value] of Object.entries(row)) {
      // Skip les clés déjà traitées
      if (key === 'id') continue;
      
      // Convertir les integers SQLite en boolean
      if (key.startsWith('is_') || key === 'actif' || key === 'valide') {
        cleaned[key] = value === 1;
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }

  async all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.sqlite.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async run() {
    console.log('🚀 Démarrage migration...\n');
    await this.init();

    const tables = Object.keys(TABLE_MAPPING).filter(t => TABLE_MAPPING[t]);
    
    for (const table of tables) {
      await this.migrateTable(table, TABLE_MAPPING[table]);
    }

    await this.createDesignDocs();
    await this.verifyMigration();

    this.sqlite.close();
    console.log('\n✅ Migration terminée');
    console.log(`   Documents insérés: ${this.stats.inserted}`);
    console.log(`   Erreurs: ${this.stats.errors}`);
  }

  async createDesignDocs() {
    console.log('\n📐 Création des vues...');
    const designDocs = require('./couchdb-design-docs.json');
    for (const doc of designDocs) {
      try {
        await this.db.insert(doc);
      } catch (err) {
        console.error(`Erreur design doc ${doc._id}:`, err.message);
      }
    }
  }

  async verifyMigration() {
    console.log('\n🔍 Vérification...');
    const counts = await this.db.view('contacts', 'by_type', { limit: 0 });
    console.log(`   Vues fonctionnelles: ${counts.total_rows || 'OK'}`);
  }
}

new MigrationRunner(options.source, options.target).run().catch(console.error);
```

---

## 5. Architecture Cible

### 5.1 Structure du Projet

```
relance3/
├── couchdb/
│   ├── design-docs/           # Vues CouchDB (JSON)
│   ├── migrations/            # Scripts de migration
│   │   ├── migrate-to-couchdb.js
│   │   └── verify-migration.js
│   └── utils/
│       └── couch-client.js    # Wrapper nano.js
├── backend/
│   ├── couch-server.js        # Nouveau serveur Express + CouchDB
│   └── routes/                # API REST adaptée
└── docs/
    └── migration-couchdb-strategie.md  # Ce document
```

### 5.2 Client CouchDB

```javascript
// couch-client.js - Wrapper Nano avec retry
const nano = require('nano');

class CouchClient {
  constructor(url, dbName) {
    this.nano = nano(url);
    this.db = this.nano.use(dbName);
  }

  async get(id, options = {}) {
    try {
      return await this.db.get(id, options);
    } catch (err) {
      if (err.statusCode === 404) return null;
      throw err;
    }
  }

  async find(selector, options = {}) {
    return this.db.find({
      selector,
      limit: options.limit || 50,
      skip: options.skip || 0,
      sort: options.sort,
      ...options
    });
  }

  async view(designName, viewName, options = {}) {
    return this.db.view(designName, viewName, options);
  }

  async insert(doc) {
    if (!doc.created_at) doc.created_at = new Date().toISOString();
    doc.updated_at = new Date().toISOString();
    return this.db.insert(doc);
  }

  async update(doc) {
    doc.updated_at = new Date().toISOString();
    return this.db.insert(doc);
  }

  async bulk(docs) {
    return this.db.bulk({ docs });
  }

  // Réplication vers client offline
  async replicateToLocal(localDbUrl, options = {}) {
    return this.nano.db.replicate(this.db.config.db, localDbUrl, {
      continuous: false,
      ...options
    });
  }
}

module.exports = CouchClient;
```

---

## 6. API REST Adaptée

### 6.1 Routes Principales

| Endpoint | Méthode | Description | Vue CouchDB |
|----------|---------|-------------|-------------|
| `/api/impayes` | GET | Liste avec filtres | `impayes/by_statut` |
| `/api/impayes/:id` | GET | Détail impayé | `get()` direct |
| `/api/impayes` | POST | Créer impayé | `insert()` |
| `/api/impayes/:id` | PUT | Modifier impayé | `update()` |
| `/api/contacts/:id/impayes` | GET | Impayés du contact | `impayes/by_contact` |
| `/api/relances` | GET | Liste relances | `relances/by_statut` |
| `/api/relances/planned` | GET | Relances programmées | `relances/by_date_programmation` |
| `/api/dashboard/kpi` | GET | KPIs tableau de bord | `dashboards/kpi_impayes` |

### 6.2 Exemple de Route

```javascript
// routes/impayes.js
const express = require('express');
const router = express.Router();

module.exports = (couch) => {
  // GET /api/impayes?statut=impaye&contact_id=xxx
  router.get('/', async (req, res) => {
    try {
      const { statut, contact_id, limit = 50, skip = 0 } = req.query;
      
      let result;
      if (contact_id) {
        result = await couch.view('impayes', 'by_contact', {
          key: `contact:${contact_id}`,
          include_docs: true,
          limit: parseInt(limit),
          skip: parseInt(skip)
        });
      } else if (statut) {
        result = await couch.view('impayes', 'by_statut', {
          key: statut,
          include_docs: true,
          limit: parseInt(limit),
          skip: parseInt(skip)
        });
      } else {
        // Utiliser Mango query pour filtres complexes
        result = await couch.find({
          type: { $eq: 'impaye' },
          ...(statut && { statut: { $eq: statut } })
        }, { limit, skip });
      }
      
      res.json({
        data: result.rows ? result.rows.map(r => r.doc) : result.docs,
        total: result.total_rows || result.docs.length
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/impayes/:id
  router.get('/:id', async (req, res) => {
    try {
      const doc = await couch.get(`impaye:${req.params.id}`);
      if (!doc) return res.status(404).json({ error: 'Not found' });
      res.json(doc);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
```

---

## 7. Plan de Migration (Phases)

### Phase 1: Préparation (1-2 jours)

- [ ] Installer CouchDB 3.x localement ou via Docker
- [ ] Créer les design documents
- [ ] Valider le script de migration sur dump de test
- [ ] Tester les performances avec ~1000 documents

```bash
# Docker CouchDB
docker run -d \
  --name couchdb-marki \
  -p 5984:5984 \
  -e COUCHDB_USER=admin \
  -e COUCHDB_PASSWORD=secret \
  -v couchdb_data:/opt/couchdb/data \
  couchdb:3
```

### Phase 2: Migration Données (1 jour)

- [ ] Exécuter migration sur environnement de staging
- [ ] Valider cohérence des données (comptages)
- [ ] Tester les vues et requêtes
- [ ] Mesurer temps de réponse

```bash
# Vérification post-migration
node migrate-to-couchdb.js --source marki.db --target http://admin:secret@localhost:5984/marki_staging
node verify-migration.js --target http://admin:secret@localhost:5984/marki_staging
```

### Phase 3: Adaptation Backend (3-5 jours)

- [ ] Créer le client CouchDB
- [ ] Migrer les routes API existantes
- [ ] Adapter la logique métier (séquences, relances)
- [ ] Tests unitaires

### Phase 4: Tests & Validation (2-3 jours)

- [ ] Tests d'intégration complets
- [ ] Test de charge (k6 ou artillery)
- [ ] Test réplication offline
- [ ] Validation avec utilisateurs beta

### Phase 5: Déploiement (1 jour)

- [ ] Backup complet de SQLite
- [ ] Migration finale en production
- [ ] Basculer l'application
- [ ] Monitoring et rollback si nécessaire

---

## 8. Gestion des Conflits

### 8.1 Stratégie de Résolution

```javascript
// middleware/conflict-handler.js
async function resolveConflicts(doc, couch) {
  const conflicts = await couch.db.get(doc._id, { conflicts: true });
  
  if (!conflicts._conflicts || conflicts._conflicts.length === 0) {
    return doc;
  }

  // Récupérer toutes les révisions en conflit
  const revisions = await Promise.all(
    conflicts._conflicts.map(rev => 
      couch.db.get(doc._id, { rev })
    )
  );
  
  // Stratégie: dernier modifié gagne (pour relances)
  // OU fusion manuelle (pour contacts)
  const winner = revisions.reduce((latest, current) => 
    new Date(current.updated_at) > new Date(latest.updated_at) ? current : latest
  );
  
  // Supprimer les révisions perdantes
  for (const rev of conflicts._conflicts) {
    if (rev !== winner._rev) {
      await couch.db.destroy(doc._id, rev);
    }
  }
  
  return winner;
}
```

### 8.2 Configuration Réplication

```javascript
// Réplication bidirectionnelle pour offline
const replicationConfig = {
  source: 'http://server:5984/marki',
  target: 'http://local:5984/marki_local',
  continuous: true,
  filter: 'app/by_user',
  query_params: { user_id: 'user:xxx' }
};
```

---

## 9. Sécurité

### 9.1 Authentification CouchDB

```javascript
// Création utilisateurs et rôles
const users = [
  { _id: 'org.couchdb.user:admin', name: 'admin', roles: ['_admin'] },
  { _id: 'org.couchdb.user:app', name: 'app', roles: ['marki_app'] },
  { _id: 'org.couchdb.user:readonly', name: 'readonly', roles: ['marki_readonly'] }
];

// Validation document
const validate_doc_update = `
function(newDoc, oldDoc, userCtx) {
  if (userCtx.roles.indexOf('_admin') !== -1) return;
  if (userCtx.roles.indexOf('marki_app') === -1) {
    throw({ forbidden: 'Application role required' });
  }
  // Validation métier ici
}
`;
```

### 9.2 Réseau

- TLS/SSL obligatoire en production
- VPN ou private network pour CouchDB
- IP whitelist sur le port 5984

---

## 10. Monitoring & Backup

### 10.1 Backups

```bash
#!/bin/bash
# backup-couchdb.sh

DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="marki"
BACKUP_DIR="/backups/couchdb"

curl -X GET "http://admin:secret@localhost:5984/${DB_NAME}/_all_docs?include_docs=true" \
  | gzip > "${BACKUP_DIR}/${DB_NAME}_${DATE}.json.gz"

# Backup via replication
 curl -X POST http://admin:secret@localhost:5984/_replicate \
   -H "Content-Type: application/json" \
   -d '{"source":"marki","target":"marki_backup_"'${DATE}'","create_target":true}'
```

### 10.2 Métriques à Surveiller

```javascript
// health-check.js
async function healthCheck(couch) {
  const info = await couch.db.info();
  const activeTasks = await couch.nano.activeTasks();
  
  return {
    db_name: info.db_name,
    doc_count: info.doc_count,
    disk_size: info.disk_size,
    fragmentation: info.disk_size / info.data_size,
    replication_lag: checkReplicationLag(activeTasks),
    status: info.doc_count > 0 ? 'healthy' : 'warning'
  };
}
```

---

## 11. Comparaison Performances

| Opération | SQLite (ms) | CouchDB (ms) | Notes |
|-----------|-------------|--------------|-------|
| GET contact | ~2 | ~5 | +réseau |
| LIST 50 impayés | ~15 | ~25 | Via view |
| Search full-text | ~100 | ~50 | Mango query |
| Write | ~5 | ~15 | +indexation |
| Réplication | N/A | ~500/s | Batch insert |

---

## 12. Rollback Plan

En cas de problème majeur:

1. **Restaurer SQLite:** `cp backups/marki-2026-07-21.db marki.db`
2. **Basculer config:** Revenir à l'ancien serveur backend
3. **Synchroniser données:** Exporter les modifs depuis CouchDB vers SQLite
4. **Notification:** Informer les users des limitations temporaires

---

## 13. Références

- [CouchDB Official Docs](https://docs.couchdb.org/)
- [Nano Node.js Client](https://github.com/apache/couchdb-nano)
- [Mango Queries](https://docs.couchdb.org/en/stable/api/database/find.html)
- [CouchDB The Definitive Guide](https://guide.couchdb.org/)

---

**Document version:** 1.0  
**Prochaine review:** Post-migration Phase 2  
**Responsable:** Équipe Backend
