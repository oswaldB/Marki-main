import sqlite3
import jwt
import datetime
from functools import wraps
from flask import current_app, jsonify

DATABASE = 'database.db'

class AuthLocal:
    """Modèle d'authentification locale avec JWT"""
    
    @staticmethod
    def get_db():
        conn = sqlite3.connect(DATABASE)
        conn.row_factory = sqlite3.Row
        return conn
    
    @staticmethod
    def hash_password(password):
        """Hache un mot de passe avec bcrypt"""
        import bcrypt
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    @staticmethod
    def verify_password(password, hashed):
        """Vérifie un mot de passe contre son hash"""
        import bcrypt
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    
    @staticmethod
    def generate_token(user_id, username, email, role):
        """Génère un token JWT"""
        payload = {
            'user_id': user_id,
            'username': username,
            'email': email,
            'role': role,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)
        }
        return jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')
    
    @staticmethod
    def verify_token(token):
        """Vérifie et décode un token JWT"""
        try:
            payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    @classmethod
    def authenticate(cls, email, password):
        """Authentifie un utilisateur par email/mot de passe"""
        db = cls.get_db()
        user = db.execute(
            'SELECT * FROM users WHERE email = ?', (email,)
        ).fetchone()
        
        if user is None:
            return None
        
        if not cls.verify_password(password, user['password_hash']):
            return None
        
        return {
            'id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'role': user['role']
        }
    
    @classmethod
    def get_user_by_id(cls, user_id):
        """Récupère un utilisateur par son ID"""
        db = cls.get_db()
        user = db.execute(
            'SELECT id, username, email, role FROM users WHERE id = ?', (user_id,)
        ).fetchone()
        
        if user is None:
            return None
        
        return dict(user)