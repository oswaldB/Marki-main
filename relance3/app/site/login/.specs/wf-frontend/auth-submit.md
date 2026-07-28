# Workflow: auth-submit

## Objectif
Authentifier l'utilisateur avec username/password et créer une session.

## Déclencheur
Appelé lors de la soumission du formulaire de login.

## Entrées
```javascript
{
    username: "john_doe",           // string, requis - peut être email, pseudo, ID, etc.
    password: "password123",        // string, requis
    rememberMe: true                // boolean, optionnel (défaut: false)
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
            username: "john_doe",
            name: "John Doe",
            role: "user" | "admin"
        },
        token: "eyJhbGciOiJIUzI1NiIs...",
        rememberMe: true
    },
    error: null
}
```

### Échec - Identifiants invalides
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
- Username requis (peut être n'importe quel format : email, pseudo, ID, téléphone...)
- Password requis.
- Pas de validation stricte du format de l'identifiant

### 2. Authentification
- Mode développement: credentials de test en dur
- Mode production: appel API vers backend

### Credentials de test (DEV)
| Username | Password | Name | Role |
|----------|----------|------|------|
| test@marki.fr | password123 | Test User | user |
| admin@marki.fr | admin123 | Admin User | admin |
| demo@example.com | demo123 | Demo User | user |
| john_doe | password123 | John Doe | user |

### 3. Stockage session
Si authentification réussie:

**localStorage:**
- `auth_token`: JWT token
- `auth_user`: JSON stringifié de l'user
- `auth_remember_me`: "true" | "false"
- `saved_username`: username (si rememberMe=true)
- `auth_last_login`: ISO timestamp

### 4. Token JWT (Mock)
Structure:
```json
{
  "sub": "john_doe",
  "name": "John Doe",
  "role": "user",
  "iat": 1690000000,
  "exp": 1690086400  // +24h
}
```

## Side Effects
- Écrit dans localStorage (5 clés)
- Supprime `saved_username` si rememberMe=false

## Dépendances
- localStorage API
- btoa/atob pour JWT

## Console Logs
```
auth-submit.js loaded
auth-submit: démarrage authentification
auth-submit: validation échouée: ...
auth-submit: tentative connexion pour: john_doe
auth-submit: identifiants invalides
auth-submit: authentification réussie pour: john_doe
```
