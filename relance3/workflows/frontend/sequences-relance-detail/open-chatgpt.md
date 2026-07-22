# Workflow : Générer avec ChatGPT (bouton robot) - PouchDB

## Écran
`sequences-relance-detail.html`

## Élément déclencheur
Bouton robot avec `@click="openChatGpt()"` (en haut de la section emails)

## Action
Générer une séquence complète d'emails via ChatGPT en mode "copier-coller externe"

## Description

Génère **tous les emails** de la séquence (7 emails) via ChatGPT sans appel API direct :

### Processus en 4 étapes

1. **Étape "prompt"** : Afficher un prompt pré-construit à copier
   - Le prompt contient les instructions pour générer 7 emails
   - Structure YAML attendue avec les 4 scénarios par email
   - Variables disponibles ([[payeur_nom]], [[nfacture]], etc.)

2. **Étape "paste"** : L'utilisateur colle la réponse YAML
   - L'utilisateur copie le prompt et le colle dans chat.openai.com
   - Copie la réponse YAML de ChatGPT
   - Colle la réponse dans le champ dédié

3. **Étape "validate"** : Validation du YAML
   - Parsing YAML via js-yaml
   - Vérification de la structure (emails[] avec email_index, delai, objet, corps, scenarios[])
   - Vérification des 4 formats de scénarios (single, multiple, broker, both)

4. **Étape "apply"** : Application des emails générés dans PouchDB
   - Si validation OK : remplacer sequence.emails par les emails générés
   - Sauvegarder dans PouchDB
   - Si erreurs : afficher les erreurs et permettre correction

**Note** : Ne PAS appeler d'API ChatGPT directement. Le LLM est utilisé côté utilisateur uniquement.

## Data Model

**Page Function:** `sequencesRelanceDetailPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis/en mémoire PouchDB):**
- `sequence` - séquence depuis PouchDB
- `promptTemplate` (string, le prompt à copier)
- `yamlInput` (string, la réponse YAML collée par l'utilisateur)
- `parsedYaml` (object|null, résultat du parsing)
- `validationErrors` (string[], erreurs de validation structurelle)
- `showChatGptModal` (boolean, état de la modale)
- `chatGptStep` ('prompt' | 'paste' | 'validate' | 'apply')
- `db` - instance PouchDB

**États UI:**
- `loading`
- `error`
- `saving`
- `hasChanges`
- `showChatGptModal`
- `chatGptStep`

## State Changes

**Modifications:**
- `showChatGptModal` passe à `true` à l'ouverture
- `chatGptStep` = 'prompt' : affiche le prompt à copier + bouton "Copier le prompt"
- `chatGptStep` = 'paste' : affiche instructions + textarea pour coller YAML + bouton "Valider"
- `chatGptStep` = 'validate' : spinner de validation + parsing YAML
- `chatGptStep` = 'apply' : preview des emails générés + boutons "Appliquer" / "Annuler" (ou erreurs)
- **PouchDB** : `sequence.emails` ← emails générés
- **PouchDB** : `db.put(sequence)` pour sauvegarder

## PouchDB Operations

**Action:** Mettre à jour la séquence avec les emails générés dans PouchDB.

**Méthodes utilisées:**
1. Validation YAML côté client (pas d'appel API)
2. `db.get('sequence:' + id)` - Récupérer le document avec sa révision
3. Mettre à jour `sequence.emails` avec les emails générés
4. `db.put(doc)` - Sauvegarder le document modifié

**Sync:** La modification est automatiquement synchronisée avec CouchDB.

## Prompt Template

```
Tu es un expert en relance d'impayés. Génère 7 emails différents pour une séquence de relance.

Pour CHAQUE email, fournis les 4 formats de scénario:
- single : 1 impayé
- multiple : plusieurs impayés
- broker : apporteur d'affaire
- both : impayés + apporteur

Structure YAML exacte attendue:
```yaml
emails:
  - email_index: 1
    delai: -7
    objet: "[[payeur_civilite]] [[payeur_nom]], relance facture [[nfacture]]"
    corps: "<p>Bonjour...</p>"
    scenarios:
      - active: true
        format: single
        objet: "..."
        corps: "..."
        cc: ""
        bcc: ""
        smtp_profile_id: ""
      - active: true
        format: multiple
        objet: "..."
        corps: "<ul>[[loop impayes]]<li>[[nfacture]] - [[montant_total]]€</li>[[endloop]]</ul>"
        cc: ""
        bcc: ""
        smtp_profile_id: ""
      - active: true
        format: broker
        objet: "..."
        corps: "..."
        cc: ""
        bcc: ""
        smtp_profile_id: ""
      - active: true
        format: both
        objet: "..."
        corps: "..."
        cc: ""
        bcc: ""
        smtp_profile_id: ""
```

VARIABLES disponibles (toutes entre [[ ]]):
# Payeur
[[payeur_civilite]], [[payeur_nom]], [[payeur_prenom]], [[payeur_email]], [[payeur_telephone]]

# Propriétaire  
[[proprietaire_nom]], [[proprietaire_prenom]]

# Apporteur
[[apporteur_nom]], [[apporteur_societe]]

# Facture / Impayé
[[nfacture]], [[montant_total]], [[reste_a_payer]], [[date_echeance]], [[total_ht]], [[total_ttc]]

# Dossier / Bien
[[numero_dossier]], [[adresse_bien]], [[code_postal]], [[ville]], [[reference]]

# Liens
[[lien_pdf]], [[lien_espace]], [[lien_paiement]]

# Loop (pour plusieurs impayés)
[[loop impayes]] ... [[nfacture]], [[montant_total]], [[date_echeance]] ... [[endloop]]

CONSIGNES:
- Génère EXACTEMENT 7 emails
- Délai négatif = avant échéance (ex: -7), positif = après échéance (ex: 7, 30, 60)
- Ton progressif : cordial (emails 1-2) → ferme (emails 3-5) → mise en demeure (emails 6-7)
- Chaque email doit avoir ses 4 scénarios complets
- Le corps peut contenir du HTML (<p>, <ul>, <li>, <strong>, etc.)
- Ne pas inclure de style CSS inline
```

## API Calls

**Pas d'appel API externe** - Le LLM est utilisé côté utilisateur sur chat.openai.com

**Validation côté client uniquement** :
- Parsing YAML via bibliothèque (js-yaml)
- Validation de structure contre le schéma `sequences.emails`

**Sauvegarde dans PouchDB** via `db.put()`

## Organisation des fichiers

```
frontend/
└── app/
    └── sequences-relance-detail/
        └── js/
            └── open-chatgpt.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-relance-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/sequences-relance-detail/js/open-chatgpt.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-relance-detail/js/open-chatgpt.js

export function buildPromptTemplate() {
  // Retourne le PROMPT_TEMPLATE ci-dessus
}

export async function validateYaml(yamlString) {
  // 1. Parser le YAML avec jsyaml
  // 2. Vérifier structure: emails[] avec email_index, delai, objet, corps, scenarios[]
  // 3. Vérifier scenarios: active, format (single/multiple/broker/both), objet, corps
  // 4. Retourner { valid: boolean, data?: object, errors?: string[] }
}

export async function applyGeneratedEmails(emailsData, sequenceId) {
  // 1. Récupérer le document depuis PouchDB avec sa révision
  // 2. Remplacer sequence.emails par les emails générés
  // 3. Sauvegarder dans PouchDB avec db.put()
  // 4. Retourner succès
}
```

## Implementation (PouchDB)

```javascript
// Dans le component Alpine.js

// État
promptTemplate: '',
yamlInput: '',
parsedYaml: null,
validationErrors: [],
chatGptStep: 'prompt', // 'prompt' | 'paste' | 'validate' | 'apply'

// Ouvrir la modale (étape 1: afficher le prompt)
openChatGpt() {
  this.promptTemplate = this.buildPromptTemplate();
  this.chatGptStep = 'prompt';
  this.yamlInput = '';
  this.parsedYaml = null;
  this.validationErrors = [];
  this.showChatGptModal = true;
},

// Construire le prompt avec toutes les variables
buildPromptTemplate() {
  return PROMPT_TEMPLATE; // Voir section Prompt Template
},

// Étape 1 → 2: Copier le prompt et passer à l'étape suivante
async copyPromptAndContinue() {
  await navigator.clipboard.writeText(this.promptTemplate);
  this.toast('Prompt copié ! Collez-le dans ChatGPT', 'success');
  this.chatGptStep = 'paste';
},

// Étape 2 → 3: Valider le YAML collé
goToValidation() {
  if (!this.yamlInput.trim()) {
    this.toast('Veuillez coller la réponse YAML', 'error');
    return;
  }
  this.chatGptStep = 'validate';
  this.validateYamlResponse();
},

// Validation du YAML
validateYamlResponse() {
  try {
    // Parser YAML
    const parsed = jsyaml.load(this.yamlInput);
    
    // Valider structure
    const validation = validateEmailsStructure(parsed);
    
    if (validation.valid) {
      this.parsedYaml = parsed;
      this.validationErrors = [];
      this.chatGptStep = 'apply';
    } else {
      this.parsedYaml = null;
      this.validationErrors = validation.errors;
      this.chatGptStep = 'apply';
    }
  } catch (e) {
    this.parsedYaml = null;
    this.validationErrors = [`YAML invalide: ${e.message}`];
    this.chatGptStep = 'apply';
  }
},

// Étape 4: Appliquer les emails générés dans PouchDB
async applyGeneratedEmails() {
  if (!this.parsedYaml?.emails?.length) return;
  
  this.loading = true;
  
  try {
    // 1. Récupérer le document depuis PouchDB avec sa révision
    const doc = await db.get('sequence:' + this.sequenceId);
    
    // 2. Préparer les emails
    const newEmails = this.parsedYaml.emails.map((email, idx) => ({
      email_index: email.email_index || idx + 1,
      delai: email.delai ?? (idx * 7),
      objet: email.objet || '',
      corps: email.corps || '',
      scenarios: (email.scenarios || []).map(sc => ({
        active: sc.active ?? true,
        format: sc.format,
        objet: sc.objet || email.objet,
        corps: sc.corps || email.corps,
        cc: sc.cc || '',
        bcc: sc.bcc || '',
        smtp_profile_id: sc.smtp_profile_id || null
      })),
      activeScenario: 0
    }));
    
    // 3. Mettre à jour le document
    doc.emails = newEmails;
    doc.updated_at = new Date().toISOString();
    
    // 4. Sauvegarder dans PouchDB
    const response = await db.put(doc);
    
    // 5. Mettre à jour l'UI
    this.sequence = { ...doc, _rev: response.rev };
    this.etapes = newEmails;
    this.hasChanges = false;
    this.showChatGptModal = false;
    
    this.toast(`${newEmails.length} emails générés et sauvegardés`, 'success');
    
  } catch (error) {
    if (error.status === 409) {
      this.error = 'Conflit de version, veuillez réessayer';
      this.toast('Conflit de version', 'error');
    } else {
      this.error = error.message;
      this.toast(error.message, 'error');
    }
  } finally {
    this.loading = false;
  }
}

// Fonction de validation structurelle
function validateEmailsStructure(parsed) {
  const errors = [];
  
  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, errors: ['Le document doit être un objet'] };
  }
  
  if (!Array.isArray(parsed.emails)) {
    return { valid: false, errors: ['Le document doit contenir une clé "emails" (array)'] };
  }
  
  if (parsed.emails.length === 0) {
    return { valid: false, errors: ['Le tableau emails ne peut pas être vide'] };
  }
  
  const validFormats = ['single', 'multiple', 'broker', 'both'];
  
  parsed.emails.forEach((email, idx) => {
    const prefix = `Email #${idx + 1}:`;
    
    if (typeof email.email_index !== 'number') {
      errors.push(`${prefix} email_index manquant ou invalide`);
    }
    if (typeof email.delai !== 'number') {
      errors.push(`${prefix} delai manquant ou invalide`);
    }
    if (!email.objet || typeof email.objet !== 'string') {
      errors.push(`${prefix} objet manquant ou invalide`);
    }
    if (!email.corps || typeof email.corps !== 'string') {
      errors.push(`${prefix} corps manquant ou invalide`);
    }
    if (!Array.isArray(email.scenarios)) {
      errors.push(`${prefix} scenarios doit être un array`);
    } else {
      email.scenarios.forEach((sc, sIdx) => {
        const scPrefix = `${prefix} scenario #${sIdx + 1}:`;
        if (!validFormats.includes(sc.format)) {
          errors.push(`${scPrefix} format invalide (attendu: single/multiple/broker/both)`);
        }
      });
    }
  });
  
  return { valid: errors.length === 0, errors };
}
```

## Notes

- **Pas d'API ChatGPT directe** : L'utilisateur copie-colle manuellement
- **Validation YAML** : Côté client uniquement avec js-yaml
- **Persistence PouchDB** : Les emails sont sauvegardés dans PouchDB après validation
- **Gestion des conflits** : Détection `_rev` côté client si modification concurrente
- **Sync automatique** : Les changements sont synchronisés avec CouchDB

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB) |
|--------|-------|-----------------|
| Génération ChatGPT | Copier-coller manuel (inchangé) | **Conservé** - Copier-coller |
| Validation YAML | Côté client (js-yaml) | **Conservé** - Côté client |
| Persistence | API `PUT /api/sequences/:id` | `db.get()` + `db.put()` |
| Sauvegarde emails | Backend SQLite | PouchDB local + sync |
| Latence sauvegarde | ~200-500ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ⚠️ Génération offline possible, sauvegarde différée |
