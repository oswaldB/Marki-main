# Modèle : Session

## Description

Représente une session utilisateur pour la gestion des tokens JWT.

## Table SQL

```sql
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
```

## Dataclass Session

### Attributs

| Nom | Type | Description |
|-----|------|-------------|
| `id` | str | Identifiant unique (sess_xxx) |
| `user_id` | str | ID de l'utilisateur |
| `token` | str | Token JWT |
| `expires_at` | str | Date ISO 8601 d'expiration |
| `ip_address` | str | Adresse IP du client |
| `user_agent` | str | User-Agent du client |
| `created_at` | str | Date ISO 8601 création |

### Méthodes

#### `is_expired() -> bool`

Vérifie si la session est expirée.

```python
def is_expired(self) -> bool:
    from datetime import datetime
    return datetime.fromisoformat(self.expires_at) < datetime.now()
```

#### `to_dict() -> dict`

Convertit en dictionnaire.

```python
return {
    'id': self.id,
    'user_id': self.user_id,
    'expires_at': self.expires_at,
    'created_at': self.created_at
}
```

## Classe SessionModel

Logique métier des sessions.

### Imports

```python
import sqlite3
from typing import Optional, List
from app.data import get_db
from datetime import datetime
import uuid
```

### Méthodes de classe

#### `from_row(row: sqlite3.Row) -> Optional[Session]`

```python
@classmethod
def from_row(cls, row: sqlite3.Row) -> Optional[Session]:
    if not row:
        return None
    return Session(
        id=row['id'],
        user_id=row['user_id'],
        token=row['token'],
        expires_at=row['expires_at'],
        ip_address=row['ip_address'],
        user_agent=row['user_agent'],
        created_at=row['created_at']
    )
```

#### `create(user_id: str, token: str, expires_at: str, ip_address: str = None, user_agent: str = None) -> Session`

Crée une nouvelle session.

```python
@classmethod
def create(cls, user_id: str, token: str, expires_at: str, 
           ip_address: str = None, user_agent: str = None) -> Session:
    session_id = f"sess_{uuid.uuid4().hex[:8]}_{int(datetime.now().timestamp())}"
    db = get_db()
    db.execute(
        """INSERT INTO sessions (id, user_id, token, expires_at, ip_address, user_agent, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (session_id, user_id, token, expires_at, ip_address, user_agent, datetime.now().isoformat())
    )
    db.commit()
    return cls.get_by_id(session_id)
```

#### `get_by_id(session_id: str) -> Optional[Session]`

```python
@classmethod
def get_by_id(cls, session_id: str) -> Optional[Session]:
    db = get_db()
    cursor = db.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
    return cls.from_row(cursor.fetchone())
```

#### `get_by_token(token: str) -> Optional[Session]`

```python
@classmethod
def get_by_token(cls, token: str) -> Optional[Session]:
    db = get_db()
    cursor = db.execute("SELECT * FROM sessions WHERE token = ?", (token,))
    return cls.from_row(cursor.fetchone())
```

#### `is_valid(token: str) -> bool`

Vérifie si un token est valide et non expiré.

```python
@classmethod
def is_valid(cls, token: str) -> bool:
    db = get_db()
    cursor = db.execute(
        "SELECT 1 FROM sessions WHERE token = ? AND expires_at > ?",
        (token, datetime.now().isoformat())
    )
    return cursor.fetchone() is not None
```

#### `revoke(session_id: str) -> bool`

Révoque une session.

```python
@classmethod
def revoke(cls, session_id: str) -> bool:
    db = get_db()
    db.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
    db.commit()
    return True
```

#### `revoke_all_by_user(user_id: str) -> bool`

Révoque toutes les sessions d'un utilisateur.

```python
@classmethod
def revoke_all_by_user(cls, user_id: str) -> bool:
    db = get_db()
    db.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
    db.commit()
    return True
```

#### `cleanup_expired() -> int`

Nettoie les sessions expirées.

```python
@classmethod
def cleanup_expired(cls) -> int:
    db = get_db()
    cursor = db.execute(
        "DELETE FROM sessions WHERE expires_at < ?",
        (datetime.now().isoformat(),)
    )
    db.commit()
    return cursor.rowcount
```

## Fichier de sortie

`app/screens/login/models/session.py`
