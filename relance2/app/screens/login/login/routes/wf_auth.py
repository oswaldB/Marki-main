"""
Workflow Backend: Authentification
"""
import jwt
import datetime
from flask import request, jsonify, current_app
from werkzeug.security import check_password_hash
from .. import login_bp
from ..models.user import User


@login_bp.route('/api/auth/login', methods=['POST'])
def api_auth_login():
    """
    Authentifier un utilisateur et retourner un token JWT
    
    POST /api/auth/login
    Body: { "email": "...", "password": "..." }
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Données manquantes'}), 400
    
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    
    if not email or not password:
        return jsonify({'error': 'Email et mot de passe requis'}), 400
    
    # Rechercher l'utilisateur
    user = User.find_by_email(email)
    
    if not user:
        return jsonify({'error': 'Identifiants invalides'}), 401
    
    # Vérifier le mot de passe
    if not check_password_hash(user.password_hash, password):
        return jsonify({'error': 'Identifiants invalides'}), 401
    
    # Générer le token JWT
    token_payload = {
        'user_id': user.id,
        'username': user.username,
        'email': user.email,
        'role': user.role,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }
    
    token = jwt.encode(
        token_payload,
        current_app.config.get('SECRET_KEY', 'dev-secret-key'),
        algorithm='HS256'
    )
    
    return jsonify({
        'token': token,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role': user.role
        }
    }), 200


@login_bp.route('/api/auth/me', methods=['GET'])
def api_auth_me():
    """
    Vérifier la validité du token et retourner les infos utilisateur
    
    GET /api/auth/me
    Header: Authorization: Bearer <token>
    """
    auth_header = request.headers.get('Authorization', '')
    
    if not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Token manquant'}), 401
    
    token = auth_header.replace('Bearer ', '')
    
    try:
        payload = jwt.decode(
            token,
            current_app.config.get('SECRET_KEY', 'dev-secret-key'),
            algorithms=['HS256']
        )
        
        return jsonify({
            'user': {
                'id': payload.get('user_id'),
                'username': payload.get('username'),
                'email': payload.get('email'),
                'role': payload.get('role')
            }
        }), 200
        
    except jwt.ExpiredSignatureError:
        return jsonify({'error': 'Token expiré'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'error': 'Token invalide'}), 401