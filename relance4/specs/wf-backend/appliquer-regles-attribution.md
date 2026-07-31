# Workflow Backend : Attribution Séquences Automatique

## Objectifs
- Attribuer automatiquement une séquence à chaque impayé sans séquence
- Règles métier configurables

## Base de données
- **SQLite** : `backend/data/marki.db`

## Règles d'Attribution

| Condition | Séquence |
|-----------|----------|
| Montant < 500€ | `seq_petit_montant` |
| 500€ - 2000€ | `seq_moyen_montant` |
| Montant > 2000€ | `seq_gros_montant` |
| Type personne = 'M' | `seq_morale` |
| Apporteur présent | `seq_apporteur` |

## Process

```javascript
const SQLiteDB = require('../lib/sqlite-db');
const db = new SQLiteDB();

async function appliquerReglesAttribution() {
  const impayes = db.query(`
    SELECT * FROM impayes 
    WHERE sequence_id IS NULL 
    AND facture_soldee = 0
  `, []);
  
  let attribues = 0;
  
  for (const impaye of impayes) {
    const sequenceId = determinerSequence(impaye);
    if (sequenceId) {
      db.update('impayes', impaye.id, { sequence_id: sequenceId });
      attribues++;
    }
  }
  
  return { impayes_traites: impayes.length, sequences_attribuees: attribues };
}

function determinerSequence(impaye) {
  // Logique métier
  if (impaye.reste_a_payer < 500) return 'seq_petit';
  if (impaye.reste_a_payer > 2000) return 'seq_gros';
  return 'seq_standard';
}
```

## Route API

```bash
POST /api/attribution/apply
```
