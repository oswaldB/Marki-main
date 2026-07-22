"""Modèle d'authentification utilisateur."""

import sqlite3
from flask import current_app
from app.middleware.auth.jwt_utils import generate_token, validate_token


class AuthError(Exception):
    """Exception personnalisée pour les erreurs d'authentification."""
    pass


class User:
    """Modèle utilisateur pour l'authentification."""
    
    def __init__(self, user_id, username, email, role='user', is_active=True):
        self.id = user_id
        self.username = username
        self.email = email
        self.role = role
        self.is_active = is_active
    
    @classmethod
    def from_row(cls, row):
        """Crée un User depuis une ligne de base de données."""
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
        """Convertit l'utilisateur en dictionnaire."""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role
        }


class AuthModel:
    """Modèle pour les opérations d'authentification."""
    
    @staticmethod
    def get_db():
        """Récupère la connexion à la base de données."""
        db_path = current_app.config['DATABASE']
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    @classmethod
    def find_by_username(cls, username):
        """Trouve un utilisateur par son nom d'utilisateur."""
        db = cls.get_db()
        user = db.execute(
            "SELECT * FROM users WHERE username = ? AND is_active = 1",
            (username,)
        ).fetchone()
        db.close()
        return User.from_row(user)
    
    @classmethod
    def find_by_id(cls, user_id):
        """Trouve un utilisateur par son ID."""
        db = cls.get_db()
        user = db.execute(
            "SELECT * FROM users WHERE id = ? AND is_active = 1",
            (user_id,)
        ).fetchone()
        db.close()
        return User.from_row(user)
    
    @classmethod
    def verify_password(cls, user, password):
        """Vérifie le mot de passe (en clair pour l'instant, à migrer vers hash)."""
        # TODO: Implémenter bcrypt pour le hash des mots de passe
        db = cls.get_db()
        stored = db.execute(
            "SELECT password FROM users WHERE id = ?",
            (user.id,)
        ).fetchone()
        db.close()
        
        if not stored:
            return False
        
        # Comparaison directe pour l'instant
        return stored['password'] == password
    
    @classmethod
    def authenticate(cls, username, password):
        """
        Authentifie un utilisateur.
        
        Args:
            username: Nom d'utilisateur
            password: Mot de passe
            
        Returns:
            dict: {'user': User, 'token': str}
            
        Raises:
            AuthError: Si les identifiants sont invalides
        """
        user = cls.find_by_username(username)
        
        if not user:
            raise AuthError("Utilisateur non trouvé")
        
        if not cls.verify_password(user, password):
            raise AuthError("Mot de passe incorrect")
        
        # Générer le token JWT
        token = generate_token(user.id, user.username, user.role)
        
        return {
            'user': user,
            'token': token
        }
    
    @classmethod
    def verify_token(cls, token):
        """
        Vérifie un token JWT et retourne l'utilisateur associé.
        
        Args:
            token: Token JWT
            
        Returns:
            User: L'utilisateur authentifié
            
        Raises:
            AuthError: Si le token est invalide
        """
        try:
            payload = validate_token(token)
            user = cls.find_by_id(payload['id'])
            
            if not user:
                raise AuthError("Utilisateur non trouvé")
            
            return user
            
        except Exception as e:
            raise AuthError(f"Token invalide: {str(e)}")


# Alias pour compatibilité avec les specs
AuthLocal = AuthModel