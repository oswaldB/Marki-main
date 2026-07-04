# Architecture ADTI - Documentation

**Date** : 2026-06-30  
**Version** : 2.0  

---

## Vue d'ensemble

L'application ADTI utilise une architecture **Full Static** :
- **Frontend** : HTML statique + AlpineJS 3.x + Tailwind CSS
- **Backend** : Node.js + Express avec **Flat Files Database** (YAML + LokiJS)
- **Routing** : Fichier `_redirects` (Netlify-style)

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Static)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  index.html │  │  AlpineJS   │  │  Tailwind CSS CDN   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                                                              │
│  Routing: _redirects → fallback vers index.html            │
│  SPA: AlpineJS gère l'affichage des composants               │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ fetch() / REST API
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND (Node.js)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Express   │  │   LokiJS    │  │  proper-lockfile    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                                                              │
│  Stockage: 1 YAML = 1 entité                                 │
│  Indexation: En mémoire via LokiJS                          │
│  Concurrent: Locks par fichier                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Frontend

### Structure

```
frontend/
├── index.html              # Point d'entrée unique (SPA)
├── _redirects              # Configuration routing
├── js/
│   ├── app.js              # Initialisation AlpineJS
│   ├── router.js           # Logique de routing
│   ├── api-client.js       # Wrapper fetch API
│   └── components/
│       ├── dashboard.js
│       ├── importer.js
│       ├── factures.js
│       ├── fiche-client.js
│       └── ...
└── public/
    └── marki-logo.png
```

### Routing

Le fichier `_redirects` redirige toutes les routes vers `index.html` :

```
# API (proxy vers backend)
/api/*  http://localhost:3000/api/:splat  200

# SPA routes
/dashboard      /index.html   200
/importer       /index.html   200
/factures       /index.html   200
/factures/*     /index.html   200
/client/*       /index.html   200
/*              /index.html   200
```

### Communication API

```javascript
// GET avec AlpineJS
async function loadData() {
  this.loading = true;
  try {
    const res = await fetch('/api/factures?page=1');
    const data = await res.json();
    this.factures = data.data;
  } catch (e) {
    this.error = e.message;
  } finally {
    this.loading = false;
  }
}

// POST
await fetch('/api/factures', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: 1, ... })
});
```

---

## Backend

### Structure

```
backend/
├── server.js               # Point d'entrée Express
├── config.js               # Configuration
├── lib/
│   ├── yaml-adapter.js     # Adapter LokiJS ↔ YAML
│   └── lock-manager.js     # Gestion des locks
├── routes/
│   ├── factures.js
│   ├── payers.js
│   ├── impayes.js
│   ├── relances.js
│   ├── sequences.js
│   └── dashboard.js
└── data/                   # Fichiers YAML
    ├── payers/
    ├── factures/
    ├── impayes/
    ├── contacts/
    ├── relances/
    ├── sequences/
    └── logs/
```

### Format des données YAML

Chaque entité est un fichier YAML séparé :

**payer_1.yml** :
```yaml
id: 1
type: payer
nom: Société Alpha
email: contact@alpha.com
adresse: 123 Rue de Paris
created_at: "2026-06-30T10:00:00Z"
updated_at: "2026-06-30T10:00:00Z"
```

**facture_1.yml** :
```yaml
id: 1
type: facture
numero: FAC-2026-001
montant: 1000.00
statut: non_payee
payer_id: 1
created_at: "2026-06-30T10:00:00Z"
updated_at: "2026-06-30T10:00:00Z"
```

### LokiJS - Indexation en mémoire

```javascript
const db = new loki('db.json');

// Collections avec indexes
const factures = db.addCollection('factures', {
  indices: ['id', 'payer_id', 'statut', 'date_echeance'],
  unique: ['id']
});

// Chargement depuis YAML
const files = fs.readdirSync(FACTURES_DIR).filter(f => f.endsWith('.yml'));
files.forEach(file => {
  const data = yaml.load(fs.readFileSync(path.join(FACTURES_DIR, file), 'utf-8'));
  factures.insert(data);
});
```

### Gestion des accès concurrents

```javascript
const lockfile = require('proper-lockfile');

async function saveToYaml(type, data) {
  const filePath = path.join(DATA_DIR, type, `${type}_${data.id}.yml`);
  const lockPath = `${filePath}.lock`;
  
  await lockfile.lock(lockPath, { stale: 5000 });
  try {
    fs.writeFileSync(filePath, yaml.dump(data, { sortKeys: true }));
  } finally {
    await lockfile.unlock(lockPath).catch(() => {});
  }
}
```

---

## API Endpoints

### Dashboard
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/dashboard/kpis` | Taux impayés, DSO, montants |
| GET | `/api/dashboard/top-debiteurs` | Top 10 débiteurs |
| GET | `/api/dashboard/evolution` | Évolution 12 mois |

### Factures
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/factures` | Liste avec filtres/pagination |
| GET | `/api/factures/:id` | Détail facture |
| POST | `/api/factures` | Créer facture |
| PUT | `/api/factures/:id` | Modifier facture |
| DELETE | `/api/factures/:id` | Supprimer facture |

### Payers
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/payers` | Liste payers |
| GET | `/api/payers/:id` | Détail avec factures |
| POST | `/api/payers` | Créer payer |
| PUT | `/api/payers/:id` | Modifier payer |

### Impayés
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/impayes` | Liste impayés |
| PUT | `/api/impayes/:id/blacklist` | Toggle blacklist |
| GET | `/api/impayes/blacklistes` | Liste blacklistés |

### Relances
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/relances` | Liste relances |
| POST | `/api/relances` | Créer relance |
| POST | `/api/relances/:id/send` | Envoyer email |
| POST | `/api/relances/generate` | Générer (CRON) |

### Séquences
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/sequences` | Liste séquences |
| PUT | `/api/sequences/:id` | Modifier séquence |
| POST | `/api/sequences/reorder` | Réordonner |

---

## Workflows

### Frontend (AlpineJS)

| Workflow | Écran | Description |
|----------|-------|-------------|
| `charger-kpis` | dashboard | Charger KPIs via API |
| `charger-factures` | liste-factures | Liste avec pagination |
| `filtrer-statut` | liste-factures | Filtre statut factures |
| `toggle-blacklist` | fiche-facture | Blacklist/unblacklist |
| `envoyer-email` | modal-relance | Envoi relance |

### Backend (CRON/Jobs)

| Workflow | Fréquence | Description |
|----------|-----------|-------------|
| `generate-relances` | Quotidien 08:00 | Génère relances automatiques |
| `regenerate-relances-contact` | On-demand | Régénère après blacklist |

---

## Déploiement

### Développement local

```bash
# Backend
cd backend
npm install
npm run dev  # Port 3000

# Frontend (static)
cd frontend
python3 -m http.server 3001  # Ou n'importe quel serveur static
```

### Production (Netlify/Vercel)

```
# Frontend
- Déployer dossier frontend/ (avec _redirects)
- Configurer proxy API vers backend

# Backend
- Déployer sur VPS/Dokku/Railway
- Exposer port 3000
- Configurer CORS
```

---

## Avantages de l'architecture

### Frontend Static
- ✅ Aucun build step requis
- ✅ Hébergement gratuit (Netlify, Vercel, Cloudflare)
- ✅ Temps de chargement rapides
- ✅ Simple à maintenir

### Backend Flat Files
- ✅ Pas de base de données externe à gérer
- ✅ Données lisibles (YAML)
- ✅ Backup simple (copier fichiers)
- ✅ Pas de migrations de schéma
- ✅ Parfait pour usage small/medium

---

## Limites

- **Volume** : Optimisé pour < 100k entités
- **Concurrent** : Locks par fichier (pas de transactions multi-documents)
- **Recherche** : Full-text limité (LokiJS simple)
- **Durabilité** : RAM + fichiers (pas de réplication automatique)

---

## Dépendances

### Frontend
- AlpineJS 3.x (CDN)
- Tailwind CSS (CDN)

### Backend
- express
- lokijs
- js-yaml
- proper-lockfile
- cors

---

## Fichiers de specs mis à jour

- `specs/brief.md` - Vue d'ensemble projet
- `specs/styleguide.md` - Guide Tailwind + AlpineJS + Routing
- `specs/screens.md` - Inventaire écrans avec routes
- `specs/workflows.md` - Inventaire workflows (frontend + backend)
- `specs/_app/backend/server-spec.md` - Spec serveur Node.js
- `specs/_app/backend/models/flat-files/` - Modèles YAML
- `specs/_app/backend/workflows/*/spec.md` - Workflows backend
