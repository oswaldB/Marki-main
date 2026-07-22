import jwt
import datetime
import os
from .user import User

class AuthLocal:
    """Gestion de l'authentification locale avec JWT"""
    
    SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'dev-secret-key-change-in-production')
    TOKEN_EXPIRY_HOURS = 24
    
    def authenticate(self, email, password):
        """Authentifie un utilisateur par email/password"""
        user = User.find_by_email(email)
        
        if not user:
            return None
        
        # Vérification du mot de passe
        if not User.verify_password(user.get('password'), password):
            return None
        
        # Retourne l'utilisateur sans le mot de passe
        return {
            'id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'role': user.get('role', 'user')
        }
    
    def generate_token(self, user):
        """Génère un token JWT pour l'utilisateur"""
        payload = {
            'user_id': user['id'],
            'email': user['email'],
            'role': user['role'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=self.TOKEN_EXPIRY_HOURS),
            'iat': datetime.datetime.utcnow()
        }
        
        token = jwt.encode(payload, self.SECRET_KEY, algorithm='HS256')
        return token
    
    def verify_token(self, token):
        """Vérifie et décode un token JWT"""
        try:
            payload = jwt.decode(token, self.SECRET_KEY, algorithms=['HS256'])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    def get_user_by_id(self, user_id):
        """Récupère un utilisateur par son ID"""
        return User.find_by_id(user_id)