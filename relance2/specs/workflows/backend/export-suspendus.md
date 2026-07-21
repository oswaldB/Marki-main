# Workflow Backend : Export Suspendus

## Objectif
Exporter la liste des impayés suspendus/blacklistés au format CSV ou Excel.

## Input
- `format` : Format d'export (csv, xlsx)
- `filters` : Filtres optionnels (dateFrom, dateTo, motif, montantMin, montantMax)
- `fields` : Champs à inclure (optionnel, default: all)

## Process

### Étape 1 : Query Impayés
Récupérer les impayés avec `is_blacklisted = 1`.

### Étape 2 : Application Filtres
Filtrer selon les critères fournis.

### Étape 3 : Enrichissement Données
Joindre les données contact et facture pour chaque impayé.

### Étape 4 : Génération Fichier
Générer le fichier CSV ou Excel avec les données.

### Étape 5 : Log
Enregistrer l'export dans les logs.

---

## Data Models SQLite

### Table `impayes`
| Colonne | Type | Description |
|---------|------|-------------|
| `id` | TEXT | Identifiant |
| `montant` | REAL | Montant impayé |
| `is_blacklisted` | INTEGER | 0 ou 1 |
| `blacklist_date` | TEXT | Date suspension |
| `blacklist_motif` | TEXT | Motif |
| `contact_relance_id` | TEXT | ID contact |
| `facture_id` | TEXT | ID facture |

---

## Code Workflow (SQLite)

```javascript
const SQLiteDB = require('../lib/sqlite-db');
const { Parser } = require('json2csv');
const XLSX = require('xlsx');
const db = new SQLiteDB();

async function exportSuspendus({ format = 'csv', filters = {}, fields = [] }) {
  // Query de base
  let query = `
    SELECT i.*, 
           c.nom as contact_nom, 
           c.email as contact_email,
           f.numero as facture_numero,
           f.date_facture
    FROM impayes i
    LEFT JOIN contacts c ON i.contact_relance_id = c.id
    LEFT JOIN factures f ON i.facture_id = f.id
    WHERE i.is_blacklisted = 1
  `;
  
  const params = [];
  
  // Appliquer filtres
  if (filters.dateFrom) {
    query += ` AND i.blacklist_date >= ?`;
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    query += ` AND i.blacklist_date <= ?`;
    params.push(filters.dateTo);
  }
  if (filters.motif) {
    query += ` AND i.blacklist_motif LIKE ?`;
    params.push(`%${filters.motif}%`);
  }
  if (filters.montantMin) {
    query += ` AND i.montant >= ?`;
    params.push(filters.montantMin);
  }
  if (filters.montantMax) {
    query += ` AND i.montant <= ?`;
    params.push(filters.montantMax);
  }
  
  query += ` ORDER BY i.blacklist_date DESC`;
  
  const impayes = db.query(query, params);
  
  // Préparer données pour export
  const data = impayes.map(i => ({
    ID: i.id,
    'Numéro Facture': i.facture_numero,
    'Date Facture': i.date_facture,
    Contact: i.contact_nom,
    Email: i.contact_email,
    Montant: i.montant,
    'Date Suspension': i.blacklist_date,
    Motif: i.blacklist_motif
  }));
  
  // Générer fichier
  let fileBuffer;
  let contentType;
  let filename;
  
  if (format === 'csv') {
    const parser = new Parser();
    const csv = parser.parse(data);
    fileBuffer = Buffer.from(csv, 'utf-8');
    contentType = 'text/csv';
    filename = `suspendus_${new Date().toISOString().slice(0, 10)}.csv`;
  } else {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Suspendus');
    fileBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    filename = `suspendus_${new Date().toISOString().slice(0, 10)}.xlsx`;
  }
  
  return {
    buffer: fileBuffer,
    contentType,
    filename,
    count: data.length
  };
}
```

---

## Route API

```bash
GET /api/impayes/export/suspendus?format=csv
GET /api/impayes/export/suspendus?format=xlsx&dateFrom=2026-01-01

# cURL
curl -X GET \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/impayes/export/suspendus?format=csv" \
  -o suspendus_export.csv
```

---

## Output

Fichier téléchargeable (CSV ou Excel) avec colonnes :
- ID
- Numéro Facture
- Date Facture
- Contact
- Email
- Montant
- Date Suspension
- Motif

---

## Dépendances
- F-006 (Export rapports)
- F-008 (Blacklist)
