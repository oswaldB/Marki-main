"""Routes package - Register all Flask blueprints."""

from .auth import bp as auth_bp
from .contacts import bp as contacts_bp
from .impayes import bp as impayes_bp
from .relances import bp as relances_bp
from .sequences import bp as sequences_bp
from .events import bp as events_bp
from .dashboard import bp as dashboard_bp
from .settings import bp as settings_bp
from .portail import bp as portail_bp


def register_blueprints(app):
    """Register all blueprints with Flask app."""
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(contacts_bp, url_prefix='/api/contacts')
    app.register_blueprint(impayes_bp, url_prefix='/api/impayes')
    app.register_blueprint(relances_bp, url_prefix='/api/relances')
    app.register_blueprint(sequences_bp, url_prefix='/api/sequences')
    app.register_blueprint(events_bp, url_prefix='/api/events')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(settings_bp, url_prefix='/api/settings')
    app.register_blueprint(portail_bp, url_prefix='/api/portail')
