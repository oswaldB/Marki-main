# Modèle Utilisateur - Login

## Overview
Modèle d'authentification utilisateur. **PAS D'ORM** - Utilise `sqlite3` du standard library uniquement avec requêtes SQL brutes.

## Table: users

| Champ | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | VARCHAR(36) | PRIMARY KEY | UUID utilisateur |
| username | VARCHAR(50) | NOT NULL, UNIQUE | Nom d'utilisateur |
| email | VARCHAR(255) | NOT NULL, UNIQUE | Email (utilisé pour login) |
| password | VARCHAR(255) | NOT NULL | Mot de passe (en clair pour test, à hasher en prod) |
| role | VARCHAR(20) | DEFAULT 'user' | Role: admin, user |
| is_active | BOOLEAN | DEFAULT 1 | Compte actif |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Date création |

## Fichiers de Modèle

```
models/
├── __init__.py    # Exporte AuthModel, AuthError, User
└── auth.py        # Toute la logique d'auth en sqlite3 pur
```

## Code : `models/auth.py`

```python
"""Modèle d'authentification utilisateur - Pure sqlite3."""

import sqlite3
from flask import current_app
from app.middleware.auth.jwt_utils import generate_token, validate_token


class AuthError(Exception):
    """Exception pour les erreurs d'authentification."""
    pass


class User:
    """Modèle utilisateur simple (dataclass-like)."""
    
    def __init__(self, user_id, username, email, role='user', is_active=True):
        self.id = user_id
        self.username = username
        self.email = email
        self.role = role
        self.is_active = is_active
    
    @classmethod
    def from_row(cls, row):
        """Crée un User depuis une ligne sqlite3 (sqlite3.Row)."""
        if not row:
            return None
        return cls(
            user_id=row['id'],
            username=row['username'],
            email=row.get('email'),
            role=row.get('role', 'user'),
            is_active=row.get('is_active', 1) == 1
        )
    
    def to_dict(self):
        """Convertit en dict pour JSON."""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role
        }


class AuthModel:
    """Modèle pour les opérations d'authentification - sqlite3 pur."""
    
    @staticmethod
    def get_db():
        """Récupère la connexion DB (sqlite3 standard)."""
        db_path = current_app.config['DATABASE']
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row  # Pour accès par nom de colonne
        return conn
    
    @classmethod
    def find_by_username(cls, username):
        """Trouve un utilisateur par username."""
        db = cls.get_db()
        user = db.execute(
            "SELECT * FROM users WHERE username = ? AND is_active = 1",
            (username,)
        ).fetchone()
        db.close()
        return User.from_row(user)
    
    @classmethod
    def find_by_id(cls, user_id):
        """Trouve un utilisateur par ID."""
        db = cls.get_db()
        user = db.execute(
            "SELECT * FROM users WHERE id = ? AND is_active = 1",
            (user_id,)
        ).fetchone()
        db.close()
        return User.from_row(user)
    
    @classmethod
    def verify_password(cls, user, password):
        """Vérifie le mot de passe (comparaison directe pour test)."""
        db = cls.get_db()
        stored = db.execute(
            "SELECT password FROM users WHERE id = ?",
            (user.id,)
        ).fetchone()
        db.close()
        
        if not stored:
            return False
        
        # TODO: Migrer vers bcrypt pour le hash
        return stored['password'] == password
    
    @classmethod
    def authenticate(cls, username, password):
        """
        Authentifie un utilisateur.
        Retourne: {'user': User, 'token': str}
        Lève: AuthError si échec
        """
        user = cls.find_by_username(username)
        
        if not user:
            raise AuthError("Utilisateur non trouvé")
        
        if not cls.verify_password(user, password):
            raise AuthError("Mot de passe incorrect")
        
        token = generate_token(user.id, user.username, user.role)
        
        return {'user': user, 'token': token}
    
    @classmethod
    def verify_token(cls, token):
        """
        Vérifie un token JWT et retourne l'utilisateur.
        Lève: AuthError si token invalide
        """
        try:
            payload = validate_token(token)
            user = cls.find_by_id(payload['id'])
            
            if not user:
                raise AuthError("Utilisateur non trouvé")
            
            return user
            
        except Exception as e:
            raise AuthError(f"Token invalide: {str(e)}")
```

## Points Clés

### ✅ Ce qu'on fait (sqlite3 pur)
```python
import sqlite3

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.execute("SELECT * FROM users WHERE username = ?", (username,))
row = cursor.fetchone()
conn.close()
```

### ❌ Ce qu'on ne fait PAS (SQLAlchemy interdit)
```python
# INTERDIT:
from sqlalchemy import Column, String
from sqlalchemy.orm import Session

class User(Base):  # INTERDIT
    __tablename__ = 'users'
    id = Column(String, primary_key=True)  # INTERDIT
```

## Dépendances

- **Aucune** pour la DB (sqlite3 est dans la stdlib)
- `app.middleware.auth.jwt_utils` : pour generate_token/validate_token
- `flask.current_app` : pour accéder à app.config['DATABASE']

## Fixtures SQL

```sql
-- Création table users
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Utilisateur de test
INSERT OR IGNORE INTO users (id, username, email, password, role)
VALUES ('user-123', 'admin', 'admin@marki.fr', 'admin', 'admin');
```

## Related Routes

- `routes/api_auth.py` : Utilise AuthModel.authenticate(), AuthModel.verify_token()
- `routes/index.py` : Utilise AuthModel.authenticate()
