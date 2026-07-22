"""
Cell Login - Authentication Module
Architecture: cellsmvc (Flask + Alpine.js + Tailwind)
"""

from flask import Flask
from .config import Config
from .models import init_db


def create_app(config_class=Config):
    """Application factory pattern"""
    app = Flask(
        __name__,
        template_folder='templates',
        static_folder='static'
    )
    
    # Configuration
    app.config.from_object(config_class)
    
    # Initialize database
    init_db(app)
    
    # Register blueprints
    from .routes.index import bp as index_bp
    from .routes.wf_auth import bp as auth_bp
    
    app.register_blueprint(index_bp)
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    
    return app
