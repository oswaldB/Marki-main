import sqlite3
import uuid
from datetime import datetime, timedelta
from flask import current_app
from app.middleware.auth.jwt_utils import generate_token, validate_token


class AuthError(Exception):
    """Exception pour les erreurs d'authentification."""
    pass


class User:
    """Dataclass utilisateur."""
    
    def __init__(self, user_id, username, email, role='user', is_active=True):
        self.id = user_id
        self.username = username
        self.email = email
        self.role = role
        self.is_active = bool(is_active)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role
        }


class AuthModel:
    """Logique métier d'authentification."""
    
    @staticmethod
    def get_db():
        """Récupère une connexion à la base de données."""
        db_path = current_app.config['DATABASE']
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    @classmethod
    def authenticate(cls, username_or_email, password):
        """
        Authentifie un utilisateur par username/email et mot de passe.
        Retourne {'user': User, 'token': str} ou lève AuthError.
        """
        db = cls.get_db()
        try:
            # Chercher par username OU email
            cursor = db.execute(
                """
                SELECT id, username, email, password_hash, role, is_active 
                FROM users 
                WHERE (username = ? OR email = ?) AND is_active = 1
                """,
                (username_or_email, username_or_email)
            )
            row = cursor.fetchone()
            
            if not row:
                raise AuthError("Identifiants invalides")
            
            # Vérification simple du mot de passe (en production utiliser bcrypt/werkzeug)
            # Ici on compare directement pour la démo - à remplacer par hash sécurisé
            if row['password_hash'] != password:
                raise AuthError("Identifiants invalides")
            
            # Créer l'objet utilisateur
            user = User(
                row['id'],
                row['username'],
                row['email'],
                row.get('role', 'user'),
                row.get('is_active', 1)
            )
            
            # Générer le token JWT
            token = generate_token(user.id, user.username, user.role)
            
            # Mettre à jour last_login et login_count
            db.execute(
                """
                UPDATE users 
                SET last_login = CURRENT_TIMESTAMP,
                    login_count = login_count + 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (user.id,)
            )
            db.commit()
            
            # Créer une session
            session_id = str(uuid.uuid4())
            expires_at = (datetime.utcnow() + timedelta(days=1)).isoformat()
            db.execute(
                """
                INSERT INTO sessions (id, user_id, token, expires_at, created_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                """,
                (session_id, user.id, token, expires_at)
            )
            db.commit()
            
            return {'user': user, 'token': token}
            
        finally:
            db.close()
    
    @classmethod
    def verify_token(cls, token):
        """
        Vérifie un token JWT et retourne les infos utilisateur.
        """
        try:
            payload = validate_token(token)
            
            # Vérifier que la session existe toujours en base
            db = cls.get_db()
            try:
                cursor = db.execute(
                    """
                    SELECT s.*, u.username, u.email, u.role, u.is_active
                    FROM sessions s
                    JOIN users u ON s.user_id = u.id
                    WHERE s.token = ? AND s.expires_at > CURRENT_TIMESTAMP
                    AND u.is_active = 1
                    """,
                    (token,)
                )
                row = cursor.fetchone()
                
                if not row:
                    raise AuthError("Session invalide ou expirée")
                
                user = User(
                    row['user_id'],
                    row['username'],
                    row['email'],
                    row['role'],
                    row['is_active']
                )
                
                return {'user': user, 'payload': payload}
                
            finally:
                db.close()
                
        except Exception as e:
            raise AuthError(f"Token invalide: {str(e)}")
    
    @classmethod
    def logout(cls, token):
        """Révoque une session en supprimant le token."""
        db = cls.get_db()
        try:
            db.execute("DELETE FROM sessions WHERE token = ?", (token,))
            db.commit()
            return True
        finally:
            db.close()