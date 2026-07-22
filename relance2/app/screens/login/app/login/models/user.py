"""User model with authentication methods"""

import uuid
import jwt
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
from flask import current_app
from . import get_db


class User:
    """User model for authentication"""
    
    def __init__(self, id=None, username=None, email=None, password_hash=None, role='user'):
        self.id = id or str(uuid.uuid4())
        self.username = username
        self.email = email
        self.password_hash = password_hash
        self.role = role
    
    @staticmethod
    def get_by_email(email):
        """Get user by email"""
        db = get_db()
        row = db.execute(
            'SELECT * FROM users WHERE email = ?', (email,)
        ).fetchone()
        
        if row:
            return User(
                id=row['id'],
                username=row['username'],
                email=row['email'],
                password_hash=row['password_hash'],
                role=row['role']
            )
        return None
    
    @staticmethod
    def get_by_id(user_id):
        """Get user by ID"""
        db = get_db()
        row = db.execute(
            'SELECT * FROM users WHERE id = ?', (user_id,)
        ).fetchone()
        
        if row:
            return User(
                id=row['id'],
                username=row['username'],
                email=row['email'],
                password_hash=row['password_hash'],
                role=row['role']
            )
        return None
    
    @staticmethod
    def authenticate(email, password):
        """Authenticate user with email and password"""
        user = User.get_by_email(email)
        if user and check_password_hash(user.password_hash, password):
            return user
        return None
    
    def generate_token(self):
        """Generate JWT token"""
        payload = {
            'user_id': self.id,
            'email': self.email,
            'role': self.role,
            'exp': datetime.utcnow() + timedelta(hours=current_app.config['JWT_EXPIRATION_HOURS']),
            'iat': datetime.utcnow()
        }
        return jwt.encode(
            payload,
            current_app.config['JWT_SECRET'],
            algorithm='HS256'
        )
    
    @staticmethod
    def verify_token(token):
        """Verify JWT token and return user"""
        try:
            payload = jwt.decode(
                token,
                current_app.config['JWT_SECRET'],
                algorithms=['HS256']
            )
            return User.get_by_id(payload['user_id'])
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
            return None
    
    def to_dict(self):
        """Convert user to dictionary (excluding password)"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role
        }
