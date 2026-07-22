"""Application Flask principale."""

import os
from flask import Flask


def create_app():
    """Application factory."""
    app = Flask(__name__, template_folder='templates')
    
    # Configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')
    app.config['JWT_SECRET'] = os.environ.get('JWT_SECRET', 'dev-jwt-secret-key-change-in-production')
    app.config['DATABASE'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app.db')
    
    # Initialise la base de données
    from models.auth import AuthModel
    AuthModel.init_db()
    
    # Enregistre les blueprints
    from routes import index, api_auth, wf_auth_submit
    
    app.register_blueprint(index.bp)
    app.register_blueprint(api_auth.bp)
    app.register_blueprint(wf_auth_submit.bp)
    
    return app


# Crée l'application
app = create_app()


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)