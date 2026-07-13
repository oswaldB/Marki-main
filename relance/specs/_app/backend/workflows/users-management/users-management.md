# Workflow Backend : Gestion Utilisateurs

## Objectifs
- CRUD des utilisateurs
- Réinitialisation mot de passe

## Process (méga-fonction)

### CRUD
La méga-fonction gère :
- **Create** : Hasher password (bcrypt coût 12), générer `id`, créer avec ACL
- **Read/List** : Query utilisateurs avec filtre rôle si besoin
- **Update** : Mettre à jour champs, hasher nouveau password si fourni
- **Delete** : Supprimer utilisateur par `id`

### Reset Password
La méga-fonction `resetPassword()` :
1. Lire utilisateur par `id`
2. Vérifier existence
3. Hasher `new_password` (bcrypt coût 12)
4. Mettre à jour `password_hash`

## Data Model

### Collection: `users`
**Stockage:** `/backend/data/users/{id}.yml`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identifiant unique (ex: `user_1783582411041`) |
| `username` | string | Nom d'utilisateur (unique) |
| `email` | string | Email de connexion (unique) |
| `password_hash` | string | **Hash bcrypt du mot de passe** (coût 12) |
| `role` | UserRole | `admin`, `user`, `client` |
| `is_active` | boolean | Compte actif ou désactivé |
| `login_count` | number | Nombre de connexions |
| `last_login` | ISO date\|null | Date de dernière connexion |
| `_acl` | ACL\|null | Permissions d'accès |
| `_acl.owner` | string | Propriétaire du document |
| `_acl.created_by` | string | Créateur du document |
| `_acl.created_at` | ISO date | Date de création ACL |
| `_acl.updated_at` | ISO date | Date modif ACL |
| `_acl.permissions` | Permissions | Droits par rôle |
| `_acl.permissions.admin` | string[] | `['read', 'write', 'delete']` |
| `_acl.permissions.user` | string[] | `['read']` ou `[]` |
| `created_at` | ISO date | Date de création |
| `updated_at` | ISO date | Date de modification |


---

## Organisation des fichiers

```
/backend/
├── users-management/
│   ├── index.js              # Point d'entrée du workflow
│   ├── specs/
│   │   └── spec.md           # Documentation du workflow
│   └── logs/                 # Logs quotidiens (JSON Lines)
│       └── YYYY-MM-DD.log
```

**Chemin complet:** `/backend/users-management/`

---

## Start

### Route
```bash
GET /api/users
POST /api/users
POST /api/users/{id}/reset-password
```

## Process

### index.js
**Objectif :** Construire une mega fonction qui encapsule tout le workflow.

#### Operations

**Initialisation logging**
```javascript
const fs = require('fs').promises;
const path = require('path');
const LOG_DIR = path.join(__dirname, '..', 'logs', 'users-management');

async function log(level, message, data = {}) {
  await fs.mkdir(LOG_DIR, { recursive: true });
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
    workflow: 'users-management'
  };
  const file = path.join(LOG_DIR, `${new Date().toISOString().split('T')[0]}.log`);
  await fs.appendFile(file, JSON.stringify(entry) + '\n');
}
```

#### Création
```javascript
const bcrypt = require('bcrypt');

const passwordHash = await bcrypt.hash(req.body.password, 12);

const user = await db.create('users', {
  id: `user_${Date.now()}`,
  ...req.body,
  password_hash: passwordHash
});
await log('info', 'User created', { userId: user.id, email: user.email, role: user.role });
```

#### Reset Password
```javascript
const user = await db.read('users', req.params.id);
if (!user) {
  await log('error', 'User not found', { userId: req.params.id });
  return { status: 404, error: "Utilisateur non trouvé" };
}

const newHash = await bcrypt.hash(req.body.new_password, 12);

await db.update('users', user.id, { password_hash: newHash });
await log('info', 'Password reset', { userId: user.id, email: user.email });
```

#### Output
```javascript
{
  "status": 201,
  "data": { user }
}
```
