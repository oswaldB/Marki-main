# import_data.py - Routes import

**Fichier** : `app/routes/import_data.py`  
**Blueprint** : `import_bp` (préfixe `/api/import`)

## Routes

### POST `/api/import/invoices`

Importer des factures (CSV, JSON).

**Body:** multipart/form-data avec fichier CSV

**Response:**
```json
{
  "imported": 50,
  "errors": 2,
  "details": [...]
}
```

### POST `/api/import/contacts`

Importer des contacts.

### POST `/api/import/validate`

Valider un fichier avant import (aperçu).

## Logs (print) - OBLIGATOIRE POUR CHAQUE ROUTE

Chaque fonction de route doit contenir les `print()` suivants:

| Route | Ligne | Instruction | Description |
|-------|-------|-------------|-------------|
| `POST /api/import/invoices` | 1 | `print(f"[API.IMPORT.INVOICES] START: filename={filename}, size={size}, format={fmt}")` | Début import factures |
| `POST /api/import/invoices` | 2 | `print(f"[API.IMPORT.INVOICES] STEP: Lecture du fichier uploadé")` | Lecture du fichier |
| `POST /api/import/invoices` | 3 | `print(f"[API.IMPORT.INVOICES] STEP: Détection format (CSV/JSON)")` | Détection du format |
| `POST /api/import/invoices` | 4 | `print(f"[API.IMPORT.INVOICES] STEP: Parsing de {total_lines} lignes")` | Parsing des lignes |
| `POST /api/import/invoices` | 5 | `print(f"[API.IMPORT.INVOICES] STEP: Validation des champs requis")` | Validation schéma |
| `POST /api/import/invoices` | 6 | `print(f"[API.IMPORT.INVOICES] STEP: Insertion en base")` | Insertion DB |
| `POST /api/import/invoices` | 7 | `print(f"[API.IMPORT.INVOICES] ERROR: Aucun fichier reçu dans la requête")` | Fichier manquant |
| `POST /api/import/invoices` | 8 | `print(f"[API.IMPORT.INVOICES] ERROR: Fichier vide (0 octets)")` | Fichier vide |
| `POST /api/import/invoices` | 9 | `print(f"[API.IMPORT.INVOICES] ERROR: Format invalide: {fmt}")` | Format non supporté |
| `POST /api/import/invoices` | 10 | `print(f"[API.IMPORT.INVOICES] ERROR: Ligne {n} malformée: {line}")` | Ligne malformée |
| `POST /api/import/invoices` | 11 | `print(f"[API.IMPORT.INVOICES] ERROR: Échec insertion DB: {e}")` | Erreur base de données |
| `POST /api/import/invoices` | 12 | `print(f"[API.IMPORT.INVOICES] SUCCESS: imported={imported}, errors={errors}")` | Succès import |
| `POST /api/import/contacts` | 1 | `print(f"[API.IMPORT.CONTACTS] START: filename={filename}, size={size}")` | Début import contacts |
| `POST /api/import/contacts` | 2 | `print(f"[API.IMPORT.CONTACTS] STEP: Parsing du fichier")` | Parsing |
| `POST /api/import/contacts` | 3 | `print(f"[API.IMPORT.CONTACTS] STEP: Déduplication par email")` | Déduplication |
| `POST /api/import/contacts` | 4 | `print(f"[API.IMPORT.CONTACTS] STEP: Insertion de {n} contacts en base")` | Insertion DB |
| `POST /api/import/contacts` | 5 | `print(f"[API.IMPORT.CONTACTS] ERROR: Aucun fichier reçu")` | Fichier manquant |
| `POST /api/import/contacts` | 6 | `print(f"[API.IMPORT.CONTACTS] ERROR: Fichier vide ou format invalide ({fmt})")` | Format invalide |
| `POST /api/import/contacts` | 7 | `print(f"[API.IMPORT.CONTACTS] ERROR: Email manquant ligne {n}")` | Champ requis manquant |
| `POST /api/import/contacts` | 8 | `print(f"[API.IMPORT.CONTACTS] ERROR: Email déjà existant: {email}")` | Doublon |
| `POST /api/import/contacts` | 9 | `print(f"[API.IMPORT.CONTACTS] ERROR: Échec insertion: {e}")` | Erreur DB |
| `POST /api/import/contacts` | 10 | `print(f"[API.IMPORT.CONTACTS] SUCCESS: contacts_created={created}, skipped={skipped}")` | Succès import |
| `POST /api/import/validate` | 1 | `print(f"[API.IMPORT.VALIDATE] START: filename={filename}, size={size}")` | Début validation aperçu |
| `POST /api/import/validate` | 2 | `print(f"[API.IMPORT.VALIDATE] STEP: Parsing aperçu (max {limit} lignes)")` | Parsing limité |
| `POST /api/import/validate` | 3 | `print(f"[API.IMPORT.VALIDATE] STEP: Validation du schéma")` | Validation schéma |
| `POST /api/import/validate` | 4 | `print(f"[API.IMPORT.VALIDATE] STEP: Comptage valides/invalides")` | Comptage résultats |
| `POST /api/import/validate` | 5 | `print(f"[API.IMPORT.VALIDATE] ERROR: Aucun fichier reçu")` | Fichier manquant |
| `POST /api/import/validate` | 6 | `print(f"[API.IMPORT.VALIDATE] ERROR: Format non supporté ({fmt})")` | Format invalide |
| `POST /api/import/validate` | 7 | `print(f"[API.IMPORT.VALIDATE] ERROR: Parsing échoué: {e}")` | Erreur parsing |
| `POST /api/import/validate` | 8 | `print(f"[API.IMPORT.VALIDATE] SUCCESS: valid={valid}, invalid={invalid}, preview_rows={rows}")` | Aperçu retourné |
