"""User model for authentication."""
from dataclasses import dataclass
from typing import Optional
import sqlite3
import bcrypt
import sys
import os

# Add app to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))
from data import get_db


@dataclass
class User:
    """User dataclass representing a user account."""
    id: str
    username: str
    email: str
    password_hash: str
    role: str
    is_active: bool
    last_login: Optional[str] = None
    login_count: int = 0
    created_at: str = ""
    updated_at: str = ""
    
    def to_dict(self) -> dict:
        """Convert user to dictionary (full)."""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'is_active': self.is_active,
            'last_login': self.last_login,
            'login_count': self.login_count,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }
    
    def to_dict_secure(self) -> dict:
        """Convert user to dictionary (without sensitive data)."""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role
        }


class AuthModel:
    """Business logic for user authentication."""
    
    @classmethod
    def from_row(cls, row: sqlite3.Row) -> Optional[User]:
        """Create User from database row."""
        if not row:
            return None
        return User(
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
    def get_by_id(cls, user_id: str) -> Optional[User]:
        """Get user by ID."""
        db = get_db()
        cursor = db.execute(
            "SELECT * FROM users WHERE id = ? AND is_active = 1",
            (user_id,)
        )
        return cls.from_row(cursor.fetchone())
    
    @classmethod
    def get_by_username(cls, username: str) -> Optional[User]:
        """Get user by username."""
        db = get_db()
        cursor = db.execute(
            "SELECT * FROM users WHERE username = ? AND is_active = 1",
            (username,)
        )
        return cls.from_row(cursor.fetchone())
    
    @classmethod
    def authenticate(cls, username: str, password: str) -> Optional[User]:
        """Authenticate user with username and password."""
        user = cls.get_by_username(username)
        if not user:
            return None
        
        # Check password with bcrypt
        try:
            if bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8')):
                return user
        except Exception:
            pass
        return None
    
    @classmethod
    def update_last_login(cls, user_id: str) -> bool:
        """Update user's last login timestamp and increment count."""
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
    
    @classmethod
    def hash_password(cls, password: str) -> str:
        """Hash a password using bcrypt."""
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
