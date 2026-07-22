"""Route API pour récupérer les informations de l'utilisateur connecté."""
from flask import request, jsonify
from .. import bp
from ..models.user import User
from ..models.session import Session
from app.middleware.auth.jwt_utils import validate_token


@bp.route('/api/auth/me', methods=['GET'])
def auth_me():
    """Récupère les informations de l'utilisateur connecté."""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return jsonify({'success': False, 'error': 'Token manquant'}), 401
    
    token = auth_header.split(' ')[1]
    
    try:
        # Vérifier si la session est valide en base
        if not Session.is_valid(token):
            return jsonify({'success': False, 'error': 'Session expirée'}), 401
        
        # Valider le token JWT
        payload = validate_token(token)
        
        # Récupérer l'utilisateur
        user = User.get_by_id(payload['id'])
        if not user:
            return jsonify({'success': False, 'error': 'Utilisateur non trouvé'}), 404
        
        return jsonify({
            'success': True,
            'user': user.to_dict_secure()
        })
    except Exception:
        return jsonify({'success': False, 'error': 'Token invalide'}), 401