"""Routes API pour l'authentification."""

from flask import Blueprint, request, jsonify
from models.auth import AuthModel, AuthError
from middleware.auth.jwt_utils import jwt_required

bp = Blueprint('api_auth', __name__, url_prefix='/api/auth')


@bp.route('/login', methods=['POST'])
def login():
    """
    POST /api/auth/login
    
    Authentifie un utilisateur et retourne un token JWT.
    
    Request Body:
        {
            "email": "admin@marki.fr",
            "password": "votre-mot-de-passe"
        }
    
    Response 200:
        {
            "token": "eyJhbGciOiJIUzI1NiIs...",
            "user": {
                "id": "user_xxx",
                "username": "admin",
                "email": "admin@marki.fr",
                "role": "admin"
            }
        }
    
    Response 401:
        {
            "error": "Identifiants invalides"
        }
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Données manquantes'}), 400
    
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'error': 'Email et mot de passe requis'}), 400
    
    try:
        result = AuthModel.authenticate(email, password)
        return jsonify({
            'token': result['token'],
            'user': result['user'].to_dict()
        }), 200
        
    except AuthError as e:
        return jsonify({'error': str(e)}), 401


@bp.route('/me', methods=['GET'])
def me():
    """
    GET /api/auth/me
    
    Vérifie le token et retourne les informations de l'utilisateur connecté.
    Le token doit être fourni dans le header Authorization: Bearer <token>
    
    Response 200:
        {
            "user": {
                "id": "user_xxx",
                "username": "admin",
                "email": "admin@marki.fr",
                "role": "admin"
            }
        }
    
    Response 401:
        {
            "error": "Token invalide ou expiré"
        }
    """
    auth_header = request.headers.get('Authorization')
    
    if not auth_header:
        return jsonify({'error': 'Token manquant'}), 401
    
    try:
        # Format: "Bearer <token>"
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return jsonify({'error': 'Format de token invalide'}), 401
        
        token = parts[1]
        user = AuthModel.verify_token(token)
        
        return jsonify({'user': user.to_dict()}), 200
        
    except AuthError as e:
        return jsonify({'error': str(e)}), 401