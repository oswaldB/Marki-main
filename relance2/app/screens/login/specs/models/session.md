# Spec Modèle : Session

## Description

Modèle de session utilisateur pour la gestion des tokens JWT et le suivi des connexions. Utilise sqlite3 pur sans ORM.

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

## Classe Session

### Attributs

| Attribut | Type | Description |
|----------|------|-------------|
| `id` | str | Identifiant unique de session (sess_xxx) |
| `user_id` | str | ID de l'utilisateur propriétaire |
| `token` | str | Token JWT stocké |
| `expires_at` | str | Date ISO 8601 d'expiration |
| `ip_address` | str | Adresse IP du client (optionnel) |
| `user_agent` | str | User-Agent du client (optionnel) |
| `created_at` | str | Date ISO 8601 création |

### Méthodes de classe

#### `from_row(row: sqlite3.Row) -> Optional[Session]`

Crée une instance Session depuis une ligne de résultat SQL.

```python
@classmethod
def from_row(cls, row: sqlite3.Row) -> Optional['Session']:
    if not row:
        return None
    return cls(
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
           ip_address: str = None, user_agent: str = None) -> 'Session':
    from datetime import datetime
    import uuid
    
    session_id = f"sess_{uuid.uuid4().hex[:8]}_{int(datetime.now().timestamp())}"
    
    db = get_db()
    db.execute(
        """INSERT INTO sessions (id, user_id, token, expires_at, ip_address, user_agent, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (session_id, user_id, token, expires_at, ip_address, user_agent, 
         datetime.now().isoformat())
    )
    db.commit()
    
    return cls.get_by_id(session_id)
```

#### `get_by_id(session_id: str) -> Optional[Session]`

Récupère une session par son ID.

```python
@classmethod
def get_by_id(cls, session_id: str) -> Optional['Session']:
    db = get_db()
    cursor = db.execute(
        "SELECT * FROM sessions WHERE id = ?",
        (session_id,)
    )
    return cls.from_row(cursor.fetchone())
```

#### `get_by_token(token: str) -> Optional[Session]`

Récupère une session par son token JWT.

```python
@classmethod
def get_by_token(cls, token: str) -> Optional['Session']:
    db = get_db()
    cursor = db.execute(
        "SELECT * FROM sessions WHERE token = ?",
        (token,)
    )
    return cls.from_row(cursor.fetchone())
```

#### `get_active_by_user(user_id: str) -> List[Session]`

Récupère toutes les sessions actives d'un utilisateur.

```python
@classmethod
def get_active_by_user(cls, user_id: str) -> List['Session']:
    from datetime import datetime
    db = get_db()
    cursor = db.execute(
        """SELECT * FROM sessions 
           WHERE user_id = ? AND expires_at > ?
           ORDER BY created_at DESC""",
        (user_id, datetime.now().isoformat())
    )
    return [cls.from_row(row) for row in cursor.fetchall()]
```

#### `is_valid(token: str) -> bool`

Vérifie si un token est valide et non expiré.

```python
@classmethod
def is_valid(cls, token: str) -> bool:
    from datetime import datetime
    db = get_db()
    cursor = db.execute(
        """SELECT 1 FROM sessions 
           WHERE token = ? AND expires_at > ?""",
        (token, datetime.now().isoformat())
    )
    return cursor.fetchone() is not None
```

#### `revoke(session_id: str) -> bool`

Révoque une session spécifique.

```python
@classmethod
def revoke(cls, session_id: str) -> bool:
    db = get_db()
    db.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
    db.commit()
    return True
```

#### `revoke_all_by_user(user_id: str) -> bool`

Révoque toutes les sessions d'un utilisateur (logout global).

```python
@classmethod
def revoke_all_by_user(cls, user_id: str) -> bool:
    db = get_db()
    db.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
    db.commit()
    return True
```

#### `cleanup_expired() -> int`

Nettoie les sessions expirées. Retourne le nombre de sessions supprimées.

```python
@classmethod
def cleanup_expired(cls) -> int:
    from datetime import datetime
    db = get_db()
    cursor = db.execute(
        "DELETE FROM sessions WHERE expires_at < ?",
        (datetime.now().isoformat(),)
    )
    db.commit()
    return cursor.rowcount
```

### Méthodes d'instance

#### `is_expired() -> bool`

Vérifie si la session est expirée.

```python
def is_expired(self) -> bool:
    from datetime import datetime
    return datetime.fromisoformat(self.expires_at) < datetime.now()
```

#### `to_dict() -> dict`

Convertit la session en dictionnaire.

```python
def to_dict(self) -> dict:
    return {
        'id': self.id,
        'user_id': self.user_id,
        'expires_at': self.expires_at,
        'ip_address': self.ip_address,
        'created_at': self.created_at
    }
```

## Dépendances

- `app.data import get_db`
- `typing.Optional, List`
- `sqlite3`
- `uuid`
- `datetime`

## Fichier de sortie

`app/screens/login/models/session.py`
