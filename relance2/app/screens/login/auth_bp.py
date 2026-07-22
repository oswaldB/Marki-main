"""Blueprint pour les routes d'API d'authentification (/api/auth)."""

from flask import Blueprint

auth_bp = Blueprint('auth_api', __name__)

from .routes.api_auth import *