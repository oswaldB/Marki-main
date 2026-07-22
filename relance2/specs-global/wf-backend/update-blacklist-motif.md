# Workflow Backend : Update Blacklist Motif

## Objectif
Mettre à jour le motif de blacklist d'un impayé ou d'un contact.

## Input
- `impaye_id` : ID de l'impayé (optionnel si contact_id fourni)
- `contact_id` : ID du contact (optionnel si impaye_id fourni)
- `motif` : Nouveau motif de blacklist

## Process

### Étape 1 : Validation
Vérifier qu'au moins un ID est fourni et que le motif est non vide.
Vérifier que l'entité existe et est bien blacklistée.

### Étape 2 : Mise à Jour
Mettre à jour le motif de blacklist.

### Étape 3 : Propagation (optionnel)
Si mise à jour contact, propager à tous les impayés liés.

### Étape 4 : Log
Enregistrer la modification dans les logs.

---

## Data Models SQLite

### Table `impayes`
| Colonne | Type | Description |
|---------|------|-------------|
| `id` | TEXT | Identifiant |
| `is_blacklisted` | INTEGER | 0 ou 1 |
| `blacklist_motif` | TEXT | Motif |

### Table `contacts`
| Colonne | Type | Description |
|---------|------|-------------|
| `id` | TEXT | Identifiant |
| `is_blacklisted` | INTEGER | 0 ou 1 |
| `blacklist_motif` | TEXT | Motif |

---

## Code Workflow (SQLite)

```javascript
const SQLiteDB = require('../lib/sqlite-db');
const db = new SQLiteDB();

async function updateBlacklistMotif({ impaye_id, contact_id, motif }) {
  // Validation
  if (!impaye_id && !contact_id) {
    throw new Error('Au moins un ID (impaye_id ou contact_id) est requis');
  }
  
  if (!motif || motif.trim() === '') {
    throw new Error('Le motif est requis');
  }
  
  const updates = [];
  
  // Mise à jour impayé
  if (impaye_id) {
    const impaye = db.read('impayes', impaye_id);
    if (!impaye) {
      throw new Error('Impayé non trouvé');
    }
    if (!impaye.is_blacklisted) {
      throw new Error('L\'impayé n\'est pas blacklisté');
    }
    
    db.update('impayes', impaye_id, {
      blacklist_motif: motif.trim(),
      updated_at: new Date().toISOString()
    });
    
    updates.push({
      type: 'impaye',
      id: impaye_id,
      motif: motif.trim()
    });
  }
  
  // Mise à jour contact
  if (contact_id) {
    const contact = db.read('contacts', contact_id);
    if (!contact) {
      throw new Error('Contact non trouvé');
    }
    if (!contact.is_blacklisted) {
      throw new Error('Le contact n\'est pas blacklisté');
    }
    
    db.update('contacts', contact_id, {
      blacklist_motif: motif.trim(),
      updated_at: new Date().toISOString()
    });
    
    updates.push({
      type: 'contact',
      id: contact_id,
      motif: motif.trim()
    });
    
    // Propager aux impayés liés (optionnel)
    const impayesLies = db.query(
      `SELECT id FROM impayes WHERE contact_relance_id = ? AND is_blacklisted = 1`,
      [contact_id]
    );
    
    for (const imp of impayesLies) {
      db.update('impayes', imp.id, {
        blacklist_motif: motif.trim(),
        updated_at: new Date().toISOString()
      });
      updates.push({
        type: 'impaye',
        id: imp.id,
        motif: motif.trim(),
        propagated: true
      });
    }
  }
  
  return {
    updated: updates.length > 0,
    updates: updates,
    message: `${updates.length} entité(s) mise(s) à jour`
  };
}
```

---

## Route API

```bash
PUT /api/blacklist/motif

# cURL - Impayé
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "impaye_id": "imp_xxx",
    "motif": "Nouveau motif de suspension"
  }' \
  "http://localhost:5000/api/blacklist/motif"

# cURL - Contact
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contact_id": "cont_xxx",
    "motif": "Client en litige commercial"
  }' \
  "http://localhost:5000/api/blacklist/motif"
```

---

## Output

```json
{
  "updated": true,
  "updates": [
    {
      "type": "contact",
      "id": "cont_xxx",
      "motif": "Client en litige commercial"
    },
    {
      "type": "impaye",
      "id": "imp_001",
      "motif": "Client en litige commercial",
      "propagated": true
    },
    {
      "type": "impaye",
      "id": "imp_002",
      "motif": "Client en litige commercial",
      "propagated": true
    }
  ],
  "message": "3 entité(s) mise(s) à jour"
}
```

---

## Dépendances
- F-008 (Blacklist)
