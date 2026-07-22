"""Blueprint pour la cell login."""
from flask import Blueprint

bp = Blueprint('login', __name__, url_prefix='/login')

# Importer les routes après la création du blueprint
from .routes import index, logout, auth_login, auth_logout, auth_me, auth_verify