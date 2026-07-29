# Workflow: auth-submit

## Objectif
Authentifier l'utilisateur avec CouchDB via l'endpoint `_session` et initialiser la synchronisation PouchDB.

## Configuration CouchDB/PouchDB

```javascript
// PouchDB est chargé globalement via CDN dans index.html
// NE PAS utiliser: import PouchDB from 'pouchdb' → ERREUR module
// Utiliser: window.PouchDB ou PouchDB (global)

const COUCHDB_URL = 'https://dev.markidiags.com/data/';
const DB_NAME = 'marki';

// PouchDB instance locale - utiliser la variable globale
const localDb = new PouchDB(DB_NAME);

// Sync configuration (activé après auth réussie)
let syncHandler = null;

function startSync() {
  // PouchDB est disponible globalement
  const remoteDb = new PouchDB(`${COUCHDB_URL}${DB_NAME}`, {
    fetch: (url, opts) => {
      opts.credentials = 'include';  // Important: envoie le cookie de session
      return fetch(url, opts);
    }
  });
  
  syncHandler = localDb.sync(remoteDb, {
    live: true,
    retry: true
  });
  
  return syncHandler;
}
```

## Déclencheur
Appelé lors de la soumission du formulaire de login.

## Entrées
```javascript
{
    username: "john_doe",       // string, requis
    password: "password123",    // string, requis
    rememberMe: true            // boolean, optionnel (défaut: false)
}
```

## Sorties

### Succès
```javascript
{
    success: true,
    data: {
        user: {
            id: "user_abc123",
            username: "john_doe",       // username
            displayName: "John Doe",    // nom affiché (from CouchDB user doc)
            roles: ["user"],            // rôles CouchDB
            db: "marki"                 // base de données
        },
        session: {
            ok: true,
            name: "john_doe",
            roles: ["user"]
        },
        rememberMe: true,
        needsSync: true               // indique que sync-loading doit être déclenché
    },
    error: null
}
```

### Échec - Identifiants invalides (HTTP 401)
```javascript
{
    success: false,
    data: null,
    error: "Identifiant ou mot de passe incorrect"
}
```

### Échec - Validation
```javascript
{
    success: false,
    data: null,
    error: "L'identifiant est requis" | 
            "Le mot de passe est requis" 
}
```

### Échec - Erreur technique
```javascript
{
    success: false,
    data: null,
    error: "Erreur technique lors de la connexion. Veuillez réessayer."
}
```

## Logique métier

### 1. Validation des entrées
- `username` requis
- `password` requis
- Pas de validation stricte du format

### 2. Authentification CouchDB (Cookie Authentication)

CouchDB utilise la Cookie Authentication (RFC 2109). Le client envoie les credentials à `/_session`, CouchDB retourne un cookie `AuthSession` valable 10 minutes (configurable).

```javascript
const response = await fetch(`${COUCHDB_URL}_session`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',  // Important: reçoit le cookie AuthSession
  body: JSON.stringify({ name: username, password })
});
```

**Réponse succès (200):**
```json
{
  "ok": true,
  "name": "john_doe",
  "roles": ["user"]
}
```

**Cookie de session:** CouchDB définit un cookie `AuthSession` automatiquement.

### 3. Vérification de session
Après authentification réussie, vérifier la session CouchDB.

```javascript
// Vérifier session active (GET /_session)
const sessionCheck = await fetch(`${COUCHDB_URL}_session`, {
  credentials: 'include'
});
const sessionData = await sessionCheck.json();
// sessionData.userCtx.name, sessionData.userCtx.roles
```

**NOTE**: Le sync PouchDB n'est PAS géré par ce workflow. Voir `sync-loading.md`.

### 4. Stockage session (localStorage)
```javascript
localStorage.setItem('auth_username', sessionData.userCtx.name);
localStorage.setItem('auth_roles', JSON.stringify(sessionData.userCtx.roles));
localStorage.setItem('auth_db', DB_NAME);
localStorage.setItem('auth_remember_me', rememberMe.toString());
localStorage.setItem('auth_last_login', new Date().toISOString());
// Le cookie AuthSession est géré automatiquement par le navigateur (HttpOnly)
```

### Credentials de test (DEV)
Les utilisateurs doivent exister dans CouchDB `_users`:

| Name | Password | Roles |
|------|----------|-------|
| test@marki.fr | password123 | ["user"] |
| admin@marki.fr | admin123 | ["admin", "user"] |

### Création d'utilisateur CouchDB
```bash
curl -X POST https://dev.markidiags.com/data/_users/org.couchdb.user:test@marki.fr \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test@marki.fr",
    "password": "password123",
    "roles": ["user"],
    "type": "user"
  }'
```

## Side Effects
- Crée un cookie `AuthSession` (HttpOnly, géré par CouchDB)
- Écrit dans localStorage (5 clés)
- Ne démarre PAS le sync PouchDB (voir `sync-loading.md`)
- Ne redirige PAS vers `/dashboard` (c'est `sync-loading` qui gère la navigation)
- Supprime `auth_username` du localStorage si rememberMe=false

## Dépendances
- `pouchdb` : Database locale (chargé via CDN global, PAS d'import ES6)
- `fetch` API avec `credentials: 'include'`
- CouchDB avec CORS configuré

**Note sur PouchDB**: PouchDB est chargé via CDN dans `index.html` comme variable globale (`window.PouchDB`). Les workflows doivent utiliser `PouchDB` directement sans import.

## CORS Configuration requise
```ini
[cors]
origins = *
credentials = true
methods = GET, PUT, POST, HEAD, DELETE, OPTIONS
headers = accept, authorization, content-type, origin
```

## Console Logs
```
auth-submit.js loaded
auth-submit: démarrage authentification
auth-submit: validation échouée: ...
auth-submit: tentative connexion pour: john_doe
auth-submit: identifiants invalides (401)
auth-submit: authentification réussie pour: john_doe
auth-submit: session CouchDB validée
auth-submit: succès - prêt pour sync-loading
auth-submit: erreur technique: ...
```

## Navigation

Après authentification réussie :
1. **Retourner succès** avec les données utilisateur
2. **Le caller (main.js)** doit alors :
   - Masquer le formulaire de login
   - Afficher l'écran de sync (voir `sync-loading.md`)
   - Déclencher le workflow `sync-loading`

**IMPORTANT** : Ce workflow ne gère PAS le sync ni la redirection. Voir `sync-loading.md` pour la gestion complète.

## Déconnexion
```javascript
async function logout() {
  // Arrêter sync
  if (syncHandler) {
    syncHandler.cancel();
  }
  
  // Déconnexion CouchDB
  await fetch(`${COUCHDB_URL}_session`, {
    method: 'DELETE',
    credentials: 'include'
  });
  
  // Cleanup localStorage
  localStorage.removeItem('auth_username');
  localStorage.removeItem('auth_roles');
  localStorage.removeItem('auth_db');
}
```
