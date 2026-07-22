"""Routes pour la cellule login."""
from flask import Blueprint

# Création du blueprint auth
auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# Import des routes après création du blueprint pour éviter les imports circulaires
from . import auth