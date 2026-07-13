# Workflow : Soumission authentification

## Écran
`login.html`

## Élément déclencheur
Formulaire de connexion (submit)

## Action
Soumettre les identifiants utilisateur pour authentification

## Description
- Récupère email et mot de passe saisis
- Valide le format de l'email
- Appelle l'API d'authentification
- Redirige vers `/dashboard` en cas de succès
- Affiche message d'erreur en cas d'échec

## Data Model
**Page Function:** `loginPage()`

**Stores Alpine.js:**
- $store.auth
- $store.ui

**Données:**
- `form`

**États UI:**
- `loading`
- `error`

## State Changes

**Modifications:**
- `loading` → `true` → `false`
- `error` ← message si échec

## API Calls

**Endpoint:** `POST /api/auth/login`

**Payload:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "user_001",
      "username": "string",
      "name": "string",
      "role": "admin|user"
    }
  }
}
```
## Organisation des fichiers

```
frontend/
└── app/
    └── login/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── auth-submit.js
```

### Fichier principal
- **HTML** : `frontend/app/login/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/login/js/auth-submit.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/login/js/auth-submit.js
export function authSubmit() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async handleLogin() {
  // 1. Validate form
  if (!this.form.username || !this.form.password) {
    this.error = 'Veuillez remplir tous les champs';
    return;
  }
  
  // 2. Set loading
  this.loading = true;
  this.error = null;
  
  try {
    // 3. Call auth API
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.form)
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message || 'Échec de connexion');
    }
    
    // 4. Store auth data
    Alpine.store('auth').token = data.data.token;
    Alpine.store('auth').user = data.data.user;
    Alpine.store('auth').isAuthenticated = true;
    
    // 5. Persist token
    localStorage.setItem('token', data.data.token);
    
    // 6. Redirect
    window.location.href = '/dashboard';
    
  } catch (error) {
    this.error = error.message;
  } finally {
    this.loading = false;
  }
}
``

## Navigation
- **Cible** : `/dashboard`
- **Condition** : Authentification réussie
