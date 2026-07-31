# Workflow Backend : Régénérer Relances avec Statut

## Objectifs
- Régénérer les relances ayant un statut spécifique
- Ex: toutes les relances en 'erreur_envoi'

## Base de données
- **SQLite** : `backend/data/marki.db`

## Process

```javascript
const SQLiteDB = require('../lib/sqlite-db');
const generateRelances = require('../generate-relances');
const db = new SQLiteDB();

async function regenerateRelancesWithStatus(statutCible) {
  const relances = db.query(
    'SELECT DISTINCT contact_id FROM relances WHERE statut = ?',
    [statutCible]
  );
  
  let totalCrees = 0;
  
  for (const { contact_id } of relances) {
    // Supprimer anciennes
    db.run(
      'DELETE FROM relances WHERE contact_id = ? AND statut = ?',
      [contact_id, statutCible]
    );
    
    // Régénérer
    const result = await generateRelances(db, { contactId: contact_id });
    totalCrees += result.relances_crees || 0;
  }
  
  return { contacts_traites: relances.length, relances_crees: totalCrees };
}
```

## Route API

```bash
POST /api/relances/regenerate-with-status
```
