# Workflow : Tester email suivi

## Écran
`sequences-suivi-detail.html`

## Élément déclencheur
Bouton avec `@click="testerEmail(idx)"`

## Action
Envoyer un email de test

## Description
- Teste l'email de suivi
- Envoie à une adresse de test

## Data Model
**Page Function:** `sequencesSuiviDetailPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `sequence`
- `etapes`
- `typeRelanceOptions`
- `selectedType`

**États UI:**
- `loading`
- `error`
- `saving`

## State Changes

**Modifications:**
- `testResult` modifié

## API Calls

**Endpoint:** `POST /api/sequences-suivi-detail/test`

**Payload:** selon contexte

**Response:** `ApiResponse<T>`



## Organisation des fichiers

```
frontend/
└── app/
    └── sequences-suivi-detail/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── tester-email.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-suivi-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/sequences-suivi-detail/js/tester-email.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-suivi-detail/js/tester-email.js
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
``