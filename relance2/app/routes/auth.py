import functools
from flask import Blueprint, request, jsonify, g, current_app
import bcrypt
import jwt
import datetime

from db import get_db

bp = Blueprint('auth', __name__)


def generate_token(user_id):
    """Generate JWT token for user."""
    print(f"[API AUTH] generate_token() - Génération token pour user_id={user_id}")
    payload = {
        'user_id': user_id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7),
        'iat': datetime.datetime.utcnow()
    }
    token = jwt.encode(payload, current_app.config['JWT_SECRET'], algorithm='HS256')
    print(f"[API AUTH] generate_token() - Token généré avec succès")
    return token


def decode_token(token):
    """Decode and validate JWT token."""
    print(f"[API AUTH] decode_token() - Décodage token")
    try:
        payload = jwt.decode(token, current_app.config['JWT_SECRET'], algorithms=['HS256'])
        print(f"[API AUTH] decode_token() - Token décodé avec succès, user_id={payload.get('user_id')}")
        return payload
    except jwt.ExpiredSignatureError:
        print(f"[API AUTH] decode_token() - ❌ Token expiré")
        return None
    except jwt.InvalidTokenError:
        print(f"[API AUTH] decode_token() - ❌ Token invalide")
        return None


def require_auth(view):
    """Decorator to protect routes with JWT."""
    @functools.wraps(view)
    def wrapped_view(**kwargs):
        auth_header = request.headers.get('Authorization', '')
        print(f"[API AUTH] Vérification token - Header: {auth_header[:50]}...")
        if not auth_header.startswith('Bearer '):
            print(f"[API AUTH] ❌ Token manquant ou format invalide")
            return jsonify({'error': 'Missing token'}), 401
        
        token = auth_header.split(' ')[1]
        payload = decode_token(token)
        
        if payload is None:
            print(f"[API AUTH] ❌ Token invalide ou expiré")
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Load user from database
        db = get_db()
        user = db.execute(
            'SELECT id, username, email, role FROM users WHERE id = ? AND is_active = 1',
            (payload['user_id'],)
        ).fetchone()
        
        if user is None:
            print(f"[API AUTH] ❌ Utilisateur id={payload['user_id']} non trouvé ou inactif")
            return jsonify({'error': 'User not found or inactive'}), 401
        
        g.current_user = user
        print(f"[API AUTH] ✅ Authentification OK - Utilisateur: {user['username']} (id={user['id']})")
        return view(**kwargs)
    
    return wrapped_view


@bp.route('/login', methods=['POST'])
def login():
    """Authenticate user and return JWT token."""
    print(f"[API AUTH] POST /api/auth/login - Tentative de connexion")
    data = request.get_json()
    
    if not data or 'username' not in data or 'password' not in data:
        print(f"[API AUTH] ❌ Login échoué: username ou password manquant")
        return jsonify({'error': 'Missing username or password'}), 400
    
    username = data['username']
    password = data['password']
    
    print(f"[API AUTH] Recherche utilisateur: {username}")
    db = get_db()
    user = db.execute(
        'SELECT id, username, password_hash, role, is_active FROM users WHERE username = ?',
        (username,)
    ).fetchone()
    
    if user is None:
        print(f"[API AUTH] ❌ Login échoué: utilisateur '{username}' non trouvé")
        return jsonify({'error': 'Invalid credentials'}), 401
    
    if not user['is_active']:
        print(f"[API AUTH] ❌ Login échoué: compte '{username}' désactivé")
        return jsonify({'error': 'Account is disabled'}), 401
    
    # Verify password with bcrypt
    if not bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
        print(f"[API AUTH] ❌ Login échoué: mot de passe incorrect pour '{username}'")
        return jsonify({'error': 'Invalid credentials'}), 401
    
    # Update last login
    db.execute(
        'UPDATE users SET last_login = datetime("now"), login_count = login_count + 1 WHERE id = ?',
        (user['id'],)
    )
    db.commit()
    
    # Generate token
    token = generate_token(user['id'])
    
    print(f"[API AUTH] ✅ Login réussi: '{username}' (id={user['id']})")
    return jsonify({
        'token': token,
        'user': {
            'id': user['id'],
            'username': user['username'],
            'role': user['role']
        }
    }), 200


@bp.route('/logout', methods=['POST'])
@require_auth
def logout():
    """Logout (token is deleted client-side)."""
    print(f"[API AUTH] POST /api/auth/logout - Déconnexion utilisateur id={g.current_user['id']}")
    # Server-side: we could blacklist the token here if needed
    print(f"[API AUTH] ✅ Logout réussi")
    return jsonify({'success': True}), 200


@bp.route('/me', methods=['GET'])
@require_auth
def me():
    """Get current user profile."""
    user = g.current_user
    print(f"[API AUTH] GET /api/auth/me - Profil utilisateur id={user['id']}")
    return jsonify({
        'id': user['id'],
        'username': user['username'],
        'email': user['email'],
        'role': user['role']
    }), 200
