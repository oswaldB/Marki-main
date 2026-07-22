"""Authentication workflow routes for login cell."""
import sqlite3
import jwt
import datetime
import os
from flask import request, jsonify
from .. import bp

# Configuration JWT
JWT_SECRET = os.environ.get('JWT_SECRET', 'dev-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Database path - use absolute path or environment variable
DATABASE_PATH = os.environ.get('DATABASE_PATH', os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'marki.db'))


def get_db_connection():
    """Get SQLite database connection."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def generate_token(user_id, username, email, role):
    """Generate JWT token for authenticated user."""
    payload = {
        'user_id': user_id,
        'username': username,
        'email': email,
        'role': role,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_token(token):
    """Verify JWT token and return payload."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


@bp.route('/api/auth/login', methods=['POST'])
def auth_login():
    """
    Authenticate user with email and password.
    
    Request Body:
        - email: User email
        - password: User password
    
    Returns:
        - 200: Token and user data
        - 401: Invalid credentials
    """
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email et mot de passe requis'}), 400
    
    email = data.get('email')
    password = data.get('password')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check user credentials
        cursor.execute(
            'SELECT id, username, email, role, password_hash FROM users WHERE email = ?',
            (email,)
        )
        user = cursor.fetchone()
        
        if not user:
            return jsonify({'error': 'Identifiants invalides'}), 401
        
        # Verify password (SHA-256 hash comparison)
        import hashlib
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        
        if password_hash != user['password_hash']:
            return jsonify({'error': 'Identifiants invalides'}), 401
        
        # Generate token
        token = generate_token(
            user_id=user['id'],
            username=user['username'],
            email=user['email'],
            role=user['role']
        )
        
        return jsonify({
            'token': token,
            'user': {
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'role': user['role']
            }
        }), 200
        
    except sqlite3.Error as e:
        return jsonify({'error': f'Erreur base de données: {str(e)}'}), 500
    finally:
        conn.close()


@bp.route('/api/auth/me', methods=['GET'])
def auth_me():
    """
    Validate token and return current user info.
    
    Headers:
        - Authorization: Bearer <token>
    
    Returns:
        - 200: User data
        - 401: Invalid or expired token
    """
    token = None
    if 'Authorization' in request.headers:
        auth_header = request.headers['Authorization']
        try:
            token = auth_header.split(' ')[1]
        except IndexError:
            return jsonify({'error': 'Token format invalid'}), 401
    
    if not token:
        return jsonify({'error': 'Token manquant'}), 401
    
    payload = verify_token(token)
    if not payload:
        return jsonify({'error': 'Token invalide ou expiré'}), 401
    
    return jsonify({
        'user': {
            'id': payload['user_id'],
            'username': payload['username'],
            'email': payload['email'],
            'role': payload['role']
        }
    }), 200


@bp.route('/api/auth/logout', methods=['POST'])
def auth_logout():
    """
    Logout user (client-side token removal).
    
    Returns:
        - 200: Logout success
    """
    return jsonify({'message': 'Déconnexion réussie'}), 200
