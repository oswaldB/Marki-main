import sqlite3
import hashlib
import secrets
from datetime import datetime, timedelta
import jwt
from flask import current_app

DATABASE = 'data/app.db'

class User:
    def __init__(self, id=None, username=None, email=None, password_hash=None, role='user'):
        self.id = id
        self.username = username
        self.email = email
        self.password_hash = password_hash
        self.role = role
    
    @staticmethod
    def get_db():
        conn = sqlite3.connect(DATABASE)
        conn.row_factory = sqlite3.Row
        return conn
    
    @staticmethod
    def hash_password(password, salt=None):
        if salt is None:
            salt = secrets.token_hex(16)
        hash_value = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
        return salt + hash_value.hex()
    
    @staticmethod
    def verify_password(password, password_hash):
        salt = password_hash[:32]
        check_hash = User.hash_password(password, salt)
        return check_hash == password_hash
    
    @classmethod
    def find_by_email(cls, email):
        conn = cls.get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return cls(
                id=row['id'],
                username=row['username'],
                email=row['email'],
                password_hash=row['password_hash'],
                role=row['role']
            )
        return None
    
    @classmethod
    def find_by_id(cls, user_id):
        conn = cls.get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return cls(
                id=row['id'],
                username=row['username'],
                email=row['email'],
                password_hash=row['password_hash'],
                role=row['role']
            )
        return None
    
    @staticmethod
    def generate_token(user_id, secret_key, expires_in=3600):
        payload = {
            'user_id': user_id,
            'exp': datetime.utcnow() + timedelta(seconds=expires_in),
            'iat': datetime.utcnow()
        }
        return jwt.encode(payload, secret_key, algorithm='HS256')
    
    @staticmethod
    def verify_token(token, secret_key):
        try:
            payload = jwt.decode(token, secret_key, algorithms=['HS256'])
            return payload.get('user_id')
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role
        }