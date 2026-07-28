# Workflow: auth-submit

## Objectif
Authentifier l'utilisateur avec CouchDB via l'endpoint `_session` et initialiser la synchronisation PouchDB.

## Configuration CouchDB/PouchDB

```javascript
const COUCHDB_URL = 'https://dev.markidiags.com/data/';
const DB_NAME = 'marki';

// PouchDB instance locale
const localDb = new PouchDB(DB_NAME);

// Sync configuration (activé après auth réussie)
let syncHandler = null;

function startSync() {
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
    name: "john_doe",           // string, requis - correspond à name dans CouchDB
    password: "password123",    // string, requis
    rememberMe: true            // boolean, optionnel (défaut: false)
}
```

> **Note:** CouchDB utilise `name` (pas `username`) pour l'authentification.

## Sorties

### Succès
```javascript
{
    success: true,
    data: {
        user: {
            id: "user_abc123",
            name: "john_doe",           // name CouchDB
            displayName: "John Doe",    // nom affiché (from CouchDB user doc)
            roles: ["user"],            // rôles CouchDB
            db: "marki"                 // base de données
        },
        session: {
            ok: true,
            name: "john_doe",
            roles: ["user"]
        },
        rememberMe: true
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
- `name` requis (correspond au champ `name` CouchDB), +>ici c'est username
- `password` requis
- Pas de validation stricte du format

### 2. Authentification CouchDB
```javascript
const response = await fetch(`${COUCHDB_URL}_session`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',  // Important pour les cookies
  body: JSON.stringify({ name, password })
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

### 3. Démarrage du sync PouchDB
Après authentification réussie:
```javascript
// Vérifier session active
const sessionCheck = await fetch(`${COUCHDB_URL}_session`, {
  credentials: 'include'
});
const session = await sessionCheck.json();

// Démarrer sync live
const sync = localDb.sync(`${COUCHDB_URL}${DB_NAME}`, {
  live: true,
  retry: true,
  ajax: { credentials: 'include' }
});

// Écouter les événements
sync.on('change', (info) => console.log('Sync change:', info));
sync.on('paused', (err) => console.log('Sync paused'));
sync.on('active', () => console.log('Sync active'));
sync.on('error', (err) => console.error('Sync error:', err));
```

### 4. Stockage session (localStorage)
```javascript
localStorage.setItem('auth_name', session.name);
localStorage.setItem('auth_roles', JSON.stringify(session.roles));
localStorage.setItem('auth_db', DB_NAME);
localStorage.setItem('auth_remember_me', rememberMe.toString());
localStorage.setItem('auth_last_login', new Date().toISOString());
// Le token est géré via cookie HttpOnly par CouchDB
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
- Démarre la synchronisation PouchDB ↔ CouchDB en mode live
- Supprime `auth_name` du localStorage si rememberMe=false

## Dépendances
- `pouchdb` : Database locale
- `fetch` API avec `credentials: 'include'`
- CouchDB avec CORS configuré

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
auth-submit: sync PouchDB démarré (live: true)
auth-submit: erreur sync: ...
```

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
  localStorage.removeItem('auth_name');
  localStorage.removeItem('auth_roles');
  localStorage.removeItem('auth_db');
}
```
