# Stratégie de Migration : Parse → Flat-Files YAML

## Résumé exécutif

Migration du backend Parse (Back4App) vers une architecture **Flat-Files DB** avec LokiJS + YAML, conforme aux principes définis dans `dev-rules/flat-files-db-backend-principles.md`.

---

## 1. Mapping des Collections Parse → Collections YAML

| Parse (source) | YAML (destination) | Fichier | Description |
|----------------|-------------------|---------|-------------|
| `Contact` | `payers/` | `payer_{id}.yml` | Payeurs/clients avec dénormalisation partielle |
| `Contact` | `contacts/` | `contact_{id}.yml` | Contacts additionnels (apporteurs, propriétaires) |
| `Impaye` | `impayes/` | `impaye_{id}.yml` | Impayés (factures non soldées) |
| `Relance` | `relances/` | `relance_{id}.yml` | Emails de relance générés/envoyés |
| `Sequence` | `sequences/` | `sequence_{id}.yml` | Séquences de relances (J+15, J+30...) |
| `SmtpProfile` | `smtp_profiles/` | `smtp_profile_{id}.yml` | Configurations SMTP pour envoi |
| `Activite` | `logs/` | `activite_{timestamp}_{id}.yml` | Logs d'activité (append-only) |
| `Config` | `config/` | `config_{cle}.yml` | Configuration dynamique |
| `Suivi` | `suivis/` | `suivi_{id}.yml` | Suivi des relances envoyées |

---

## 2. Structure des Entités YAML

### 2.1 Payer (ex-Contact de type payeur)

```yaml
id: "pay_001"
type: payer
code: "C12345"
nom: "DUPONT"
prenom: "Jean"
civilite: "M."
email: "jean.dupont@example.com"
telephone: "0612345678"
societe: "SARL DUPONT IMMO"
activite_societe: "Agence immobilière"
statut: "actif"  # actif, inactif, blacklisted
date_creation: "2026-01-15"
adresse:
  rue: "123 Rue de Paris"
  code_postal: "75001"
  ville: "Paris"
  pays: "France"
# Relations dénormalisées
impaye_ids:
  - "imp_001"
  - "imp_002"
relance_ids:
  - "rel_001"
# Métadonnées
is_blacklisted: false
blacklist_motif: null
blacklist_date: null
# LokiJS
loki_id: 1
```

### 2.2 Contact (apporteurs, propriétaires, donneurs d'ordre)

```yaml
id: "cont_001"
type: contact  # apporteur | proprietaire | donneur_ordre | mandataire
code: "A123"
nom: "MARTIN"
prenom: "Marie"
civilite: "Mme"
email: "marie.martin@example.com"
telephone: "0687654321"
societe: "AGENCE MARTIN"
type_personne: "Apporteur d'affaire"  # pour scénarios broker
# Relations
impaye_apporteur_ids:
  - "imp_003"
```

### 2.3 Impaye (central - remplace facture + impaye)

```yaml
id: "imp_001"
type: impaye
# Identifiants facture
nfacture: "FAC-2026-001"
reference: "REF-001"
ref_piece: "RP-001"
numero_dossier: "DOS-123"
id_dossier: "ID-456"
# Dates
date_piece: "2026-05-15"
date_echeance: "2026-06-15"
date_import: "2026-06-30"
# Montants
total_ht: 1000.00
total_ttc: 1200.00
montant_total: 1200.00
reste_a_payer: 1200.00
# Statut
facture_soldee: false
statut: "non_payee"  # non_payee | payee | annulee
# Relations (clés étrangères en IDs string)
payer_id: "pay_001"
contact_relance_id: "pay_001"  # peut être différent du payer
apporteur_id: "cont_001"
proprietaire_id: "cont_002"
donneur_ordre_id: "cont_003"
# Dénormalisation (pour affichage rapide)
payeur_nom: "DUPONT"
payeur_prenom: "Jean"
payeur_email: "jean.dupont@example.com"
apporteur_nom: "MARTIN"
apporteur_societe: "AGENCE MARTIN"
# Bien immobilier
adresse_bien: "45 Avenue des Champs"
ville: "Paris"
code_postal: "75008"
# Document
url_pdf: "https://..."
# Séquence de relance
sequence_id: "seq_001"
email_index: 1
# Blacklist
is_blacklisted: false
blacklist_motif: null
blacklist_date: null
blacklist_par: null
# Commentaire
commentaire_piece: "Diagnostic immobilier"
```

### 2.4 Sequence

```yaml
id: "seq_001"
type: sequence
nom: "Séquence Standard"
type_sequence: "relances"  # relances | rappels
validation_obligatoire: true
delai: 15  # délai par défaut entre emails
actif: true
emails:
  - email_index: 1
    delai: 15
    objet: "Rappel échéance"
    corps: "Bonjour..."
    cc: "comptabilite@example.com"
    scenarios:
      - format: "single"
        active: true
        smtp_profile_id: "smtp_001"
        objet: "Rappel échéance"
        corps: "Bonjour {{nom}}..."
      - format: "multiple"
        active: true
        smtp_profile_id: "smtp_001"
      - format: "broker"
        active: false
      - format: "both"
        active: true
        smtp_profile_id: "smtp_001"
  - email_index: 2
    delai: 30
    objet: "2ème relance"
    scenarios: [...]
```

### 2.5 Relance

```yaml
id: "rel_001"
type: relance
# Relations
contact_id: "pay_001"
sequence_id: "seq_001"
email_index: 1
impaye_ids:
  - "imp_001"
  - "imp_002"
# Scénario détecté
scenario: "multiple"  # single | multiple | broker | both
# Contenu généré
objet: "Rappel : 2 factures en attente"
corps: "Bonjour M. DUPONT..."
# Statut
statut: "pret pour envoi"  # brouillon | pret pour envoi | envoyee | erreur
manuelle: false
valide: true
# Dates
date_creation: "2026-06-30T10:00:00Z"
date_envoi: null
envoye_le: null
planifiee_le: "2026-07-15T09:00:00Z"
# Configuration SMTP
smtp_profile_id: "smtp_001"
cc: "comptabilite@example.com"
# Erreurs
erreur_count: 0
derniere_erreur: null
# Tracking
message_id: null
ouvert: false
date_ouverture: null
clicks: 0
```

### 2.6 SmtpProfile

```yaml
id: "smtp_001"
type: smtp_profile
nom: "SMTP Principal"
host: "smtp.example.com"
port: 587
secure: true
username: "notifications@example.com"
password: "[encrypted]"
from_email: "notifications@example.com"
from_name: "ADTI Marki"
actif: true
```

### 2.7 Activité (Log)

```yaml
id: "act_001"
type: activite
timestamp: "2026-06-30T10:00:00Z"
niveau: "INFO"  # DEBUG | INFO | WARN | ERROR
source: "generate-relances"
contact_id: "pay_001"
impaye_id: "imp_001"
message: "Relance créée avec succès"
metadata:
  email_index: 1
  scenario: "multiple"
  relance_id: "rel_001"
```

---

## 3. Architecture Backend Proposée

```
backend/
├── server.js                 # Point d'entrée Express
├── config.js               # Configuration (PORT, chemins)
├── lib/
│   ├── db.js                 # Initialisation LokiJS + YAML adapter
│   ├── yaml-adapter.js       # Classe YamlPerDocAdapter
│   ├── lock-manager.js       # Wrapper proper-lockfile
│   ├── validators.js         # Validation des entités
│   └── views.js              # Vues matérialisées LokiJS
├── routes/
│   ├── index.js              # Router principal
│   ├── payers.js             # CRUD payers
│   ├── contacts.js           # CRUD contacts
│   ├── impayes.js            # CRUD impayés + blacklist
│   ├── relances.js           # CRUD relances + envoi
│   ├── sequences.js          # CRUD séquences
│   ├── smtp.js               # Test/configuration SMTP
│   ├── dashboard.js          # KPIs et stats
│   └── export.js             # Export CSV/JSON
├── workflows/                # Workflows CRON/background
│   ├── generate-relances/    # Génération quotidienne
│   ├── cleanup-old-relances/ # Nettoyage
│   └── verify-paid/          # Vérification paiements
└── data/                     # Fichiers YAML (gitignored)
    ├── payers/
    ├── contacts/
    ├── impayes/
    ├── relances/
    ├── sequences/
    ├── smtp_profiles/
    ├── logs/
    └── config/
```

---

## 4. Collections LokiJS et Indexes

```javascript
// Collections principales
const payers = db.addCollection('payers', {
  indices: ['id', 'code', 'email', 'nom', 'is_blacklisted'],
  unique: ['id']
});

const contacts = db.addCollection('contacts', {
  indices: ['id', 'email', 'type', 'type_personne'],
  unique: ['id']
});

const impayes = db.addCollection('impayes', {
  indices: ['id', 'payer_id', 'contact_relance_id', 
            'nfacture', 'date_echeance', 'statut', 
            'is_blacklisted', 'facture_soldee'],
  unique: ['id']
});

const relances = db.addCollection('relances', {
  indices: ['id', 'contact_id', 'sequence_id', 
            'statut', 'date_envoi', 'manuelle'],
  unique: ['id']
});

const sequences = db.addCollection('sequences', {
  indices: ['id', 'type_sequence', 'actif'],
  unique: ['id']
});

// Vues matérialisées (materialized views)
const impayesNonPayes = db.addCollection('impayes_non_payes');
impayesNonPayes.createIndex('date_echeance');

const impayesParPayer = db.addCollection('impayes_par_payer');
impayesParPayer.createIndex('payer_id');

const relancesAEnvoyer = db.addCollection('relances_a_envoyer');
relancesAEnvoyer.createIndex('planifiee_le');
```

---

## 5. Stratégie de Migration des Données

### 5.1 Script de Migration (One-shot)

```javascript
// scripts/migrate-from-parse.js
const Parse = require('parse/node');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Config Parse depuis .env
Parse.initialize(process.env.PARSE_APP_ID, null, process.env.PARSE_MASTER_KEY);
Parse.serverURL = process.env.PARSE_SERVER_URL;

async function migrate() {
  // 1. Migrer les Contacts (payers)
  const contacts = await new Parse.Query('Contact').findAll({ useMasterKey: true });
  for (const c of contacts) {
    const payerData = {
      id: `pay_${c.id}`,
      type: 'payer',
      code: c.get('code'),
      nom: c.get('nom'),
      prenom: c.get('prenom'),
      email: c.get('email'),
      // ... mapping complet
    };
    saveYaml('payers', payerData);
  }
  
  // 2. Migrer les Impayes
  // 3. Migrer les Séquences
  // 4. Migrer les SMTP Profiles
  // 5. Migrer les Relances (historique)
}
```

### 5.2 Ordre de Migration

1. **Payers/Contacts** (entités de base)
2. **SmtpProfiles** (configuration)
3. **Sequences** (règles métier)
4. **Impayes** (avec relations vers payers/contacts/sequences)
5. **Relances** (avec relations vers impayes/contacts/sequences)
6. **Logs** (optionnel - historique)

---

## 6. Workflows Backend à Implémenter

| Workflow | Priority | Description |
|----------|----------|-------------|
| `import-impayes` | P0 | Parser CSV/Excel et créer YAML impayes |
| `generate-relances` | P0 | CRON quotidien - génère relances depuis impayes |
| `regenerate-relances-contact` | P1 | Régénère après blacklist/unblacklist |
| `cleanup-old-relances` | P1 | Supprime relances anciennes (> 1 an) |
| `verify-paid-invoices` | P1 | Vérifie si factures soldées via API externe |
| `send-email` | P0 | Envoi SMTP avec retry |
| `calculate-kpis` | P1 | Calcule taux impayés, DSO pour dashboard |
| `export-data` | P2 | Export CSV/Excel des impayes/relances |

---

## 7. API Endpoints REST

### Payers
```
GET    /api/payers                    # Liste avec filtres
GET    /api/payers/:id                # Détail + impayés liés
POST   /api/payers                    # Créer
PUT    /api/payers/:id                # Modifier
DELETE /api/payers/:id                # Supprimer (si pas d'impayés)
GET    /api/payers/:id/impayes        # Impayés du payer
GET    /api/payers/:id/relances       # Relances du payer
```

### Impayes
```
GET    /api/impayes                   # Liste avec pagination
GET    /api/impayes/:id               # Détail
PUT    /api/impayes/:id/blacklist     # Toggle blacklist
GET    /api/impayes/blacklistes       # Liste blacklistés
POST   /api/impayes/import            # Import CSV/Excel
```

### Relances
```
GET    /api/relances                  # Liste
POST   /api/relances                 # Créer manuelle
POST   /api/relances/:id/send        # Envoyer
POST   /api/relances/generate        # Lancer génération
PUT    /api/relances/:id/regenerate  # Régénérer contenu
```

### Dashboard
```
GET    /api/dashboard/kpis           # Taux, DSO, montants
GET    /api/dashboard/top-debiteurs  # Top 10
GET    /api/dashboard/evolution      # Évolution 12 mois
GET    /api/dashboard/stats-relances # Stats envoi
```

---

## 8. Gestion des Contraintes Parse → YAML

### 8.1 Relations (Pointeurs Parse)

| Parse | YAML |
|-------|------|
| `Pointer<Contact>` | `contact_id: "pay_001"` |
| `Array<Pointer>` | `impaye_ids: ["imp_001", "imp_002"]` |
| `Relation` | Dénormalisation + view LokiJS |

### 8.2 ACL/Permissions

Parse : ACL par objet  
YAML : Gestion des permissions au niveau API (routes protégées par middleware)

### 8.3 Cloud Functions

Parse : Cloud Functions  
YAML : Workflows dans `backend/workflows/` + endpoints REST dédiés

---

## 9. Configuration Requise

### package.json
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "lokijs": "^1.5.11",
    "js-yaml": "^4.1.0",
    "proper-lockfile": "^4.1.2",
    "cors": "^2.8.5",
    "multer": "^1.4.5-lts.1",
    "nodemailer": "^6.9.0",
    "csv-parse": "^5.4.0",
    "xlsx": "^0.18.5"
  }
}
```

### Variables d'environnement (.env)
```
PORT=3000
DATA_DIR=./data
NODE_ENV=development

# SMTP (pour envoi relances)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=notifications@example.com
SMTP_PASS=password

# Ollama (pour génération emails)
OLLAMA_API_URL=https://ollama.com/api
OLLAMA_API_KEY=xxx
OLLAMA_MODEL=mistral

# Frontend (pour liens dans emails)
FRONTEND_URL=https://relance.markidiags.com
```

---

## 10. Phases de Migration

### Phase 1 : Setup (Jour 1)
- [ ] Créer structure dossiers `backend/`
- [ ] Installer dépendances
- [ ] Implémenter `yaml-adapter.js` et `db.js`
- [ ] Créer modèles de validation

### Phase 2 : Core Data (Jour 2-3)
- [ ] Implémenter CRUD payers
- [ ] Implémenter CRUD impayes
- [ ] Implémenter import CSV/Excel
- [ ] Migrer données existantes (script one-shot)

### Phase 3 : Relances (Jour 4-5)
- [ ] Implémenter CRUD sequences
- [ ] Implémenter workflow `generate-relances`
- [ ] Implémenter envoi SMTP
- [ ] Tester génération emails

### Phase 4 : Dashboard & Export (Jour 6)
- [ ] Calcul KPIs
- [ ] Views matérialisées
- [ ] Export CSV/Excel

### Phase 5 : Polish (Jour 7)
- [ ] Tests concurrents (locks)
- [ ] Backup/restore
- [ ] Documentation

---

## 11. Risques et Mitigations

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Corruption fichier YAML | Haut | Locks + backup quotidien |
| Conflits écriture | Moyen | proper-lockfile par fichier |
| Volume données élevé | Moyen | Pagination + vues matérialisées |
| Migration incomplète | Haut | Validation + rapport post-migration |
| Performance LokiJS | Moyen | Indexes + limiter à < 100k entités |

---

**Date proposition** : 2026-07-08  
**Auteur** : Pi Coding Agent  
**Statut** : À valider
