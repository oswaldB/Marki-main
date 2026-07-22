# Spec Modèle : User

## Description

Modèle utilisateur pour l'authentification et la gestion des comptes. Utilise sqlite3 pur sans ORM.

## Table SQL

```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    is_active INTEGER NOT NULL DEFAULT 1,
    last_login TEXT,
    login_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## Classe User

### Attributs

| Attribut | Type | Description |
|----------|------|-------------|
| `id` | str | Identifiant unique (user_xxx) |
| `username` | str | Nom d'utilisateur unique |
| `email` | str | Email de l'utilisateur |
| `password_hash` | str | Hash du mot de passe (bcrypt) |
| `role` | str | Rôle : 'admin' ou 'user' |
| `is_active` | bool | Compte actif ou désactivé |
| `last_login` | str | Date ISO 8601 dernière connexion |
| `login_count` | int | Nombre de connexions |
| `created_at` | str | Date ISO 8601 création |
| `updated_at` | str | Date ISO 8601 mise à jour |

### Méthodes de classe

#### `from_row(row: sqlite3.Row) -> Optional[User]`

Crée une instance User depuis une ligne de résultat SQL.

```python
@classmethod
def from_row(cls, row: sqlite3.Row) -> Optional['User']:
    if not row:
        return None
    return cls(
        id=row['id'],
        username=row['username'],
        email=row['email'],
        password_hash=row['password_hash'],
        role=row['role'],
        is_active=bool(row['is_active']),
        last_login=row['last_login'],
        login_count=row['login_count'],
        created_at=row['created_at'],
        updated_at=row['updated_at']
    )
```

#### `get_by_id(user_id: str) -> Optional[User]`

Récupère un utilisateur par son ID.

```python
@classmethod
def get_by_id(cls, user_id: str) -> Optional['User']:
    db = get_db()
    cursor = db.execute(
        "SELECT * FROM users WHERE id = ? AND is_active = 1",
        (user_id,)
    )
    return cls.from_row(cursor.fetchone())
```

#### `get_by_username(username: str) -> Optional[User]`

Récupère un utilisateur par son nom d'utilisateur.

```python
@classmethod
def get_by_username(cls, username: str) -> Optional['User']:
    db = get_db()
    cursor = db.execute(
        "SELECT * FROM users WHERE username = ? AND is_active = 1",
        (username,)
    )
    return cls.from_row(cursor.fetchone())
```

#### `get_by_email(email: str) -> Optional[User]`

Récupère un utilisateur par son email.

```python
@classmethod
def get_by_email(cls, email: str) -> Optional['User']:
    db = get_db()
    cursor = db.execute(
        "SELECT * FROM users WHERE email = ? AND is_active = 1",
        (email.lower().strip(),)
    )
    return cls.from_row(cursor.fetchone())
```

#### `authenticate(username: str, password: str) -> Optional[User]`

Authentifie un utilisateur avec son nom d'utilisateur et mot de passe.

```python
@classmethod
def authenticate(cls, username: str, password: str) -> Optional['User']:
    import bcrypt
    user = cls.get_by_username(username)
    if not user:
        return None
    if bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8')):
        return user
    return None
```

#### `update_last_login(user_id: str) -> bool`

Met à jour la date de dernière connexion et incrémente le compteur.

```python
@classmethod
def update_last_login(cls, user_id: str) -> bool:
    from datetime import datetime
    db = get_db()
    db.execute(
        """UPDATE users 
           SET last_login = ?, login_count = login_count + 1, updated_at = ?
           WHERE id = ?""",
        (datetime.now().isoformat(), datetime.now().isoformat(), user_id)
    )
    db.commit()
    return True
```

### Méthodes d'instance

#### `to_dict() -> dict`

Convertit l'utilisateur en dictionnaire (pour JSON).

```python
def to_dict(self) -> dict:
    return {
        'id': self.id,
        'username': self.username,
        'email': self.email,
        'role': self.role,
        'is_active': self.is_active
    }
```

#### `to_dict_secure() -> dict`

Version sans données sensibles pour le frontend.

```python
def to_dict_secure(self) -> dict:
    return {
        'id': self.id,
        'username': self.username,
        'email': self.email,
        'role': self.role
    }
```

## Dépendances

- `app.data import get_db`
- `bcrypt` (pour la vérification des mots de passe)
- `typing.Optional`
- `sqlite3`

## Fichier de sortie

`app/screens/login/models/user.py`
