"""
Modèle User - Gestion des utilisateurs
"""
import sqlite3
import hashlib
import secrets
import os

DATABASE = 'database.db'

def get_db_connection():
    """Get SQLite database connection"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

class User:
    @staticmethod
    def init_table():
        """Create users table if not exists"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
        
        # Create default admin user if none exists
        if not User.get_by_email('admin@marki.fr'):
            User.create('admin', 'admin@marki.fr', 'admin123', 'admin')

    @staticmethod
    def _hash_password(password, salt):
        """Hash password with salt using PBKDF2"""
        return hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        ).hex()

    @staticmethod
    def create(username, email, password, role='user'):
        """Create a new user"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        user_id = secrets.token_hex(16)
        salt = secrets.token_hex(16)
        password_hash = User._hash_password(password, salt)
        
        try:
            cursor.execute('''
                INSERT INTO users (id, username, email, password_hash, salt, role)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (user_id, username, email, password_hash, salt, role))
            
            conn.commit()
            return user_id
        except sqlite3.IntegrityError:
            return None
        finally:
            conn.close()

    @staticmethod
    def get_by_id(user_id):
        """Get user by ID"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, username, email, role, created_at
            FROM users WHERE id = ?
        ''', (user_id,))
        
        user = cursor.fetchone()
        conn.close()
        
        if user:
            return dict(user)
        return None

    @staticmethod
    def get_by_email(email):
        """Get user by email"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, username, email, password_hash, salt, role
            FROM users WHERE email = ?
        ''', (email,))
        
        user = cursor.fetchone()
        conn.close()
        
        if user:
            return dict(user)
        return None

    @staticmethod
    def verify_credentials(email, password):
        """Verify user credentials"""
        user = User.get_by_email(email)
        
        if not user:
            return None
        
        password_hash = User._hash_password(password, user['salt'])
        
        if password_hash == user['password_hash']:
            return {
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'role': user['role']
            }
        return None

    @staticmethod
    def update(user_id, username=None, email=None, role=None):
        """Update user information"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        updates = []
        params = []
        
        if username:
            updates.append('username = ?')
            params.append(username)
        if email:
            updates.append('email = ?')
            params.append(email)
        if role:
            updates.append('role = ?')
            params.append(role)
        
        if not updates:
            conn.close()
            return False
        
        params.append(user_id)
        
        cursor.execute(f'''
            UPDATE users 
            SET {', '.join(updates)}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', params)
        
        conn.commit()
        conn.close()
        return True

    @staticmethod
    def delete(user_id):
        """Delete user by ID"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM users WHERE id = ?', (user_id,))
        
        conn.commit()
        conn.close()
        return True

    @staticmethod
    def list_all():
        """List all users"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, username, email, role, created_at
            FROM users ORDER BY created_at DESC
        ''')
        
        users = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return users