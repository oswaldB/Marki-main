from functools import wraps
from flask import g, request, jsonify
from .jwt_utils import validate_token

def require_auth(f):
    """Décorateur pour protéger les routes."""
    @wraps(f)
    def decorated(*args, **kwargs):
        # Chercher le token dans le header Authorization ou dans le cookie
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '')

        # Si pas de token dans le header, chercher dans le cookie
        if not token:
            token = request.cookies.get('access_token', '')

        # Vérification
        try:
            payload = validate_token(token)
            g.user = payload
            return f(*args, **kwargs)
        except Exception:
            return jsonify({'error': 'Token invalide'}), 401

    return decorated
