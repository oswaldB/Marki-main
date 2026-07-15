# Workflow : Tester email

## Écran
`sequences-relance-detail.html`

## Élément déclencheur
Bouton avec `@click="testerEmail(idx)"`

## Action
Envoyer un email de test

## Description

Envoie un email de test pour vérifier le rendu sans impact sur les destinataires réels.

**Workflow backend** : `test-single`
- Le frontend appelle le workflow backend `test-single`
- Le backend génère l'email avec les variables du payeur sélectionné
- Le backend envoie l'email à l'adresse de test fournie
- Retour : confirmation d'envoi ou erreur

## Data Model
**Page Function:** `sequencesRelanceDetailPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `sequence`
- `etapes`
- `modeles`
- `activeTab`
- `draggingEtape`
- `editingEtape`
- `editorInstance`

**États UI:**
- `loading`
- `error`
- `saving`
- `hasChanges`
- `showEtapeModal`
- `showModeleModal`
- `showDeleteEtapeModal`

## State Changes

**Modifications:**
- `testResult` modifié

## API Calls

**Workflow backend** : `test-single`

| Méthode | Endpoint | Body | Description |
|---------|----------|------|-------------|
| `POST` | `/api/workflows/test-single/execute` | `{ email_index: number, scenario: string, destinataire: string, payeur_id: string }` | Envoie un email de test avec le scénario sélectionné |

**Données envoyées** :
- `email_index` (number) : Index de l'email à tester dans la séquence
- `scenario` (string) : Format du scénario ('single', 'multiple', 'broker', 'both')
- `destinataire` (string) : Adresse email de test
- `payeur_id` (string) : ID du payeur pour récupérer les variables

**Réponse** : `{ success: boolean, sent: boolean, preview?: object, error?: string }`



## Organisation des fichiers

```
frontend/
└── app/
    └── sequences-relance-detail/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── tester-email.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-relance-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/sequences-relance-detail/js/tester-email.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-relance-detail/js/tester-email.js
export function testerEmail() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async testConnection() {
  // 1. Set testing state
  this.testing = true;
  this.testResult = null;
  
  try {
    // 2. Call test API
    const response = await fetch('/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.testData)
    });
    
    const data = await response.json();
    
    // 3. Store result
    this.testResult = {
      success: data.success,
      message: data.success ? 'Test réussi' : data.error?.message
    };
    
    // 4. Notify
    Alpine.store('ui').addToast(
      this.testResult.message,
      data.success ? 'success' : 'error'
    );
    
  } catch (error) {
    this.testResult = { success: false, message: error.message };
    Alpine.store('ui').addToast(error.message, 'error');
  } finally {
    this.testing = false;
  }
}
```

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.sequences-relance-detail-tester-email] START: Test email pour étape', emailIndex, 'payeur', payeurId, 'vers', destinataire)` |
| `validation` | `console.log('[WORKFLOW.sequences-relance-detail-tester-email] STEP: Validation des paramètres (destinataire, payeur_id, scenario)')` |
| `api-call` | `console.log('[WORKFLOW.sequences-relance-detail-tester-email] API_CALL: POST /api/workflows/test-single/execute', {email_index, scenario, destinataire, payeur_id})` |
| `response` | `console.log('[WORKFLOW.sequences-relance-detail-tester-email] API_RESPONSE: Workflow test-single terminé', {success, sent, hasPreview: !!preview})` |
| `result-stored` | `console.log('[WORKFLOW.sequences-relance-detail-tester-email] STEP: testResult mis à jour', {success, message})` |
| `toast-notified` | `console.log('[WORKFLOW.sequences-relance-detail-tester-email] STEP: Notification toast envoyée à l\'utilisateur')` |
| `end` | `console.log('[WORKFLOW.sequences-relance-detail-tester-email] SUCCESS: Email de test envoyé en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.sequences-relance-detail-tester-email] ERROR:', error.message, {code: error.code, details: error.details})` |
