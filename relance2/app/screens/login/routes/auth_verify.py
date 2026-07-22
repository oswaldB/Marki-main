"""API route for token verification."""
from flask import request, jsonify
from .. import bp
from ..models.session import SessionModel
from ....middleware.auth.jwt_utils import validate_token


@bp.route('/api/auth/verify', methods=['POST'])
def auth_verify():
    """Verify if a JWT token is valid."""
    data = request.get_json() or {}
    token = data.get('token', '')
    
    if not token:
        return jsonify({'success': True, 'valid': False, 'error': 'Token manquant'})
    
    try:
        # Check if session exists and is not expired
        if not SessionModel.is_valid(token):
            return jsonify({'success': True, 'valid': False, 'error': 'Session expirée ou révoquée'})
        
        # Validate JWT signature
        validate_token(token)
        return jsonify({'success': True, 'valid': True})
    except Exception as e:
        return jsonify({'success': True, 'valid': False, 'error': str(e)})
