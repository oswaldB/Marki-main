"""Route API pour l'authentification."""
from flask import request, jsonify
from datetime import datetime, timedelta
from .. import bp
from ..models.user import User
from ..models.session import Session
from app.middleware.auth.jwt_utils import generate_token


@bp.route('/api/auth/login', methods=['POST'])
def auth_login():
    """Authentifie un utilisateur et crée une session."""
    data = request.get_json()
    
    username = data.get('username', '').strip()
    password = data.get('password', '')
    
    if not username or not password:
        return jsonify({'success': False, 'error': 'Identifiants requis'}), 400
    
    # Authentification
    user = User.authenticate(username, password)
    
    if not user:
        return jsonify({'success': False, 'error': 'Identifiants invalides'}), 401
    
    # Générer token JWT
    token = generate_token(user.id, user.username, user.role)
    
    # Créer session en base
    expires_at = (datetime.utcnow() + timedelta(hours=24)).isoformat()
    Session.create(
        user_id=user.id,
        token=token,
        expires_at=expires_at,
        ip_address=request.remote_addr,
        user_agent=request.headers.get('User-Agent')
    )
    
    # Mettre à jour last_login
    User.update_last_login(user.id)
    
    return jsonify({
        'success': True,
        'token': token,
        'user': user.to_dict_secure()
    })