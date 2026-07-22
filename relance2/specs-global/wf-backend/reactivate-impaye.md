# Workflow Backend : Reactivate Impaye

## Objectif
Réactiver un impayé suspendu (retirer de la blacklist) et régénérer les relances si nécessaire.

## Input
- `impaye_id` : ID de l'impayé à réactiver
- `regenerate_relances` : Boolean pour régénérer les relances (default: true)
- `reason` : Raison de la réactivation (optionnel)

## Process

### Étape 1 : Vérification
Récupérer l'impayé et vérifier qu'il existe et est bien blacklisté.

### Étape 2 : Réactivation
Retirer le statut blacklist de l'impayé.

### Étape 3 : Vérification Contact
Vérifier si le contact est également blacklisté.

### Étape 4 : Régénération Relances (optionnel)
Si demandé et contact non blacklisté, régénérer les relances.

### Étape 5 : Log
Enregistrer l'action dans les logs.

---

## Data Models SQLite

### Table `impayes`
| Colonne | Type | Description |
|---------|------|-------------|
| `id` | TEXT | Identifiant |
| `is_blacklisted` | INTEGER | 0 ou 1 |
| `blacklist_date` | TEXT | Date blacklist |
| `blacklist_motif` | TEXT | Motif |
| `contact_relance_id` | TEXT | ID contact |

### Table `contacts`
| Colonne | Type | Description |
|---------|------|-------------|
| `id` | TEXT | Identifiant |
| `is_blacklisted` | INTEGER | 0 ou 1 |

---

## Code Workflow (SQLite)

```javascript
const SQLiteDB = require('../lib/sqlite-db');
const { v4: uuidv4 } = require('uuid');
const db = new SQLiteDB();

async function reactivateImpaye(impayeId, { regenerate_relances = true, reason = null }) {
  const impaye = db.read('impayes', impayeId);
  
  if (!impaye) {
    throw new Error('Impayé non trouvé');
  }
  
  if (!impaye.is_blacklisted) {
    throw new Error('L\'impayé n\'est pas suspendu');
  }
  
  // Réactiver l'impayé
  db.update('impayes', impayeId, {
    is_blacklisted: 0,
    blacklist_date: null,
    blacklist_motif: null,
    reactivated_at: new Date().toISOString(),
    reactivation_reason: reason
  });
  
  // Vérifier le contact
  let contactBlacklisted = false;
  let relancesGenerated = 0;
  
  if (impaye.contact_relance_id) {
    const contact = db.read('contacts', impaye.contact_relance_id);
    contactBlacklisted = contact?.is_blacklisted === 1;
    
    // Régénérer les relances si demandé et contact non blacklisté
    if (regenerate_relances && !contactBlacklisted) {
      relancesGenerated = await generateRelancesForImpaye(impayeId, impaye.contact_relance_id);
    }
  }
  
  return {
    impaye_id: impayeId,
    reactivated: true,
    contact_blacklisted: contactBlacklisted,
    relances_regenerated: relancesGenerated,
    message: contactBlacklisted 
      ? 'Impayé réactivé mais contact encore blacklisté'
      : 'Impayé réactivé avec succès'
  };
}

async function generateRelancesForImpaye(impayeId, contactId) {
  // Récupérer la séquence active
  const sequence = db.query(
    `SELECT * FROM sequences WHERE is_active = 1 ORDER BY niveau ASC LIMIT 1`
  )[0];
  
  if (!sequence) {
    return 0;
  }
  
  // Créer une relance
  const relanceId = `rel_${uuidv4().slice(0, 8)}`;
  const now = new Date().toISOString();
  
  db.create('relances', {
    id: relanceId,
    contact_id: contactId,
    statut: 'brouillon',
    canal: sequence.canal || 'email',
    sequence_id: sequence.id,
    date_creation: now,
    created_by: 'auto_reactivation'
  });
  
  // Lier l'impayé
  db.run(
    'INSERT INTO relances_impayes (relance_id, impaye_id) VALUES (?, ?)',
    [relanceId, impayeId]
  );
  
  return 1;
}
```

---

## Route API

```bash
POST /api/impayes/:id/reactivate

# cURL
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "regenerate_relances": true,
    "reason": "Litige résolu"
  }' \
  "http://localhost:5000/api/impayes/imp_xxx/reactivate"
```

---

## Output

```json
{
  "impaye_id": "imp_xxx",
  "reactivated": true,
  "contact_blacklisted": false,
  "relances_regenerated": 1,
  "message": "Impayé réactivé avec succès"
}
```

---

## Dépendances
- F-008 (Blacklist)
- F-010 (Génération automatique relances)
