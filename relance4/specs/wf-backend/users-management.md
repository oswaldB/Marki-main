# Workflow Backend : Gestion Utilisateurs

## Objectifs
- CRUD utilisateurs
- Gestion des rôles et permissions

## Base de données
- **SQLite** : `backend/data/marki.db`
- **Table** : `users`

## Data Models SQLite

### Table `users`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | TEXT | Identifiant (user_xxx) |
| `username` | TEXT | Nom d'utilisateur (unique) |
| `email` | TEXT | Email |
| `password_hash` | TEXT | Hash bcrypt |
| `role` | TEXT | `admin` ou `user` |
| `is_active` | INTEGER | 0 ou 1 |
| `login_count` | INTEGER | Nombre de connexions |
| `last_login` | TEXT | Dernière connexion |

## Opérations

### Créer Utilisateur
```javascript
const bcrypt = require('bcrypt');

async function createUser(data) {
  const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const passwordHash = await bcrypt.hash(data.password, 10);
  
  const user = db.create('users', {
    id,
    username: data.username,
    email: data.email.toLowerCase().trim(),
    password_hash: passwordHash,
    role: data.role || 'user',
    is_active: 1,
    login_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  
  return user;
}
```

### Modifier Utilisateur
```javascript
async function updateUser(id, data) {
  const updates = { ...data };
  delete updates.id;
  delete updates.password_hash;
  
  db.update('users', id, updates);
  return db.read('users', id);
}
```

### Réinitialiser Mot de Passe
```javascript
async function resetPassword(userId, newPassword) {
  const passwordHash = await bcrypt.hash(newPassword, 10);
  db.update('users', userId, { password_hash: passwordHash });
  return true;
}
```

## Routes API

```bash
GET    /api/users              # Liste
GET    /api/users/:id          # Détail
POST   /api/users              # Créer (admin)
PUT    /api/users/:id          # Modifier
DELETE /api/users/:id          # Désactiver (admin)
POST   /api/users/:id/reset-password  # Reset password (admin)
```
