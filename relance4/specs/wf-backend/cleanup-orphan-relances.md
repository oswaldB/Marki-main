# Workflow Backend : Cleanup Relances Orphelines

## Objectifs
- Supprimer les relances dont le contact n'existe plus
- Nettoyer les relances sans impayés valides

## Base de données
- **SQLite** : `backend/data/marki.db`

## Process

```javascript
const SQLiteDB = require('../lib/sqlite-db');
const db = new SQLiteDB();

async function cleanupOrphanRelances() {
  // Relances avec contact inexistant
  const orphelines = db.query(`
    SELECT r.id FROM relances r
    LEFT JOIN contacts c ON r.contact_id = c.id
    WHERE c.id IS NULL
  `, []);
  
  let supprimees = 0;
  
  for (const relance of orphelines) {
    db.delete('relances', relance.id);
    supprimees++;
  }
  
  return { relances_supprimees: supprimees };
}
```

## Route API

```bash
POST /api/cleanup/orphan-relances
```

## Output

```json
{
  "relances_supprimees": 3
}
```
