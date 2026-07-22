from flask import Blueprint, request, jsonify
from models.auth import AuthLocal, token_required

wf_auth_bp = Blueprint('wf_auth', __name__, url_prefix='/api/auth')


@wf_auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate user and return JWT token"""
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password required'}), 400
    
    email = data['email']
    password = data['password']
    
    # Validate email format
    import re
    if not re.match(r'^[^@]+@[^@]+\.[^@]+$', email):
        return jsonify({'error': 'Invalid email format'}), 400
    
    user = AuthLocal.authenticate_user(email, password)
    
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401
    
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


@wf_auth_bp.route('/me', methods=['GET'])
@token_required
def get_current_user(payload):
    """Get current authenticated user"""
    user = AuthLocal.get_user_by_id(payload['user_id'])
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({'user': user}), 200


@wf_auth_bp.route('/logout', methods=['POST'])
def logout():
    """Logout user (client-side token removal)"""
    return jsonify({'message': 'Logged out successfully'}), 200