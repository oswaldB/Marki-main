# Workflow Backend : Cleanup Batch Relances Blacklist

## Objectifs
- Version batch du cleanup des relances blacklistées
- Traiter tous les contacts blacklistés en une fois

## Base de données
- **SQLite** : `backend/data/marki.db`

## Process

```javascript
const SQLiteDB = require('../lib/sqlite-db');
const db = new SQLiteDB();

async function cleanupAllRelancesBlacklistBatch() {
  const result = db.run(`
    UPDATE relances 
    SET statut = 'annulee', updated_at = CURRENT_TIMESTAMP
    WHERE statut IN ('brouillon', 'pret pour envoi', 'planifiee')
    AND contact_id IN (
      SELECT id FROM contacts WHERE is_blacklisted = 1
    )
  `, []);
  
  return { 
    relances_annulees: result.changes 
  };
}
```

## Route API

```bash
POST /api/cleanup/all-relances-blacklist
```

## Output

```json
{
  "relances_annulees": 42
}
```
