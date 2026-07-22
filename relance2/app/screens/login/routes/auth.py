"""Routes d'authentification API."""
from flask import request, jsonify, g
from . import auth_bp
from models.auth import AuthLocal, User, login_required

@auth_bp.route('/login', methods=['POST'])
def login():
    """
    POST /api/auth/login
    Authentifie un utilisateur et retourne un token JWT.
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Données JSON requises'}), 400
    
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'error': 'Email et mot de passe requis'}), 400
    
    # Authentification
    result = AuthLocal.authenticate(email, password)
    
    if not result:
        return jsonify({'error': 'Identifiants invalides'}), 401
    
    return jsonify(result), 200


@auth_bp.route('/me', methods=['GET'])
def me():
    """
    GET /api/auth/me
    Vérifie le token et retourne les informations de l'utilisateur courant.
    """
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({'error': 'Token manquant'}), 401
    
    try:
        token = auth_header.split(' ')[1]  # Bearer <token>
    except IndexError:
        return jsonify({'error': 'Format de token invalide'}), 401
    
    payload = AuthLocal.verify_token(token)
    if not payload:
        return jsonify({'error': 'Token invalide ou expiré'}), 401
    
    user = User.find_by_id(payload['user_id'])
    if not user:
        return jsonify({'error': 'Utilisateur non trouvé'}), 401
    
    return jsonify({
        'user': {
            'id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'role': user['role']
        }
    }), 200