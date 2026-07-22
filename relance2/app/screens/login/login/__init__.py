"""
Cell: Login
Authentication module with JWT token management
"""
from flask import Blueprint

login_bp = Blueprint('login', __name__, 
                    template_folder='templates',
                    static_folder='static')

# Import routes after blueprint creation to avoid circular imports
from .routes import index, wf_auth