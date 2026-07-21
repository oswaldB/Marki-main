# Workflow Backend : Create Manual Relance

## Objectif
Créer manuellement une relance pour un ou plusieurs impayés.

## Input
- `impaye_ids` : Tableau d'IDs d'impayés à relancer
- `contact_id` : ID du contact à relancer (optionnel, déduit des impayés)
- `sequence_id` : ID de la séquence à utiliser (optionnel)
- `template` : Template de message personnalisé (optionnel)
- `date_envoi` : Date d'envoi planifiée (optionnel, default: now)
- `canal` : Canal d'envoi (email, sms, courrier)

## Process

### Étape 1 : Validation
Vérifier que les impayés existent et ne sont pas blacklistés.
Vérifier que le contact existe et n'est pas blacklisté.

### Étape 2 : Regroupement
Regrouper les impayés par contact si `contact_id` non fourni.

### Étape 3 : Création Relance
Créer une entrée dans la table `relances` avec statut `brouillon` ou `planifiee`.

### Étape 4 : Association Impayés
Créer les entrées dans `relances_impayes` pour lier les impayés.

### Étape 5 : Log
Enregistrer la création manuelle dans les logs.

---

## Data Models SQLite

### Table `relances`
| Colonne | Type | Description |
|---------|------|-------------|
| `id` | TEXT | Identifiant (rel_xxx) |
| `contact_id` | TEXT | ID contact |
| `statut` | TEXT | brouillon, planifiee, pret pour envoi, envoyee, annulee |
| `canal` | TEXT | email, sms, courrier |
| `sequence_id` | TEXT | ID séquence utilisée |
| `template` | TEXT | Template personnalisé |
| `date_creation` | TEXT | Date de création |
| `date_envoi` | TEXT | Date d'envoi planifiée |

### Table `relances_impayes`
| Colonne | Type | Description |
|---------|------|-------------|
| `relance_id` | TEXT | ID relance |
| `impaye_id` | TEXT | ID impayé |

---

## Code Workflow (SQLite)

```javascript
const SQLiteDB = require('../lib/sqlite-db');
const { v4: uuidv4 } = require('uuid');
const db = new SQLiteDB();

async function createManualRelance({
  impaye_ids,
  contact_id,
  sequence_id,
  template,
  date_envoi,
  canal = 'email'
}) {
  // Validation
  if (!impaye_ids || impaye_ids.length === 0) {
    throw new Error('Au moins un impayé est requis');
  }
  
  // Vérifier les impayés
  const impayes = [];
  for (const id of impaye_ids) {
    const impaye = db.read('impayes', id);
    if (!impaye) {
      throw new Error(`Impayé ${id} non trouvé`);
    }
    if (impaye.is_blacklisted) {
      throw new Error(`Impayé ${id} est blacklisté`);
    }
    impayes.push(impaye);
  }
  
  // Déterminer le contact
  const targetContactId = contact_id || impayes[0].contact_relance_id;
  if (!targetContactId) {
    throw new Error('Impossible de déterminer le contact à relancer');
  }
  
  // Vérifier le contact
  const contact = db.read('contacts', targetContactId);
  if (!contact) {
    throw new Error('Contact non trouvé');
  }
  if (contact.is_blacklisted) {
    throw new Error('Contact est blacklisté');
  }
  
  // Créer la relance
  const relanceId = `rel_${uuidv4().slice(0, 8)}`;
  const now = new Date().toISOString();
  
  db.create('relances', {
    id: relanceId,
    contact_id: targetContactId,
    statut: date_envoi ? 'planifiee' : 'brouillon',
    canal,
    sequence_id: sequence_id || null,
    template: template || null,
    date_creation: now,
    date_envoi: date_envoi || null,
    created_by: 'manual'
  });
  
  // Associer les impayés
  for (const impaye of impayes) {
    db.run(
      'INSERT INTO relances_impayes (relance_id, impaye_id) VALUES (?, ?)',
      [relanceId, impaye.id]
    );
  }
  
  return {
    relance_id: relanceId,
    contact_id: targetContactId,
    impayes_count: impayes.length,
    statut: date_envoi ? 'planifiee' : 'brouillon',
    date_envoi: date_envoi || null
  };
}
```

---

## Route API

```bash
POST /api/relances/manual

# cURL
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "impaye_ids": ["imp_001", "imp_002"],
    "sequence_id": "seq_001",
    "canal": "email",
    "date_envoi": "2026-07-20T09:00:00Z"
  }' \
  "http://localhost:5000/api/relances/manual"
```

---

## Output

```json
{
  "relance_id": "rel_abc123",
  "contact_id": "cont_xxx",
  "impayes_count": 2,
  "statut": "planifiee",
  "date_envoi": "2026-07-20T09:00:00Z",
  "message": "Relance manuelle créée avec succès"
}
```

---

## Dépendances
- F-007 (Relances email)
