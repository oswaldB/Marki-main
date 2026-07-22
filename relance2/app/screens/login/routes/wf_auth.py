from flask import Blueprint, request, jsonify, current_app
from models.user import User

bp = Blueprint('wf_auth', __name__, url_prefix='/api/auth')

@bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'error': 'Email et mot de passe requis'}), 400
    
    user = User.find_by_email(email)
    if not user or not User.verify_password(password, user.password_hash):
        return jsonify({'error': 'Identifiants invalides'}), 401
    
    token = User.generate_token(
        user.id, 
        current_app.config['SECRET_KEY'],
        expires_in=3600
    )
    
    return jsonify({
        'token': token,
        'user': user.to_dict()
    }), 200

@bp.route('/me', methods=['GET'])
def me():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Token manquant'}), 401
    
    token = auth_header.split(' ')[1]
    user_id = User.verify_token(token, current_app.config['SECRET_KEY'])
    
    if not user_id:
        return jsonify({'error': 'Token invalide ou expiré'}), 401
    
    user = User.find_by_id(user_id)
    if not user:
        return jsonify({'error': 'Utilisateur non trouvé'}), 404
    
    return jsonify({
        'user': user.to_dict()
    }), 200