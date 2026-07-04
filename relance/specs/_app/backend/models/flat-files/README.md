# Modèles Flat Files (YAML)

**Architecture** : Flat Files Database avec LokiJS

## Principe

Chaque entité est stockée dans un fichier YAML séparé :
- **Fichier** : `{type}_{id}.yml`
- **Format** : YAML 1.2
- **Locking** : proper-lockfile pour accès concurrents
- **Indexation** : LokiJS en mémoire (rebuild au démarrage)

## Structure des dossiers

```
backend/data/
├── payers/
│   └── payer_1.yml
├── factures/
│   └── facture_1.yml
├── impayes/
│   └── impaye_1.yml
├── contacts/
│   └── contact_1.yml
├── relances/
│   └── relance_1.yml
├── sequences/
│   └── sequence_1.yml
└── logs/
    └── log_2026-06-30T10-30-00.yml
```

## Format YAML

### Payer (`payer_{id}.yml`)
```yaml
id: 1
type: "payer"
nom: "Société Alpha"
email: "contact@alpha.com"
adresse: "123 Rue de Paris"
code_postal: "75001"
ville: "Paris"
telephone: "+33123456789"
created_at: "2026-06-30T10:00:00Z"
updated_at: "2026-06-30T10:00:00Z"
```

### Facture (`facture_{id}.yml`)
```yaml
id: 1
type: "facture"
numero: "FAC-2026-001"
montant: 1000.00
date_emission: "2026-06-15"
date_echeance: "2026-07-15"
client: "Société Alpha"
statut: "non_payee"  # payee, non_payee, annulee
payer_id: 1
created_at: "2026-06-30T10:00:00Z"
updated_at: "2026-06-30T10:00:00Z"
```

### Impaye (`impaye_{id}.yml`)
```yaml
id: 1
type: "impaye"
facture_id: 1
payer_id: 1
reste_a_payer: 1000.00
date_echeance: "2026-07-15"
est_en_retard: true
jours_retard: 15
is_blacklisted: false
blacklisted_at: null
blacklist_motif: null
blacklist_motif_type: null  # litige, arrangement, contestation, procedure, annulation, autre
sequence_id: 1
date_assignation_sequence: "2026-06-30"
created_at: "2026-06-30T10:00:00Z"
updated_at: "2026-06-30T10:00:00Z"
```

### Contact (`contact_{id}.yml`)
```yaml
id: 1
type: "contact"
payer_id: 1
nom: "Jean Dupont"
email: "jean.dupont@alpha.com"
telephone: "+33123456789"
est_contact_relance: true
is_blacklisted: false
created_at: "2026-06-30T10:00:00Z"
updated_at: "2026-06-30T10:00:00Z"
```

### Relance (`relance_{id}.yml`)
```yaml
id: 1
type: "relance"
contact_id: 1
impaye_ids: [1, 2, 3]
sequence_id: 1
sujet: "Relance facture impayée"
contenu: "Bonjour, nous vous rappelons..."
cc: ""
valide: false
envoyee: false
date_envoi: null
statut: "brouillon"  # brouillon, valide, envoyee, erreur
created_at: "2026-06-30T10:00:00Z"
updated_at: "2026-06-30T10:00:00Z"
```

### Séquence (`sequence_{id}.yml`)
```yaml
id: 1
type: "sequence"
nom: "Relance J+15"
delai_jours: 15
niveau: 1
est_active: true
template_sujet: "Relance {{contact_nom}} - {{nb_factures}} factures"
template_corps: "Bonjour {{contact_nom}}, vous avez {{nb_factures}} factures impayées pour un montant de {{montant_total}}€..."
created_at: "2026-06-30T10:00:00Z"
updated_at: "2026-06-30T10:00:00Z"
```

## API Interne (YAML Adapter)

### Lecture
```javascript
const payer = await yamlAdapter.findOne('payers', { id: 1 });
const factures = await yamlAdapter.find('factures', { payer_id: 1 });
```

### Écriture (avec lock)
```javascript
await yamlAdapter.insert('impayes', { id: 1, ... });
await yamlAdapter.update('impayes', { id: 1, is_blacklisted: true });
await yamlAdapter.remove('impayes', { id: 1 });
```

## Gestion des locks

```javascript
const lockfile = require('proper-lockfile');

async function saveEntity(type, data) {
  const filePath = `${DATA_DIR}/${type}/${type}_${data.id}.yml`;
  const lockPath = `${filePath}.lock`;
  
  await lockfile.lock(lockPath, { stale: 5000 });
  try {
    fs.writeFileSync(filePath, yaml.dump(data, { sortKeys: true }));
  } finally {
    await lockfile.unlock(lockPath);
  }
}
```

## Views LokiJS (Materialized)

- `impayes_en_retard` : Impayés avec est_en_retard = true
- `impayes_blacklistes` : Impayés avec is_blacklisted = true
- `relances_a_envoyer` : Relances avec statut = "valide" AND envoyee = false
- `factures_par_payer` : Regroupement factures par payer_id
