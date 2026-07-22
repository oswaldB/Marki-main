from flask import Blueprint, request, jsonify, current_app
from models.auth import AuthLocal

bp = Blueprint('wf_auth', __name__, url_prefix='/api/auth')

@bp.route('/login', methods=['POST'])
def login():
    """Authentifie un utilisateur et retourne un token JWT"""
    data = request.get_json()
    
    if not data or 'email' not in data or 'password' not in data:
        return jsonify({'error': 'Email et mot de passe requis'}), 400
    
    email = data.get('email')
    password = data.get('password')
    
    # Validation email basique
    if '@' not in email:
        return jsonify({'error': 'Format email invalide'}), 400
    
    # Authentification
    user = AuthLocal.authenticate(email, password)
    
    if user is None:
        return jsonify({'error': 'Identifiants invalides'}), 401
    
    # Génération du token
    token = AuthLocal.generate_token(
        user['id'],
        user['username'],
        user['email'],
        user['role']
    )
    
    return jsonify({
        'token': token,
        'user': user
    }), 200

@bp.route('/me', methods=['GET'])
def me():
    """Vérifie le token et retourne les infos utilisateur"""
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Token manquant'}), 401
    
    token = auth_header.split(' ')[1]
    payload = AuthLocal.verify_token(token)
    
    if payload is None:
        return jsonify({'error': 'Token invalide ou expiré'}), 401
    
    user = AuthLocal.get_user_by_id(payload['user_id'])
    
    if user is None:
        return jsonify({'error': 'Utilisateur non trouvé'}), 404
    
    return jsonify({
        'user': user,
        'token': token
    }), 200