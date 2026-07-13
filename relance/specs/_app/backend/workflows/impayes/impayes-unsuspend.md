# Workflow Backend : Réactiver une Facture

## Objectifs
- Réactiver une facture suspendue

## Process (méga-fonction)

La méga-fonction `unsuspendImpaye()` exécute les étapes suivantes :

### Étape 1 : Validation
- Lire impayé par `id`
- Vérifier existence
- Vérifier `is_suspended === true` (est bien suspendu)

### Étape 2 : Réactivation
- Mettre à jour : `is_suspended = false`, réinitialiser `suspension_motif` et `suspension_date`

### Étape 3 : Réactivation relances
- Query les relances avec `statut === 'suspendue'` liées à cet impayé
- Déterminer le dernier `email_index` déjà envoyé pour cet impayé (parmi les relances `Envoyée`)
- Pour chaque relance suspendue :
  - Si `relance.email_index` > dernier index envoyé : **regénérer la relance** (nouveau contenu via Ollama, recalculer `planifiee_le`, mettre à jour `statut = 'pret pour envoi'`) +> comment tu comptes géré cela? On appel un autre workflow ou on le code ici?
  - Si `relance.email_index` ≤ dernier index envoyé : laisser en l'état (historique)

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
| `is_suspended` | boolean | **Modifié par ce workflow** (true → false) |
| `suspension_motif` | string\|null | Motif de suspension historique |
| `suspension_date` | ISO date\|null | Date de suspension historique |
| `payer_id` | string | ID du payeur |
| `contact_relance_id` | string | ID contact pour relance |
| `sequence_id` | string | ID séquence assignée |
| `proprietaire_id` | string | ID propriétaire |
| `proprietaire_nom` | string | Nom propriétaire |
| `proprietaire_prenom` | string | Prénom propriétaire |
| `apporteur_id` | string | ID apporteur |
| `apporteur_nom` | string | Nom apporteur |
| `donneur_ordre_id` | string | ID donneur d'ordre |
| `donneur_ordre_nom` | string | Nom donneur d'ordre |
| `payeur_type` | ImpayePayeurType | Type payeur |
| `payeur_nom` | string | Nom payeur |
| `payeur_prenom` | string | Prénom payeur |
| `payeur_email` | string | Email payeur |
| `payeur_telephone` | string | Téléphone payeur |
| `payeur_civilite` | string | Civilité payeur |
| `adresse_bien` | string | Adresse du bien |
| `code_postal` | string | Code postal |
| `ville` | string | Ville |
| `commentaire_piece` | string | Commentaire |
| `url_pdf` | string | URL PDF |
| `email_index` | number | Index email actuel |
| `date_import` | ISO date | Date d'import |
| `created_at` | ISO date | Date de création |
| `updated_at` | ISO date | Date de modification |
| `type` | string | `impaye` |


---

## Organisation des fichiers

```
/backend/
├── impayes-unsuspend/
│   ├── index.js              # Point d'entrée du workflow
│   ├── specs/
│   │   └── spec.md           # Documentation du workflow
│   └── logs/                 # Logs quotidiens (JSON Lines)
│       └── YYYY-MM-DD.log
```

**Chemin complet:** `/backend/impayes-unsuspend/`

---

## Start

### Route
```bash
POST /api/impayes/{id}/unsuspend
```

## Process

### index.js
**Objectif :** Construire une mega fonction qui encapsule tout le workflow.

#### Operations

**Initialisation logging**
```javascript
const fs = require('fs').promises;
const path = require('path');
const LOG_DIR = path.join(__dirname, '..', 'logs', 'impayes-unsuspend');

async function log(level, message, data = {}) {
  await fs.mkdir(LOG_DIR, { recursive: true });
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
    workflow: 'impayes-unsuspend'
  };
  const file = path.join(LOG_DIR, `${new Date().toISOString().split('T')[0]}.log`);
  await fs.appendFile(file, JSON.stringify(entry) + '\n');
}
```

**Process**
```javascript
const impaye = await db.read('impayes', req.params.id);
if (!impaye) {
  await log('error', 'Impaye not found', { impayeId: req.params.id });
  return { status: 404, error: "Impayé non trouvé" };
}
if (!impaye.is_suspended) {
  await log('warn', 'Impaye not suspended', { impayeId: impaye.id });
  return { status: 409, error: "Impayé n'est pas suspendu" };
}

await db.update('impayes', impaye.id, {
  is_suspended: false,
  suspension_motif: null,
  suspension_date: null
});
await log('info', 'Impaye unsuspended', { impayeId: impaye.id });

// 3. Réactiver les relances suspendues
// Récupérer l'historique des relances envoyées pour cet impayé
const historiqueRelances = db.query('relances')
  .where('impaye_ids').contains(impaye.id)
  .where('statut').eq('Envoyée')
  .data();

// Déterminer le dernier email_index envoyé
const dernierIndexEnvoye = historiqueRelances.length > 0 
  ? Math.max(...historiqueRelances.map(r => r.email_index))
  : -1;

await log('info', 'Last sent email index', { impayeId: impaye.id, dernierIndexEnvoye });

// Récupérer les relances suspendues
const relancesSuspendues = db.query('relances')
  .where('impaye_ids').contains(impaye.id)
  .where('statut').eq('suspendue')
  .data();

for (const relance of relancesSuspendues) {
  // Si cette étape a déjà été envoyée avant suspension, la laisser en l'état
  if (relance.email_index <= dernierIndexEnvoye) {
    await log('info', 'Relance skipped (already sent)', { relanceId: relance.id, emailIndex: relance.email_index });
    continue;
  }
  
  // Sinon, regénérer la relance avec une nouvelle date et nouveau contenu
  // Régénérer le contenu via Ollama (comme dans generate-relances)
  const sequence = await db.read('sequences', relance.sequence_id);
  const templateEmail = sequence.emails.find(e => e.email_index === relance.email_index);
  const delai = templateEmail?.delai || 0;
  
  // Calcul nouvelle date d'envoi
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  const nouvelleDateEnvoi = new Date(aujourdhui);
  nouvelleDateEnvoi.setDate(nouvelleDateEnvoi.getDate() + delai);
  
  // TODO: Regénérer objet et corps via Ollama avec le scénario adapté
  // Lire le prompt depuis `/config/prompts/relance-{relance.scenario}-prompt.txt`
  // Appeler API Ollama pour générer nouveau contenu
  // Remplacer les variables [[...]] dans le template
  
  // Pour l'instant, on met à jour statut et date uniquement
  await db.update('relances', relance.id, {
    statut: 'pret pour envoi',
    planifiee_le: nouvelleDateEnvoi.toISOString()
    // TODO: Ajouter objet et corps regénérés
  });
  await log('info', 'Relance reactivated', { relanceId: relance.id, emailIndex: relance.email_index, planifiee_le: nouvelleDateEnvoi.toISOString() });
}
```

#### Output
```javascript
{
  "status": 200,
  "data": { impaye }
}
```
