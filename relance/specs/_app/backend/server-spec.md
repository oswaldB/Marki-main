# Spécification du serveur Backend

**Type** : Node.js + Express  
**Architecture** : Flat Files Database (LokiJS + YAML)  
**Locking** : proper-lockfile  

---

## Configuration

```javascript
// config.js
module.exports = {
  port: process.env.PORT || 3000,
  dataDir: path.join(__dirname, 'data'),
  lockTimeout: 5000,
  cors: {
    origin: ['http://localhost:3001', 'https://*.netlify.app'],
    credentials: true
  }
};
```

---

## Structure du serveur

```
backend/
├── server.js                 # Point d'entrée Express
├── config.js                 # Configuration
├── lib/
│   ├── yaml-adapter.js       # Adapter LokiJS <-> YAML
│   ├── lock-manager.js       # Gestion des locks
│   └── views.js              # Views materialized
├── routes/
│   ├── factures.js           # Routes /api/factures
│   ├── payers.js             # Routes /api/payers
│   ├── impayes.js            # Routes /api/impayes
│   ├── relances.js           # Routes /api/relances
│   ├── sequences.js          # Routes /api/sequences
│   └── dashboard.js          # Routes /api/dashboard
├── data/                     # Dossier des fichiers YAML
│   ├── payers/
│   ├── factures/
│   ├── impayes/
│   ├── contacts/
│   ├── relances/
│   ├── sequences/
│   └── logs/
└── package.json
```

---

## Initialisation LokiJS

```javascript
const loki = require('lokijs');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

// Adapter personnalisé pour YAML
class YamlAdapter {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.collections = ['payers', 'factures', 'impayes', 'contacts', 'relances', 'sequences'];
  }

  loadDatabase(dbname, callback) {
    const db = new loki(dbname);
    
    // Créer les collections avec indexes
    const payers = db.addCollection('payers', { 
      indices: ['id', 'nom'], 
      unique: ['id'] 
    });
    
    const factures = db.addCollection('factures', { 
      indices: ['id', 'payer_id', 'statut', 'date_echeance'],
      unique: ['id']
    });
    
    const impayes = db.addCollection('impayes', {
      indices: ['id', 'payer_id', 'facture_id', 'is_blacklisted', 'est_en_retard'],
      unique: ['id']
    });
    
    const contacts = db.addCollection('contacts', {
      indices: ['id', 'payer_id', 'email'],
      unique: ['id']
    });
    
    const relances = db.addCollection('relances', {
      indices: ['id', 'contact_id', 'sequence_id', 'envoyee'],
      unique: ['id']
    });
    
    const sequences = db.addCollection('sequences', {
      indices: ['id', 'niveau'],
      unique: ['id']
    });

    // Charger depuis YAML
    this.collections.forEach(colName => {
      const colDir = path.join(this.dataDir, colName);
      if (!fs.existsSync(colDir)) {
        fs.mkdirSync(colDir, { recursive: true });
        return;
      }
      
      const files = fs.readdirSync(colDir).filter(f => f.endsWith('.yml'));
      files.forEach(file => {
        const filePath = path.join(colDir, file);
        const data = yaml.load(fs.readFileSync(filePath, 'utf-8'));
        if (data) {
          db.getCollection(colName).insert(data);
        }
      });
    });

    callback(db);
  }

  async saveDatabase(dbname, db, callback) {
    // Sauvegarde automatique via event listeners
    callback();
  }
}

// Initialisation
const adapter = new YamlAdapter(DATA_DIR);
const db = new loki('db.json', { adapter });

db.loadDatabase({}, () => {
  console.log('Database loaded');
  setupViews(db);
});
```

---

## Views Materialized

```javascript
function setupViews(db) {
  // View: Impayés en retard
  const impayesEnRetard = db.addCollection('impayes_en_retard');
  impayesEnRetard.createIndex('payer_id');
  
  // View: Impayés blacklistés
  const impayesBlacklistes = db.addCollection('impayes_blacklistes');
  impayesBlacklistes.createIndex('blacklisted_at');
  
  // View: Relances à envoyer
  const relancesAEnvoyer = db.addCollection('relances_a_envoyer');
  
  // Listeners pour maintenir les views à jour
  db.getCollection('impayes').on('insert', (doc) => {
    if (doc.est_en_retard && !doc.is_blacklisted) {
      impayesEnRetard.insert(doc);
    }
    if (doc.is_blacklisted) {
      impayesBlacklistes.insert(doc);
    }
  });
  
  db.getCollection('impayes').on('update', (doc) => {
    // Update views...
  });
  
  db.getCollection('relances').on('insert', (doc) => {
    if (doc.statut === 'valide' && !doc.envoyee) {
      relancesAEnvoyer.insert(doc);
    }
  });
}
```

---

## Routes API

### Dashboard
```javascript
// GET /api/dashboard/kpis
app.get('/api/dashboard/kpis', (req, res) => {
  const factures = db.getCollection('factures').find();
  const impayes = db.getCollection('impayes').find({ is_blacklisted: false });
  
  const montantTotal = factures.reduce((sum, f) => sum + (f.montant || 0), 0);
  const montantImpaye = impayes.reduce((sum, i) => sum + (i.reste_a_payer || 0), 0);
  
  const tauxImpaye = montantTotal > 0 ? (montantImpaye / montantTotal * 100).toFixed(2) : 0;
  
  // Calcul DSO moyen...
  const dsoMoyen = calculateDSO(impayes);
  
  res.json({
    taux_impaye: parseFloat(tauxImpaye),
    montant_impaye: montantImpaye,
    montant_total: montantTotal,
    dso_moyen: dsoMoyen,
    nb_impayes: impayes.length
  });
});

// GET /api/dashboard/top-debiteurs
app.get('/api/dashboard/top-debiteurs', (req, res) => {
  const impayes = db.getCollection('impayes').find({ is_blacklisted: false });
  
  // Grouper par payer_id
  const byPayer = {};
  impayes.forEach(i => {
    if (!byPayer[i.payer_id]) byPayer[i.payer_id] = 0;
    byPayer[i.payer_id] += i.reste_a_payer || 0;
  });
  
  // Récupérer noms et trier
  const payers = db.getCollection('payers').find();
  const result = Object.entries(byPayer)
    .map(([payerId, montant]) => {
      const payer = payers.find(p => p.id === parseInt(payerId));
      return {
        payer_id: parseInt(payerId),
        nom: payer?.nom || 'Inconnu',
        montant_total: montant
      };
    })
    .sort((a, b) => b.montant_total - a.montant_total)
    .slice(0, 10);
  
  res.json(result);
});
```

### Factures
```javascript
// GET /api/factures
app.get('/api/factures', (req, res) => {
  const { page = 1, limit = 20, statut, sort } = req.query;
  
  let query = {};
  if (statut) query.statut = statut;
  
  let results = db.getCollection('factures').find(query);
  
  // Tri
  if (sort) {
    const [field, order] = sort.split(':');
    results = results.sort((a, b) => {
      return order === 'desc' ? b[field] - a[field] : a[field] - b[field];
    });
  }
  
  // Pagination
  const total = results.length;
  const start = (page - 1) * limit;
  results = results.slice(start, start + parseInt(limit));
  
  res.json({
    data: results,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

// PUT /api/factures/:id
app.put('/api/factures/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const collection = db.getCollection('factures');
  
  const facture = collection.findOne({ id });
  if (!facture) return res.status(404).json({ error: 'Facture not found' });
  
  // Update en mémoire
  Object.assign(facture, req.body, { updated_at: new Date().toISOString() });
  collection.update(facture);
  
  // Sauvegarde YAML avec lock
  await saveToYaml('factures', facture);
  
  res.json({ success: true, data: facture });
});
```

### Impayés (Blacklist)
```javascript
// PUT /api/impayes/:id/blacklist
app.put('/api/impayes/:id/blacklist', async (req, res) => {
  const id = parseInt(req.params.id);
  const { is_blacklisted, motif, motif_type } = req.body;
  
  const collection = db.getCollection('impayes');
  const impaye = collection.findOne({ id });
  
  if (!impaye) return res.status(404).json({ error: 'Impaye not found' });
  
  // Update
  impaye.is_blacklisted = is_blacklisted;
  if (is_blacklisted) {
    impaye.blacklisted_at = new Date().toISOString();
    impaye.blacklist_motif = motif;
    impaye.blacklist_motif_type = motif_type;
  } else {
    impaye.blacklisted_at = null;
    impaye.blacklist_motif = null;
    impaye.blacklist_motif_type = null;
  }
  impaye.updated_at = new Date().toISOString();
  
  collection.update(impaye);
  await saveToYaml('impayes', impaye);
  
  // Déclencher régénération des relances
  if (!is_blacklisted) {
    await regenerateRelancesForContact(impaye.payer_id);
  }
  
  res.json({ success: true, data: impaye });
});

// GET /api/impayes/blacklistes
app.get('/api/impayes/blacklistes', (req, res) => {
  const { motif_type } = req.query;
  
  let query = { is_blacklisted: true };
  if (motif_type) query.blacklist_motif_type = motif_type;
  
  const results = db.getCollection('impayes').find(query);
  res.json(results);
});
```

---

## Sauvegarde YAML avec Lock

```javascript
const lockfile = require('proper-lockfile');
const yaml = require('js-yaml');

async function saveToYaml(type, data) {
  const filePath = path.join(DATA_DIR, type, `${type}_${data.id}.yml`);
  const lockPath = `${filePath}.lock`;
  
  // Nettoyer les locks périmés
  cleanupStaleLocks(type);
  
  await lockfile.lock(lockPath, { stale: 5000, retries: 3 });
  
  try {
    const yamlContent = yaml.dump(data, { 
      sortKeys: true,
      lineWidth: -1 
    });
    fs.writeFileSync(filePath, yamlContent);
  } finally {
    await lockfile.unlock(lockPath).catch(() => {});
  }
}

function cleanupStaleLocks(type) {
  const dir = path.join(DATA_DIR, type);
  if (!fs.existsSync(dir)) return;
  
  const now = Date.now();
  fs.readdirSync(dir)
    .filter(f => f.endsWith('.lock'))
    .forEach(lockFile => {
      const lockPath = path.join(dir, lockFile);
      const stats = fs.statSync(lockPath);
      if (now - stats.mtimeMs > 10000) {
        try { fs.unlinkSync(lockPath); } catch(e) {}
      }
    });
}
```

---

## Génération automatique des relances (CRON)

```javascript
// workflows/generate-relances.js
async function generateRelances() {
  const sequences = db.getCollection('sequences').find({ est_active: true });
  const maintenant = new Date();
  
  for (const sequence of sequences.sort(s => s.niveau)) {
    const dateLimite = new Date(maintenant);
    dateLimite.setDate(dateLimite.getDate() - sequence.delai_jours);
    
    // Impayés éligibles
    let impayes = db.getCollection('impayes').find({
      date_echeance: { $lte: dateLimite.toISOString().split('T')[0] },
      is_blacklisted: false,
      est_en_retard: true
    });
    
    // Grouper par contact
    const byContact = {};
    impayes.forEach(i => {
      const contact = db.getCollection('contacts').findOne({ 
        payer_id: i.payer_id,
        est_contact_relance: true 
      });
      if (!contact) return;
      
      if (!byContact[contact.id]) {
        byContact[contact.id] = { contact, impayes: [], montant: 0 };
      }
      byContact[contact.id].impayes.push(i);
      byContact[contact.id].montant += i.reste_a_payer;
    });
    
    // Créer les relances
    for (const [contactId, group] of Object.entries(byContact)) {
      const payer = db.getCollection('payers').findOne({ id: group.contact.payer_id });
      
      // Générer contenu avec template
      let sujet = sequence.template_sujet
        .replace(/\{\{contact_nom\}\}/g, payer?.nom || group.contact.nom)
        .replace(/\{\{montant_total\}\}/g, group.montant.toFixed(2))
        .replace(/\{\{nb_factures\}\}/g, group.impayes.length);
      
      let contenu = sequence.template_corps
        .replace(/\{\{contact_nom\}\}/g, payer?.nom || group.contact.nom)
        .replace(/\{\{montant_total\}\}/g, group.montant.toFixed(2))
        .replace(/\{\{nb_factures\}\}/g, group.impayes.length)
        .replace(/\{\{date_jour\}\}/g, new Date().toLocaleDateString('fr-FR'));
      
      // Créer la relance
      const relanceId = generateId('relances');
      const relance = {
        id: relanceId,
        type: 'relance',
        contact_id: parseInt(contactId),
        impaye_ids: group.impayes.map(i => i.id),
        sequence_id: sequence.id,
        sujet,
        contenu,
        cc: '',
        valide: false,
        envoyee: false,
        statut: 'brouillon',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      db.getCollection('relances').insert(relance);
      await saveToYaml('relances', relance);
    }
  }
}

// Exporter pour CRON
module.exports = { generateRelances };
```

---

## Gestion des erreurs

```javascript
// Middleware global
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  
  // Log dans fichier YAML
  const logEntry = {
    id: Date.now(),
    type: 'error_log',
    timestamp: new Date().toISOString(),
    url: req.url,
    method: req.method,
    error: err.message,
    stack: err.stack
  };
  
  saveToYaml('logs', logEntry).catch(console.error);
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    timestamp: new Date().toISOString()
  });
});
```

---

## Démarrage du serveur

```javascript
const app = express();

// Middleware
app.use(express.json());
app.use(cors(config.cors));

// Routes
app.use('/api/factures', require('./routes/factures'));
app.use('/api/payers', require('./routes/payers'));
app.use('/api/impayes', require('./routes/impayes'));
app.use('/api/relances', require('./routes/relances'));
app.use('/api/sequences', require('./routes/sequences'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Start
app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
});
```
