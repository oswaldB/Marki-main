# Workflow : Tester connexion SMTP

## Écran
`settings-smtp-detail.html`

## Élément déclencheur
Bouton avec `@click="testerConnexion()"`

## Action
Tester la connexion au serveur

## Description
- Vérifie les paramètres
- Tente une connexion
- Affiche le résultat

## Data Model
**Page Function:** `settingsSmtpDetailPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `profil`
- `historique`
- `stats`
- `activeTab`
- `editedProfil`

**États UI:**
- `loading`
- `error`
- `saving`
- `editMode`

## State Changes

**Modifications:**
- `testResult` modifié

## API Calls

**`POST /functions/testSmtpProfile`** - Appelle le workflow backend pour tester le profil SMTP

**Payload:**
```json
{
  "profileId": "smtp_abc123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Connexion SMTP testée avec succès. Email envoyé."
}
```

**Note** : Même workflow backend que `settings-smtp/test-profil.md`.



## Organisation des fichiers

```
frontend/
└── app/
    └── settings-smtp-detail/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── tester-connexion.js
```

### Fichier principal
- **HTML** : `frontend/app/settings-smtp-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/settings-smtp-detail/js/tester-connexion.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/settings-smtp-detail/js/tester-connexion.js
export function testerConnexion() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async testerConnexion() {
  // 1. Set testing state
  this.testing = true;
  this.testResult = null;
  
  try {
    // 2. Call test API
    const response = await fetch('/functions/testSmtpProfile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId: this.profil.id })
    });
    
    const data = await response.json();
    
    // 3. Store result
    this.testResult = {
      success: data.success,
      message: data.message || (data.success ? 'Test réussi' : data.error?.message)
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
| `start` | `console.log('[WORKFLOW.settings-smtp-detail-tester-connexion] START: Test de la connexion SMTP pour le profil', this.profil.id)` |
| `validation` | `console.log('[WORKFLOW.settings-smtp-detail-tester-connexion] STEP: Validation des paramètres du profil', {host: this.profil.host, port: this.profil.port})` |
| `state-reset` | `console.log('[WORKFLOW.settings-smtp-detail-tester-connexion] STEP: testing = true, testResult réinitialisé à null')` |
| `api-call` | `console.log('[WORKFLOW.settings-smtp-detail-tester-connexion] API_CALL: POST /functions/testSmtpProfile', {profileId: this.profil.id})` |
| `response` | `console.log('[WORKFLOW.settings-smtp-detail-tester-connexion] API_RESPONSE: Réponse reçue', {success: data.success, message: data.message})` |
| `state-applied` | `console.log('[WORKFLOW.settings-smtp-detail-tester-connexion] DATA: État après test:', {testResult: this.testResult, testing: this.testing})` |
| `end` | `console.log('[WORKFLOW.settings-smtp-detail-tester-connexion] SUCCESS: Test de connexion SMTP terminé en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.settings-smtp-detail-tester-connexion] ERROR:', error.message)` |
