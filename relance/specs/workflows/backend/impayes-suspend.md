# Workflow Backend : Suspendre une Facture

## Objectifs
- Suspendre temporairement une facture
- Annuler les relances futures

## Process (méga-fonction)

La méga-fonction `suspendImpaye()` exécute les étapes suivantes :

### Étape 1 : Validation
- Lire impayé par `id`
- Vérifier existence
- Vérifier `is_suspended === false` (pas déjà suspendu)
- Vérifier présence `motif`

### Étape 2 : Suspension
- Mettre à jour : `is_suspended = true`, `suspension_motif`, `suspension_date`

### Étape 3 : Annulation relances
- Query relances avec `statut === 'pret pour envoi'` liées à cet impayé
- Mettre à jour : `statut = 'suspendue'`, `annulation_motif = 'Impayé suspendu'`

## Data Model

### Collection: `impayes`
**Stockage:** `/backend/data/impayes/{id}.yml`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant (ex: `imp_01BrQ1FJtk`) |
| `nfacture` | string | Numéro de facture |
| `reference` | string | Référence interne |
| `date_piece` | ISO date | Date de la facture |
| `date_echeance` | ISO date | Date d'échéance |
| `reste_a_payer` | number | Montant restant dû |
| `montant_total` | number | Montant total TTC |
| `statut` | ImpayeStatut | `non_payee` |
| `is_suspended` | boolean | **Champ modifié par ce workflow** |
| `suspension_motif` | string | **Champ modifié par ce workflow** |
| `suspension_date` | ISO date | **Champ modifié par ce workflow** |
| `payer_id` | string | ID du payeur |
| `contact_relance_id` | string | ID contact pour relance |
| `sequence_id` | string | ID séquence assignée |
| `created_at` | ISO date | Date de création |
| `updated_at` | ISO date | Date de modification |
| `type` | string | `impaye` |

### Collection: `relances`
**Stockage:** `/backend/data/relances/{id}.yml`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant |
| `contact_id` | string | ID du contact |
| `impaye_ids` | string[] | IDs des impayés concernés |
| `statut` | RelanceStatut | **Modifié par ce workflow**: `pret pour envoi` → `suspendue` |
| `annulation_motif` | string\|null | **Champ modifié par ce workflow** |
| `sequence_id` | string | ID séquence |
| `objet` | string | Objet email |
| `corps` | string | Corps HTML |
| `type` | string | `relance` |


---

## Organisation des fichiers

```
/backend/
├── impayes-suspend/
│   ├── index.js              # Point d'entrée du workflow
│   ├── specs/
│   │   └── spec.md           # Documentation du workflow
│   └── logs/                 # Logs quotidiens (JSON Lines)
│       └── YYYY-MM-DD.log
```

**Chemin complet:** `/backend/impayes-suspend/`

---

## Start

### Route
```bash
POST /api/impayes/{id}/suspend

# cURL
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"motif": "Litige en cours"}' \
  "http://adti.api2.markidiags.com/api/impayes/imp_001/suspend"
```

### Entry Data
- `id`: string (path param) - ID de l'impayé
- `motif`: string (requis) - Motif de suspension

## Process

### index.js
**Objectif :** Construire une mega fonction qui encapsule tout le workflow.

#### Operations

**Initialisation logging**
```javascript
const fs = require('fs').promises;
const path = require('path');
const LOG_DIR = path.join(__dirname, '..', 'logs', 'impayes-suspend');

async function log(level, message, data = {}) {
  await fs.mkdir(LOG_DIR, { recursive: true });
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
    workflow: 'impayes-suspend'
  };
  const file = path.join(LOG_DIR, `${new Date().toISOString()}.log`);
  await fs.appendFile(file, JSON.stringify(entry) + '\n');
}
```

1. **Validation**
   ```javascript
   const impaye = await db.read('impayes', req.params.id);
   if (!impaye) {
     await log('error', 'Impaye not found', { impayeId: req.params.id });
     return { status: 404, error: "Impayé non trouvé" };
   }
   if (impaye.is_suspended) {
     await log('warn', 'Impaye already suspended', { impayeId: impaye.id });
     return { status: 409, error: "Déjà suspendu" };
   }
   if (!req.body.motif) {
     await log('warn', 'Missing motif', { impayeId: impaye.id });
     return { status: 400, error: "Motif requis" };
   }
   await log('info', 'Validation passed', { impayeId: impaye.id, motif: req.body.motif });
   ```

2. **Suspension**
   ```javascript
   await db.update('impayes', impaye.id, {
     is_suspended: true,
     suspension_motif: req.body.motif,
     suspension_date: new Date().toISOString()
   });
   await log('info', 'Impaye suspended', { impayeId: impaye.id, motif: req.body.motif, userId: req.user.id });
   ```

3. **Annuler relances futures**
   ```javascript
   const relances = db.query('relances')
     .where('impaye_ids').contains(impaye.id)
     .where('statut').eq('pret pour envoi')
     .data();
   
   await log('info', 'Found pending relances to cancel', { impayeId: impaye.id, count: relances.length });
   
   for (const relance of relances) {
     await db.update('relances', relance.id, {
       statut: 'suspendue',
       annulation_motif: 'Impayé suspendu'
     });
     await log('info', 'Relance cancelled', { relanceId: relance.id, impayeId: impaye.id });
   }
   await log('info', 'Suspend process completed', { impayeId: impaye.id, relancesCancelled: relances.length });
   ```

#### Output
```javascript
{
  "status": 200,
  "data": {
    "suspended": true,
    "relances_annulees": Number
  }
}
```
