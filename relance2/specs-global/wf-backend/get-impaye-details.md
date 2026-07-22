# Workflow Backend : Get Impaye Details

## Objectif
Récupérer les détails complets d'un impayé avec toutes les relations associées.

## Input
- `impaye_id` : ID de l'impayé
- `include_relances` : Inclure l'historique des relances (boolean, default: true)
- `include_historique` : Inclure l'historique des actions (boolean, default: true)

## Process

### Étape 1 : Validation
Vérifier que l'impayé existe.

### Étape 2 : Récupération Données
Récupérer l'impayé avec ses relations (facture, contact, payer).

### Étape 3 : Enrichissement
Si demandé, récupérer :
- Les relances associées à ce contact
- L'historique des actions sur l'impayé

### Étape 4 : Calcul Statistiques
Calculer :
- Âge de l'impayé (jours depuis échéance)
- Total des relances envoyées
- Dernière relance

### Étape 5 : Log
Enregistrer la consultation dans les logs.

---

## Data Models SQLite

### Table `impayes`
| Colonne | Type | Description |
|---------|------|-------------|
| `id` | TEXT | Identifiant |
| `montant` | REAL | Montant |
| `date_echeance` | TEXT | Date d'échéance |
| `is_blacklisted` | INTEGER | 0 ou 1 |
| `blacklist_date` | TEXT | Date blacklist |
| `blacklist_motif` | TEXT | Motif |
| `contact_relance_id` | TEXT | ID contact |
| `facture_id` | TEXT | ID facture |

---

## Code Workflow (SQLite)

```javascript
const SQLiteDB = require('../lib/sqlite-db');
const db = new SQLiteDB();

async function getImpayeDetails(impayeId, { include_relances = true, include_historique = true }) {
  // Récupérer l'impayé
  const impaye = db.read('impayes', impayeId);
  if (!impaye) {
    throw new Error('Impayé non trouvé');
  }
  
  // Récupérer les relations
  const facture = impaye.facture_id ? db.read('factures', impaye.facture_id) : null;
  const contact = impaye.contact_relance_id ? db.read('contacts', impaye.contact_relance_id) : null;
  const payer = facture?.payer_id ? db.read('payers', facture.payer_id) : null;
  
  // Calculer âge
  const today = new Date();
  const echeance = new Date(impaye.date_echeance);
  const ageJours = Math.floor((today - echeance) / (1000 * 60 * 60 * 24));
  
  const result = {
    id: impaye.id,
    montant: impaye.montant,
    date_echeance: impaye.date_echeance,
    age_jours: ageJours,
    is_blacklisted: impaye.is_blacklisted === 1,
    blacklist: impaye.is_blacklisted ? {
      date: impaye.blacklist_date,
      motif: impaye.blacklist_motif
    } : null,
    facture: facture ? {
      id: facture.id,
      numero: facture.numero,
      date_facture: facture.date_facture,
      montant_total: facture.montant_total
    } : null,
    contact: contact ? {
      id: contact.id,
      nom: contact.nom,
      email: contact.email,
      telephone: contact.telephone,
      is_blacklisted: contact.is_blacklisted === 1
    } : null,
    payer: payer ? {
      id: payer.id,
      raison_sociale: payer.raison_sociale,
      siret: payer.siret
    } : null
  };
  
  // Récupérer les relances
  if (include_relances && contact) {
    const relances = db.query(
      `SELECT * FROM relances WHERE contact_id = ? ORDER BY date_creation DESC`,
      [contact.id]
    );
    result.relances = relances.map(r => ({
      id: r.id,
      statut: r.statut,
      canal: r.canal,
      date_creation: r.date_creation,
      date_envoi: r.date_envoi
    }));
    result.total_relances = relances.length;
    result.relances_envoyees = relances.filter(r => r.statut === 'envoyee').length;
  }
  
  return result;
}
```

---

## Route API

```bash
GET /api/impayes/:id/details
GET /api/impayes/:id/details?include_relances=false

# cURL
curl -X GET \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/impayes/imp_xxx/details"
```

---

## Output

```json
{
  "id": "imp_xxx",
  "montant": 1250.50,
  "date_echeance": "2026-06-15",
  "age_jours": 36,
  "is_blacklisted": true,
  "blacklist": {
    "date": "2026-07-14T15:30:00Z",
    "motif": "Client en litige"
  },
  "facture": {
    "id": "fac_xxx",
    "numero": "FAC-2026-001",
    "date_facture": "2026-05-15",
    "montant_total": 1250.50
  },
  "contact": {
    "id": "cont_xxx",
    "nom": "Jean Dupont",
    "email": "jean@example.com",
    "telephone": "+33123456789",
    "is_blacklisted": true
  },
  "payer": {
    "id": "pay_xxx",
    "raison_sociale": "Entreprise ABC",
    "siret": "12345678900012"
  },
  "relances": [...],
  "total_relances": 5,
  "relances_envoyees": 3
}
```

---

## Dépendances
- F-003 (Liste factures)
- F-004 (Fiche client)
