# Workflow : Générer par IA (open-ia-modal) - PouchDB

## Écran
`sequences-relance-detail.html`

## Élément déclencheur
Bouton "Générer par IA" avec `@click="openIaModal(idx)"` (à côté de chaque email)

## Action
Générer **un seul email** avec ses **4 scénarios** via ChatGPT en mode "copier-coller externe"

## Description

Génère l'email sélectionné (celui à l'index `idx`) avec les 4 scénarios complets :

### Processus en 4 étapes

1. **Étape "prompt"** : Afficher un prompt pré-construit à copier
   - Le prompt contient les instructions pour générer 1 email
   - Structure YAML attendue avec les 4 scénarios (single, multiple, broker, both)
   - Variables disponibles ([[payeur_nom]], [[nfacture]], etc.)

2. **Étape "paste"** : L'utilisateur colle la réponse YAML
   - L'utilisateur copie le prompt et le colle dans chat.openai.com
   - Copie la réponse YAML de ChatGPT
   - Colle la réponse dans le champ dédié

3. **Étape "validate"** : Validation du YAML
   - Parsing YAML via js-yaml
   - Vérification de la structure (email avec email_index, delai, objet, corps, scenarios[])
   - Vérification des 4 formats de scénarios (single, multiple, broker, both)

4. **Étape "apply"** : Application de l'email généré dans PouchDB
   - Si validation OK : remplacer l'email courant avec les 4 scénarios générés
   - Sauvegarder dans PouchDB
   - Si erreurs : afficher les erreurs et permettre correction

**Note** : Ne PAS appeler d'API ChatGPT directement. Le LLM est utilisé côté utilisateur uniquement.

## Data Model

**Page Function:** `sequencesRelanceDetailPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis/en mémoire PouchDB):**
- `sequence` - séquence depuis PouchDB
- `currentEmailIndex` (index de l'email à générer)
- `promptTemplate` (string, le prompt à copier)
- `yamlInput` (string, la réponse YAML collée par l'utilisateur)
- `parsedYaml` (object|null, résultat du parsing)
- `validationErrors` (string[], erreurs de validation structurelle)
- `showIaModal` (boolean, état de la modale)
- `iaStep` ('prompt' | 'paste' | 'validate' | 'apply')
- `db` - instance PouchDB

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
- `iaStep` = 'apply' : preview de l'email avec ses 4 scénarios + boutons "Appliquer" / "Annuler" (ou erreurs)
- **PouchDB** : `sequence.emails[idx]` ← email généré
- **PouchDB** : `db.put(sequence)` pour sauvegarder

## PouchDB Operations

**Action:** Mettre à jour un seul email de la séquence dans PouchDB.

**Méthodes utilisées:**
1. Validation YAML côté client (pas d'appel API)
2. `db.get('sequence:' + id)` - Récupérer le document avec sa révision
3. Mettre à jour `sequence.emails[idx]` avec l'email généré
4. `db.put(doc)` - Sauvegarder le document modifié

**Sync:** La modification est automatiquement synchronisée avec CouchDB.

## Prompt Template

```
Tu es un expert en relance d'impayés. Génère l'email #[INDEX_EMAIL] avec ses 4 scénarios.

Structure YAML attendue:
```yaml
email:
  email_index: [INDEX_EMAIL]
  delai: [DELAI_COURANT]
  objet: "[[payeur_civilite]] [[payeur_nom]], ..."
  corps: "<p>Bonjour...</p>"
  scenarios:
    - active: true
      format: single
      objet: "[Objet pour 1 impayé]"
      corps: "<p>[CORPS SINGLE]</p>"
      cc: ""
      bcc: ""
      smtp_profile_id: ""
    - active: true
      format: multiple
      objet: "[Objet pour plusieurs impayés]"
      corps: "<ul>[[loop impayes]]<li>[[nfacture]] - [[montant_total]]€</li>[[endloop]]</ul>"
      cc: ""
      bcc: ""
      smtp_profile_id: ""
    - active: true
      format: broker
      objet: "[Objet pour apporteur]"
      corps: "<p>[CORPS BROKER avec [[apporteur_nom]], [[apporteur_societe]]]</p>"
      cc: ""
      bcc: ""
      smtp_profile_id: ""
    - active: true
      format: both
      objet: "[Objet pour propriétaire + apporteur]"
      corps: "<p>[CORPS BOTH]</p>"
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
- Génère UN SEUL email avec ses 4 scénarios complets
- Chaque scénario a son propre objet et corps adapté au contexte
- Ton adapté à la position de l'email dans la séquence (email #[INDEX_EMAIL])
```

## API Calls

**Pas d'appel API externe** - Le LLM est utilisé côté utilisateur sur chat.openai.com

**Validation côté client uniquement** :
- Parsing YAML via bibliothèque (js-yaml)
- Validation de structure contre le schéma `sequence.emails[]`

**Sauvegarde dans PouchDB** via `db.put()`

## Organisation des fichiers

```
frontend/
└── app/
    └── sequences-relance-detail/
        └── js/
            └── open-ia-modal.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-relance-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/sequences-relance-detail/js/open-ia-modal.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-relance-detail/js/open-ia-modal.js

export function buildPromptTemplateForEmail(idx, email) {
  // Retourne le PROMPT_TEMPLATE adapté à l'email #idx
  // avec les valeurs email_index et delai dynamiques
}

export async function validateYaml(yamlString) {
  // 1. Parser le YAML avec jsyaml
  // 2. Vérifier structure: email avec email_index, delai, objet, corps, scenarios[]
  // 3. Vérifier scenarios: active, format (single/multiple/broker/both), objet, corps
  // 4. Retourner { valid: boolean, data?: object, errors?: string[] }
}

export async function applyGeneratedEmail(emailData, sequenceId, idx) {
  // 1. Récupérer le document depuis PouchDB avec sa révision
  // 2. Remplacer sequence.emails[idx] par l'email généré
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
  return `Tu es un expert en relance d'impayés. Génère l'email #${email.email_index} avec ses 4 scénarios.

Structure YAML attendue:
\`\`\`yaml
email:
  email_index: ${email.email_index}
  delai: ${email.delai}
  objet: "[[payeur_civilite]] [[payeur_nom]], ..."
  corps: "<p>Bonjour...</p>"
  scenarios:
    - active: true
      format: single
      objet: "[Objet pour 1 impayé]"
      corps: "<p>[CORPS SINGLE]</p>"
      cc: ""
      bcc: ""
      smtp_profile_id: ""
    - active: true
      format: multiple
      objet: "[Objet pour plusieurs impayés]"
      corps: "<ul>[[loop impayes]]<li>[[nfacture]] - [[montant_total]]€</li>[[endloop]]</ul>"
      cc: ""
      bcc: ""
      smtp_profile_id: ""
    - active: true
      format: broker
      objet: "[Objet pour apporteur]"
      corps: "<p>[CORPS BROKER]</p>"
      cc: ""
      bcc: ""
      smtp_profile_id: ""
    - active: true
      format: both
      objet: "[Objet pour propriétaire + apporteur]"
      corps: "<p>[CORPS BOTH]</p>"
      cc: ""
      bcc: ""
      smtp_profile_id: ""
\`\`\`

VARIABLES: [[payeur_civilite]], [[payeur_nom]], [[payeur_prenom]], [[payeur_email]], [[proprietaire_nom]], [[proprietaire_prenom]], [[apporteur_nom]], [[apporteur_societe]], [[nfacture]], [[montant_total]], [[reste_a_payer]], [[date_echeance]], [[numero_dossier]], [[adresse_bien]]

CONSIGNES:
- Génère UN SEUL email avec ses 4 scénarios complets
- Chaque scénario a son propre objet et corps adapté
- Ton adapté à la position de l'email dans la séquence`;
},

// Étape 1 → 2: Copier le prompt et passer à l'étape suivante
async copyPromptAndContinue() {
  await navigator.clipboard.writeText(this.promptTemplate);
  this.toast('Prompt copié ! Collez-le dans ChatGPT', 'success');
  this.iaStep = 'paste';
},

// Étape 2 → 3: Valider le YAML collé
goToValidation() {
  if (!this.yamlInput.trim()) {
    this.toast('Veuillez coller la réponse YAML', 'error');
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

// Étape 4: Appliquer l'email généré (remplace seulement l'email courant) dans PouchDB
async applyGeneratedEmail() {
  if (!this.parsedYaml?.email) return;
  
  this.loading = true;
  
  try {
    // 1. Récupérer le document depuis PouchDB avec sa révision
    const doc = await db.get('sequence:' + this.sequenceId);
    
    // 2. Préparer l'email
    const newEmail = this.parsedYaml.email;
    const idx = this.currentEmailIndex;
    
    // 3. Mettre à jour l'email dans le tableau
    doc.emails[idx] = {
      email_index: newEmail.email_index || doc.emails[idx].email_index,
      delai: newEmail.delai ?? doc.emails[idx].delai,
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
    
    doc.updated_at = new Date().toISOString();
    
    // 4. Sauvegarder dans PouchDB
    const response = await db.put(doc);
    
    // 5. Mettre à jour l'UI
    this.sequence = { ...doc, _rev: response.rev };
    this.etapes = [...doc.emails];
    this.hasChanges = false;
    this.showIaModal = false;
    
    this.toast('Email généré avec ses 4 scénarios', 'success');
    
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
  } else if (email.scenarios.length !== 4) {
    errors.push(`email.scenarios doit contenir exactement 4 scénarios (trouvé: ${email.scenarios.length})`);
  } else {
    const validFormats = ['single', 'multiple', 'broker', 'both'];
    email.scenarios.forEach((sc, idx) => {
      if (!validFormats.includes(sc.format)) {
        errors.push(`scénario #${idx + 1}: format invalide (attendu: single/multiple/broker/both)`);
      }
    });
  }
  
  return { valid: errors.length === 0, errors };
}
```

## Notes

- **Pas d'API ChatGPT directe** : L'utilisateur copie-colle manuellement
- **Validation YAML** : Côté client uniquement avec js-yaml
- **Persistence PouchDB** : L'email est sauvegardé dans PouchDB après validation
- **Gestion des conflits** : Détection `_rev` côté client si modification concurrente
- **Sync automatique** : Les changements sont synchronisés avec CouchDB

---

## Migration depuis l'ancienne architecture

| Aspect | Avant | Après (PouchDB) |
|--------|-------|-----------------|
| Génération ChatGPT | Copier-coller manuel (inchangé) | **Conservé** - Copier-coller |
| Validation YAML | Côté client (js-yaml) | **Conservé** - Côté client |
| Persistence | API `PUT /api/sequences/:id` | `db.get()` + `db.put()` |
| Sauvegarde email | Backend SQLite | PouchDB local + sync |
| Latence sauvegarde | ~200-500ms | ~10-50ms (local) |
| Offline | ❌ Impossible | ⚠️ Génération offline possible, sauvegarde différée |
