# Workflow Backend : Test d'Envoi d'Email (Suivi)

## Objectifs
- Envoyer un email de test de suivi à une adresse spécifique
- Permettre de tester une séquence de suivi d'agences avec un contact réel
- Générer le contenu via Ollama avec les vraies données du contact et ses factures

## Process (méga-fonction)

La méga-fonction `testSingleSuivi()` exécute les étapes suivantes :

### Étape 1 : Validation et Récupération
- Vérifier les paramètres requis : `sequenceId`, `testEmail`, `contactId`, `emailIndex`, `scenarioType`
- Récupérer la séquence par `sequenceId` (type séquence doit être `"suivi"`)
- Vérifier que l'email existe à l'index demandé dans `sequence.emails[]`
- Récupérer le contact par `contactId`
- Récupérer les factures associées au contact pour le suivi

### Étape 2 : Détermination du Scénario
- Trouver le scénario actif dans `emailConfig.scenarios` qui correspond au `scenarioType` reçu en paramètre
- Récupérer les templates (objet et corps) du scénario actif ou du template par défaut

### Étape 3 : Génération Contenu (Ollama)
- Lire le prompt depuis `/config/prompts/suivi-{scenarioType}-prompt.txt`
- Construire le prompt avec :
  - `objetTemplate` et `corpsTemplate`
  - `impayesJson` : données des impayés (nfacture, montant_total, date_piece, date_echeance, reste_a_payer, adresse_bien, missions)
  - `contactJson` : données du contact (nom, prenom, civilite, email, telephone, type_personne, societe)
  - `emailIndex` : index de l'email dans la séquence
  - `premierRappel` : true si c'est le premier email (index 0)
  - `relancePrecedente` : informations sur la relance précédente (date, statut)
  - `totalImpayes` : nombre total d'impayés
  - `montantTotal` : montant total dû
- Appeler l'API Ollama avec retry (3 tentatives max)
- Parser la réponse YAML pour extraire `objet` et `corps` générés

### Étape 4 : Post-traitement
- Remplacer `[[lien_pdf]]` → `${FRONTEND_URL}/redirect-pdf/{firstImpayeId}`
- Remplacer `[[lien_espace]]` → `${FRONTEND_URL}/redirect-espace/{contactId}`
- Ajouter la signature HTML du profil SMTP sélectionné

### Étape 5 : Envoi Email
- Déterminer le profil SMTP à utiliser
- Créer le transport nodemailer avec le profil SMTP
- Construire l'email :
  - `from` : `"{userName} (Test Suivi)" <{smtpProfile.email_from}>`
  - `to` : `testEmail` (email de test)
  - `subject` : `[TEST SUIVI] {objetFinal}`
  - `html` : `corpsFinal`
- Envoyer l'email
- Retourner le résultat avec prévisualisation

## Data Model

### Collection: `sequences`
**Stockage:** `/backend/data/sequences/{id}.yml`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant de la séquence |
| `type_sequence` | SequenceType | **Doit être** `"suivi"` |
| `nom` | string | Nom de la séquence (ex: "Suivi agences début de mois") |
| `emails` | EmailConfig[] | Liste des emails de la séquence |
| `emails[].email_index` | number | Position (0, 1, 2...) |
| `emails[].delai` | number | Délai en jours (peut être négatif) |
| `emails[].objet` | string | Template d'objet |
| `emails[].corps` | string | Template de corps avec tableaux |
| `emails[].scenarios` | ScenarioConfig[] | Scénarios de suivi |

### Collection: `contacts`
**Stockage:** `/backend/data/contacts/{id}.yml`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant du contact (agence) |
| `nom` | string | Nom de l'agence |
| `email` | string\|null | Email de l'agence |
| `telephone` | string\|null | Téléphone |
| `type_personne` | ContactTypePersonne | `"M"` (morale) pour les agences |

### Collection: `impayes`
**Stockage:** `/backend/data/impayes/{id}.yml`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant |
| `apporteur_id` | string\|null | ID de l'agence (contact de suivi) |
| `payeur_type` | ImpayePayeurType | `Propriétaire` ou `Apporteur d'affaire` |
| `payeur_nom` | string | Nom du payeur |
| `proprietaire_nom` | string | Nom du propriétaire |
| `proprietaire_prenom` | string | Prénom du propriétaire |
| `nfacture` | string | Numéro de facture |
| `date_piece` | ISO date | Date de la facture |
| `date_echeance` | ISO date | Date d'échéance |
| `montant_total` | number | Montant total |
| `reste_a_payer` | number | Reste à payer |
| `adresse_bien` | string | Adresse du bien |
| `code_postal` | string | Code postal |
| `ville` | string | Ville |
| `numero_dossier` | string | Numéro de dossier |

### Collection: `smtp_profiles`
**Stockage:** `/backend/data/smtp_profiles/{id}.yml`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant |
| `nom` | string | Nom du profil |
| `host` | string | Serveur SMTP |
| `port` | number | Port SMTP |
| `username` | string | Identifiant |
| `password` | string | Mot de passe |
| `email_from` | string | Email d'expédition |
| `signature_html` | string\|null | Signature HTML |

---

## Organisation des fichiers

```
/backend/
├── test-single-suivi/
│   ├── index.js              # Point d'entrée du workflow
│   ├── specs/
│   │   └── spec.md           # Documentation du workflow
│   └── logs/                 # Logs quotidiens (JSON Lines)
│       └── YYYY-MM-DD.log
```

**Chemin complet:** `/backend/test-single-suivi/`

---

## Start

### Route
```bash
POST /api/test/suivi

# cURL
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sequenceId": "seq_xsqjGJ4mw3",
    "testEmail": "test@example.com",
    "contactId": "cont_00jPOdYCRP",
    "emailIndex": 0,
    "scenarioType": "suivi_agence"
  }' \
  "https://dev.markidiags.com/api/test/suivi"
```

### Entry Data
- `sequenceId`: string (requis) - ID de la séquence de suivi
- `testEmail`: string (requis) - Email de destination pour le test
- `contactId`: string (requis) - ID du contact (agence)
- `emailIndex`: number (requis) - Index de l'email dans la séquence (0, 1, 2...)
- `scenarioType`: string (requis) - Type de scénario (`suivi_agence`, `suivi_proprietaire`, etc.)

## Process

### index.js
**Objectif :** Construire une mega fonction qui encapsule tout le workflow.

#### Operations

**Initialisation logging**
```javascript
const fs = require('fs').promises;
const path = require('path');
const LOG_DIR = path.join(__dirname, '..', 'logs', 'test-single-suivi');

async function log(level, message, data = {}) {
  await fs.mkdir(LOG_DIR, { recursive: true });
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
    workflow: 'test-single-suivi'
  };
  const file = path.join(LOG_DIR, `${new Date().toISOString().split('T')[0]}.log`);
  await fs.appendFile(file, JSON.stringify(entry) + '\n');
}
```

**Process**
```javascript
// Validation
if (!sequenceId || !testEmail || !contactId || emailIndex === undefined || !scenarioType) {
  await log('error', 'Missing required parameters');
  return { status: 400, error: "Paramètres requis: sequenceId, testEmail, contactId, emailIndex, scenarioType" };
}

// 1. Récupération séquence
const sequence = await db.read('sequences', sequenceId);
if (!sequence) {
  await log('error', 'Sequence not found', { sequenceId });
  return { status: 404, error: "Séquence introuvable" };
}

// Vérifier que c'est une séquence de suivi
if (sequence.type_sequence !== 'suivi') {
  await log('error', 'Not a suivi sequence', { type: sequence.type_sequence });
  return { status: 400, error: "La séquence doit être de type 'suivi'" };
}

const emailConfig = sequence.emails[emailIndex];
if (!emailConfig) {
  await log('error', 'Email not found at index', { sequenceId, emailIndex });
  return { status: 404, error: "Email introuvable à cet index" };
}

// 2. Récupération contact (agence)
const contact = await db.read('contacts', contactId);
if (!contact) {
  await log('error', 'Contact not found', { contactId });
  return { status: 404, error: "Contact introuvable" };
}

// 3. Récupération impayés du contact
const impayes = db.query('impayes')
  .where('payeur_id').eq(contactId)
  .where('facture_soldee').eq(false)
  .where('reste_a_payer').gt(0)
  .data();

await log('info', 'Retrieved data', { 
  sequenceName: sequence.nom, 
  contact: contact.nom, 
  impayesCount: impayes.length
});

// 4. Détermination scénario
const scenarios = emailConfig.scenarios || [];
const scenarioActif = scenarios.find(s => s.format === scenarioType && s.active);

let objetFinal = scenarioActif?.objet || emailConfig.objet || '';
let corpsFinal = scenarioActif?.corps || emailConfig.corps || '';

// 5. Génération via Ollama
const promptPath = path.join(__dirname, '..', 'config', 'prompts', `suivi-${scenarioType}-prompt.txt`);
const basePrompt = await fs.readFile(promptPath, 'utf-8');

const totalImpayes = impayes.length;
const montantTotal = impayes.reduce((sum, imp) => sum + (imp.reste_a_payer || 0), 0);
const premierRappel = emailIndex === 0;
const relancePrecedente = { /* infos sur la relance précédente */ };

const promptData = {
  objetTemplate: emailConfig.objet,
  corpsTemplate: emailConfig.corps,
  impayesJson: JSON.stringify(impayes),
  contactJson: JSON.stringify(contact),
  emailIndex,
  premierRappel,
  relancePrecedente,
  totalImpayes,
  montantTotal
};

const prompt = basePrompt
  .replace(/{{objetTemplate}}/g, promptData.objetTemplate)
  .replace(/{{corpsTemplate}}/g, promptData.corpsTemplate)
  .replace(/{{impayesJson}}/g, promptData.impayesJson)
  .replace(/{{contactJson}}/g, promptData.contactJson)
  .replace(/{{emailIndex}}/g, promptData.emailIndex)
  .replace(/{{premierRappel}}/g, promptData.premierRappel)
  .replace(/{{relancePrecedente}}/g, JSON.stringify(promptData.relancePrecedente))
  .replace(/{{totalImpayes}}/g, promptData.totalImpayes)
  .replace(/{{montantTotal}}/g, promptData.montantTotal);

// 6. Post-traitement
const frontendUrl = process.env.FRONTEND_URL || "https://adti.markidiags.com";

if (impayes.length > 0) {
  const lienPdf = `${frontendUrl}/redirect-pdf/${impayes[0].id}`;
  objetFinal = objetFinal.split("[[lien_pdf]]").join(lienPdf);
  corpsFinal = corpsFinal.split("[[lien_pdf]]").join(lienPdf);
}

const lienEspace = `${frontendUrl}/redirect-espace/${contactId}`;
objetFinal = objetFinal.split("[[lien_espace]]").join(lienEspace);
corpsFinal = corpsFinal.split("[[lien_espace]]").join(lienEspace);

// 7. Envoi email
const smtpProfileId = scenarioActif?.smtp_profile_id || emailConfig.smtp_profile_id;
if (!smtpProfileId) {
  await log('error', 'No SMTP profile configured');
  return { status: 400, error: "Aucun profil SMTP configuré" };
}

const smtp = await db.read('smtp_profiles', smtpProfileId);
const transporter = nodemailer.createTransport({
  host: smtp.host,
  port: smtp.port,
  secure: smtp.secure,
  auth: { user: smtp.username, pass: smtp.password }
});

// Ajouter signature si présente
if (smtp.signature_html) {
  corpsFinal = corpsFinal + "<br><br>" + smtp.signature_html;
}

// Envoyer l'email
const result = await transporter.sendMail({
  from: `"${userName || 'Test'} (Test Suivi)" <${smtp.email_from || smtp.username}>`,
  to: testEmail,
  subject: `[TEST SUIVI] ${objetFinal}`,
  html: corpsFinal,
  headers: {
    'X-Test-Email': 'true',
    'X-Test-Type': 'suivi',
    'X-Sequence-Id': sequenceId,
    'X-Email-Index': String(emailIndex)
  }
});

await log('info', 'Test suivi email sent', { to: testEmail, messageId: result.messageId });
```

#### Output
```javascript
{
  "status": 200,
  "data": {
    "emailSent": true,
    "from": "Test (Test Suivi) <comptabilite@adti06.com>",
    "to": "test@example.com",
    "smtpProfile": "EX'IM - comptabilité",
    "metadata": {
      "sequenceId": "seq_xsqjGJ4mw3",
      "emailIndex": 0,
      "testEmail": "test@example.com",
      "contactId": "cont_00jPOdYCRP",
      "typeSequence": "suivi",
      "scenarioType": "suivi_agence",
      "impayesCount": 17,
      "sentAt": "2026-07-10T14:30:00.000Z",
      "durationMs": 3200,
      "messageId": "<abc123@mail.infomaniak.com>"
    }
  }
}
```

## Error Handling

| Code | Description |
|------|-------------|
| 400 | Paramètres manquants, séquence non de type "suivi", ou SMTP non configuré |
| 404 | Séquence, email ou contact introuvable |
| 500 | Erreur Ollama ou SMTP |

### Gestion des erreurs Ollama
- 3 tentatives avec backoff exponentiel
- En cas d'échec après retries : utilisation des templates bruts (fallback)
