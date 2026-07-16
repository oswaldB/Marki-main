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

**POST /api/test/relance**

```javascript
const response = await fetch('/api/test/relance', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${this.token}`
  },
  body: JSON.stringify({
    sequenceId: this.sequence.id,
    testEmail: this.testEmail,
    payeurId: this.selectedPayeur.id,
    emailIndex: this.emailIndex,
    scenarioType: this.selectedScenario
  })
});

// Response: { status: 200, data: { emailSent: true, to: "...", messageId: "..." } }
```



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
async testerEmail(emailIndex) {
  const workflowId = crypto.randomUUID();
  log.info('WORKFLOW_START', { workflowId, workflow: 'testerEmail', emailIndex });
  
  this.testing = true;
  this.testResult = null;
  
  try {
    const response = await fetch('/api/test/relance', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({
        sequenceId: this.sequence.id,
        testEmail: this.testEmail,
        payeurId: this.selectedPayeur.id,
        emailIndex: emailIndex,
        scenarioType: this.selectedScenario
      })
    });
    
    if (!response.ok) throw new Error('Erreur serveur');
    
    const data = await response.json();
    
    this.testResult = {
      success: data.data?.emailSent,
      message: data.data?.emailSent ? 'Email envoyé avec succès' : 'Échec de l\'envoi'
    };
    
    log.info('WORKFLOW_SUCCESS', { workflowId, emailSent: data.data?.emailSent });
    Alpine.store('ui').addToast(this.testResult.message, 'success');
    
  } catch (error) {
    log.error('WORKFLOW_ERROR', { workflowId, error: error.message });
    this.testResult = { success: false, message: error.message };
    Alpine.store('ui').addToast(error.message, 'error');
  } finally {
    this.testing = false;
  }
}
```
