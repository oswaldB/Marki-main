"""
Model: Authentication & User
"""
from datetime import datetime, timedelta
import jwt
import os

JWT_SECRET = os.environ.get('JWT_SECRET', 'dev-secret-key-change-in-production')

class User:
    """User model representing authenticated user"""
    def __init__(self, id, username, email, role, password_hash=None):
        self.id = id
        self.username = username
        self.email = email
        self.role = role
        self._password_hash = password_hash
    
    def to_dict(self):
        """Return user data without sensitive info"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role
        }

class AuthLocal:
    """
    Local authentication handler
    JWT token generation and verification
    """
    
    @staticmethod
    def generate_token(user_id, expires_hours=24):
        """
        Generate JWT token for user
        
        @param {str} user_id - User identifier
        @param {int} expires_hours - Token expiration time
        @returns {str} JWT token
        """
        payload = {
            'user_id': user_id,
            'exp': datetime.utcnow() + timedelta(hours=expires_hours),
            'iat': datetime.utcnow()
        }
        return jwt.encode(payload, JWT_SECRET, algorithm='HS256')
    
    @staticmethod
    def verify_token(token):
        """
        Verify JWT token validity
        
        @param {str} token - JWT token to verify
        @returns {dict|None} Token payload or None if invalid
        """
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    @staticmethod
    def hash_password(password):
        """
        Hash password for storage
        Uses Werkzeug security in production
        """
        from werkzeug.security import generate_password_hash
        return generate_password_hash(password)
    
    @staticmethod
    def verify_password(stored_hash, password):
        """
        Verify password against stored hash
        """
        from werkzeug.security import check_password_hash
        return check_password_hash(stored_hash, password)