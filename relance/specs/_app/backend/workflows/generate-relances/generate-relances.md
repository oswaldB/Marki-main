# Workflow Backend : Génération des Relances

## Objectifs
- Générer automatiquement les relances pour les impayés
- Déterminer le scénario adapté (single, multiple, broker, both)

## Process (méga-fonction)

La méga-fonction `generateRelances()` exécute les étapes suivantes dans l'ordre :

### Étape 1 : Récupération
- Query les impayés avec `reste_a_payer > 0` et `sequence_id` défini
- **OU** récupérer les impayés liés à des relances avec `statut === 'refaire'`
- Filtrer sur les séquences de type `"relances"` (exclure `"suivi"`)

### Étape 2 : Filtrage
- Exclure les contacts blacklistés (`is_blacklisted === true`)
- Exclure les contacts sans email
- Exclure les impayés suspendus (`is_suspended === true`)
- Exclure les impayés déjà associés à une relance envoyée (via `date_envoi`)

### Étape 3 : Regroupement
- Regrouper par `(contact_id, sequence_id)`
- Puis sous-regrouper par `nfacture` (une relance = une facture)

### Étape 4 : Détermination scénario
Pour chaque groupe :
- `single` : 1 impayé
- `multiple` : 2+ impayés, même payeur
- `broker` : 2+ impayés, tous avec `apporteur_id` sans `payer_id`
- `both` : mix d'impayés avec `apporteur_id` et `payer_id`

### Étape 5 : Calcul date d'envoi planifiée
Pour chaque groupe, calculer `planifiee_le` :
- Récupérer `date_echeance` de l'impayé et `delai` du template email (sequence.emails[email_index].delai)
- Si `date_echeance` future ou aujourd'hui : `planifiee_le = date_echeance + delai`
- Si `date_echeance` dépassée : `planifiee_le = date_du_jour + delai`
- Le délai peut être négatif (ex: -4 pour 4 jours avant échéance)

### Étape 6 : Génération contenu (Ollama)
- Lire le prompt depuis `/config/prompts/relance-{scenario}-prompt.txt`
- Construire `promptData` avec : date, templates, impayes (séparés payeur/apporteur), contact, historique
- Appel API Ollama avec retry (3 tentatives max)
- Parser la réponse YAML pour extraire `objet` et `corps`

### Étape 7 : Post-traitement
- Remplacer `[[lien_pdf]]` → `${FRONTEND_URL}/redirect-pdf/{impayeId}`
- Remplacer `[[lien_espace]]` → `${FRONTEND_URL}/redirect-espace/{contactId}`

### Étape 8 : Sauvegarde
- Créer la relance en base avec `statut: 'pret pour envoi'` et `planifiee_le` calculée
- En cas d'échec Ollama après 3 retries : créer avec `statut: 'refaire'`
- Logger chaque étape

## Data Model

### Collection: `impayes`
**Stockage:** `/backend/data/impayes/{id}.yml`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant (ex: `imp_01BrQ1FJtk`) |
| `nfacture` | string | Numéro de facture |
| `reference` | string | Référence interne |
| `ref_piece` | string | Référence de pièce |
| `numero_dossier` | string | Numéro de dossier client |
| `id_dossier` | string | ID du dossier |
| `date_piece` | ISO date | Date de la facture |
| `date_echeance` | ISO date | Date d'échéance |
| `montant_total` | number | Montant total TTC |
| `total_ht` | number | Montant HT |
| `total_ttc` | number | Montant TTC |
| `reste_a_payer` | number | **Critère principal** |
| `statut` | ImpayeStatut | `non_payee` |
| `facture_soldee` | boolean | Facture soldée ou non |
| `is_suspended` | boolean | **Exclu si true** |
| `suspension_date` | ISO date\|null | Date de suspension |
| `suspension_motif` | string\|null | Motif de suspension |
| `payer_id` | string\|null | ID du contact payeur |
| `contact_relance_id` | string\|null | ID du contact pour relance (si différent) |
| `proprietaire_id` | string\|null | ID du propriétaire |
| `proprietaire_nom` | string | Nom du propriétaire |
| `proprietaire_prenom` | string | Prénom du propriétaire |
| `apporteur_id` | string\|null | ID de l'apporteur d'affaires |
| `apporteur_nom` | string | Nom de l'apporteur |
| `apporteur_prenom` | string | Prénom de l'apporteur |
| `apporteur_societe` | string | Société de l'apporteur |
| `donneur_ordre_id` | string\|null | ID du donneur d'ordre |
| `donneur_ordre_nom` | string | Nom du donneur d'ordre |
| `donneur_ordre_prenom` | string | Prénom du donneur d'ordre |
| `payeur_type` | ImpayePayeurType | Type: `Propriétaire`, `Apporteur d'affaire`, `Autre` |
| `payeur_nom` | string | Nom du payeur |
| `payeur_prenom` | string | Prénom du payeur |
| `payeur_email` | string | Email du payeur |
| `payeur_telephone` | string | Téléphone du payeur |
| `payeur_civilite` | string | Civilité du payeur |
| `adresse_bien` | string | Adresse du bien concerné |
| `code_postal` | string | Code postal |
| `ville` | string | Ville |
| `commentaire_piece` | string | Commentaire interne |
| `url_pdf` | string\|null | URL du PDF de facture |
| `sequence_id` | string\|null | ID de la séquence assignée |
| `email_index` | number | Index de l'email actuel dans séquence |
| `date_import` | ISO date | Date d'import dans le système |
| `created_at` | ISO date | Date de création |
| `updated_at` | ISO date | Date de modification |
| `type` | string | `impaye` |

### Collection: `contacts`
**Stockage:** `/backend/data/contacts/{id}.yml`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant (ex: `cont_00jPOdYCRP`) |
| `nom` | string | Nom du contact |
| `prenom` | string | Prénom |
| `civilite` | string\|null | Civilité |
| `email` | string\|null | Email principal (obligatoire pour envoi) |
| `telephone` | string\|null | Téléphone |
| `societe` | string\|null | Société |
| `activite_societe` | string\|null | Activité |
| `code` | string\|null | Code client |
| `adresse_rue` | string\|null | Rue |
| `adresse_code_postal` | string\|null | Code postal |
| `adresse_ville` | string\|null | Ville |
| `adresse_pays` | string\|null | Pays |
| `type_personne` | ContactTypePersonne | `P` (physique), `M` (morale) |
| `is_blacklisted` | boolean | **Exclure des relances si true** |
| `blacklist_date` | ISO date\|null | Date de blacklist |
| `blacklist_motif` | string\|null | Motif |
| `statut` | ContactStatut | `actif` |
| `impaye_ids` | string[] | Impayés liés |
| `relance_ids` | string[] | Relances liées |
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
| `sequence_id` | string | ID de la séquence |
| `smtp_profile_id` | string\|null | Profil SMTP utilisé |
| `objet` | string | Objet de l'email généré |
| `corps` | string | Contenu HTML généré |
| `corps_html` | string\|null | Alternative texte brut |
| `statut` | RelanceStatut | `pret pour envoi`, `Envoyée`, `annulee`, `erreur_envoi`, `refaire` |
| `manuelle` | boolean | true = créée manuellement, false = auto |
| `valide` | boolean | Validée par un utilisateur |
| `scenario` | RelanceScenario | `single`, `multiple`, `broker`, `both` |
| `planifiee_le` | ISO date\|null | Date d'envoi planifiée |
| `date_creation` | ISO date | Date de création |
| `date_envoi` | ISO date\|null | Date d'envoi effective |
| `email_index` | number | Position dans la séquence (0, 1, 2...) |
| `clicks` | number | Nombre de clics sur liens |
| `ouvert` | number | Nombre d'ouvertures (0 initialement) |
| `date_ouverture` | ISO date\|null | Date d'ouverture |
| `bcc` | string\|null | Copie cachée |
| `cc` | string\|null | Copie |
| `updated_at` | ISO date | Date de modification |
| `type` | string | `relance` |

### Collection: `sequences`
**Stockage:** `/backend/data/sequences/{id}.yml`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant (ex: `seq_zgPKAlVH65`) |
| `nom` | string | Nom de la séquence |
| `type_sequence` | SequenceType | `relances`, `suivi` |
| `actif` | boolean | Séquence active ou non |
| `validation_obligatoire` | boolean | Validation obligatoire |
| `emails` | EmailConfig[] | Liste des emails de la séquence |
| `emails[].email_index` | number | Position (0, 1, 2...) |
| `emails[].delai` | number | Délai en jours après l'échéance |
| `emails[].objet` | string | Modèle d'objet |
| `emails[].corps` | string | Modèle de corps HTML |
| `emails[].cc` | string\|null | Destinataires CC |
| `emails[].bcc` | string\|null | Destinataires BCC |
| `emails[].scenarios` | ScenarioConfig[] | Scénarios applicables |
| `emails[].scenarios[].format` | ScenarioFormat | `single`, `multiple`, `broker`, `both` |
| `emails[].scenarios[].corps` | string | Template spécifique au scénario |
| `emails[].scenarios[].objet` | string | Objet spécifique au scénario |
| `emails[].scenarios[].cc` | string\|null | Destinataires CC spécifiques |
| `emails[].scenarios[].bcc` | string\|null | Destinataires BCC spécifiques |
| `emails[].scenarios[].smtp_profile_id` | string\|null | Profil SMTP par défaut |
| `emails[].scenarios[].active` | boolean | Scénario actif |
| `created_at` | ISO date | Date de création |
| `updated_at` | ISO date | Date de modification |


---

## Organisation des fichiers

```
/backend/
├── generate-relances/
│   ├── index.js              # Point d'entrée du workflow
│   ├── specs/
│   │   └── spec.md           # Documentation du workflow
│   ├── logs/                 # Logs quotidiens (JSON Lines)
│   │   └── YYYY-MM-DD_HH-mm-ss.log
│   └── config/
│       └── prompts/
│           ├── relance-email-prompt.txt
│           ├── relance-single-prompt.txt
│           ├── relance-multiple-prompt.txt
│           ├── relance-broker-prompt.txt
│           └── relance-both-prompt.txt
```
**Chemin complet:** `/backend/generate-relances/`

---

## Start

### Route
```bash
POST /api/relances/generate

# cURL
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  "https://dev.markidiags.com/api/relances/generate"
```

### Cron
Mettre à jour `backend/cron.js` :
```javascript
cron.schedule("0 * * * *", () => {
  generateRelances();
});
```

## Process

### index.js
**Objectif :** Construire une mega fonction qui encapsule tout le workflow.

#### Operations

**Initialisation logging**
```javascript
const fs = require('fs').promises;
const path = require('path');
const LOG_DIR = path.join(__dirname, '..', 'logs', 'generate-relances');

async function log(level, message, data = {}) {
  await fs.mkdir(LOG_DIR, { recursive: true });
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
    workflow: 'generate-relances'
  };
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  const file = path.join(LOG_DIR, `${dateStr}_${timeStr}.log`);
  await fs.appendFile(file, JSON.stringify(entry) + '\n');
}
```

1. **Récupération impayés avec séquence (type "relances") + relances à refaire**
   ```javascript
   await log('info', 'Starting relance generation');
   
   // Impayés avec reste à payer et séquence
   const impayesActifs = db.query('impayes')
     .where('reste_a_payer').gt(0)
     .where('sequence_id').ne(null)
     .where('is_suspended').eq(false)
     .data();
   
   // Impayés liés à des relances en statut 'refaire'
   const relancesARefaire = db.query('relances')
     .where('statut').eq('refaire')
     .data();
   
   const impayeIdsFromRefaire = relancesARefaire.flatMap(r => r.impaye_ids);
   const impayesFromRefaire = impayeIdsFromRefaire.map(id => 
     db.query('impayes').where('id').eq(id).data()[0]
   ).filter(Boolean);
   
   // Merge sans doublons
   const allImpayes = [...impayesActifs];
   for (const imp of impayesFromRefaire) {
     if (!allImpayes.find(i => i.id === imp.id)) {
       allImpayes.push(imp);
     }
   }
   
   const impayes = allImpayes.filter(i => {
     // Vérifier que la séquence est de type "relances"
     const sequence = db.query('sequences').where('id').eq(i.sequence_id).data()[0];
     return sequence && sequence.type_sequence === 'relances';
   });
   
   await log('info', 'Retrieved impayes with relance sequence', { 
     actifs: impayesActifs.length, 
     refaire: impayesFromRefaire.length,
     total: impayes.length 
   });
   ```

2. **Filtrage**
   ```javascript
   // Exclure contacts blacklistés et sans email
   const filtered = impayes.filter(i => {
     const contact = db.query('contacts').where('id').eq(i.contact_relance_id || i.payer_id).data()[0];
     return contact && !contact.is_blacklisted && contact.email;
   });
   await log('info', 'Filtered impayes', { before: impayes.length, after: filtered.length });
   ```

3. **Regroupement par contact + séquence, puis par facture**
   ```javascript
   const groupedByContactSequence = new Map();
   for (const impaye of filtered) {
     const contactId = impaye.contact_relance_id || impaye.payer_id;
     const key = `${contactId}_${impaye.sequence_id}`;
     if (!groupedByContactSequence.has(key)) {
       groupedByContactSequence.set(key, { contact_id: contactId, sequence_id: impaye.sequence_id, impayes: [] });
     }
     groupedByContactSequence.get(key).impayes.push(impaye);
   }
   
   // Puis regrouper par numéro de facture pour créer une relance par facture
   const groupedByFacture = new Map();
   for (const group of groupedByContactSequence.values()) {
     for (const impaye of group.impayes) {
       const factureKey = `${group.contact_id}_${group.sequence_id}_${impaye.nfacture}`;
       if (!groupedByFacture.has(factureKey)) {
         groupedByFacture.set(factureKey, {
           contact_id: group.contact_id,
           sequence_id: group.sequence_id,
           nfacture: impaye.nfacture,
           impayes: []
         });
       }
       groupedByFacture.get(factureKey).impayes.push(impaye);
     }
   }
   await log('info', 'Grouped impayes', { groupCount: groupedByFacture.size });
   ```

4. **Détermination scénario et création relances**
   ```javascript
   let createdCount = 0;
   for (const group of groupedByFacture.values()) {
     const contact = await db.read('contacts', group.contact_id);
     const sequence = await db.read('sequences', group.sequence_id);
     
     // Déterminer scénario (inline, pas de fonction externe)
     // Définitions:
     // - single: 1 impayé (le payeur est le destinataire de la relance)
     // - broker: plusieurs impayés, tous avec un broker (apporteur) mais AUCUN n'a de payeur
     // - both: plusieurs impayés, certains avec broker ET certains avec payeur (mix des deux)
     // - multiple: plusieurs impayés, tous avec le même payeur (le contact qui reçoit la relance)
     
     let scenario = 'single';
     const impayeCount = group.impayes.length;
     
     if (impayeCount === 1) {
       scenario = 'single';
     } else if (impayeCount > 1) {
       const hasBroker = group.impayes.some(i => i.apporteur_id && i.apporteur_id.trim() !== '');
       const hasPayeur = group.impayes.some(i => i.payer_id && i.payer_id.trim() !== '');
       
       if (hasBroker && hasPayeur) {
         // Mix: certains impayés ont un broker, d'autres un payeur
         scenario = 'both';
       } else if (hasBroker && !hasPayeur) {
         // Tous les impayés ont un broker, aucun n'a de payeur
         scenario = 'broker';
       } else {
         // Multiple impayés pour le même payeur
         scenario = 'multiple';
       }
     }
     await log('info', 'Determined scenario', { contactId: group.contact_id, scenario, impayeCount });
     
     // Calcul de la date d'envoi planifiée
     const emailIndex = 0; // Premier email de la séquence
     const templateEmail = sequence.emails.find(e => e.email_index === emailIndex);
     const delai = templateEmail?.delai || 0;
     
     const dateEcheance = new Date(group.impayes[0].date_echeance);
     const aujourdhui = new Date();
     aujourdhui.setHours(0, 0, 0, 0);
     
     let dateEnvoi;
     if (dateEcheance >= aujourdhui) {
       // Date d'échéance future ou aujourd'hui : date_echeance + delai
       dateEnvoi = new Date(dateEcheance);
     } else {
       // Date d'échéance dépassée : aujourd'hui + delai
       dateEnvoi = new Date(aujourdhui);
     }
     dateEnvoi.setDate(dateEnvoi.getDate() + delai);
     
     const planifiee_le = dateEnvoi.toISOString();
     await log('info', 'Calculated send date', { contactId: group.contact_id, dateEcheance: group.impayes[0].date_echeance, delai, planifiee_le });
     
     // Générer contenu via Ollama (inline, pas de fonction externe)
     // Lire le prompt depuis le fichier de config
     const promptPath = path.join(__dirname, 'config', 'prompts', `relance-${scenario}-prompt.txt`);
     const basePrompt = await fs.readFile(promptPath, 'utf-8');
     
     // Préparer les données pour le prompt
     // Séparer les impayés selon le rôle du contact (payeur vs apporteur)
     const impayesAsPayeur = group.impayes.filter(i => i.payer_id === group.contact_id);
     const impayesAsApporteur = group.impayes.filter(i => i.apporteur_id === group.contact_id);
     
     const objetTemplate = templateEmail?.objet || '';
     const corpsTemplate = templateEmail?.corps || '';
     
     // Construire le prompt complet
     // Note: Les prompts sont conçus pour accepter ces valeurs dynamiques
     
     // Récupérer l'historique des relances passées pour ce contact
     const historiqueRelances = db.query('relances')
       .where('contact_id').eq(group.contact_id)
       .where('statut').in(['Envoyée', 'annulee'])
       .sort('date_envoi', 'desc')
       .limit(5)
       .data();
     
     const promptData = {
       dateDuJour: new Date().toISOString().split('T')[0],
       dateEnvoiPlanifiee: planifiee_le.split('T')[0], // Date calculée d'envoi
       objetTemplate,
       corpsTemplate,
       impayesAsPayeur: JSON.stringify(impayesAsPayeur, null, 2),
       impayesAsApporteur: JSON.stringify(impayesAsApporteur, null, 2),
       contactJson: JSON.stringify(contact, null, 2),
       historiqueRelances: JSON.stringify(historiqueRelances, null, 2),
       scenarioType: scenario,
       emailIndex
     };
     
     // Appel Ollama avec retry (3 tentatives max)
     let ollamaResult = null;
     let lastError = null;
     const maxRetries = 3;
     
     for (let attempt = 1; attempt <= maxRetries; attempt++) {
       try {
         const ollamaResponse = await fetch('https://ollama.com/api/generate', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             model: 'mistral-large-3:675b-cloud',
             prompt: basePrompt + '\n\n' + JSON.stringify(promptData),
             stream: false
           })
         });
         
         if (!ollamaResponse.ok) {
           throw new Error(`Ollama error: ${ollamaResponse.status}`);
         }
         
         ollamaResult = await ollamaResponse.json();
         break; // Succès, sortir de la boucle
       } catch (error) {
         lastError = error;
         await log('warn', `Ollama attempt ${attempt} failed`, { contactId: group.contact_id, error: error.message });
         
         if (attempt === maxRetries) {
           // Dernière tentative échouée, créer une relance avec statut "refaire"
           const relanceId = `rel_${Date.now()}_${group.contact_id}`;
           await db.create('relances', {
             id: relanceId,
             contact_id: group.contact_id,
             sequence_id: group.sequence_id,
             impaye_ids: group.impayes.map(i => i.id),
             scenario,
             objet: 'Relance impayé - À régénérer',
             corps: '<p>Contenu non généré -</p>',
             statut: 'refaire',
             manuelle: false,
             valide: false,
             planifiee_le: null
           });
           await log('error', 'Relance marked as refaire after max retries', { relanceId, contactId: group.contact_id, error: lastError.message });
           createdCount++;
           continue; // Passer au groupe suivant
         }
         
         // Attendre avant de réessayer (backoff exponentiel)
         await new Promise(resolve => setTimeout(resolve, attempt * 1000));
       }
     }
     
     if (!ollamaResult) {
       continue; // Si échec après retries, passer au groupe suivant
     }
     
     // Parser la réponse YAML - pas de fallback, si parsing échoue on passe au groupe suivant
     const yamlContent = ollamaResult.response;
     const objetMatch = yamlContent.match(/objet:\s*"?([^"\n]+)"?/);
     const corpsMatch = yamlContent.match(/corps:\s*\|[\r\n]+([\s\S]+)/);
     
     if (!objetMatch || !corpsMatch) {
       await log('error', 'Failed to parse Ollama response, skipping group', { contactId: group.contact_id, response: yamlContent.substring(0, 500) });
       continue; // Passer au groupe suivant sans créer de relance
     }
     
     let objet = objetMatch[1].trim();
     let corps = corpsMatch[1].trim();
     
     // Étape 5 : Remplacement manuel des liens [[lien_pdf]] et [[lien_espace]]
     const frontendUrl = process.env.FRONTEND_URL || "https://adti.markidiags.com";
     
     // Remplacer [[lien_pdf]] par l'URL de redirection PDF (premier impayé du groupe)
     if (group.impayes.length > 0) {
       const lienPdf = `${frontendUrl}/redirect-pdf/${group.impayes[0].id}`;
       objet = objet.split("[[lien_pdf]]").join(lienPdf);
       corps = corps.split("[[lien_pdf]]").join(lienPdf);
     }
     
     // Remplacer [[lien_espace]] par l'URL de redirection espace client
     const lienEspace = `${frontendUrl}/redirect-espace/${group.contact_id}`;
     objet = objet.split("[[lien_espace]]").join(lienEspace);
     corps = corps.split("[[lien_espace]]").join(lienEspace);
     
     await log('info', 'Generated content via Ollama', { contactId: group.contact_id, scenario });
     
     // Créer relance
     const relanceId = `rel_${Date.now()}_${group.contact_id}`;
     await db.create('relances', {
       id: relanceId,
       contact_id: group.contact_id,
       sequence_id: group.sequence_id,
       impaye_ids: group.impayes.map(i => i.id),
       scenario,
       objet,
       corps,
       statut: 'pret pour envoi',
       manuelle: false,
       valide: !sequence.validation_obligatoire,
       planifiee_le: planifiee_le
     });
     createdCount++;
     await log('info', 'Created relance', { relanceId, contactId: group.contact_id, scenario });
   }
   await log('info', 'Relance generation completed', { totalCreated: createdCount });
   ```

#### Output
```javascript
{
  "status": 200,
  "data": {
    "relances_crees": Number
  }
}
```

## Error Handling

| Code | Description |
|------|-------------|
| 500 | Erreur serveur (Ollama indisponible, etc.) |
| 404 | Fichier prompt introuvable |

### Gestion des erreurs Ollama
- 3 tentatives avec backoff exponentiel (1s, 2s, 3s)
- Après échec: création d'une relance avec `statut: 'refaire'`   
- Si parsing YAML échoue (objet/corps manquant): le groupe est ignoré (pas de relance créée)
- La relance pourra être manuellement régénérée via l'interface
