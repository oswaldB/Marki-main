"""Application Flask principale."""

import os
import logging
from datetime import datetime
from flask import Flask


def create_app():
    """Application factory."""
    app = Flask(__name__, 
                template_folder='templates',
                static_folder='static')
    
    # Configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')
    app.config['JWT_SECRET'] = os.environ.get('JWT_SECRET', 'dev-jwt-secret')
    app.config['DATABASE'] = os.environ.get('DATABASE', 'marki.db')
    
    # Logging
    os.makedirs('logs', exist_ok=True)
    logging.basicConfig(
        filename=f'logs/app_{datetime.now().strftime("%Y%m%d")}.log',
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Initialiser la base de données
    from models.auth import AuthModel
    with app.app_context():
        AuthModel.init_db()
        app.logger.info("Base de données initialisée")
    
    # Enregistrer les blueprints
    from routes.index import index_bp
    from routes.api_auth import api_auth_bp
    from routes.wf_auth_check import wf_auth_check_bp
    
    app.register_blueprint(index_bp)
    app.register_blueprint(api_auth_bp)
    app.register_blueprint(wf_auth_check_bp)
    
    return app


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)