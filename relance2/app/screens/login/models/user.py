import sqlite3
import jwt
import datetime
from werkzeug.security import check_password_hash, generate_password_hash
import os

DATABASE = 'database.db'
SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

class AuthLocal:
    @staticmethod
    def init_db():
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        c.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'user'
            )
        ''')
        
        # Insert demo user if not exists
        c.execute("SELECT * FROM users WHERE email = ?", ('admin@marki.fr',))
        if not c.fetchone():
            password_hash = generate_password_hash('votre-mot-de-passe')
            c.execute('''
                INSERT INTO users (username, email, password_hash, role) 
                VALUES (?, ?, ?, ?)
            ''', ('admin', 'admin@marki.fr', password_hash, 'admin'))
        
        conn.commit()
        conn.close()

    @staticmethod
    def verify_credentials(email, password):
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        c.execute("SELECT id, username, email, password_hash, role FROM users WHERE email = ?", (email,))
        row = c.fetchone()
        conn.close()
        
        if row and check_password_hash(row[3], password):
            return {
                'id': row[0],
                'username': row[1],
                'email': row[2],
                'role': row[4]
            }
        return None

    @staticmethod
    def generate_token(user):
        payload = {
            'user_id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'role': user['role'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)
        }
        return jwt.encode(payload, SECRET_KEY, algorithm='HS256')

    @staticmethod
    def verify_token(token):
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            return {
                'id': payload['user_id'],
                'username': payload['username'],
                'email': payload['email'],
                'role': payload['role']
            }
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None

    @staticmethod
    def get_user_by_id(user_id):
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        c.execute("SELECT id, username, email, role FROM users WHERE id = ?", (user_id,))
        row = c.fetchone()
        conn.close()
        
        if row:
            return {
                'id': row[0],
                'username': row[1],
                'email': row[2],
                'role': row[3]
            }
        return None