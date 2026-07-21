# CouchDB Migration pour Marki

> **Setup:** CouchDB distant sur https://dev.markidiags.com/data/

## Configuration actuelle

```bash
URL:     https://admin:admin@dev.markidiags.com/data
Database: marki
```

## Structure

```
couchdb/
├── README.md                      # Ce fichier
├── package.json                   # Dépendances Node
├── config.js                      # ⚙️ Configuration (déjà prête)
├── .env                           # 🔐 Variables d'environnement
├── .env.example                   # Template
├── migrate.sh                     # 🚀 Script de migration
├── couch-admin.sh                 # Outils admin
├── design-docs/
│   └── couchdb-design-docs.json   # Vues CouchDB
├── migrations/
│   ├── migrate-sqlite-to-couchdb.js
│   └── verify-migration.js
└── utils/
    └── couch-client.js            # Client CouchDB
```

## Démarrage rapide

### 1. Installer les dépendances

```bash
cd couchdb/
npm install
```

### 2. Vérifier la connexion

```bash
./couch-admin.sh ping
# ou
npm run check
```

### 3. Migrer 🚀

```bash
# Migration complète
./migrate.sh

# Ou avec chemin SQLite custom
./migrate.sh /chemin/vers/marki.db
```

## Commandes disponibles

### Migration

| Commande | Description |
|----------|-------------|
| `./migrate.sh` | Migration complète avec vérif |
| `npm run migrate` | Script Node direct |
| `npm run verify` | Vérification post-migration |
| `npm run check` | Test connexion CouchDB |

### Admin CouchDB

```bash
./couch-admin.sh status     # Statut CouchDB
./couch-admin.sh info       # Info base marki
./couch-admin.sh docs       # Nombre de documents
./couch-admin.sh views      # Liste des vues
./couch-admin.sh compact    # Compacter la base
./couch-admin.sh ping       # Test connexion HTTPS
```

## Configuration

La configuration est déjà faite dans `config.js` et `.env` :

```javascript
// config.js
module.exports = {
  url: 'https://admin:admin@dev.markidiags.com/data',
  dbName: 'marki'
};
```

Si besoin de changer, modifie le fichier `.env` :

```bash
COUCHDB_URL=https://admin:admin@dev.markidiags.com/data
COUCHDB_DB=marki
```

## Utilisation du client CouchDB

```javascript
const CouchClient = require('./utils/couch-client');
const config = require('./config');

const couch = new CouchClient(config.url, config.dbName);

// Récupérer un document
const contact = await couch.get('contact:550e8400-...');

// Recherche Mango
const impayes = await couch.find({
  type: { $eq: 'impaye' },
  statut: { $eq: 'impaye' }
}, { limit: 50 });

// Requête via View
const parContact = await couch.view('impayes', 'by_contact', {
  key: 'contact:xxx',
  include_docs: true
});
```

## Types de Documents

| Type | ID | Description |
|------|-----|-------------|
| contact | `contact:{uuid}` | Contacts/clients/payeurs |
| impaye | `impaye:{uuid}` | Factures impayées |
| relance | `relance:{uuid}` | Relances envoyées |
| sequence | `sequence:{uuid}` | Séquences de relances |
| smtp | `smtp:{uuid}` | Profils SMTP |
| event | `event:{uuid}` | Événements/activité |
| user | `user:{uuid}` | Utilisateurs |

## Vues disponibles

### impayes
- `by_contact` - Impayés par contact
- `by_statut` - Impayés par statut
- `by_date_echeance` - Impayés par date d'échéance
- `blacklistes` - Impayés blacklistés

### contacts
- `by_email` - Recherche par email
- `by_type` - Contacts par type_personne
- `by_blacklist` - Contacts blacklistés
- `all_relations` - Relations entre contacts

### relances
- `by_contact` - Relances par contact
- `by_sequence` - Relances par séquence
- `by_statut` - Relances par statut
- `by_date_programmation` - Relances programmées

### dashboards
- `kpi_impayes` - Totaux par statut (reduce)
- `impayes_par_mois` - Impayés par mois (reduce)
- `relances_par_statut` - Relances par statut (reduce)

## Troubleshooting

### Erreur HTTPS/SSL

Si tu as une erreur de certificat SSL en dev :

```javascript
// config.js - décommente:
requestDefaults: {
  strictSSL: false  // Pour self-signed certs
}
```

### Test manuel

```bash
# Test connexion direct
curl -k https://admin:admin@dev.markidiags.com/data/

# Voir les bases
curl -k https://admin:admin@dev.markidiags.com/data/_all_dbs

# Info base marki
curl -k https://admin:admin@dev.markidiags.com/data/marki
```

### Timeout

Si la migration est lente à cause du réseau :

```javascript
// config.js
requestDefaults: {
  timeout: 120000  // 2 minutes
}
```

## Références

- [CouchDB Docs](https://docs.couchdb.org/)
- [Nano Client](https://github.com/apache/couchdb-nano)
