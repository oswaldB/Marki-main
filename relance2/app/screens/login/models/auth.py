import sqlite3
import jwt
import datetime
from functools import wraps
from flask import request, jsonify, current_app
import os

SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

class AuthLocal:
    @staticmethod
    def get_db():
        """Get database connection"""
        conn = sqlite3.connect('database.db')
        conn.row_factory = sqlite3.Row
        return conn
    
    @staticmethod
    def hash_password(password):
        """Simple password hashing (use bcrypt in production)"""
        import hashlib
        return hashlib.sha256(password.encode()).hexdigest()
    
    @staticmethod
    def verify_password(password, hashed):
        """Verify password against hash"""
        return AuthLocal.hash_password(password) == hashed
    
    @staticmethod
    def generate_token(user_id, username, email, role):
        """Generate JWT token"""
        payload = {
            'user_id': user_id,
            'username': username,
            'email': email,
            'role': role,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=1),
            'iat': datetime.datetime.utcnow()
        }
        return jwt.encode(payload, SECRET_KEY, algorithm='HS256')
    
    @staticmethod
    def verify_token(token):
        """Verify JWT token"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    @staticmethod
    def authenticate_user(email, password):
        """Authenticate user with email and password"""
        conn = AuthLocal.get_db()
        cursor = conn.cursor()
        cursor.execute(
            'SELECT id, username, email, password, role FROM users WHERE email = ?',
            (email,)
        )
        user = cursor.fetchone()
        conn.close()
        
        if user and AuthLocal.verify_password(password, user['password']):
            return {
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'role': user['role']
            }
        return None
    
    @staticmethod
    def get_user_by_id(user_id):
        """Get user by ID"""
        conn = AuthLocal.get_db()
        cursor = conn.cursor()
        cursor.execute(
            'SELECT id, username, email, role FROM users WHERE id = ?',
            (user_id,)
        )
        user = cursor.fetchone()
        conn.close()
        
        if user:
            return {
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'role': user['role']
            }
        return None


def token_required(f):
    """Decorator to protect routes with JWT"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(' ')[1]
            except IndexError:
                return jsonify({'error': 'Token format invalid'}), 401
        
        if not token:
            return jsonify({'error': 'Token missing'}), 401
        
        payload = AuthLocal.verify_token(token)
        if not payload:
            return jsonify({'error': 'Token invalid or expired'}), 401
        
        return f(payload, *args, **kwargs)
    return decorated