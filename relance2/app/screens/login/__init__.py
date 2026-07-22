"""Login screen blueprint."""
from flask import Blueprint

bp = Blueprint(
    'login',
    __name__,
    url_prefix='/login',
    template_folder='templates',
    static_folder='static'
)

# Import routes after blueprint creation to avoid circular imports
from .routes import index, auth_login, auth_logout, auth_me, auth_verify
