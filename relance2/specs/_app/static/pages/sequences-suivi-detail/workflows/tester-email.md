# Workflow : Tester email suivi

## Écran
`sequences-suivi-detail.html`

## Élément déclencheur
Bouton avec `@click="testerEmail(idx)"`

## Action
Envoyer un email de test

## Description

Envoie un email de test pour vérifier le rendu sans impact sur les destinataires réels.

**Workflow backend** : `test-single-suivi`
- Le frontend appelle le workflow backend `test-single-suivi`
- Le backend génère l'email avec les variables du contact (agence) sélectionné
- Le backend envoie l'email à l'adresse de test fournie
- Retour : confirmation d'envoi ou erreur

- Teste l'email de suivi
- Envoie à une adresse de test

## Data Model

**Page Function:** `sequencesSuiviDetailPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `sequence`
- `testEmailConfig` : `{ destinataire: string, contactId: string, emailIndex: number, scenarioType: string }`
- `envoiEnCours`

**États UI:**
- `loading`
- `error`
- `saving`
- `envoiEnCours`

## State Changes

**Modifications:**
- `envoiEnCours` passe à `true` pendant l'envoi
- Toast 'Envoi en cours...' (info) au début
- Toast 'Email de test envoyé' (succès) ou message d'erreur
- `envoiEnCours` passe à `false` à la fin

## API Calls

**Workflow backend** : `test-single-suivi`

| Méthode | Endpoint | Body | Description |
|---------|----------|------|-------------|
| `POST` | `/api/test/suivi` | `{ sequenceId: string, testEmail: string, contactId: string, emailIndex: number, scenarioType: string }` | Envoie un email de test de suivi |

**Données envoyées** :
- `sequenceId` (string) : ID de la séquence de suivi
- `testEmail` (string) : Adresse email de test (destinataire)
- `contactId` (string) : ID du contact (agence)
- `emailIndex` (number) : Index de l'email dans la séquence
- `scenarioType` (string) : Type de scénario (`suivi_agence`, `suivi_proprietaire`, etc.)

**Réponse** : `{ status: number, data?: object, error?: string }`

**Structure de la réponse** :
```javascript
{
  "status": 200,
  "data": {
    "emailSent": true,
    "from": "Test (Test Suivi) <comptabilite@adti06.com>",
    "to": "test@example.com",
    "smtpProfile": "EX'IM - comptabilité",
    "metadata": {
      "sequenceId": "seq_xxx",
      "emailIndex": 0,
      "contactId": "cont_xxx",
      "typeSequence": "suivi",
      "scenarioType": "suivi_agence",
      "impayesCount": 17,
      "sentAt": "2026-07-10T14:30:00.000Z",
      "messageId": "<abc123@mail.infomaniak.com>"
    }
  }
}
```

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
async testerEmail(idx) {
  // 1. Set testing state
  this.envoiEnCours = true;
  this.currentEmailIndex = idx;
  
  try {
    // 2. Call workflow backend test-single-suivi
    const response = await fetch('/api/test/suivi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sequenceId: this.sequence.id,
        testEmail: this.testEmailConfig.destinataire,
        contactId: this.testEmailConfig.contactId,
        emailIndex: idx,
        scenarioType: this.sequence.emails[idx].activeScenario || 'suivi_agence'
      })
    });
    
    const data = await response.json();
    
    // 3. Handle response
    if (data.status === 200 && data.data?.emailSent) {
      Alpine.store('ui').addToast(
        `Email de test envoyé à ${data.data.to}`, 
        'success'
      );
    } else {
      throw new Error(data.error || 'Erreur lors de l\'envoi');
    }
    
  } catch (error) {
    Alpine.store('ui').addToast(error.message, 'error');
  } finally {
    // 4. Reset state
    this.envoiEnCours = false;
  }
}

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.sequences-suivi-detail-tester-email] START: Test email de suivi pour', {sequenceId: this.sequence.id, contactId: this.testEmailConfig.contactId, emailIndex: idx})` |
| `validation` | `console.log('[WORKFLOW.sequences-suivi-detail-tester-email] STEP: Validation de l\'adresse email destinataire:', this.testEmailConfig.destinataire)` |
| `state-testing` | `console.log('[WORKFLOW.sequences-suivi-detail-tester-email] STEP: envoiEnCours = true, currentEmailIndex =', idx)` |
| `api-call` | `console.log('[WORKFLOW.sequences-suivi-detail-tester-email] API_CALL: POST /api/test/suivi', {sequenceId: this.sequence.id, testEmail: this.testEmailConfig.destinataire, contactId: this.testEmailConfig.contactId, emailIndex: idx, scenarioType: this.sequence.emails[idx].activeScenario \|\| 'suivi_agence'})` |
| `response` | `console.log('[WORKFLOW.sequences-suivi-detail-tester-email] API_RESPONSE: Réponse reçue du backend', data)` |
| `end` | `console.log('[WORKFLOW.sequences-suivi-detail-tester-email] SUCCESS: Email de test envoyé à', data.data.to, 'en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.sequences-suivi-detail-tester-email] ERROR:', error)` |
```
