# Workflow Backend : Suspendre Impayé

## Objectifs
- Suspendre un impayé (masquer temporairement)
- Annuler les relances associées
- Logger l'action

## Base de données
- **SQLite** : `backend/data/marki.db`
- **Tables** : `impayes`, `relances`

## Process

### Étape 1 : Vérification
Récupérer l'impayé et vérifier s'il existe.

### Étape 2 : Suspension
Marquer `is_blacklisted = 1` sur l'impayé avec motif.

### Étape 3 : Annuler Relances
Annuler les relances en cours liées à ce contact.

---

## Data Models SQLite

### Table `impayes`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | TEXT | Identifiant (imp_xxx) |
| `is_blacklisted` | INTEGER | 0 ou 1 (suspension) |
| `blacklist_date` | TEXT | Date de suspension |
| `blacklist_motif` | TEXT | Motif de suspension |
| `contact_relance_id` | TEXT | ID contact à relancer |

---

## Code Workflow (SQLite)

```javascript
const SQLiteDB = require('../lib/sqlite-db');
const db = new SQLiteDB();

async function suspendreImpaye(impayeId, motif) {
  const impaye = db.read('impayes', impayeId);
  
  if (!impaye) {
    throw new Error('Impayé non trouvé');
  }
  
  // Suspendre l'impayé
  db.update('impayes', impayeId, {
    is_blacklisted: 1,
    blacklist_date: new Date().toISOString(),
    blacklist_motif: motif || 'Suspension manuelle'
  });
  
  // Annuler les relances en cours
  const result = db.run(`
    UPDATE relances 
    SET statut = 'annulee', updated_at = CURRENT_TIMESTAMP
    WHERE contact_id = ? 
      AND statut IN ('brouillon', 'pret pour envoi', 'planifiee')
  `, [impaye.contact_relance_id]);
  
  return {
    impaye_id: impayeId,
    relances_annulees: result.changes,
    motif
  };
}
```

---

## Route API

```bash
POST /api/impayes/:id/suspend

# cURL
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"motif": "Client en vacances"}' \
  "http://localhost:5000/api/impayes/imp_xxx/suspend"
```

---

## Output

```json
{
  "message": "Impayé suspendu et relances annulées",
  "relances_annulees": 2
}
```
