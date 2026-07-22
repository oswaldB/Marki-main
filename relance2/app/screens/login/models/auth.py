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
    def find_by_email(cls, email):
        """Trouve un utilisateur par email."""
        db = cls.get_db()
        user = db.execute(
            "SELECT * FROM users WHERE email = ? AND is_active = 1",
            (email,)
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
    def authenticate(cls, identifier, password):
        """
        Authentifie un utilisateur par username ou email.
        Retourne: {'user': User, 'token': str}
        Lève: AuthError si échec
        """
        # Essayer par username d'abord, puis par email si contient @
        user = cls.find_by_username(identifier)
        if not user and '@' in identifier:
            user = cls.find_by_email(identifier)
        
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