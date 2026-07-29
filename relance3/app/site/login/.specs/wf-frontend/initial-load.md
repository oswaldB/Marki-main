# Workflow: initial-load

## Objectif
Vérifier si l'utilisateur possède une session active au chargement de la page login.

## Configuration CouchDB

```javascript
const COUCHDB_URL = 'https://dev.markidiags.com/data/';
```

## Déclencheur
Appelé automatiquement au `x-init` de la page Alpine.js.

## Entrées
```javascript
{
    // Aucun paramètre requis
}
```

## Sorties

### Succès - Session active et données sync (redirection)
```javascript
{
    success: true,
    data: {
        hasSession: true,
        session: {
            name: "john_doe",
            roles: ["user"]
        },
        pouchDbStatus: {
            docCount: 1247,
            lastSync: "2024-01-15T10:30:00Z",
            needsSync: false
        },
        rememberMe: true,
        redirectTo: "/dashboard"  // Redirection automatique
    },
    error: null
}
```

**Action**: Rediriger immédiatement vers `/dashboard`

### Succès - Pas de session (cookie absent/expiré)
```javascript
{
    success: true,
    data: {
        hasSession: false,
        reason: "no_session_cookie"
    },
    error: null
}
```

### Succès - Session en cours de sync
```javascript
{
    success: true,
    data: {
        hasSession: true,
        session: {
            name: "john_doe",
            roles: ["user"]
        },
        pouchDbStatus: {
            docCount: 0,
            needsSync: true,
            syncing: true
        },
        rememberMe: true
    },
    error: null
}
```

### Échec - Token expiré
```javascript
{
    success: true,
    data: {
        hasSession: false,
        reason: "token_expired"
    },
    error: null
}
```

### Échec - Erreur technique
```javascript
{
    success: false,
    data: null,
    error: "Erreur lors de la vérification de session: ..."
}
```

## Logique métier

### 1. Vérifier le cookie de session CouchDB (AuthSession)

Le cookie `AuthSession` est défini par CouchDB lors de la connexion via `auth-submit`. Ce cookie HttpOnly est géré automatiquement par le navigateur.

```javascript
// Vérifier session active via CouchDB
// Gestion des erreurs réseau et réponses non-JSON
let sessionData = null;
try {
  const response = await fetch(`${COUCHDB_URL}_session`, {
    credentials: 'include'  // Envoie le cookie AuthSession
  });
  
  // Vérifier Content-Type avant parsing JSON
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error(`Réponse non-JSON: ${contentType}`);
  }
  
  sessionData = await response.json();
} catch (error) {
  console.error('initial-load: erreur récupération session:', error.message);
  // Fallback: considérer qu'il n'y a pas de session
  sessionData = { ok: true, userCtx: { name: null, roles: [] } };
}
```

**Réponse session active (200):**
```json
{
  "ok": true,
  "userCtx": {
    "name": "john_doe",
    "roles": ["user"]
  },
  "info": {
    "authentication_handlers": ["cookie"]
  }
}
```

**Réponse session inactive (200):**
```json
{
  "ok": true,
  "userCtx": {
    "name": null,
    "roles": []
  }
}
```

**Réponse erreur (fallback):**
Si le serveur retourne HTML (erreur 404/500/502) ou si le réseau est indisponible, le workflow doit gérer l'erreur gracieusement et considérer qu'il n'y a pas de session active.

### 2. Vérifier PouchDB local (fallback)

**IMPORTANT**: PouchDB est chargé globalement via CDN. Utiliser `PouchDB` sans import.

```javascript
// PouchDB est disponible globalement
const localDb = new PouchDB('marki');
const info = await localDb.info();
// info.doc_count > 0 signifie des données locales existent
```

### 3. Synchronisation initiale ou redirection

Si une session est détectée mais PouchDB est vide ou désynchronisé:

```javascript
// Démarrer sync initial (one-shot) avec loading UI
const sync = localDb.sync(`${COUCHDB_URL}marki`, {
  live: false,    // Sync initial one-shot
  retry: true
});

// Afficher écran de sync (voir sync-loading.md)
showSyncLoading();

// Écouter événements
sync.on('change', (info) => updateLoadingUI(info));

sync.on('complete', () => {
  // Sync terminé → rediriger vers dashboard
  window.location.href = '/dashboard';
});

sync.on('error', (err) => {
  showSyncError(err);
  // Option: rediriger quand même en mode hors-ligne
  // window.location.href = '/dashboard';
});
```

Si PouchDB est déjà à jour (`needsSync: false`):

```javascript
// Redirection immédiate
window.location.href = '/dashboard';
```

### 4. Restaurer rememberMe
- Lire `auth_remember_me` dans localStorage
- Si true, restaurer l'identifiant utilisateur dans le formulaire

## Navigation

### Cas 1 : Pas de session
- Rester sur la page login
- Afficher le formulaire de connexion

### Cas 2 : Session active + PouchDB à jour
- Rediriger immédiatement vers `/dashboard`
- Pas d'écran de loading

### Cas 3 : Session active + PouchDB vide/désync
- Afficher l'écran de sync (voir `sync-loading.md`)
- Attendre la fin du sync
- Rediriger vers `/dashboard`

## Dépendances
- PouchDB (initialisé dans main.js)
- localStorage API
- Cookie API (pour AuthSession CouchDB)
- CouchDB endpoint `/_session`

## Console Logs
```
initial-load.js loaded
initial-load: démarrage vérification session
initial-load: vérification cookie AuthSession
initial-load: cookie AuthSession absent ou invalide
initial-load: session CouchDB active pour: john_doe
initial-load: PouchDB local: 1247 documents
initial-load: PouchDB à jour → redirection vers /dashboard
initial-load: sync initial requis → affichage loading screen
initial-load: sync terminé → redirection vers /dashboard
initial-load: erreur récupération session (réponse non-JSON ou réseau)
initial-load: erreur réseau → mode hors-ligne (pas de session)
```