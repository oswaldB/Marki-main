# Workflow: initial-load

## Objectif
Vérifier si l'utilisateur possède une session active au chargement de la page login.

## Déclencheur
Appelé automatiquement au `x-init` de la page Alpine.js.

## Entrées
```javascript
{
    // Aucun paramètre requis
}
```

## Sorties

### Succès - Session active
```javascript
{
    success: true,
    data: {
        hasSession: true,
        token: "eyJhbGciOiJIUzI1NiIs...",
        user: {
            id: "user_abc123",
            email: "user@example.com",
            name: "John Doe",
            role: "user"
        },
        rememberMe: true
    },
    error: null
}
```

### Succès - Pas de session
```javascript
{
    success: true,
    data: {
        hasSession: false
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

1. **Lire localStorage**
   - Clé: `auth_token`
   - Clé: `auth_user`

2. **Vérifier expiration JWT**
   - Décoder le payload (base64)
   - Comparer `exp` avec timestamp actuel

3. **Nettoyer si expiré**
   - Supprimer `auth_token`
   - Supprimer `auth_user`

4. **Restaurer email si rememberMe**
   - Lire `saved_email`
   - Pré-remplir le formulaire

## Dépendances
- PouchDB (initialisé dans main.js)
- localStorage API

## Console Logs
```
initial-load.js loaded
initial-load: démarrage vérification session
initial-load: aucun token trouvé
initial-load: token expiré
initial-load: utilisateur récupéré: user@example.com
initial-load: session active trouvée
```