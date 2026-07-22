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
- Appelle l'**API d'authentification** (conservée - pas de PouchDB pour l'auth)
- Initialise PouchDB après connexion réussie
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

**⚠️ Note importante :** L'authentification conserve son API backend car elle nécessite une vérification serveur des identifiants. PouchDB n'est utilisé qu'après connexion réussie.

**POST /api/auth/login**

```javascript
// Requête
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@marki.fr",
  "password": "votre-mot-de-passe"
}

// Réponse 200
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user_xxx",
    "username": "admin",
    "email": "admin@marki.fr",
    "role": "admin"
  }
}

// Réponse 401
{
  "error": "Identifiants invalides"
}
```

## PouchDB Initialisation (après login)

```javascript
// Après connexion réussie, initialiser PouchDB
async initPouchDBAfterLogin() {
  const remoteUrl = 'https://admin:admin@dev.markidiags.com/data/marki';
  
  // Créer les bases locales
  const db = new PouchDB('marki-factures');
  const dbContacts = new PouchDB('marki-contacts');
  const dbEvents = new PouchDB('marki-events');
  
  // Configurer le sync avec authentification
  const syncOptions = {
    live: true,
    retry: true,
    headers: {
      'Authorization': `Bearer ${Alpine.store('auth').token}`
    }
  };
  
  db.sync(remoteUrl, syncOptions);
  dbContacts.sync(remoteUrl, syncOptions);
  dbEvents.sync(remoteUrl, syncOptions);
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

### Fichier workflow
- **JS** : `frontend/app/login/js/auth-submit.js`

```javascript
// frontend/app/login/js/auth-submit.js
export async function authSubmit(email, password) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Échec de connexion');
  }
  
  return await response.json();
}
```

## Implementation

```javascript
async handleLogin() {
  // 1. Validate form
  if (!this.form.email || !this.form.password) {
    this.error = 'Veuillez remplir tous les champs';
    return;
  }
  
  // 2. Set loading
  this.loading = true;
  this.error = null;
  
  try {
    // 3. Call auth API (conservée - pas de PouchDB pour l'auth)
    const data = await authSubmit(this.form.email, this.form.password);
    
    // 4. Store auth data
    Alpine.store('auth').token = data.token;
    Alpine.store('auth').user = data.user;
    Alpine.store('auth').isAuthenticated = true;
    
    // 5. Persist token
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    // 6. Initialiser PouchDB avec le token
    await this.initPouchDBAfterLogin(data.token);
    
    // 7. Redirect
    window.location.href = '/dashboard';
    
  } catch (error) {
    this.error = error.message;
  } finally {
    this.loading = false;
  }
}

async initPouchDBAfterLogin(token) {
  const remoteUrl = 'https://admin:admin@dev.markidiags.com/data/marki';
  
  // Créer les bases locales
  const db = new PouchDB('marki-factures');
  const dbContacts = new PouchDB('marki-contacts');
  
  // Configurer le sync avec auth
  db.sync(remoteUrl, {
    live: true,
    retry: true,
    headers: { 'Authorization': `Bearer ${token}` }
  });
}
```

## Navigation
- **Cible** : `/dashboard`
- **Condition** : Authentification réussie

---

## Notes sur l'authentification

L'authentification **conserve son API backend** (`/api/auth/login`) car :
- La vérification des identifiants nécessite un serveur sécurisé
- PouchDB est une base de données locale, pas un système d'authentification
- Après connexion, PouchDB est initialisé et synchronisé avec le token JWT

| Aspect | Implémentation |
|--------|----------------|
| Authentification | API backend conservée |
| Stockage données | PouchDB après login |
| Sync | Avec token JWT dans headers |
