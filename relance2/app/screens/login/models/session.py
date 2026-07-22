"""Session model for JWT token management."""
from dataclasses import dataclass
from typing import Optional
import sqlite3
import uuid
from datetime import datetime
import sys
import os

# Add app to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))
from data import get_db


@dataclass
class Session:
    """Session dataclass representing a user session."""
    id: str
    user_id: str
    token: str
    expires_at: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: str = ""
    
    def is_expired(self) -> bool:
        """Check if session is expired."""
        return datetime.fromisoformat(self.expires_at) < datetime.now()
    
    def to_dict(self) -> dict:
        """Convert session to dictionary."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'expires_at': self.expires_at,
            'created_at': self.created_at
        }


class SessionModel:
    """Business logic for session management."""
    
    @classmethod
    def from_row(cls, row: sqlite3.Row) -> Optional[Session]:
        """Create Session from database row."""
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
    
    @classmethod
    def create(cls, user_id: str, token: str, expires_at: str,
               ip_address: str = None, user_agent: str = None) -> Session:
        """Create a new session."""
        session_id = f"sess_{uuid.uuid4().hex[:8]}_{int(datetime.now().timestamp())}"
        db = get_db()
        db.execute(
            """INSERT INTO sessions (id, user_id, token, expires_at, ip_address, user_agent, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (session_id, user_id, token, expires_at, ip_address, user_agent, datetime.now().isoformat())
        )
        db.commit()
        return cls.get_by_id(session_id)
    
    @classmethod
    def get_by_id(cls, session_id: str) -> Optional[Session]:
        """Get session by ID."""
        db = get_db()
        cursor = db.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
        return cls.from_row(cursor.fetchone())
    
    @classmethod
    def get_by_token(cls, token: str) -> Optional[Session]:
        """Get session by token."""
        db = get_db()
        cursor = db.execute("SELECT * FROM sessions WHERE token = ?", (token,))
        return cls.from_row(cursor.fetchone())
    
    @classmethod
    def is_valid(cls, token: str) -> bool:
        """Check if token is valid and not expired."""
        db = get_db()
        cursor = db.execute(
            "SELECT 1 FROM sessions WHERE token = ? AND expires_at > ?",
            (token, datetime.now().isoformat())
        )
        return cursor.fetchone() is not None
    
    @classmethod
    def revoke(cls, session_id: str) -> bool:
        """Revoke a session."""
        db = get_db()
        db.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        db.commit()
        return True
    
    @classmethod
    def revoke_all_by_user(cls, user_id: str) -> bool:
        """Revoke all sessions for a user."""
        db = get_db()
        db.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
        db.commit()
        return True
    
    @classmethod
    def cleanup_expired(cls) -> int:
        """Clean up expired sessions."""
        db = get_db()
        cursor = db.execute(
            "DELETE FROM sessions WHERE expires_at < ?",
            (datetime.now().isoformat(),)
        )
        db.commit()
        return cursor.rowcount
