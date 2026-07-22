"""Modèle de session utilisateur pour la gestion des tokens JWT."""
import sqlite3
import uuid
from datetime import datetime
from typing import Optional, List
from app.data import get_db


class Session:
    """Modèle de session utilisateur pour la gestion des tokens JWT et le suivi des connexions."""
    
    def __init__(self, id: str, user_id: str, token: str, expires_at: str,
                 ip_address: str = None, user_agent: str = None, created_at: str = None):
        self.id = id
        self.user_id = user_id
        self.token = token
        self.expires_at = expires_at
        self.ip_address = ip_address
        self.user_agent = user_agent
        self.created_at = created_at
    
    @classmethod
    def from_row(cls, row: sqlite3.Row) -> Optional['Session']:
        """Crée une instance Session depuis une ligne de résultat SQL."""
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
    
    @classmethod
    def create(cls, user_id: str, token: str, expires_at: str,
               ip_address: str = None, user_agent: str = None) -> 'Session':
        """Crée une nouvelle session."""
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
    
    @classmethod
    def get_by_id(cls, session_id: str) -> Optional['Session']:
        """Récupère une session par son ID."""
        db = get_db()
        cursor = db.execute(
            "SELECT * FROM sessions WHERE id = ?",
            (session_id,)
        )
        return cls.from_row(cursor.fetchone())
    
    @classmethod
    def get_by_token(cls, token: str) -> Optional['Session']:
        """Récupère une session par son token JWT."""
        db = get_db()
        cursor = db.execute(
            "SELECT * FROM sessions WHERE token = ?",
            (token,)
        )
        return cls.from_row(cursor.fetchone())
    
    @classmethod
    def get_active_by_user(cls, user_id: str) -> List['Session']:
        """Récupère toutes les sessions actives d'un utilisateur."""
        db = get_db()
        cursor = db.execute(
            """SELECT * FROM sessions 
               WHERE user_id = ? AND expires_at > ?
               ORDER BY created_at DESC""",
            (user_id, datetime.now().isoformat())
        )
        return [cls.from_row(row) for row in cursor.fetchall()]
    
    @classmethod
    def is_valid(cls, token: str) -> bool:
        """Vérifie si un token est valide et non expiré."""
        db = get_db()
        cursor = db.execute(
            """SELECT 1 FROM sessions 
               WHERE token = ? AND expires_at > ?""",
            (token, datetime.now().isoformat())
        )
        return cursor.fetchone() is not None
    
    @classmethod
    def revoke(cls, session_id: str) -> bool:
        """Révoque une session spécifique."""
        db = get_db()
        db.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        db.commit()
        return True
    
    @classmethod
    def revoke_all_by_user(cls, user_id: str) -> bool:
        """Révoque toutes les sessions d'un utilisateur (logout global)."""
        db = get_db()
        db.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
        db.commit()
        return True
    
    @classmethod
    def cleanup_expired(cls) -> int:
        """Nettoie les sessions expirées. Retourne le nombre de sessions supprimées."""
        db = get_db()
        cursor = db.execute(
            "DELETE FROM sessions WHERE expires_at < ?",
            (datetime.now().isoformat(),)
        )
        db.commit()
        return cursor.rowcount
    
    def is_expired(self) -> bool:
        """Vérifie si la session est expirée."""
        return datetime.fromisoformat(self.expires_at) < datetime.now()
    
    def to_dict(self) -> dict:
        """Convertit la session en dictionnaire."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'expires_at': self.expires_at,
            'ip_address': self.ip_address,
            'created_at': self.created_at
        }