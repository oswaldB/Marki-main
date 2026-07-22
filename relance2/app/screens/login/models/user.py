import sqlite3
from flask import current_app
import hashlib

class User:
    """Modèle User pour SQLite"""
    
    @staticmethod
    def get_db():
        """Récupère la connexion DB"""
        # Par défaut, cherche 'database.db' dans le dossier parent
        conn = sqlite3.connect('database.db')
        conn.row_factory = sqlite3.Row
        return conn
    
    @staticmethod
    def find_by_email(email):
        """Recherche un utilisateur par email"""
        conn = User.get_db()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM users WHERE email = ?",
            (email,)
        )
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return dict(row)
        return None
    
    @staticmethod
    def find_by_id(user_id):
        """Recherche un utilisateur par ID"""
        conn = User.get_db()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM users WHERE id = ?",
            (user_id,)
        )
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return dict(row)
        return None
    
    @staticmethod
    def verify_password(stored_password, provided_password):
        """Vérifie le mot de passe (comparaison directe pour demo, utiliser bcrypt en prod)"""
        # En production, utiliser werkzeug.security ou bcrypt
        # Ici on fait un simple hash SHA256 pour demo
        hashed = hashlib.sha256(provided_password.encode()).hexdigest()
        return stored_password == hashed
    
    @staticmethod
    def hash_password(password):
        """Hash le mot de passe"""
        return hashlib.sha256(password.encode()).hexdigest()