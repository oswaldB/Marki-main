"""
Modèle Utilisateur pour l'authentification
"""
import sqlite3
from werkzeug.security import generate_password_hash


class User:
    def __init__(self, id=None, username=None, email=None, 
                 password_hash=None, role='user'):
        self.id = id
        self.username = username
        self.email = email
        self.password_hash = password_hash
        self.role = role
    
    @staticmethod
    def get_db_path():
        """Retourne le chemin de la base de données"""
        from flask import current_app
        return current_app.config.get('DATABASE', 'app.db')
    
    @classmethod
    def find_by_email(cls, email):
        """Trouver un utilisateur par email"""
        conn = sqlite3.connect(cls.get_db_path())
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute(
            'SELECT * FROM users WHERE email = ?',
            (email.lower(),)
        )
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return cls(
                id=row['id'],
                username=row['username'],
                email=row['email'],
                password_hash=row['password_hash'],
                role=row.get('role', 'user')
            )
        return None
    
    @classmethod
    def create_table(cls):
        """Créer la table users si elle n'existe pas"""
        conn = sqlite3.connect(cls.get_db_path())
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
    
    @classmethod
    def create_user(cls, username, email, password, role='user'):
        """Créer un nouvel utilisateur"""
        password_hash = generate_password_hash(password)
        
        conn = sqlite3.connect(cls.get_db_path())
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO users (username, email, password_hash, role)
                VALUES (?, ?, ?, ?)
            ''', (username, email.lower(), password_hash, role))
            
            conn.commit()
            user_id = cursor.lastrowid
            conn.close()
            
            return cls(id=user_id, username=username, email=email, 
                      password_hash=password_hash, role=role)
        except sqlite3.IntegrityError:
            conn.close()
            return None