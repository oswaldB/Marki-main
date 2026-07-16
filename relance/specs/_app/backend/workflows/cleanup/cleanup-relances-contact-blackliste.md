# Workflow Backend : Cleanup Relances Contact Blacklisté

## Objectifs
- Annuler les relances des contacts blacklistés
- Ne pas supprimer, juste changer le statut

## Base de données
- **SQLite** : `backend/data/marki.db`

## Process

```javascript
const SQLiteDB = require('../lib/sqlite-db');
const db = new SQLiteDB();

async function cleanupRelancesBlacklist() {
  // Récupérer contacts blacklistés
  const blacklistes = db.search('contacts', {
    where: { is_blacklisted: 1 }
  }).data;
  
  let annulees = 0;
  
  for (const contact of blacklistes) {
    const result = db.run(`
      UPDATE relances 
      SET statut = 'annulee', updated_at = CURRENT_TIMESTAMP
      WHERE contact_id = ? 
        AND statut IN ('brouillon', 'pret pour envoi', 'planifiee')
    `, [contact.id]);
    
    annulees += result.changes;
  }
  
  return { relances_annulees: annulees };
}
```

## Route API

```bash
POST /api/cleanup/relances-blacklist
```

## Output

```json
{
  "relances_annulees": 15
}
```
