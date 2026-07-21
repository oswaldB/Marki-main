# Workflow Backend : Get Contact Impayés

## Objectifs
- Récupérer les impayés d'un contact
- Option: filtrer par statut

## Base de données
- **SQLite** : `backend/data/marki.db`

## Process

```javascript
const SQLiteDB = require('../lib/sqlite-db');
const db = new SQLiteDB();

async function getContactImpayes(contactId, options = {}) {
  const { factureSoldee = null } = options;
  
  let sql = 'SELECT * FROM impayes WHERE contact_relance_id = ?';
  const params = [contactId];
  
  if (factureSoldee !== null) {
    sql += ' AND facture_soldee = ?';
    params.push(factureSoldee ? 1 : 0);
  }
  
  sql += ' ORDER BY date_echeance ASC';
  
  return db.query(sql, params);
}
```

## Route API

```bash
GET /api/contacts/:id/impayes

# cURL
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/contacts/cont_xxx/impayes?solde=false"
```

## Output

```json
{
  "impayes": [
    { "id": "imp_xxx", "nfacture": "12345", ... }
  ]
}
```
