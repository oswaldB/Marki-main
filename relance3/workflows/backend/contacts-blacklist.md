# Workflow Backend : Contacts Blacklist

## Objectifs
- Basculer le statut blacklist d'un contact
- Mettre à jour les relances associées si nécessaire
- Logger l'action

## Base de données
- **SQLite** : `backend/data/marki.db`
- **Tables** : `contacts`, `relances`, `impayes`

## Process

### Étape 1 : Vérification Contact
Récupérer le contact et vérifier s'il existe.

### Étape 2 : Toggle Blacklist
Basculer `is_blacklisted` entre 0 et 1.

### Étape 3 : Mise à jour Relances (si blacklist)
Si mise en blacklist : annuler les relances en cours.

### Étape 4 : Logger
Enregistrer l'action dans les logs.

---

## Data Models SQLite

### Table `contacts`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | TEXT | Identifiant (cont_xxx) |
| `is_blacklisted` | INTEGER | 0 ou 1 |
| `blacklist_date` | TEXT | Date de mise en blacklist |
| `blacklist_motif` | TEXT | Motif de blacklist |

### Table `relances`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | TEXT | Identifiant (rel_xxx) |
| `contact_id` | TEXT | ID contact |
| `statut` | TEXT | Statut de la relance |

---

## Code Workflow (SQLite)

### Initialisation
```javascript
const SQLiteDB = require('../lib/sqlite-db');
const db = new SQLiteDB();
```

### Toggle Blacklist
```javascript
async function toggleBlacklist(contactId, motif = null) {
  const contact = db.read('contacts', contactId);
  
  if (!contact) {
    throw new Error('Contact non trouvé');
  }
  
  const nouvelEtat = !contact.is_blacklisted;
  
  const updates = {
    is_blacklisted: nouvelEtat ? 1 : 0,
    blacklist_date: nouvelEtat ? new Date().toISOString() : null,
    blacklist_motif: nouvelEtat ? motif : null
  };
  
  db.update('contacts', contactId, updates);
  
  // Si blacklisté, annuler les relances en cours
  if (nouvelEtat) {
    db.run(`
      UPDATE relances 
      SET statut = 'annulee', updated_at = CURRENT_TIMESTAMP
      WHERE contact_id = ? 
        AND statut IN ('brouillon', 'pret pour envoi', 'planifiee')
    `, [contactId]);
  }
  
  return {
    id: contactId,
    is_blacklisted: nouvelEtat,
    action: nouvelEtat ? 'blacklisté' : 'retiré de la blacklist'
  };
}
```

---

## Route API

```bash
POST /api/contacts/:id/blacklist

# cURL
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"motif": "Client ne souhaite plus être relancé"}' \
  "http://localhost:5000/api/contacts/cont_xxx/blacklist"
```

---

## Output

```json
{
  "contact": {
    "id": "cont_xxx",
    "is_blacklisted": 1,
    "blacklist_date": "2026-07-14T15:30:00Z",
    "blacklist_motif": "Client ne souhaite plus être relancé"
  },
  "action": "blacklisté",
  "relances_annulees": 3
}
```
