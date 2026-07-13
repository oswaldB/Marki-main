# Workflow : Tester profil SMTP

## Écran
`settings-smtp.html`

## Élément déclencheur
Lien avec `@click="testerProfil(profil)"`

## Action
Tester la connexion SMTP

## Description
- Envoie un email de test
- Vérifie la configuration
- Affiche le résultat

## Data Model
**Page Function:** `settingsSmtpPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `profils`
- `newProfil`
- `testingProfil`
- `testResult`

**États UI:**
- `loading`
- `error`
- `showNewProfilForm`
- `testingProfil`

## State Changes

**Modifications:**
- `testingProfil` modifié
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

**Note** : Le workflow backend utilise `nodemailer` pour vérifier la connexion et envoyer un email de test.



## Organisation des fichiers

```
frontend/
└── app/
    └── settings-smtp/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── test-profil.js
```

### Fichier principal
- **HTML** : `frontend/app/settings-smtp/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/settings-smtp/js/test-profil.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/settings-smtp/js/test-profil.js
export function testProfil() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async testerProfil(profil) {
  // 1. Set testing state
  this.testingProfil = profil.id;
  this.testResult = null;
  
  try {
    // 2. Call test API
    const response = await fetch('/functions/testSmtpProfile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId: profil.id })
    });
    
    const data = await response.json();
    
    // 3. Store result
    this.testResult = {
      profilId: profil.id,
      success: data.success,
      message: data.message || (data.success ? 'Test réussi' : data.error?.message)
    };
    
    // 4. Notify
    Alpine.store('ui').addToast(
      this.testResult.message,
      data.success ? 'success' : 'error'
    );
    
  } catch (error) {
    this.testResult = { profilId: profil.id, success: false, message: error.message };
    Alpine.store('ui').addToast(error.message, 'error');
  } finally {
    this.testingProfil = null;
  }
}
```
