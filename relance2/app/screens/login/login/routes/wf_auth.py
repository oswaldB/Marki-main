"""
Workflow Backend: Authentication API
Routes: /api/auth/login, /api/auth/me
"""
import os
from datetime import datetime, timedelta
  from flask import jsonify, request, current_app
from functools import wraps
import jwt
from werkzeug.security import check_password_hash
from .. import login_bp

# Configuration JWT
JWT_SECRET = os.environ.get('JWT_SECRET', 'dev-secret-key-change-in-production')
JWT_EXPIRATION_HOURS = 24

# Mock database - in production, this would query SQLite
# Structure: {email: {id, username, email, password_hash, role}}
MOCK_USERS = {
    'admin@marki.fr': {
        'id': 'user_001',
        'username': 'admin',
        'email': 'admin@marki.fr',
        'password_hash': 'pbkdf2:sha256:600000$demo$hash',  # password: "admin123"
        'role': 'admin'
    }
}

def verify_password(stored_hash, password):
    """Verify password against hash"""
    # In production, use werkzeug.security.check_password_hash
    # For demo: plain text comparison with mock
    if stored_hash.startswith('pbkdf2:'):
        # Demo mode - accept any password for demo user
        return password == 'admin123'
    return check_password_hash(stored_hash, password)

def generate_token(user_id):
    """Generate JWT token"""
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

def verify_token(token):
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def token_required(f):
    """Decorator to protect routes with JWT"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({'error': 'Token manquant'}), 401
        
        payload = verify_token(token)
        if not payload:
            return jsonify({'error': 'Token invalide ou expiré'}), 401
        
        return f(payload, *args, **kwargs)
    return decorated

@login_bp.route('/api/auth/login', methods=['POST'])
def auth_login():
    """
    POST /api/auth/login
    Authenticate user with email/password, return JWT token
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Données JSON requises'}), 400
    
    email = data.get('email')
    password = data.get('password')
    
    # Validation
    if not email or not password:
        return jsonify({'error': 'Email et mot de passe requis'}), 400
    
    # Verify email format
    import re
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        return jsonify({'error': 'Format email invalide'}), 400
    
    # Check user exists
    user = MOCK_USERS.get(email)
    if not user:
        return jsonify({'error': 'Identifiants invalides'}), 401
    
    # Verify password
    if not verify_password(user['password_hash'], password):
        return jsonify({'error': 'Identifiants invalides'}), 401
    
    # Generate token
    token = generate_token(user['id'])
    
    # Prepare user data (exclude password_hash)
    user_data = {
        'id': user['id'],
        'username': user['username'],
        'email': user['email'],
        'role': user['role']
    }
    
    return jsonify({
        'token': token,
        'user': user_data
    }), 200

@login_bp.route('/api/auth/me', methods=['GET'])
def auth_me():
    """
    GET /api/auth/me
    Validate token and return current user info
    """
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Token manquant'}), 401
    
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    
    if not payload:
        return jsonify({'error': 'Token invalide ou expiré'}), 401
    
    # Get user from database
    user_id = payload.get('user_id')
    user = None
    for u in MOCK_USERS.values():
        if u['id'] == user_id:
            user = u
            break
    
    if not user:
        return jsonify({'error': 'Utilisateur non trouvé'}), 404
    
    return jsonify({
        'id': user['id'],
        'username': user['username'],
        'email': user['email'],
        'role': user['role']
    }), 200