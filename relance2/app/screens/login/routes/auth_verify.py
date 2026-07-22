"""Route API pour vérifier la validité d'un token."""
from flask import request, jsonify
from .. import bp
from ..models.session import Session
from app.middleware.auth.jwt_utils import validate_token


@bp.route('/api/auth/verify', methods=['POST'])
def auth_verify():
    """Vérifie si un token est valide sans retourner les infos utilisateur."""
    data = request.get_json()
    token = data.get('token', '')
    
    if not token:
        return jsonify({'success': True, 'valid': False, 'error': 'Token manquant'})
    
    try:
        # Vérifier en base si la session existe et est valide
        if not Session.is_valid(token):
            return jsonify({'success': True, 'valid': False, 'error': 'Session expirée ou révoquée'})
        
        # Valider le JWT
        validate_token(token)
        
        return jsonify({'success': True, 'valid': True})
    except Exception as e:
        return jsonify({'success': True, 'valid': False, 'error': str(e)})