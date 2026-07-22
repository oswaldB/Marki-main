"""
Cell: Login
Gestion de l'authentification utilisateur
"""

from flask import Blueprint

login_bp = Blueprint('login', __name__, template_folder='templates')

from .routes import index, wf_auth