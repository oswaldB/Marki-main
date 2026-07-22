# Workflow : Créer profil SMTP

## Écran
`settings-smtp.html`

## Élément déclencheur
Bouton avec `@click="createProfil()"`

## Action
Valider la création du profil

## Description
- Valide tous les champs
- Crée le profil en base
- Ferme le formulaire

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
- `showNewProfilForm` passe à false
- `profils` mis à jour
- `error` ← message si échec

## API Calls

**Endpoint:** `POST /api/smtp-profiles`

**Payload:**
```json
{
  "nom": string,
  "email": string,
  "host": string,
  "port": number,
  "secure": boolean,
  "username": string,
  "password": string,
  "from_email": string,
  "from_name": string
}
```

**Response:** `ApiResponse<SmtpProfile>`

## Organisation des fichiers

```
frontend/
└── app/
    └── settings-smtp/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── create-profil.js
```

### Fichier principal
- **HTML** : `frontend/app/settings-smtp/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/settings-smtp/js/create-profil.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/settings-smtp/js/create-profil.js
export function createProfil() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async createProfil() {
  // 1. Validate form
  if (!this.validateForm()) {
    return;
  }
  
  // 2. Set loading state
  this.loading = true;
  this.error = null;
  
  try {
    // 3. Call API
    const response = await fetch('/api/smtp-profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.newProfil)
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message);
    }
    
    // 4. Update local data
    this.profils.unshift(data.data);
    
    // 5. Close form
    this.showNewProfilForm = false;
    this.resetNewProfil();
    
    // 6. Notify success
    Alpine.store('ui').addToast('Profil SMTP créé', 'success');
    
  } catch (error) {
    this.error = error.message;
    Alpine.store('ui').addToast(error.message, 'error');
  } finally {
    this.loading = false;
  }
}
```
