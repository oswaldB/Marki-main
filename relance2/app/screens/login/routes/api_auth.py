"""Routes API pour l'authentification."""

from flask import Blueprint, request, jsonify

from models import AuthModel, AuthError

bp = Blueprint('api_auth', __name__, url_prefix='/api/auth')


@bp.route('/login', methods=['POST'])
def login():
    """Authentifie un utilisateur et retourne un token JWT."""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Données JSON requises'}), 400
    
    identifier = data.get('email') or data.get('username')
    password = data.get('password')
    
    if not identifier or not password:
        return jsonify({'error': 'Identifiant et mot de passe requis'}), 400
    
    try:
        result = AuthModel.authenticate(identifier, password)
        return jsonify({
            'token': result['token'],
            'user': result['user'].to_dict()
        }), 200
        
    except AuthError as e:
        return jsonify({'error': str(e)}), 401
    except Exception as e:
        return jsonify({'error': 'Erreur serveur'}), 500


@bp.route('/me', methods=['GET'])
def get_current_user():
    """Retourne l'utilisateur courant à partir du token Bearer."""
    auth_header = request.headers.get('Authorization')
    
    if not auth_header:
        return jsonify({'error': 'Token manquant'}), 401
    
    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != 'bearer':
        return jsonify({'error': 'Format token invalide'}), 401
    
    token = parts[1]
    
    try:
        user = AuthModel.verify_token(token)
        return jsonify({
            'user': user.to_dict(),
            'authenticated': True
        }), 200
        
    except AuthError as e:
        return jsonify({'error': str(e)}), 401