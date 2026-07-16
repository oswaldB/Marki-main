from flask import Blueprint, request, jsonify, current_app
import jwt
import datetime
from ..db import get_db

bp = Blueprint('auth', __name__)


def get_token_from_header():
    """Extract Bearer token from Authorization header."""
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        return auth_header.split(' ')[1]
    return None


def verify_token(token):
    """Verify JWT token and return payload."""
    try:
        payload = jwt.decode(
            token, 
            current_app.config['SECRET_KEY'], 
            algorithms=['HS256']
        )
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


@bp.route('/login', methods=['POST'])
def login():
    """Authenticate user and return JWT token."""
    print(f"[API.AUTH.LOGIN] START: received request")
    
    data = request.get_json()
    if not data:
        print("[API.AUTH.LOGIN] ERROR: No JSON data provided")
        return jsonify({'error': 'Données manquantes'}), 400
    
    username = data.get('username')
    password = data.get('password')
    
    print(f"[API.AUTH.LOGIN] STEP: Validating input for user={username}")
    
    if not username or not password:
        print("[API.AUTH.LOGIN] ERROR: Missing username or password")
        return jsonify({'error': 'Identifiant et mot de passe requis'}), 400
    
    # Query database
    print("[API.AUTH.LOGIN] STEP: Querying database")
    db = get_db()
    cursor = db.cursor()
    
    cursor.execute(
        "SELECT * FROM users WHERE username = ? OR email = ?",
        (username, username)
    )
    user = cursor.fetchone()
    
    if not user:
        print(f"[API.AUTH.LOGIN] ERROR: User not found: {username}")
        return jsonify({'error': 'Identifiants invalides'}), 401
    
    print(f"[API.AUTH.LOGIN] STEP: User found, validating password")
    
    # Check password (plaintext for now - should be hashed)
    if user['password_hash'] != password:
        print(f"[API.AUTH.LOGIN] ERROR: Invalid password for user: {username}")
        return jsonify({'error': 'Identifiants invalides'}), 401
    
    # Check if user is active
    if not user['is_active']:
        print(f"[API.AUTH.LOGIN] ERROR: User inactive: {username}")
        return jsonify({'error': 'Compte désactivé'}), 403
    
    print("[API.AUTH.LOGIN] STEP: Generating JWT token")
    
    # Generate JWT token
    token = jwt.encode(
        {
            'user_id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'role': user['role'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=1),
            'iat': datetime.datetime.utcnow()
        },
        current_app.config['SECRET_KEY'],
        algorithm='HS256'
    )
    
    # Update last login
    cursor.execute(
        "UPDATE users SET last_login = CURRENT_TIMESTAMP, login_count = login_count + 1 WHERE id = ?",
        (user['id'],)
    )
    db.commit()
    
    print(f"[API.AUTH.LOGIN] SUCCESS: User {username} authenticated, token generated")
    
    return jsonify({
        'token': token,
        'user': {
            'id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'role': user['role']
        }
    })


@bp.route('/me', methods=['GET'])
def me():
    """Get current user info from token."""
    print("[API.AUTH.ME] START: verifying token")
    
    token = get_token_from_header()
    if not token:
        print("[API.AUTH.ME] ERROR: No token provided")
        return jsonify({'error': 'Token manquant'}), 401
    
    payload = verify_token(token)
    if not payload:
        print("[API.AUTH.ME] ERROR: Invalid or expired token")
        return jsonify({'error': 'Token invalide ou expiré'}), 401
    
    print(f"[API.AUTH.ME] STEP: Token valid, fetching user {payload['user_id']}")
    
    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        "SELECT id, username, email, role FROM users WHERE id = ?",
        (payload['user_id'],)
    )
    user = cursor.fetchone()
    
    if not user:
        print("[API.AUTH.ME] ERROR: User not found")
        return jsonify({'error': 'Utilisateur non trouvé'}), 404
    
    print("[API.AUTH.ME] SUCCESS: User info returned")
    
    return jsonify({
        'user': dict(user)
    })


@bp.route('/logout', methods=['POST'])
def logout():
    """Logout user (client-side token removal)."""
    print("[API.AUTH.LOGOUT] SUCCESS: Logout endpoint called")
    return jsonify({'message': 'Déconnexion réussie'})
