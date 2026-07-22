"""Route API pour la déconnexion."""
from flask import request, jsonify
from .. import bp
from ..models.session import Session
from app.middleware.auth.jwt_utils import validate_token


@bp.route('/api/auth/logout', methods=['POST'])
def auth_logout():
    """Déconnecte l'utilisateur en révoquant sa session."""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return jsonify({'success': False, 'error': 'Token manquant'}), 401
    
    token = auth_header.split(' ')[1]
    
    try:
        # Valider le token JWT
        payload = validate_token(token)
        
        # Révoquer la session
        session = Session.get_by_token(token)
        if session:
            Session.revoke(session.id)
        
        return jsonify({'success': True, 'message': 'Déconnexion réussie'})
    except Exception:
        return jsonify({'success': False, 'error': 'Token invalide'}), 401