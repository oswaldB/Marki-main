"""Modèle utilisateur pour l'authentification."""
import sqlite3
import bcrypt
from datetime import datetime
from typing import Optional
from app.data import get_db


class User:
    """Modèle utilisateur pour l'authentification et la gestion des comptes."""
    
    def __init__(self, id: str, username: str, email: str, password_hash: str,
                 role: str = 'user', is_active: bool = True, last_login: str = None,
                 login_count: int = 0, created_at: str = None, updated_at: str = None):
        self.id = id
        self.username = username
        self.email = email
        self.password_hash = password_hash
        self.role = role
        self.is_active = is_active
        self.last_login = last_login
        self.login_count = login_count
        self.created_at = created_at
        self.updated_at = updated_at
    
    @classmethod
    def from_row(cls, row: sqlite3.Row) -> Optional['User']:
        """Crée une instance User depuis une ligne de résultat SQL."""
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
    
    @classmethod
    def get_by_id(cls, user_id: str) -> Optional['User']:
        """Récupère un utilisateur par son ID."""
        db = get_db()
        cursor = db.execute(
            "SELECT * FROM users WHERE id = ? AND is_active = 1",
            (user_id,)
        )
        return cls.from_row(cursor.fetchone())
    
    @classmethod
    def get_by_username(cls, username: str) -> Optional['User']:
        """Récupère un utilisateur par son nom d'utilisateur."""
        db = get_db()
        cursor = db.execute(
            "SELECT * FROM users WHERE username = ? AND is_active = 1",
            (username,)
        )
        return cls.from_row(cursor.fetchone())
    
    @classmethod
    def get_by_email(cls, email: str) -> Optional['User']:
        """Récupère un utilisateur par son email."""
        db = get_db()
        cursor = db.execute(
            "SELECT * FROM users WHERE email = ? AND is_active = 1",
            (email.lower().strip(),)
        )
        return cls.from_row(cursor.fetchone())
    
    @classmethod
    def authenticate(cls, username: str, password: str) -> Optional['User']:
        """Authentifie un utilisateur avec son nom d'utilisateur et mot de passe."""
        user = cls.get_by_username(username)
        if not user:
            return None
        if bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8')):
            return user
        return None
    
    @classmethod
    def update_last_login(cls, user_id: str) -> bool:
        """Met à jour la date de dernière connexion et incrémente le compteur."""
        db = get_db()
        now = datetime.now().isoformat()
        db.execute(
            """UPDATE users 
               SET last_login = ?, login_count = login_count + 1, updated_at = ?
               WHERE id = ?""",
            (now, now, user_id)
        )
        db.commit()
        return True
    
    def to_dict(self) -> dict:
        """Convertit l'utilisateur en dictionnaire (pour JSON)."""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'is_active': self.is_active
        }
    
    def to_dict_secure(self) -> dict:
        """Version sans données sensibles pour le frontend."""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role
        }