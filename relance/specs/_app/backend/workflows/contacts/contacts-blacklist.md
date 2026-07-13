# Workflow Backend : Blacklister un Contact

## Objectifs
- Blacklister un contact
- Annuler les relances futures si blacklist

## Process (méga-fonction)

La méga-fonction `blacklistContact()` exécute les étapes suivantes :

### Étape 1 : Validation
- Vérifier présence `motif` (requis)

### Étape 2 : Vérification contact
- Lire contact par `id`
- Vérifier existence
- Vérifier `is_blacklisted === false` (pas déjà blacklisté)

### Étape 3 : Blacklist
- Mettre à jour : `is_blacklisted = true`, `blacklist_motif`, `blacklist_date`

### Étape 4 : Annulation relances
- Query relances avec `statut === 'pret pour envoi'` pour ce contact
- Mettre à jour : `statut = 'annulee'`
- Logger chaque annulation

## Data Model

### Collection: `contacts`
**Stockage:** `/backend/data/contacts/{id}.yml`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant unique (ex: `cont_00jPOdYCRP`) |
| `nom` | string | Nom du contact |
| `prenom` | string | Prénom du contact |
| `civilite` | string\|null | Civilité (M, Mme, etc.) |
| `email` | string\|null | Email principal |
| `telephone` | string\|null | Numéro de téléphone |
| `societe` | string\|null | Nom de la société |
| `activite_societe` | string\|null | Activité de la société |
| `code` | string\|null | Code client interne |
| `adresse_rue` | string\|null | Rue |
| `adresse_code_postal` | string\|null | Code postal |
| `adresse_ville` | string\|null | Ville |
| `adresse_pays` | string\|null | Pays (défaut: France) |
| `type_personne` | ContactTypePersonne | `P` (physique), `M` (morale) |
| `is_blacklisted` | boolean | Blacklisté ou non |
| `blacklist_date` | ISO date\|null | Date du blacklist |
| `blacklist_motif` | string\|null | Motif du blacklist (requis) |
| `statut` | ContactStatut | `actif` |
| `impaye_ids` | string[] | IDs des impayés liés |
| `relance_ids` | string[] | IDs des relances liées |
| `created_at` | ISO date | Date de création |
| `updated_at` | ISO date | Date de modification |
| `type` | string | `contact` |

### Collection: `relances`
**Stockage:** `/backend/data/relances/{id}.yml`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant (ex: `rel_0AnbUjTVKD`) |
| `contact_id` | string | ID du contact destinataire |
| `impaye_ids` | string[] | IDs des impayés concernés |
| `sequence_id` | string | ID de la séquence utilisée |
| `smtp_profile_id` | string\|null | ID du profil SMTP utilisé |
| `objet` | string | Objet de l'email |
| `corps` | string | Contenu HTML de l'email |
| `statut` | RelanceStatut | `brouillon`, `pret pour envoi`, `Envoyée`, `annulee` |
| `manuelle` | boolean | Relance manuelle ou auto |
| `valide` | boolean | Validée ou non |
| `scenario` | RelanceScenario | `single`, `multiple`, `broker`, `both` |
| `planifiee_le` | ISO date\|null | Date d'envoi planifiée |
| `date_creation` | ISO date | Date de création |
| `date_envoi` | ISO date\|null | Date d'envoi effective |
| `email_index` | number | Index de l'email dans la séquence |
| `clicks` | number | Nombre de clics sur les liens |
| `ouvert` | number | Nombre de fois que l'email a été ouvert |
| `date_ouverture` | ISO date\|null | Date d'ouverture |
| `bcc` | string\|null | Destinataires en copie cachée |
| `cc` | string\|null | Destinataires en copie |
| `corps_html` | string\|null | Version alternative du corps |
| `type` | string | `relance` |

---

## Organisation des fichiers

```
/backend/
├── contacts-blacklist/
│   ├── index.js              # Point d'entrée du workflow
│   ├── specs/
│   │   └── spec.md           # Documentation du workflow
│   └── logs/                 # Logs quotidiens (JSON Lines)
│       └── YYYY-MM-DD.log
```

**Chemin complet:** `/backend/contacts-blacklist/`

---

## Start

### Route
```bash
POST /api/contacts/{id}/blacklist
```

### Entry Data
- `motif`: string (requis)

## Process

### index.js
**Objectif :** Construire une mega fonction qui encapsule tout le workflow.

#### Operations

**Initialisation logging**
```javascript
const fs = require('fs').promises;
const path = require('path');
const LOG_DIR = path.join(__dirname, '..', 'logs', 'contacts-blacklist');

async function log(level, message, data = {}) {
  await fs.mkdir(LOG_DIR, { recursive: true });
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
    workflow: 'contacts-blacklist'
  };
  const file = path.join(LOG_DIR, `${new Date().toISOString()}.log`); 
  await fs.appendFile(file, JSON.stringify(entry) + '\n');
}
```

**Process**
```javascript
// 1. Validation
if (!req.body.motif || req.body.motif.trim() === '') {
  await log('warn', 'Validation failed', { reason: 'missing_motif' });
  return { status: 400, error: "Motif requis" };
}

// 2. Vérifier que le contact existe
const contact = await db.read('contacts', req.params.id);
if (!contact) {
  await log('warn', 'Contact not found', { contactId: req.params.id });
  return { status: 404, error: "Contact non trouvé" };
}

// 3. Vérifier que le contact n'est pas déjà blacklisté
if (contact.is_blacklisted) {
  await log('warn', 'Contact already blacklisted', { contactId: contact.id });
  return { status: 409, error: "Contact déjà blacklisté" };
}

await log('info', 'Contact read', { contactId: contact.id });

// 4. Blacklister le contact
await db.update('contacts', contact.id, {
  is_blacklisted: true,
  blacklist_motif: req.body.motif,
  blacklist_date: new Date().toISOString()
});
await log('info', 'Contact blacklisted', { contactId: contact.id, motif: req.body.motif });

// 5. Annuler les relances futures
const relances = db.query('relances')
  .where('contact_id').eq(contact.id)
  .where('statut').eq('pret pour envoi')
  .data();

await log('info', 'Cancelling pending relances', { contactId: contact.id, count: relances.length });

for (const relance of relances) {
  await db.update('relances', relance.id, { statut: 'annulee' });
  await log('info', 'Relance cancelled', { relanceId: relance.id, reason: 'contact_blacklisted' });
}
```

#### Output
```javascript
{
  "status": 200,
  "data": { contact }
}
```

## Error Handling

| Code | Description |
|------|-------------|
| 400 | Motif manquant |
| 404 | Contact non trouvé |
| 409 | Contact déjà blacklisté |
| 500 | Erreur serveur |
