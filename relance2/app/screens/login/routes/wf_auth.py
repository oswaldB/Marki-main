from flask import request, jsonify, current_app
from functools import wraps
import jwt
import datetime
from . import login_bp
from models.auth_local import AuthLocal

@login_bp.route('/api/auth/login', methods=['POST'])
def api_auth_login():
    """Authentification utilisateur - POST /api/auth/login"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Données JSON requises'}), 400
    
    email = data.get('email')
    password = data.get('password')
    
    # Validation des champs
    if not email or not password:
        return jsonify({'error': 'Email et mot de passe requis'}), 400
    
    # Validation format email simple
    if '@' not in email or '.' not in email:
        return jsonify({'error': 'Format email invalide'}), 400
    
    # Authentification
    auth = AuthLocal()
    user = auth.authenticate(email, password)
    
    if not user:
        return jsonify({'error': 'Identifiants invalides'}), 401
    
    # Génération du token JWT
    token = auth.generate_token(user)
    
    return jsonify({
        'token': token,
        'user': {
            'id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'role': user['role']
        }
    }), 200


@login_bp.route('/api/auth/me', methods=['GET'])
def api_auth_me():
    """Vérification token et récupération utilisateur courant"""
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Token manquant'}), 401
    
    token = auth_header.split(' ')[1]
    auth = AuthLocal()
    payload = auth.verify_token(token)
    
    if not payload:
        return jsonify({'error': 'Token invalide ou expiré'}), 401
    
    user = auth.get_user_by_id(payload.get('user_id'))
    
    if not user:
        return jsonify({'error': 'Utilisateur non trouvé'}), 404
    
    return jsonify({
        'user': {
            'id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'role': user['role']
        }
    }), 200