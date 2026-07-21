# Workflow Backend : Génération des Relances

## Objectifs
- Générer automatiquement les relances pour les impayés
- Déterminer le scénario adapté (single, multiple, broker, both)
- Créer les relances avec statut "brouillon" ou "pret pour envoi"

## Base de données
- **SQLite** : `backend/data/marki.db`
- **Tables** : `impayes`, `contacts`, `relances`, `sequences`

## Process

La méga-fonction `generateRelances()` exécute les étapes suivantes :

### Étape 1 : Récupération Impayés
Query les impayés avec `reste_a_payer > 0`, `sequence_id` défini, non soldés.

### Étape 2 : Filtrage
- Exclure les contacts blacklistés (`is_blacklisted = 1`)
- Exclure les contacts sans email
- Exclure les impayés suspendus (`is_blacklisted = 1` sur l'impayé)

### Étape 3 : Regroupement
Regrouper par `(contact_id, sequence_id, nfacture)` - une relance par facture.

### Étape 4 : Détermination Scénario
- `single` : 1 impayé
- `multiple` : 2+ impayés, même payeur
- `broker` : 2+ impayés, tous avec `apporteur_id` sans `payer_id`
- `both` : mix d'impayés avec `apporteur_id` et `payer_id`

### Étape 5 : Calcul Date d'Envoi
`planifiee_le = date_echeance + delai` (ou date du jour + delai si échéance dépassée)

### Étape 6 : Génération Contenu
Génération objet et corps via Ollama ou templates prédéfinis.

### Étape 7 : Sauvegarde
Créer la relance en base avec statut adapté.

---

## Data Models SQLite

### Table `impayes`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | TEXT | Identifiant (imp_xxx) |
| `payer_id` | TEXT | ID contact payeur |
| `contact_relance_id` | TEXT | ID contact à relancer |
| `apporteur_id` | TEXT | ID apporteur d'affaire |
| `sequence_id` | TEXT | ID séquence attribuée |
| `nfacture` | TEXT | Numéro de facture |
| `date_echeance` | TEXT | Date d'échéance (ISO) |
| `montant_ttc` | REAL | Montant TTC |
| `reste_a_payer` | REAL | Reste à payer |
| `facture_soldee` | INTEGER | 0 ou 1 |
| `is_blacklisted` | INTEGER | 0 ou 1 (suspension) |
| `statut` | TEXT | `impaye`, `paye` |

### Table `relances`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | TEXT | Identifiant (rel_xxx) |
| `contact_id` | TEXT | ID contact destinataire |
| `sequence_id` | TEXT | ID séquence |
| `statut` | TEXT | `brouillon`, `pret pour envoi`, etc. |
| `sujet` | TEXT | Objet email |
| `corps` | TEXT | Corps HTML |
| `date_programmation` | TEXT | Date d'envoi planifiée |
| `valide` | INTEGER | 0 ou 1 |
| `manuelle` | INTEGER | 0 ou 1 |

### Table `sequences`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | TEXT | Identifiant (seq_xxx) |
| `nom` | TEXT | Nom de la séquence |
| `type_sequence` | TEXT | `relances` ou `suivi` |
| `actif` | INTEGER | 0 ou 1 |

### Table `sequences_emails`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | TEXT | Identifiant (seqmail_xxx) |
| `sequence_id` | TEXT | ID séquence parente |
| `email_index` | INTEGER | Position (0, 1, 2...) |
| `delai` | INTEGER | Délai en jours |

---

## Code Workflow (SQLite)

### Initialisation
```javascript
const SQLiteDB = require('../lib/sqlite-db');
const db = new SQLiteDB();

async function log(level, message, data = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level, message, data,
    workflow: 'generate-relances'
  }));
}
```

### Étape 1 : Récupération Impayés
```javascript
// Impayés actifs avec séquence de type 'relances'
const impayesActifs = db.query(`
  SELECT i.*, s.nom as sequence_nom, s.type_sequence
  FROM impayes i
  JOIN sequences s ON i.sequence_id = s.id
  WHERE i.reste_a_payer > 0
    AND i.facture_soldee = 0
    AND i.statut = 'impaye'
    AND s.type_sequence = 'relances'
`, []);

await log('info', 'Impayés récupérés', { count: impayesActifs.length });
```

### Étape 2 : Filtrage
```javascript
const filtered = [];

for (const impaye of impayesActifs) {
  // Exclure si blacklisté
  if (impaye.is_blacklisted === 1) continue;
  
  // Vérifier contact
  const contact = db.read('contacts', impaye.contact_relance_id || impaye.payer_id);
  if (!contact) continue;
  if (contact.is_blacklisted === 1) continue;
  if (!contact.email) continue;
  
  filtered.push({ ...impaye, contact });
}

await log('info', 'Impayés filtrés', { before: impayesActifs.length, after: filtered.length });
```

### Étape 3 : Regroupement
```javascript
const grouped = new Map();

for (const impaye of filtered) {
  const contactId = impaye.contact_relance_id || impaye.payer_id;
  const key = `${contactId}_${impaye.sequence_id}_${impaye.nfacture}`;
  
  if (!grouped.has(key)) {
    grouped.set(key, {
      contact_id: contactId,
      sequence_id: impaye.sequence_id,
      nfacture: impaye.nfacture,
      impayes: []
    });
  }
  grouped.get(key).impayes.push(impaye);
}
```

### Étape 4 : Détermination Scénario
```javascript
function determinerScenario(group) {
  const count = group.impayes.length;
  
  if (count === 1) return 'single';
  
  const hasBroker = group.impayes.some(i => i.apporteur_id);
  const hasPayeur = group.impayes.some(i => i.payer_id);
  
  if (hasBroker && hasPayeur) return 'both';
  if (hasBroker && !hasPayeur) return 'broker';
  return 'multiple';
}
```

### Étape 5 : Calcul Date Envoi
```javascript
function calculerDateEnvoi(impaye, sequenceId) {
  const emailConfig = db.queryOne(
    'SELECT delai FROM sequences_emails WHERE sequence_id = ? AND email_index = 0',
    [sequenceId]
  );
  
  const delai = emailConfig?.delai || 0;
  const dateEcheance = new Date(impaye.date_echeance);
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  
  const baseDate = dateEcheance >= aujourdhui ? dateEcheance : aujourdhui;
  baseDate.setDate(baseDate.getDate() + delai);
  
  return baseDate.toISOString();
}
```

### Étape 6-7 : Génération et Sauvegarde
```javascript
let createdCount = 0;

for (const group of grouped.values()) {
  const scenario = determinerScenario(group);
  const sequence = db.read('sequences', group.sequence_id);
  
  // Générer contenu (Ollama ou templates)
  const { objet, corps } = await genererContenu(group, scenario, sequence);
  
  // Calculer date envoi
  const dateProgrammation = calculerDateEnvoi(group.impayes[0], group.sequence_id);
  
  // Créer relance
  const relanceId = `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  db.create('relances', {
    id: relanceId,
    contact_id: group.contact_id,
    sequence_id: group.sequence_id,
    statut: sequence.validation_obligatoire ? 'brouillon' : 'pret pour envoi',
    sujet: objet,
    corps: corps,
    date_programmation: dateProgrammation,
    valide: sequence.validation_obligatoire ? 0 : 1,
    manuelle: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  
  createdCount++;
  await log('info', 'Relance créée', { relanceId, scenario });
}
```

---

## Route API

```bash
POST /api/relances/generate

# cURL
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/relances/generate"
```

---

## Output

```json
{
  "status": 200,
  "data": {
    "relances_crees": 89,
    "scenarios": {
      "single": 45,
      "multiple": 30,
      "broker": 8,
      "both": 6
    },
    "duration_ms": 5230
  }
}
```

---

## Error Handling

| Erreur | Gestion |
|--------|---------|
| Ollama indisponible | Créer relance statut `refaire` |
| Contact sans email | Exclure du batch |
| Séquence inactive | Skip + log |
