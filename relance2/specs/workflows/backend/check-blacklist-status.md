# Workflow Backend : Check Blacklist Status

## Objectif
Vérifier si un impayé ou un contact est blacklisté et retourner son statut détaillé.

## Input
- `impaye_id` (optionnel) : ID de l'impayé à vérifier
- `contact_id` (optionnel) : ID du contact à vérifier

## Process

### Étape 1 : Validation Input
Vérifier qu'au moins un ID est fourni (impaye_id ou contact_id).

### Étape 2 : Récupération Données
Si `impaye_id` fourni :
- Récupérer l'impayé et son contact associé
- Vérifier `is_blacklisted` sur l'impayé et le contact

Si `contact_id` fourni :
- Récupérer le contact
- Vérifier `is_blacklisted` sur le contact

### Étape 3 : Calcul Statut
Déterminer le statut global :
- `blacklisted` : si impayé OU contact blacklisté
- `clear` : si aucun blacklist
- `partial` : si impayé blacklisté mais pas contact (ou inversement)

### Étape 4 : Log
Enregistrer la vérification dans les logs.

## Data Models SQLite

### Table `impayes`
| Colonne | Type | Description |
|---------|------|-------------|
| `id` | TEXT | Identifiant (imp_xxx) |
| `is_blacklisted` | INTEGER | 0 ou 1 |
| `blacklist_date` | TEXT | Date de blacklist |
| `blacklist_motif` | TEXT | Motif de blacklist |
| `contact_relance_id` | TEXT | ID contact associé |

### Table `contacts`
| Colonne | Type | Description |
|---------|------|-------------|
| `id` | TEXT | Identifiant (cont_xxx) |
| `is_blacklisted` | INTEGER | 0 ou 1 |
| `blacklist_date` | TEXT | Date de blacklist |
| `blacklist_motif` | TEXT | Motif de blacklist |

---

## Code Workflow (SQLite)

```javascript
const SQLiteDB = require('../lib/sqlite-db');
const db = new SQLiteDB();

async function checkBlacklistStatus({ impaye_id, contact_id }) {
  // Validation
  if (!impaye_id && !contact_id) {
    throw new Error('Au moins un ID (impaye_id ou contact_id) est requis');
  }
  
  let impaye = null;
  let contact = null;
  
  // Récupération données
  if (impaye_id) {
    impaye = db.read('impayes', impaye_id);
    if (!impaye) {
      throw new Error('Impayé non trouvé');
    }
    // Récupérer le contact associé
    if (impaye.contact_relance_id) {
      contact = db.read('contacts', impaye.contact_relance_id);
    }
  }
  
  if (contact_id && !contact) {
    contact = db.read('contacts', contact_id);
    if (!contact) {
      throw new Error('Contact non trouvé');
    }
  }
  
  // Calcul statut
  const impayeBlacklisted = impaye?.is_blacklisted === 1;
  const contactBlacklisted = contact?.is_blacklisted === 1;
  
  let status = 'clear';
  if (impayeBlacklisted && contactBlacklisted) {
    status = 'blacklisted';
  } else if (impayeBlacklisted || contactBlacklisted) {
    status = 'partial';
  }
  
  return {
    status,
    impaye: impaye ? {
      id: impaye.id,
      is_blacklisted: impayeBlacklisted,
      blacklist_date: impaye.blacklist_date,
      blacklist_motif: impaye.blacklist_motif
    } : null,
    contact: contact ? {
      id: contact.id,
      is_blacklisted: contactBlacklisted,
      blacklist_date: contact.blacklist_date,
      blacklist_motif: contact.blacklist_motif
    } : null,
    can_relance: status === 'clear'
  };
}
```

---

## Route API

```bash
GET /api/blacklist/status?impaye_id=imp_xxx
GET /api/blacklist/status?contact_id=cont_xxx
GET /api/blacklist/status?impaye_id=imp_xxx&contact_id=cont_xxx

# cURL
curl -X GET \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/blacklist/status?impaye_id=imp_xxx"
```

---

## Output

```json
{
  "status": "blacklisted",
  "impaye": {
    "id": "imp_xxx",
    "is_blacklisted": true,
    "blacklist_date": "2026-07-14T15:30:00Z",
    "blacklist_motif": "Client en litige"
  },
  "contact": {
    "id": "cont_xxx",
    "is_blacklisted": true,
    "blacklist_date": "2026-07-14T15:30:00Z",
    "blacklist_motif": "Client en litige"
  },
  "can_relance": false
}
```

---

## Dépendances
- F-008 (Blacklist)
