# Workflow Backend : List Impayes Suspendus

## Objectif
Récupérer la liste paginée des impayés suspendus/blacklistés avec filtres et tri.

## Input
- `page` : Numéro de page (default: 1)
- `limit` : Nombre d'éléments par page (default: 20)
- `sort_by` : Champ de tri (date, montant, contact)
- `sort_order` : Ordre (asc, desc)
- `filters` : Filtres optionnels (motif, dateFrom, dateTo, montantMin, montantMax, contact_id)

## Process

### Étape 1 : Construction Query
Construire la requête avec les filtres.

### Étape 2 : Count Total
Compter le nombre total de résultats pour la pagination.

### Étape 3 : Récupération Données
Récupérer les impayés avec jointures contact et facture.

### Étape 4 : Tri
Trier selon les paramètres.

### Étape 5 : Pagination
Limiter les résultats selon page/limit.

### Étape 6 : Log
Enregistrer la consultation.

---

## Data Models SQLite

### Table `impayes`
| Colonne | Type | Description |
|---------|------|-------------|
| `id` | TEXT | Identifiant |
| `montant` | REAL | Montant |
| `is_blacklisted` | INTEGER | 0 ou 1 |
| `blacklist_date` | TEXT | Date suspension |
| `blacklist_motif` | TEXT | Motif |
| `contact_relance_id` | TEXT | ID contact |
| `facture_id` | TEXT | ID facture |

---

## Code Workflow (SQLite)

```javascript
const SQLiteDB = require('../lib/sqlite-db');
const db = new SQLiteDB();

async function listImpayesSuspendus({
  page = 1,
  limit = 20,
  sort_by = 'blacklist_date',
  sort_order = 'desc',
  filters = {}
}) {
  // Construire WHERE
  const whereClauses = ['i.is_blacklisted = 1'];
  const params = [];
  
  if (filters.motif) {
    whereClauses.push('i.blacklist_motif LIKE ?');
    params.push(`%${filters.motif}%`);
  }
  if (filters.dateFrom) {
    whereClauses.push('i.blacklist_date >= ?');
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    whereClauses.push('i.blacklist_date <= ?');
    params.push(filters.dateTo);
  }
  if (filters.montantMin) {
    whereClauses.push('i.montant >= ?');
    params.push(filters.montantMin);
  }
  if (filters.montantMax) {
    whereClauses.push('i.montant <= ?');
    params.push(filters.montantMax);
  }
  if (filters.contact_id) {
    whereClauses.push('i.contact_relance_id = ?');
    params.push(filters.contact_id);
  }
  
  const where = whereClauses.join(' AND ');
  
  // Count total
  const countQuery = `SELECT COUNT(*) as total FROM impayes i WHERE ${where}`;
  const total = db.query(countQuery, [...params])[0].total;
  
  // Mapping sort_by
  const sortMap = {
    'date': 'i.blacklist_date',
    'montant': 'i.montant',
    'contact': 'c.nom',
    'motif': 'i.blacklist_motif'
  };
  const orderColumn = sortMap[sort_by] || 'i.blacklist_date';
  const orderDirection = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  
  // Query paginée
  const offset = (page - 1) * limit;
  const query = `
    SELECT i.*, 
           c.nom as contact_nom, 
           c.email as contact_email,
           c.telephone as contact_telephone,
           f.numero as facture_numero,
           f.date_facture
    FROM impayes i
    LEFT JOIN contacts c ON i.contact_relance_id = c.id
    LEFT JOIN factures f ON i.facture_id = f.id
    WHERE ${where}
    ORDER BY ${orderColumn} ${orderDirection}
    LIMIT ? OFFSET ?
  `;
  
  const impayes = db.query(query, [...params, limit, offset]);
  
  // Formater résultats
  const results = impayes.map(i => ({
    id: i.id,
    montant: i.montant,
    blacklist_date: i.blacklist_date,
    blacklist_motif: i.blacklist_motif,
    contact: {
      id: i.contact_relance_id,
      nom: i.contact_nom,
      email: i.contact_email,
      telephone: i.contact_telephone
    },
    facture: {
      id: i.facture_id,
      numero: i.facture_numero,
      date_facture: i.date_facture
    }
  }));
  
  return {
    data: results,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}
```

---

## Route API

```bash
GET /api/impayes/suspendus
GET /api/impayes/suspendus?page=1&limit=20&sort_by=date&sort_order=desc
GET /api/impayes/suspendus?motif=Litige&montantMin=1000

# cURL
curl -X GET \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/impayes/suspendus?page=1&limit=10"
```

---

## Output

```json
{
  "data": [
    {
      "id": "imp_xxx",
      "montant": 1250.50,
      "blacklist_date": "2026-07-14T15:30:00Z",
      "blacklist_motif": "Client en litige",
      "contact": {
        "id": "cont_xxx",
        "nom": "Jean Dupont",
        "email": "jean@example.com",
        "telephone": "+33123456789"
      },
      "facture": {
        "id": "fac_xxx",
        "numero": "FAC-2026-001",
        "date_facture": "2026-05-15"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "pages": 5
  }
}
```

---

## Dépendances
- F-008 (Blacklist)
