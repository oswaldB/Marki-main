# Workflow Backend : Portail Client

+> quelle différence avec /home/ubuntu/marki/relance/specs/workflows/backend/generate-contact-token.md? Répond ici :

## Objectifs
- Authentifier un contact
- Récupérer ses factures et missions

## Process (méga-fonction)

### Login
La méga-fonction `portailLogin()` :
1. Vérifier JWT token
2. Lire contact par `contact_id`
3. Retourner contact

### Data
La méga-fonction `portailData()` :
1. Lire contact authentifié
2. Query impayés avec `payer_id === contact.id` et `statut === 'non_payee'`
3. Retourner `{ contact, factures }`

## Data Model

### Collection: `contacts`
**Stockage:** `/backend/data/contacts/{id}.yml`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant (ex: `cont_00jPOdYCRP`) |
| `nom` | string | Nom du contact |
| `prenom` | string | Prénom |
| `civilite` | string\|null | Civilité |
| `email` | string\|null | Email principal (utilisé pour auth JWT) |
| `telephone` | string\|null | Téléphone |
| `societe` | string\|null | Société |
| `activite_societe` | string\|null | Activité |
| `code` | string\|null | Code client |
| `adresse_rue` | string\|null | Rue |
| `adresse_code_postal` | string\|null | Code postal |
| `adresse_ville` | string\|null | Ville |
| `adresse_pays` | string\|null | Pays |
| `type_personne` | ContactTypePersonne | `P` (physique), `M` (morale) |
| `is_blacklisted` | boolean | Blacklisté |
| `statut` | ContactStatut | `actif` |
| `impaye_ids` | string[] | IDs des impayés liés (filtrés pour portail) |
| `relance_ids` | string[] | IDs des relances liées |
| `created_at` | ISO date | Date de création |
| `updated_at` | ISO date | Date de modification |
| `type` | string | `contact` |

### Collection: `impayes`
**Stockage:** `/backend/data/impayes/{id}.yml`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant |
| `nfacture` | string | Numéro de facture |
| `reference` | string | Référence |
| `date_piece` | ISO date | Date facture |
| `date_echeance` | ISO date | Date d'échéance |
| `reste_a_payer` | number | Reste dû (affiché sur portail) |
| `montant_total` | number | Montant total |
| `statut` | ImpayeStatut | Filtré pour `non_payee` sur portail |
| `facture_soldee` | boolean | Facture soldée |
| `is_suspended` | boolean | Masqué sur portail si true |
| `suspension_date` | ISO date\|null | Date de suspension |
| `suspension_motif` | string\|null | Motif de suspension |
| `payer_id` | string | ID du payeur (doit matcher contact auth) |
| `proprietaire_id` | string\|null | ID propriétaire |
| `proprietaire_nom` | string | Nom propriétaire |
| `proprietaire_prenom` | string | Prénom propriétaire |
| `apporteur_id` | string\|null | ID apporteur |
| `apporteur_nom` | string | Nom apporteur |
| `donneur_ordre_id` | string\|null | ID donneur d'ordre |
| `donneur_ordre_nom` | string | Nom donneur d'ordre |
| `payeur_type` | ImpayePayeurType | Type payeur |
| `payeur_nom` | string | Nom payeur (affiché) |
| `payeur_prenom` | string | Prénom payeur |
| `adresse_bien` | string | Adresse du bien |
| `code_postal` | string | Code postal |
| `ville` | string | Ville |
| `url_pdf` | string\|null | Lien vers PDF (affiché sur portail) |
| `created_at` | ISO date | Date de création |
| `updated_at` | ISO date | Date de modification |
| `type` | string | `impaye` |


---

## Organisation des fichiers

```
/backend/
├── portail-client/
│   ├── index.js              # Point d'entrée du workflow
│   ├── specs/
│   │   └── spec.md           # Documentation du workflow
│   └── logs/                 # Logs quotidiens (JSON Lines)
│       └── YYYY-MM-DD.log
```

**Chemin complet:** `/backend/portail-client/`

---

## Start

### Route
```bash
POST /api/portail/login
GET /api/portail/data
```

## Process

### index.js
**Objectif :** Construire une mega fonction qui encapsule tout le workflow.

#### Operations

**Initialisation logging**
```javascript
const fs = require('fs').promises;
const path = require('path');
const LOG_DIR = path.join(__dirname, '..', 'logs', 'portail-client');

async function log(level, message, data = {}) {
  await fs.mkdir(LOG_DIR, { recursive: true });
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
    workflow: 'portail-client'
  };
  const file = path.join(LOG_DIR, `${new Date().toISOString().split('T')[0]}.log`);
  await fs.appendFile(file, JSON.stringify(entry) + '\n');
}
```

#### Login
```javascript
const decoded = jwt.verify(req.body.token, process.env.JWT_SECRET);
const contact = await db.read('contacts', decoded.contact_id);
if (!contact) {
  await log('warn', 'Portail login failed', { contactId: decoded.contact_id, reason: 'contact_not_found' });
  return { status: 404, error: "Contact non trouvé" };
}
await log('info', 'Portail login successful', { contactId: contact.id, email: contact.email });
```

#### Data
```javascript
const factures = db.query('impayes')
  .where('payer_id').eq(contact.id)
  .where('statut').eq('non_payee')
  .where('is_suspended').eq(false)
  .data();
await log('info', 'Portail data retrieved', { contactId: contact.id, factureCount: factures.length });
```

#### Output
```javascript
{
  "status": 200,
  "data": { contact, factures }
}
```
