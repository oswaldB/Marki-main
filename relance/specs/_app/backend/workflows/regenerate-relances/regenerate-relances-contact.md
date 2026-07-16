# Workflow Backend : Régénérer Relances Contact

## Objectifs
- Supprimer les relances existantes d'un contact
- Régénérer depuis les impayés actuels

## Base de données
- **SQLite** : `backend/data/marki.db`

## Process

```javascript
const SQLiteDB = require('../lib/sqlite-db');
const generateRelances = require('../generate-relances');
const db = new SQLiteDB();

async function regenerateRelancesContact(contactId, reason) {
  // Supprimer relances existantes
  const relances = db.query(
    'SELECT id FROM relances WHERE contact_id = ? AND statut = "brouillon"',
    [contactId]
  );
  
  for (const relance of relances) {
    db.delete('relances', relance.id);
  }
  
  // Régénérer
  const result = await generateRelances(db, { contactId });
  
  return {
    relances_supprimees: relances.length,
    relances_crees: result.relances_crees
  };
}
```

## Route API

```bash
POST /api/relances/regenerate
```
