# Workflow Backend : Génération des Suivis Agence

## Objectifs
- Générer les emails de suivi pour les agences
- Distinct de la relance client (type_sequence = 'suivi')

## Base de données
- **SQLite** : `backend/data/marki.db`

## Différences avec Relances
- Séquences de type `suivi` (pas `relances`)
- Cible: contacts de type agence/apporteur
- Fréquence différente (hebdomadaire vs relances)

## Process

```javascript
const SQLiteDB = require('../lib/sqlite-db');
const db = new SQLiteDB();

async function generateSuivi() {
  // Séquences de type 'suivi' actives
  const sequences = db.query(`
    SELECT * FROM sequences 
    WHERE type_sequence = 'suivi' AND actif = 1
  `, []);
  
  // Impayés avec ces séquences
  for (const sequence of sequences) {
    const impayes = db.query(`
      SELECT i.*, c.email, c.nom
      FROM impayes i
      JOIN contacts c ON i.apporteur_id = c.id
      WHERE i.sequence_id = ?
        AND i.facture_soldee = 0
        AND c.is_blacklisted = 0
    `, [sequence.id]);
    
    // Regrouper et créer suivis...
  }
}
```

## Route API

```bash
POST /api/suivis/generate
```
