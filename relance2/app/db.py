import sqlite3
from flask import g, current_app


def get_db():
    """Get database connection."""
    if 'db' not in g:
        g.db = sqlite3.connect(
            current_app.config['DATABASE'],
            detect_types=sqlite3.PARSE_DECLTYPES
        )
        g.db.row_factory = sqlite3.Row
    return g.db


def close_db(e=None):
    """Close database connection."""
    db = g.pop('db', None)
    if db is not None:
        db.close()


def init_app(app):
    """Register teardown handler with Flask app."""
    app.teardown_appcontext(close_db)
