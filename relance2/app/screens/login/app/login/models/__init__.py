"""Models initialization"""

import sqlite3
from flask import current_app, g


def get_db():
    """Get database connection"""
    if 'db' not in g:
        g.db = sqlite3.connect(
            current_app.config['DB_PATH'],
            detect_types=sqlite3.PARSE_DECLTYPES
        )
        g.db.row_factory = sqlite3.Row
    return g.db


def close_db(e=None):
    """Close database connection"""
    db = g.pop('db', None)
    if db is not None:
        db.close()


def init_db(app):
    """Initialize database with tables"""
    with app.app_context():
        db = get_db()
        
        # Create users table
        db.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Insert demo user if not exists
        from werkzeug.security import generate_password_hash
        import uuid
        
        demo_user = db.execute(
            'SELECT 1 FROM users WHERE email = ?', ('admin@marki.fr',)
        ).fetchone()
        
        if not demo_user:
            db.execute('''
                INSERT INTO users (id, username, email, password_hash, role)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                str(uuid.uuid4()),
                'admin',
                'admin@marki.fr',
                generate_password_hash('votre-mot-de-passe'),
                'admin'
            ))
        
        db.commit()
    
    # Register teardown
    app.teardown_appcontext(close_db)


from .user import User

__all__ = ['get_db', 'close_db', 'init_db', 'User']
