# Workflow Backend : Réactiver Impayé

## Objectifs
- Réactiver un impayé suspendu
- Régénérer les relances si nécessaire
- Logger l'action

## Base de données
- **SQLite** : `backend/data/marki.db`
- **Tables** : `impayes`, `relances`, `contacts`

## Process

### Étape 1 : Vérification
Récupérer l'impayé et vérifier s'il est suspendu.

### Étape 2 : Réactivation
Remettre `is_blacklisted = 0`.

### Étape 3 : Génération Relances
Lancer la génération de relances pour ce contact.

---

## Data Models SQLite

### Table `impayes`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | TEXT | Identifiant (imp_xxx) |
| `is_blacklisted` | INTEGER | 0 ou 1 |
| `blacklist_date` | TEXT | Date de suspension |
| `blacklist_motif` | TEXT | Motif |
| `sequence_id` | TEXT | ID séquence |
| `facture_soldee` | INTEGER | 0 ou 1 |

---

## Code Workflow (SQLite)

```javascript
const SQLiteDB = require('../lib/sqlite-db');
const generateRelances = require('../generate-relances');
const db = new SQLiteDB();

async function reactiverImpaye(impayeId) {
  const impaye = db.read('impayes', impayeId);
  
  if (!impaye) {
    throw new Error('Impayé non trouvé');
  }
  
  if (impaye.is_blacklisted !== 1) {
    throw new Error('Impayé déjà actif');
  }
  
  // Réactiver
  db.update('impayes', impayeId, {
    is_blacklisted: 0,
    blacklist_date: null,
    blacklist_motif: null
  });
  
  // Générer relances si séquence attribuée
  let relancesCrees = 0;
  if (impaye.sequence_id && impaye.facture_soldee === 0) {
    const result = await generateRelances(db, { 
      contactId: impaye.contact_relance_id 
    });
    relancesCrees = result.relances_crees || 0;
  }
  
  return {
    impaye_id: impayeId,
    statut: 'reactivé',
    relances_crees: relancesCrees
  };
}
```

---

## Route API

```bash
POST /api/impayes/:id/unsuspend

# cURL
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/impayes/imp_xxx/unsuspend"
```

---

## Output

```json
{
  "message": "Impayé réactivé",
  "relances_crees": 1
}
```
