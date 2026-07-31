# Workflow Backend : Get Suspendus Filters

## Objectif
Récupérer les valeurs disponibles pour les filtres de la liste des impayés suspendus.

## Input
- Aucun (point de données statique/dynamique)

## Process

### Étape 1 : Query Distinct Values
Récupérer les valeurs uniques pour chaque champ filtrable.

### Étape 2 : Calcul Ranges
Calculer les ranges pour les montants et dates.

### Étape 3 : Retourner Métadonnées
Retourner les options de filtrage disponibles.

---

## Data Models SQLite

### Table `impayes`
| Colonne | Type | Description |
|---------|------|-------------|
| `id` | TEXT | Identifiant |
| `montant` | REAL | Montant |
| `blacklist_date` | TEXT | Date suspension |
| `blacklist_motif` | TEXT | Motif |
| `contact_relance_id` | TEXT | ID contact |

---

## Code Workflow (SQLite)

```javascript
const SQLiteDB = require('../lib/sqlite-db');
const db = new SQLiteDB();

async function getSuspendusFilters() {
  // Motifs uniques
  const motifsResult = db.query(
    `SELECT DISTINCT blacklist_motif FROM impayes 
     WHERE is_blacklisted = 1 AND blacklist_motif IS NOT NULL`
  );
  const motifs = motifsResult.map(r => r.blacklist_motif).filter(Boolean);
  
  // Range montants
  const montantRange = db.query(
    `SELECT MIN(montant) as min, MAX(montant) as MAX, AVG(montant) as avg 
     FROM impayes WHERE is_blacklisted = 1`
  )[0];
  
  // Range dates
  const dateRange = db.query(
    `SELECT MIN(blacklist_date) as min_date, MAX(blacklist_date) as max_date 
     FROM impayes WHERE is_blacklisted = 1`
  )[0];
  
  // Comptes par motif
  const countByMotif = db.query(
    `SELECT blacklist_motif, COUNT(*) as count 
     FROM impayes 
     WHERE is_blacklisted = 1 
     GROUP BY blacklist_motif`
  );
  
  // Comptes par mois
  const countByMonth = db.query(
    `SELECT strftime('%Y-%m', blacklist_date) as month, COUNT(*) as count 
     FROM impayes 
     WHERE is_blacklisted = 1 
     GROUP BY month 
     ORDER BY month DESC`
  );
  
  // Total suspendus
  const totalResult = db.query(
    `SELECT COUNT(*) as total FROM impayes WHERE is_blacklisted = 1`
  );
  
  return {
    motifs: motifs.sort(),
    montant_range: {
      min: montantRange.min || 0,
      max: montantRange.max || 0,
      avg: Math.round(montantRange.avg || 0)
    },
    date_range: {
      min: dateRange.min_date,
      max: dateRange.max_date
    },
    counts: {
      total: totalResult[0].total,
      by_motif: countByMotif,
      by_month: countByMonth
    }
  };
}
```

---

## Route API

```bash
GET /api/impayes/suspendus/filters

# cURL
curl -X GET \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/impayes/suspendus/filters"
```

---

## Output

```json
{
  "motifs": [
    "Client en litige",
    "Client en vacances",
    "Demande client",
    "Litige en cours"
  ],
  "montant_range": {
    "min": 150.00,
    "max": 15000.00,
    "avg": 2450
  },
  "date_range": {
    "min": "2026-01-15T10:30:00Z",
    "max": "2026-07-14T15:30:00Z"
  },
  "counts": {
    "total": 42,
    "by_motif": [
      { "blacklist_motif": "Client en litige", "count": 15 },
      { "blacklist_motif": "Demande client", "count": 12 }
    ],
    "by_month": [
      { "month": "2026-07", "count": 8 },
      { "month": "2026-06", "count": 12 }
    ]
  }
}
```

---

## Dépendances
- F-008 (Blacklist)
