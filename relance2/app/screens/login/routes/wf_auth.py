from flask import Blueprint, request, jsonify
from models.user import AuthLocal

wf_auth_bp = Blueprint('wf_auth', __name__)

@wf_auth_bp.route('/api/auth/login', methods=['POST'])
def api_login():
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Données manquantes'}), 400
        
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'error': 'Email et mot de passe requis'}), 400
    
    user = AuthLocal.verify_credentials(email, password)
    if user:
        token = AuthLocal.generate_token(user)
        return jsonify({
            'token': token,
            'user': {
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'role': user['role']
            }
        }), 200
    
    return jsonify({'error': 'Identifiants invalides'}), 401

@wf_auth_bp.route('/api/auth/me', methods=['GET'])
def api_me():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Token manquant ou invalide'}), 401
    
    token = auth_header.split(' ')[1]
    user = AuthLocal.verify_token(token)
    
    if user:
        return jsonify({'user': user}), 200
    
    return jsonify({'error': 'Token invalide'}), 401