# CRUD Flat-Files - Spécification Minimaliste

## Architecture

Un seul CRUD générique pour toutes les entités. Chaque entité = 1 fichier YAML.

```
data/
├── contacts/       # contact_{id}.yml
├── impayes/        # impaye_{id}.yml
├── relances/       # relance_{id}.yml
├── sequences/      # sequence_{id}.yml
└── smtp_profiles/  # smtp_{id}.yml
```

---

## CRUD Générique

### Interface

```javascript
// CRUD de base
await db.create('impayes', { id: 'imp_001', ... })     // Créer
await db.read('impayes', 'imp_001')                    // Lire un
await db.search('impayes', { payer_id: 'pay_001' })    // Rechercher
await db.update('impayes', 'imp_001', { statut: 'payee' })  // Modifier
await db.delete('impayes', 'imp_001')                  // Supprimer

// Recherche avancée (LokiJS)
await db.query('impayes')
  .where('statut').eq('non_payee')
  .where('date_echeance').lt('2026-07-01')
  .data()
```

### Implémentation

```javascript
const loki = require('lokijs');
const yaml = require('js-yaml');
const fs = require('fs').promises;
const path = require('path');
const lockfile = require('proper-lockfile');

class FlatFileDB {
  constructor(baseDir) {
    this.baseDir = baseDir;
    this.db = new loki('db.json');
    this.collections = {};
    this.initCollections();
  }

  // Initialisation des collections avec indexes
  initCollections() {
    this.collections.contacts = this.db.addCollection('contacts', {
      indices: ['id', 'email', 'nom', 'type', 'is_blacklisted'],
      unique: ['id']
    });

    this.collections.impayes = this.db.addCollection('impayes', {
      indices: ['id', 'payer_id', 'contact_relance_id', 'nfacture', 
               'date_echeance', 'statut', 'is_blacklisted', 'facture_soldee',
               'apporteur_id', 'sequence_id'],
      unique: ['id']
    });

    this.collections.relances = this.db.addCollection('relances', {
      indices: ['id', 'contact_id', 'sequence_id', 'statut', 'date_envoi'],
      unique: ['id']
    });

    this.collections.sequences = this.db.addCollection('sequences', {
      indices: ['id', 'type_sequence', 'actif'],
      unique: ['id']
    });

    this.collections.smtp_profiles = this.db.addCollection('smtp_profiles', {
      indices: ['id', 'actif'],
      unique: ['id']
    });
  }

  // Chemin du fichier YAML
  _getPath(collection, id) {
    const dir = path.join(this.baseDir, collection);
    return path.join(dir, `${id}.yml`);
  }

  // --- CREATE ---
  async create(collection, data) {
    if (!data.id) throw new Error('id requis');
    
    const filePath = this._getPath(collection, data.id);
    const lockPath = `${filePath}.lock`;
    const coll = this.collections[collection];

    await lockfile.lock(lockPath, { stale: 5000 });
    try {
      // Vérifier si existe déjà
      if (coll.findOne({ id: data.id })) {
        throw new Error(`${collection}/${data.id} existe déjà`);
      }

      // Créer répertoire si besoin
      await fs.mkdir(path.dirname(filePath), { recursive: true });

      // Écrire YAML
      await fs.writeFile(filePath, yaml.dump(data, { sortKeys: true }));

      // Indexer dans LokiJS
      coll.insert(data);

      return data;
    } finally {
      await lockfile.unlock(lockPath).catch(() => {});
    }
  }

  // --- READ ---
  async read(collection, id) {
    // Lecture depuis LokiJS (mémoire)
    const result = this.collections[collection].findOne({ id });
    if (!result) throw new Error(`${collection}/${id} non trouvé`);
    return result;
  }

  // --- UPDATE ---
  async update(collection, id, updates) {
    const filePath = this._getPath(collection, id);
    const lockPath = `${filePath}.lock`;
    const coll = this.collections[collection];

    await lockfile.lock(lockPath, { stale: 5000 });
    try {
      // Lire existant
      const existing = coll.findOne({ id });
      if (!existing) throw new Error(`${collection}/${id} non trouvé`);

      // Fusionner
      const updated = { ...existing, ...updates, id };

      // Écrire YAML
      await fs.writeFile(filePath, yaml.dump(updated, { sortKeys: true }));

      // Mettre à jour LokiJS
      coll.update(updated);

      return updated;
    } finally {
      await lockfile.unlock(lockPath).catch(() => {});
    }
  }

  // --- DELETE ---
  async delete(collection, id) {
    const filePath = this._getPath(collection, id);
    const lockPath = `${filePath}.lock`;
    const coll = this.collections[collection];

    await lockfile.lock(lockPath, { stale: 5000 });
    try {
      // Supprimer fichier
      try {
        await fs.unlink(filePath);
      } catch (e) {
        if (e.code !== 'ENOENT') throw e;
      }

      // Supprimer de LokiJS
      const doc = coll.findOne({ id });
      if (doc) coll.remove(doc);

      return { deleted: true };
    } finally {
      await lockfile.unlock(lockPath).catch(() => {});
    }
  }

  // --- SEARCH ---
  async search(collection, criteria) {
    const coll = this.collections[collection];
    return coll.find(criteria);
  }

  // --- QUERY BUILDER ---
  query(collection) {
    return this.collections[collection].chain();
  }

  // --- LOAD INITIAL ---
  async loadAll() {
    for (const collection of Object.keys(this.collections)) {
      const dir = path.join(this.baseDir, collection);
      try {
        const files = await fs.readdir(dir);
        for (const file of files.filter(f => f.endsWith('.yml'))) {
          const content = await fs.readFile(path.join(dir, file), 'utf-8');
          const data = yaml.load(content);
          if (data && data.id) {
            this.collections[collection].insert(data);
          }
        }
      } catch (e) {
        if (e.code !== 'ENOENT') throw e;
      }
    }
  }
}

// Export
module.exports = FlatFileDB;
```

---

## Schémas YAML

### Contact (Payer + Apporteur)

```yaml
# contacts/contact_{id}.yml
id: "cont_001"
type: "contact"  # contact

# Identité
code: "C12345"
nom: "DUPONT"
prenom: "Jean"
civilite: "M."

# Coordonnées
email: "jean.dupont@example.com"
telephone: "0612345678"

# Société
societe: "SARL DUPONT IMMO"
type_personne: "Apporteur d'affaire"  # | "Particulier" | "Société" | "Notaire" | "Agence"
activite_societe: "Agence immobilière"

# Adresse
adresse_rue: "123 Rue de Paris"
adresse_code_postal: "75001"
adresse_ville: "Paris"
adresse_pays: "France"

# Statut
statut: "actif"  # actif | inactif
is_blacklisted: false
blacklist_motif: null
blacklist_date: null
blacklist_par: null

# Relations (IDs uniquement)
impaye_ids: []
relance_ids: []

# Timestamps
created_at: "2026-07-08T10:00:00Z"
updated_at: "2026-07-08T10:00:00Z"
```

### Impaye (Entité centrale)

```yaml
# impayes/impaye_{id}.yml
id: "imp_001"
type: "impaye"

# Identifiants facture
nfacture: "FAC-2026-001"
reference: "REF-001"
ref_piece: "RP-001"
numero_dossier: "DOS-123"
id_dossier: "ID-456"

# Dates
date_piece: "2026-05-15"
date_echeance: "2026-06-15"
date_import: "2026-07-08"

# Montants
total_ht: 1000.00
total_ttc: 1200.00
montant_total: 1200.00
reste_a_payer: 1200.00

# Statut
facture_soldee: false
statut: "non_payee"  # non_payee | payee | annulee

# Relations (clés étrangères)
payer_id: "cont_001"
contact_relance_id: "cont_001"
apporteur_id: null
proprietaire_id: null
donneur_ordre_id: null
sequence_id: null

# Dénormalisation (copie pour affichage rapide)
payeur_nom: "DUPONT"
payeur_prenom: "Jean"
payeur_email: "jean.dupont@example.com"
payeur_telephone: "0612345678"
payeur_civilite: "M."
payeur_type: "Apporteur d'affaire"

apporteur_nom: null
apporteur_prenom: null
apporteur_societe: null

proprietaire_nom: null
proprietaire_prenom: null

donneur_ordre_nom: null
donneur_ordre_prenom: null

# Bien immobilier
adresse_bien: "45 Avenue des Champs"
ville: "Paris"
code_postal: "75008"

# Document
url_pdf: "https://..."
url_pdf_token: "abc123"

# Séquence de relance
email_index: 0  # 0 = pas encore de relance

# Blacklist
is_blacklisted: false
blacklist_motif: null
blacklist_date: null

# Commentaire
commentaire_piece: "Diagnostic immobilier"

# Timestamps
created_at: "2026-07-08T10:00:00Z"
updated_at: "2026-07-08T10:00:00Z"
```

### Relance

```yaml
# relances/relance_{id}.yml
id: "rel_001"
type: "relance"

# Relations
contact_id: "cont_001"
sequence_id: "seq_001"

# Impayés liés (array d'IDs)
impaye_ids:
  - "imp_001"
  - "imp_002"

# Scénario détecté
scenario: "multiple"  # single | multiple | broker | both
email_index: 1

# Contenu généré
objet: "Rappel : 2 factures en attente"
corps: "Bonjour M. DUPONT,\n\nNous vous rappelons..."
corps_html: "<p>Bonjour...</p>"

# Statut
statut: "pret_pour_envoi"  # brouillon | pret_pour_envoi | envoyee | erreur | annulee
manuelle: false
valide: true

# Dates
date_creation: "2026-07-08T10:00:00Z"
date_envoi: null
planifiee_le: "2026-07-15T09:00:00Z"

# Configuration envoi
smtp_profile_id: "smtp_001"
cc: "comptabilite@example.com"
bcc: null

# Erreurs
erreur_count: 0
derniere_erreur: null
derniere_tentative: null

# Tracking
message_id: null
ouvert: false
date_ouverture: null
clicks: 0

# Timestamps
updated_at: "2026-07-08T10:00:00Z"
```

### Sequence

```yaml
# sequences/sequence_{id}.yml
id: "seq_001"
type: "sequence"

nom: "Séquence Standard"
type_sequence: "relances"  # relances | rappels
validation_obligatoire: true
actif: true

# Emails de la séquence
emails:
  - email_index: 1
    delai: 15  # jours après date échéance
    objet: "Rappel échéance"
    corps: "Bonjour, nous vous rappelons..."
    cc: ""
    
    # Scénarios par type de situation
    scenarios:
      - format: "single"      # 1 impayé simple
        active: true
        smtp_profile_id: "smtp_001"
        objet: "Rappel : facture {{nfacture}} en attente"
        corps: "Bonjour {{civilite}} {{nom}}, ..."
        
      - format: "multiple"    # plusieurs impayés même contact
        active: true
        smtp_profile_id: "smtp_001"
        objet: "Rappel : {{nombre}} factures en attente"
        corps: "Bonjour {{civilite}} {{nom}}, ..."
        
      - format: "broker"      # contact = apporteur, impayés d'autres
        active: false
        smtp_profile_id: "smtp_001"
        objet: "Relance : impayés de vos clients"
        corps: "Bonjour {{civilite}} {{nom}}, ..."
        
      - format: "both"         # mixte : ses impayés + ceux où il est apporteur
        active: true
        smtp_profile_id: "smtp_001"
        objet: "Rappel factures et information clients"
        corps: "Bonjour {{civilite}} {{nom}}, ..."

  - email_index: 2
    delai: 30
    objet: "2ème relance"
    scenarios: [...]

  - email_index: 3
    delai: 45
    objet: "Mise en demeure"
    scenarios: [...]

created_at: "2026-07-08T10:00:00Z"
updated_at: "2026-07-08T10:00:00Z"
```

### SmtpProfile

```yaml
# smtp_profiles/smtp_001.yml
id: "smtp_001"
type: "smtp_profile"

nom: "SMTP Principal"
description: "Serveur SMTP pour envoi des relances"

# Configuration serveur
host: "smtp.example.com"
port: 587
secure: false  # true pour 465
require_tls: true

# Authentification
username: "notifications@example.com"
password: "[encrypted:xxx]"

# From par défaut
from_email: "notifications@example.com"
from_name: "ADTI Marki"

# Options
actif: true
max_per_hour: 100

# Réponses
display_name: "Service Recouvrement"
reply_to: "comptabilite@example.com"

created_at: "2026-07-08T10:00:00Z"
updated_at: "2026-07-08T10:00:00Z"
```

---

## Configuration LokiJS

```javascript
const db = new loki('db.json');

// Collections avec indexes
db.addCollection('contacts', {
  indices: ['id', 'email', 'nom', 'type', 'is_blacklisted'],
  unique: ['id']
});

db.addCollection('impayes', {
  indices: ['id', 'payer_id', 'contact_relance_id', 'nfacture', 
           'date_echeance', 'statut', 'is_blacklisted', 
           'facture_soldee', 'sequence_id', 'apporteur_id'],
  unique: ['id']
});

db.addCollection('relances', {
  indices: ['id', 'contact_id', 'sequence_id', 'statut', 
           'date_envoi', 'planifiee_le'],
  unique: ['id']
});

db.addCollection('sequences', {
  indices: ['id', 'type_sequence', 'actif'],
  unique: ['id']
});

db.addCollection('smtp_profiles', {
  indices: ['id', 'actif'],
  unique: ['id']
});
```

---

## Exemples d'utilisation

```javascript
const FlatFileDB = require('./flat-file-db');

// Initialisation
const db = new FlatFileDB('./data');
await db.loadAll();  // Charger tous les YAML existants

// CRUD Contact
const contact = await db.create('contacts', {
  id: 'cont_001',
  nom: 'DUPONT',
  prenom: 'Jean',
  email: 'jean@example.com',
  type_personne: 'Apporteur d\'affaire'
});

const found = await db.read('contacts', 'cont_001');

await db.update('contacts', 'cont_001', { 
  telephone: '0612345678',
  updated_at: new Date().toISOString()
});

// Recherche simple
const impayes = await db.search('impayes', { 
  payer_id: 'cont_001',
  statut: 'non_payee'
});

// Recherche avancée (LokiJS chain)
const relancesAEnvoyer = db.query('relances')
  .where('statut').eq('pret_pour_envoi')
  .where('planifiee_le').lt(new Date().toISOString())
  .data();

// Suppression
await db.delete('impayes', 'imp_001');
```

---

## Dépendances

```json
{
  "dependencies": {
    "lokijs": "^1.5.11",
    "js-yaml": "^4.1.0",
    "proper-lockfile": "^4.1.2"
  }
}
```

---

**Total: ~200 lignes de code + 5 schémas YAML**
