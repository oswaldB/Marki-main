"""Modèle d'authentification et gestion utilisateurs."""
import sqlite3
import jwt
import uuid
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from flask import request, jsonify, current_app, g
import os

DATABASE = os.environ.get('DATABASE_PATH', 'data/app.db')
JWT_SECRET = os.environ.get('JWT_SECRET', 'dev-secret-key-change-in-production')
JWT_EXPIRATION_HOURS = 24

class User:
    """Modèle utilisateur pour l'authentification."""
    
    @staticmethod
    def get_db():
        """Récupère la connexion à la base de données."""
        if 'db' not in g:
            g.db = sqlite3.connect(DATABASE)
            g.db.row_factory = sqlite3.Row
        return g.db
    
    @staticmethod
    def close_db():
        """Ferme la connexion à la base de données."""
        db = g.pop('db', None)
        if db is not None:
            db.close()
    
    @staticmethod
    def init_table():
        """Initialise la table users si elle n'existe pas."""
        db = sqlite3.connect(DATABASE)
        cursor = db.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        db.commit()
        db.close()
    
    @staticmethod
    def create(username, email, password, role='user'):
        """Crée un nouvel utilisateur."""
        user_id = f"user_{uuid.uuid4().hex[:8]}"
        password_hash = generate_password_hash(password)
        
        db = sqlite3.connect(DATABASE)
        cursor = db.cursor()
        try:
            cursor.execute('''
                INSERT INTO users (id, username, email, password_hash, role)
                VALUES (?, ?, ?, ?, ?)
            ''', (user_id, username, email, password_hash, role))
            db.commit()
            return user_id
        except sqlite3.IntegrityError:
            return None
        finally:
            db.close()
    
    @staticmethod
    def find_by_email(email):
        """Trouve un utilisateur par son email."""
        db = sqlite3.connect(DATABASE)
        cursor = db.cursor()
        cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
        row = cursor.fetchone()
        db.close()
        
        if row:
            return {
                'id': row[0],
                'username': row[1],
                'email': row[2],
                'password_hash': row[3],
                'role': row[4],
                'created_at': row[5]
            }
        return None
    
    @staticmethod
    def find_by_id(user_id):
        """Trouve un utilisateur par son ID."""
        db = sqlite3.connect(DATABASE)
        cursor = db.cursor()
        cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
        row = cursor.fetchone()
        db.close()
        
        if row:
            return {
                'id': row[0],
                'username': row[1],
                'email': row[2],
                'role': row[4],
                'created_at': row[5]
            }
        return None
    
    @staticmethod
    def verify_password(password_hash, password):
        """Vérifie si le mot de passe correspond au hash."""
        return check_password_hash(password_hash, password)


class AuthLocal:
    """Gestion de l'authentification locale (JWT)."""
    
    @staticmethod
    def generate_token(user):
        """Génère un token JWT pour l'utilisateur."""
        payload = {
            'user_id': user['id'],
            'email': user['email'],
            'role': user['role'],
            'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
            'iat': datetime.utcnow()
        }
        return jwt.encode(payload, JWT_SECRET, algorithm='HS256')
    
    @staticmethod
    def verify_token(token):
        """Vérifie la validité d'un token JWT."""
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            return {
                'user_id': payload.get('user_id'),
                'email': payload.get('email'),
                'role': payload.get('role')
            }
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    @staticmethod
    def authenticate(email, password):
        """Authentifie un utilisateur avec email/password."""
        user = User.find_by_email(email)
        if not user:
            return None
        
        if not User.verify_password(user['password_hash'], password):
            return None
        
        # Génère le token
        token = AuthLocal.generate_token(user)
        
        return {
            'token': token,
            'user': {
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'role': user['role']
            }
        }


def login_required(f):
    """Décorateur pour protéger les routes nécessitant une authentification."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        try:
            token = auth_header.split(' ')[1]  # Bearer <token>
        except IndexError:
            return jsonify({'error': 'Format de token invalide'}), 401
        
        payload = AuthLocal.verify_token(token)
        if not payload:
            return jsonify({'error': 'Token invalide ou expiré'}), 401
        
        # Ajoute l'utilisateur au contexte
        g.current_user = User.find_by_id(payload['user_id'])
        if not g.current_user:
            return jsonify({'error': 'Utilisateur non trouvé'}), 401
        
        return f(*args, **kwargs)
    return decorated_function