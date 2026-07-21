# Workflow Backend : Envoi des Suivis

## Objectifs
- Envoyer les emails de suivi programmés
- Similaire à send-emails mais pour type_sequence = 'suivi'

## Base de données
- **SQLite** : `backend/data/marki.db`

## Process

```javascript
const SQLiteDB = require('../lib/sqlite-db');
const db = new SQLiteDB();

async function sendSuivi() {
  const suivis = db.query(`
    SELECT r.*, c.email
    FROM relances r
    JOIN contacts c ON r.contact_id = c.id
    JOIN sequences s ON r.sequence_id = s.id
    WHERE s.type_sequence = 'suivi'
      AND r.statut IN ('pret pour envoi', 'planifiee')
      AND (r.date_programmation IS NULL OR r.date_programmation <= datetime('now'))
  `, []);
  
  // Envoyer via SMTP...
}
```

## Route API

```bash
POST /api/suivis/send
```
