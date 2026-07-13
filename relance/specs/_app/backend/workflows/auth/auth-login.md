# Workflow Backend : Authentification Utilisateur

## Objectifs
- Authentifier un utilisateur avec email et mot de passe
- Générer un token JWT pour la session

## Process (méga-fonction)

La méga-fonction `login()` exécute les étapes suivantes :

### Étape 1 : Validation
- Vérifier présence `email` et `password`

### Étape 2 : Recherche utilisateur
- Query `users` par `email` (lowercase + trim)
- Vérifier existence et `is_active === true`

### Étape 3 : Vérification mot de passe
- Comparer `password` avec `password_hash` (bcrypt)

### Étape 4 : Génération JWT
- Signer token avec `userId`, `email`, `role`
- Expiration : 7 jours

### Étape 5 : Mise à jour
- Mettre à jour `last_login` avec date courante
- Logger le succès

## Data Model

### Collection: `users`
**Stockage:** `/backend/data/users/{id}.yml`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant unique (ex: `user_1783582411041`) |
| `username` | string | Nom d'utilisateur (unique) |
| `email` | string | Email de l'utilisateur |
| `password_hash` | string | Hash bcrypt du mot de passe |
| `role` | UserRole | `admin`, `user`, `client` |
| `is_active` | boolean | Compte actif ou non |
| `login_count` | number | Nombre de connexions |
| `last_login` | ISO date\|null | Date de dernière connexion |
| `created_at` | ISO date | Date de création |
| `updated_at` | ISO date | Date de dernière modification |
| `_acl` | ACL\|null | Permissions d'accès |
| `_acl.owner` | string | Propriétaire du document |
| `_acl.created_by` | string | Créateur du document |
| `_acl.created_at` | ISO date | Date de création ACL |
| `_acl.updated_at` | ISO date | Date modif ACL |
| `_acl.permissions` | Permissions | Droits par rôle |
| `_acl.permissions.admin` | string[] | `['read', 'write', 'delete']` |
| `_acl.permissions.user` | string[] | `['read']` ou `[]` |

---

## Organisation des fichiers

```
/backend/
├── auth-login/
│   ├── index.js              # Point d'entrée du workflow
│   ├── specs/
│   │   └── spec.md           # Documentation du workflow
│   └── logs/                 # Logs quotidiens (JSON Lines)
│       └── YYYY-MM-DD.log
```

**Chemin complet:** `/backend/auth-login/`

---

## Start

### Route
```bash
POST /api/auth/login

# cURL
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "*****"}' \
  "http://adti.api2.markidiags.com/api/auth/login"
```

### Entry Data
- `email`: string (requis)
- `password`: string (requis)

## Process

### index.js
**Objectif :** Construire une mega fonction qui encapsule tout le workflow.

#### Operations

**Initialisation logging**
```javascript
const fs = require('fs').promises;
const path = require('path');
const LOG_DIR = path.join(__dirname, '..', 'logs', 'auth-login');

async function log(level, message, data = {}) {
  await fs.mkdir(LOG_DIR, { recursive: true });
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
    workflow: 'auth-login'
  };
  const file = path.join(LOG_DIR, `${new Date().toISOString()}.log`); 
  await fs.appendFile(file, JSON.stringify(entry) + '\n');
}
```

1. **Validation**
   ```javascript
   if (!email || !password) {
     await log('warn', 'Validation failed', { reason: 'missing_credentials' });
     return { status: 400, error: "Email et mot de passe requis" };
   }
   ```

2. **Recherche utilisateur**
   ```javascript
   const users = await db.search('users', { 
     email: email.toLowerCase().trim()
   });
   const user = users[0];
   
   if (!user || !user.is_active) {
     await log('warn', 'Authentication failed', { email, reason: 'invalid_credentials' });
     return { status: 401, error: "Identifiants invalides" };
   }
   ```

3. **Vérification mot de passe**
   ```javascript
   const bcrypt = require('bcrypt');
   const isValid = await bcrypt.compare(password, user.password_hash);
   
   if (!isValid) {
     await log('warn', 'Authentication failed', { email, userId: user.id, reason: 'invalid_password' });
     return { status: 401, error: "Identifiants invalides" };
   }
   ```

4. **Génération token JWT**
   ```javascript
   const jwt = require('jsonwebtoken');
   const token = jwt.sign(
     { userId: user.id, email: user.email, role: user.role },
     process.env.JWT_SECRET,
     { expiresIn: "7d" }
   );
   await log('info', 'Login successful', { userId: user.id, role: user.role });
   ```

5. **Mise à jour last_login**
   ```javascript
   await db.update('users', user.id, {
     last_login: new Date().toISOString()
   });
   ```

#### Output
```javascript
{
  "status": 200,
  "data": {
    "token": String,
    "user": {
      "id": String,
      "username": String,
      "email": String,
      "role": String
    }
  }
}
```

## Error Handling

| Code | Description |
|------|-------------|
| 400 | Email ou mot de passe manquant |
| 401 | Identifiants invalides |
| 500 | Erreur serveur |
