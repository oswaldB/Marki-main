# Workflow Backend : Authentification

## Objectifs
- Authentifier un utilisateur
- Générer un token JWT
- Gérer les sessions

## Base de données
- **SQLite** : `backend/data/marki.db`
- **Tables** : `users`, `sessions`

## Data Models SQLite

### Table `users`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | TEXT | Identifiant (user_xxx) |
| `username` | TEXT | Nom d'utilisateur |
| `email` | TEXT | Email |
| `password_hash` | TEXT | Hash bcrypt |
| `role` | TEXT | `admin` ou `user` |
| `is_active` | INTEGER | 0 ou 1 |

### Table `sessions`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | TEXT | Identifiant (sess_xxx) |
| `user_id` | TEXT | ID utilisateur |
| `token` | TEXT | Token JWT |
| `expires_at` | TEXT | Date d'expiration |

## Process

```javascript
const SQLiteDB = require('../lib/sqlite-db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = new SQLiteDB();

const JWT_SECRET = process.env.JWT_SECRET || 'votre-secret';
const JWT_EXPIRES = '15m';

async function login(email, password) {
  // Récupérer utilisateur
  const user = db.getUserByEmail(email.toLowerCase().trim());
  
  if (!user || !user.is_active) {
    return null;
  }
  
  // Vérifier mot de passe
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return null;
  }
  
  // Générer JWT
  const token = jwt.sign(
    { 
      sub: user.id, 
      username: user.username,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
  
  // Sauvegarder session
  const sessionId = `sess_${Date.now()}`;
  db.create('sessions', {
    id: sessionId,
    user_id: user.id,
    token: token,
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
  });
  
  // Mettre à jour last_login
  db.update('users', user.id, {
    last_login: new Date().toISOString(),
    login_count: user.login_count + 1
  });
  
  return { token, user: { id: user.id, username: user.username, role: user.role } };
}
```

## Route API

```bash
POST /api/auth/login

# cURL
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@marki.fr","password":"secret"}' \
  "http://localhost:5000/api/auth/login"
```

## Output

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user_xxx",
    "username": "admin",
    "role": "admin"
  }
}
```
