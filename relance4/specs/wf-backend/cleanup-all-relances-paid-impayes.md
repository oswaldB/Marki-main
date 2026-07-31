# Workflow Backend : Cleanup Relances Impayés Soldés

## Objectifs
- Annuler les relances dont tous les impayés sont soldés
- Nettoyer les relances orphelines

## Base de données
- **SQLite** : `backend/data/marki.db`

## Process

```javascript
const SQLiteDB = require('../lib/sqlite-db');
const db = new SQLiteDB();

async function cleanupRelancesPaid() {
  // Relances actives
  const relances = db.query(`
    SELECT r.* FROM relances r
    WHERE r.statut IN ('brouillon', 'pret pour envoi', 'planifiee')
  `, []);
  
  let annulees = 0;
  
  for (const relance of relances) {
    // Vérifier si contact a encore des impayés non soldés
    const impayesActifs = db.query(`
      SELECT COUNT(*) as count FROM impayes
      WHERE contact_relance_id = ? AND facture_soldee = 0
    `, [relance.contact_id]);
    
    if (impayesActifs[0].count === 0) {
      db.update('relances', relance.id, { statut: 'annulee' });
      annulees++;
    }
  }
  
  return { relances_annulees: annulees };
}
```

## Route API

```bash
POST /api/cleanup/relances-paid
```

## Output

```json
{
  "relances_annulees": 8
}
```
