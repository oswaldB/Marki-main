import os
from flask import Flask

import db


def create_app(test_config=None):
    """Application factory."""
    app = Flask(__name__, instance_relative_config=True)
    
    # Configuration
    app.config.from_mapping(
        SECRET_KEY=os.environ.get('SECRET_KEY', 'dev'),
        DATABASE=os.path.join(app.instance_path, 'data', 'marki.db'),
        JWT_SECRET=os.environ.get('JWT_SECRET', 'votre-secret-jwt-tres-long-pour-marki-2026'),
    )
    
    if test_config is None:
        app.config.from_pyfile('config.py', silent=True)
    else:
        app.config.from_mapping(test_config)
    
    # Créer le dossier instance si nécessaire
    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass
    
    # Initialiser la base de données
    db.init_app(app)
    
    # Enregistrement des blueprints
    from routes.pages import bp as pages_bp
    app.register_blueprint(pages_bp)
    
    # Auth blueprint
    from routes.auth import bp as auth_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    
    from routes.contacts import bp as contacts_bp
    app.register_blueprint(contacts_bp, url_prefix='/api/contacts')
    
    from routes.impayes import bp as impayes_bp
    app.register_blueprint(impayes_bp, url_prefix='/api/impayes')
    
    from routes.relances import bp as relances_bp
    app.register_blueprint(relances_bp, url_prefix='/api/relances')
    
    from routes.events import bp as events_bp
    app.register_blueprint(events_bp, url_prefix='/api/events')

    from routes.dashboard import bp as dashboard_bp
    app.register_blueprint(dashboard_bp)  # blueprint already has url_prefix='/api/dashboard'
    
    # from routes.users import bp as users_bp
    # app.register_blueprint(users_bp, url_prefix='/api/users')
    
    # from routes.sequences import bp as sequences_bp
    # app.register_blueprint(sequences_bp, url_prefix='/api/sequences')
    
    # from routes.smtp import bp as smtp_bp
    # app.register_blueprint(smtp_bp, url_prefix='/api/smtp-profiles')
    
    # from routes.portail import bp as portail_bp
    # app.register_blueprint(portail_bp, url_prefix='/api/portail')
    
    # from routes.tokens import bp as tokens_bp
    # app.register_blueprint(tokens_bp, url_prefix='/api/tokens')
    
    # from routes.cleanup import bp as cleanup_bp
    # app.register_blueprint(cleanup_bp, url_prefix='/api/cleanup')
    
    # from routes.import_data import bp as import_bp
    # app.register_blueprint(import_bp, url_prefix='/api/import')
    
    # from routes.workflow import bp as workflow_bp
    # app.register_blueprint(workflow_bp, url_prefix='/api/workflow')
    
    return app


if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)
