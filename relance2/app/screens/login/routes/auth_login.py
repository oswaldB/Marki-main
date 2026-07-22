"""API route for user authentication."""
from flask import request, jsonify
from .. import bp
from ..models.user import AuthModel
from ..models.session import SessionModel
from ....middleware.auth.jwt_utils import generate_token
from datetime import datetime, timedelta


@bp.route('/api/auth/login', methods=['POST'])
def auth_login():
    """Authenticate user and create session."""
    data = request.get_json()
    
    if not data:
        return jsonify({'success': False, 'error': 'Données JSON requises'}), 400
    
    # Support both username and email fields
    username = data.get('username', '').strip() or data.get('email', '').strip()
    password = data.get('password', '')
    
    if not username or not password:
        return jsonify({'success': False, 'error': 'Identifiants requis'}), 400
    
    # Authenticate user
    user = AuthModel.authenticate(username, password)
    if not user:
        return jsonify({'success': False, 'error': 'Identifiants invalides'}), 401
    
    # Generate JWT token
    token = generate_token(user.id, user.username, user.role)
    
    # Create session
    expires_at = (datetime.utcnow() + timedelta(hours=24)).isoformat()
    SessionModel.create(
        user_id=user.id,
        token=token,
        expires_at=expires_at,
        ip_address=request.remote_addr,
        user_agent=request.headers.get('User-Agent')
    )
    
    # Update last login
    AuthModel.update_last_login(user.id)
    
    return jsonify({
        'success': True,
        'token': token,
        'user': user.to_dict_secure()
    })
