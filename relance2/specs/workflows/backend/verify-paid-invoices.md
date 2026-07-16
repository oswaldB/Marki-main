# Workflow Backend : Vérifier Factures Payées

## Objectifs
- Vérifier manuellement les factures payées depuis la source
- Mettre à jour les statuts des impayés

## Base de données
- **SQLite** : `backend/data/marki.db`
- **Source** : SQLite externe

## Process

```javascript
const SQLiteDB = require('../lib/sqlite-db');
const Database = require('better-sqlite3');
const db = new SQLiteDB();

async function verifyPaidInvoices() {
  // Connexion base externe
  const syncDb = new Database(process.env.SYNC_DB_PATH);
  
  // Récupérer impayés non soldés dans Marki
  const impayes = db.query(
    'SELECT * FROM impayes WHERE facture_soldee = 0',
    []
  );
  
  let misAJour = 0;
  
  for (const impaye of impayes) {
    // Vérifier dans source
    const piece = syncDb.prepare(
      'SELECT facturesoldee FROM _GCO__GcoPiece WHERE nfacture = ?'
    ).get(impaye.nfacture);
    
    if (piece && piece.facturesoldee) {
      db.update('impayes', impaye.id, {
        facture_soldee: 1,
        statut: 'paye'
      });
      misAJour++;
    }
  }
  
  return { verifiees: impayes.length, mises_a_jour: misAJour };
}
```

## Route API

```bash
POST /api/verify/paid-invoices
```
