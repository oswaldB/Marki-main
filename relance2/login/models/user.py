"""User model for authentication."""
import sqlite3
import hashlib


class User:
    """User model representing application users."""
    
    def __init__(self, id=None, username=None, email=None, role=None, password_hash=None):
        self.id = id
        self.username = username
        self.email = email
        self.role = role
        self.password_hash = password_hash
    
    @staticmethod
    def get_db_connection():
        """Get SQLite database connection."""
        conn = sqlite3.connect('database.db')
        conn.row_factory = sqlite3.Row
        return conn
    
    @classmethod
    def find_by_email(cls, email):
        """Find user by email address."""
        conn = cls.get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            'SELECT id, username, email, role, password_hash FROM users WHERE email = ?',
            (email,)
        )
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return cls(
                id=row['id'],
                username=row['username'],
                email=row['email'],
                role=row['role'],
                password_hash=row['password_hash']
            )
        return None
    
    @classmethod
    def find_by_id(cls, user_id):
        """Find user by ID."""
        conn = cls.get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            'SELECT id, username, email, role, password_hash FROM users WHERE id = ?',
            (user_id,)
        )
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return cls(
                id=row['id'],
                username=row['username'],
                email=row['email'],
                role=row['role'],
                password_hash=row['password_hash']
            )
        return None
    
    def check_password(self, password):
        """Verify password against stored hash."""
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        return password_hash == self.password_hash
    
    def to_dict(self):
        """Convert user to dictionary (excluding sensitive data)."""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role
        }
    
    @staticmethod
    def hash_password(password):
        """Hash password using SHA-256."""
        return hashlib.sha256(password.encode()).hexdigest()


class AuthLocal:
    """Local authentication helper class."""
    
    @staticmethod
    def verify_credentials(email, password):
        """Verify user credentials and return user if valid."""
        user = User.find_by_email(email)
        if user and user.check_password(password):
            return user
        return None
