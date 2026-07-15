# Workflow : Créer utilisateur

## Écran
`settings-utilisateurs.html`

## Élément déclencheur
Bouton avec `@click="createUser()"`

## Action
Valider la création

## Description
- Valide les champs
- Crée l'utilisateur
- Ferme le modal

## Data Model
**Page Function:** `settingsUtilisateursPage()`

**Stores Alpine.js:**
- $store.ui
- $store.auth

**Données:**
- `utilisateurs`
- `roles`
- `searchQuery`
- `filterRole`
- `userForm`

**États UI:**
- `loading`
- `error`
- `showUserModal`
- `showDeleteModal`
- `showPermissionsModal`
- `editingUser`
- `deletingUser`

## State Changes

**Modifications:**
- `showUserModal` passe à false
- `utilisateurs` mis à jour
- `error` ← message si échec

## API Calls

**Endpoint:** `POST /api/users`

**Payload:**
```json
{
  "nom": string,
  "email": string,
  "role": "admin" | "diagnostiqueur" | "assistant",
  "actif": boolean
}
```

**Response:** `ApiResponse<User>`

## Organisation des fichiers

```
frontend/
└── app/
    └── settings-utilisateurs/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── create-user.js
```

### Fichier principal
- **HTML** : `frontend/app/settings-utilisateurs/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/settings-utilisateurs/js/create-user.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/settings-utilisateurs/js/create-user.js
export function createUser() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async createUser() {
  // 1. Validate form
  if (!this.validateForm()) {
    return;
  }
  
  // 2. Set loading state
  this.loading = true;
  this.error = null;
  
  try {
    // 3. Call API
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.userForm)
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message);
    }
    
    // 4. Update local data
    this.utilisateurs.unshift(data.data);
    
    // 5. Close modal
    this.showUserModal = false;
    this.resetUserForm();
    
    // 6. Notify success
    Alpine.store('ui').addToast('Utilisateur créé', 'success');
    
  } catch (error) {
    this.error = error.message;
    Alpine.store('ui').addToast(error.message, 'error');
  } finally {
    this.loading = false;
  }
}
```

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.settings-utilisateurs-create-user] START: Création utilisateur - email:', this.userForm.email)` |
| `validation` | `console.log('[WORKFLOW.settings-utilisateurs-create-user] STEP: Validation du formulaire OK')` |
| `api-call` | `console.log('[WORKFLOW.settings-utilisateurs-create-user] API_CALL: POST /api/users', this.userForm)` |
| `api-response` | `console.log('[WORKFLOW.settings-utilisateurs-create-user] API_RESPONSE: status', response.status, 'data', data)` |
| `state-updated` | `console.log('[WORKFLOW.settings-utilisateurs-create-user] STEP: utilisateurs mis à jour, total =', this.utilisateurs.length)` |
| `end` | `console.log('[WORKFLOW.settings-utilisateurs-create-user] SUCCESS: Utilisateur créé en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.settings-utilisateurs-create-user] ERROR:', error)` |
