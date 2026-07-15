# Workflow : Générer par IA (open-ia-modal)

## Écran
`sequences-suivi-detail.html`

## Élément déclencheur
Bouton "Générer par IA" avec `@click="openIaModal(idx)"` (à côté de chaque email)

## Action
Générer **un seul email** avec ses **scénarios** via ChatGPT en mode "copier-coller externe"

## Description

Génère l'email sélectionné (celui à l'index `idx`) avec ses scénarios complets :

### Processus en 4 étapes

1. **Étape "prompt"** : Afficher un prompt pré-construit à copier
   - Le prompt contient les instructions pour générer 1 email
   - Structure YAML attendue avec les scénarios de suivi
   - Variables disponibles ([[agence_nom]], [[formateur_nom]], etc.)

2. **Étape "paste"** : L'utilisateur colle la réponse YAML
   - L'utilisateur copie le prompt et le colle dans chat.openai.com
   - Copie la réponse YAML de ChatGPT
   - Colle la réponse dans le champ dédié

3. **Étape "validate"** : Validation du YAML
   - Parsing YAML via js-yaml
   - Vérification de la structure (email avec email_index, delai, objet, corps, scenarios[])
   - Vérification des formats de scénarios

4. **Étape "apply"** : Application de l'email généré
   - Si validation OK : remplacer l'email courant avec les scénarios générés
   - Si erreurs : afficher les erreurs et permettre correction

**Note** : Ne PAS appeler d'API ChatGPT directement. Le LLM est utilisé côté utilisateur uniquement.

## Data Model

**Page Function:** `sequencesSuiviDetailPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `sequence`
- `currentEmailIndex` (index de l'email à générer)
- `promptTemplate` (string, le prompt à copier)
- `yamlInput` (string, la réponse YAML collée par l'utilisateur)
- `parsedYaml` (object|null, résultat du parsing)
- `validationErrors` (string[], erreurs de validation structurelle)
- `showIaModal` (boolean, état de la modale)
- `iaStep` ('prompt' | 'paste' | 'validate' | 'apply')

**États UI:**
- `loading`
- `error`
- `saving`
- `hasChanges`
- `showIaModal`
- `iaStep`

## State Changes

**Modifications:**
- `showIaModal` passe à `true` à l'ouverture
- `currentEmailIndex` = idx de l'email ciblé
- `iaStep` = 'prompt' : affiche le prompt à copier + bouton "Copier le prompt"
- `iaStep` = 'paste' : affiche instructions + textarea pour coller YAML + bouton "Valider"
- `iaStep` = 'validate' : spinner de validation + parsing YAML
- `iaStep` = 'apply' : preview de l'email avec ses scénarios + boutons "Appliquer" / "Annuler" (ou erreurs)
- Toast erreur si YAML invalide ou structure incorrecte
- Toast succès si application réussie

## Prompt Template

```
Tu es un expert en communication éducative et suivi d'agences. Génère un email de suivi avec ses scénarios.

Structure YAML attendue:
```yaml
email:
  email_index: [INDEX_EMAIL]
  delai: [DELAI_COURANT]
  objet: "[[agence_nom]] - Suivi formation [[formation_nom]]"
  corps: "<p>Bonjour...</p>"
  scenarios:
    - active: true
      format: nouveau
      objet: "[Objet pour nouvelle agence]"
      corps: "<p>[CORPS NOUVELLE AGENCE]</p>"
      cc: ""
      bcc: ""
      smtp_profile_id: ""
    - active: true
      format: existant
      objet: "[Objet pour agence existante]"
      corps: "<p>[CORPS AGENCE EXISTANTE]</p>"
      cc: ""
      bcc: ""
      smtp_profile_id: ""
    - active: true
      format: relance
      objet: "[Objet pour relance]"
      corps: "<p>[CORPS RELANCE]</p>"
      cc: ""
      bcc: ""
      smtp_profile_id: ""
```

VARIABLES disponibles (toutes entre [[ ]]):
# Agence
[[agence_nom]], [[agence_code]], [[agence_email]], [[agence_telephone]]

# Formateur
[[formateur_nom]], [[formateur_prenom]], [[formateur_email]]

# Formation
[[formation_nom]], [[formation_date_debut]], [[formation_date_fin]], [[formation_duree]]

# Suivi
[[date_prochaine_etape]], [[nb_jours_suivi]], [[score_suivi]], [[commentaire_suivi]]

# Liens
[[lien_portail]], [[lien_documentation]], [[lien_formulaire]]

CONSIGNES:
- Génère UN SEUL email de suivi avec ses scénarios complets
- Ton éducatif et professionnel, adapté au suivi d'agences
- Chaque scénario a son propre objet et corps adapté au contexte
- Ton adapté à la position de l'email dans la séquence (email #[INDEX_EMAIL])
```

## API Calls

**Pas d'appel API externe** - Le LLM est utilisé côté utilisateur sur chat.openai.com

**Validation côté client uniquement** :
- Parsing YAML via bibliothèque (js-yaml)
- Validation de structure contre le schéma `sequence.emails[]`

## Organisation des fichiers

```
frontend/
└── app/
    └── sequences-suivi-detail/
        └── js/
            └── open-ia-modal.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-suivi-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/sequences-suivi-detail/js/open-ia-modal.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-suivi-detail/js/open-ia-modal.js

export function buildPromptTemplateForEmail(idx, email) {
  // Retourne le PROMPT_TEMPLATE adapté à l'email #idx
  // avec les valeurs email_index et delai dynamiques
}

export async function validateYaml(yamlString) {
  // 1. Parser le YAML avec jsyaml
  // 2. Vérifier structure: email avec email_index, delai, objet, corps, scenarios[]
  // 3. Vérifier scenarios: active, format (nouveau/existant/relance), objet, corps
  // 4. Retourner { valid: boolean, data?: object, errors?: string[] }
}

export function applyGeneratedEmail(emailData, sequence, idx) {
  // 1. Remplacer sequence.emails[idx] par l'email généré
  // 2. Mettre à jour hasChanges
  // 3. Retourner succès
}
```

## Implementation

```javascript
// Dans le component Alpine.js

// État
promptTemplate: '',
yamlInput: '',
parsedYaml: null,
validationErrors: [],
iaStep: 'prompt', // 'prompt' | 'paste' | 'validate' | 'apply'
currentEmailIndex: null,

// Ouvrir la modale pour un email spécifique
openIaModal(idx) {
  this.currentEmailIndex = idx;
  const email = this.sequence.emails[idx];
  this.promptTemplate = this.buildPromptTemplateForEmail(idx, email);
  this.iaStep = 'prompt';
  this.yamlInput = '';
  this.parsedYaml = null;
  this.validationErrors = [];
  this.showIaModal = true;
},

// Construire le prompt spécifique à l'email
buildPromptTemplateForEmail(idx, email) {
  return `Tu es un expert en communication éducative et suivi d'agences. Génère l'email #${email.email_index} de suivi avec ses scénarios.

Structure YAML attendue:
\`\`\`yaml
email:
  email_index: ${email.email_index}
  delai: ${email.delai}
  objet: "[[agence_nom]] - Suivi formation [[formation_nom]]"
  corps: "<p>Bonjour...</p>"
  scenarios:
    - active: true
      format: nouveau
      objet: "[Objet pour nouvelle agence]"
      corps: "<p>[CORPS NOUVELLE AGENCE]</p>"
      cc: ""
      bcc: ""
      smtp_profile_id: ""
    - active: true
      format: existant
      objet: "[Objet pour agence existante]"
      corps: "<p>[CORPS AGENCE EXISTANTE]</p>"
      cc: ""
      bcc: ""
      smtp_profile_id: ""
    - active: true
      format: relance
      objet: "[Objet pour relance]"
      corps: "<p>[CORPS RELANCE]</p>"
      cc: ""
      bcc: ""
      smtp_profile_id: ""
\`\`\`

VARIABLES: [[agence_nom]], [[agence_code]], [[formateur_nom]], [[formateur_prenom]], [[formation_nom]], [[formation_date_debut]], [[date_prochaine_etape]], [[lien_portail]]

CONSIGNES:
- Génère UN SEUL email de suivi avec ses scénarios complets
- Ton éducatif et professionnel, adapté au suivi d'agences
- Chaque scénario a son propre objet et corps adapté
- Ton adapté à la position de l'email dans la séquence`;
},

// Étape 1 → 2: Copier le prompt et passer à l'étape suivante
async copyPromptAndContinue() {
  await navigator.clipboard.writeText(this.promptTemplate);
  Alpine.store('ui').addToast('Prompt copié ! Collez-le dans ChatGPT', 'success');
  this.iaStep = 'paste';
},

// Étape 2 → 3: Valider le YAML collé
goToValidation() {
  if (!this.yamlInput.trim()) {
    Alpine.store('ui').addToast('Veuillez coller la réponse YAML', 'error');
    return;
  }
  this.iaStep = 'validate';
  this.validateYamlResponse();
},

// Validation du YAML
validateYamlResponse() {
  try {
    const parsed = jsyaml.load(this.yamlInput);
    
    // Valider structure
    const validation = validateEmailStructure(parsed);
    
    if (validation.valid) {
      this.parsedYaml = parsed;
      this.validationErrors = [];
      this.iaStep = 'apply';
    } else {
      this.parsedYaml = null;
      this.validationErrors = validation.errors;
      this.iaStep = 'apply';
    }
  } catch (e) {
    this.parsedYaml = null;
    this.validationErrors = [`YAML invalide: ${e.message}`];
    this.iaStep = 'apply';
  }
},

// Étape 4: Appliquer l'email généré (remplace seulement l'email courant)
applyGeneratedEmail() {
  if (!this.parsedYaml?.email) return;
  
  const newEmail = this.parsedYaml.email;
  const idx = this.currentEmailIndex;
  
  this.sequence.emails[idx] = {
    email_index: newEmail.email_index || this.sequence.emails[idx].email_index,
    delai: newEmail.delai ?? this.sequence.emails[idx].delai,
    objet: newEmail.objet || '',
    corps: newEmail.corps || '',
    scenarios: newEmail.scenarios.map(sc => ({
      active: sc.active ?? true,
      format: sc.format,
      objet: sc.objet || newEmail.objet,
      corps: sc.corps || newEmail.corps,
      cc: sc.cc || '',
      bcc: sc.bcc || '',
      smtp_profile_id: sc.smtp_profile_id || null
    })),
    activeScenario: 0
  };
  
  this.hasChanges = true;
  this.showIaModal = false;
  Alpine.store('ui').addToast('Email généré avec ses scénarios', 'success');
}

// Fonction de validation structurelle
function validateEmailStructure(parsed) {
  const errors = [];
  
  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, errors: ['Le document doit être un objet'] };
  }
  
  if (!parsed.email || typeof parsed.email !== 'object') {
    return { valid: false, errors: ['Le document doit contenir une clé "email"'] };
  }
  
  const email = parsed.email;
  
  if (typeof email.email_index !== 'number') {
    errors.push('email.email_index manquant ou invalide');
  }
  if (typeof email.delai !== 'number') {
    errors.push('email.delai manquant ou invalide');
  }
  if (!email.objet || typeof email.objet !== 'string') {
    errors.push('email.objet manquant ou invalide');
  }
  if (!email.corps || typeof email.corps !== 'string') {
    errors.push('email.corps manquant ou invalide');
  }
  if (!Array.isArray(email.scenarios)) {
    errors.push('email.scenarios doit être un array');
  } else if (email.scenarios.length === 0) {
    errors.push('email.scenarios ne peut pas être vide');
  } else {
    const validFormats = ['nouveau', 'existant', 'relance'];
    email.scenarios.forEach((sc, idx) => {
      if (!validFormats.includes(sc.format)) {
        errors.push(`scénario #${idx + 1}: format invalide (attendu: nouveau/existant/relance)`);
      }
    });
  }
  
  return { valid: errors.length === 0, errors };
}
```

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.sequences-suivi-detail-open-ia-modal] START: Ouverture de la modale IA pour email #', idx)` |
| `prompt-built` | `console.log('[WORKFLOW.sequences-suivi-detail-open-ia-modal] STEP: Prompt template construit (longueur:', promptTemplate.length, 'caractères)')` |
| `modal-shown` | `console.log('[WORKFLOW.sequences-suivi-detail-open-ia-modal] STEP: showIaModal = true, iaStep =', this.iaStep)` |
| `yaml-validated` | `console.log('[WORKFLOW.sequences-suivi-detail-open-ia-modal] STEP: YAML validé,', this.validationErrors.length, 'erreur(s)')` |
| `end` | `console.log('[WORKFLOW.sequences-suivi-detail-open-ia-modal] SUCCESS: Workflow terminé')` |
| `error` | `console.error('[WORKFLOW.sequences-suivi-detail-open-ia-modal] ERROR:', error)` |
