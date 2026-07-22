"""Workflow backend: vérification session."""

from flask import Blueprint, request, jsonify
from models.auth import AuthModel, AuthError

wf_auth_check_bp = Blueprint('wf_auth_check', __name__, url_prefix='/api/wf')


@wf_auth_check_bp.route('/auth-check', methods=['POST'])
def auth_check():
    """
    Workflow backend: Vérifie si une session est valide.
    
    Reçoit: { token: string }
    Retourne: { valid: bool, user?: object }
    """
    data = request.get_json()
    
    if not data or 'token' not in data:
        return jsonify({'valid': False, 'error': 'Token manquant'}), 400
    
    token = data['token']
    
    try:
        user = AuthModel.verify_token(token)
        return jsonify({
            'valid': True,
            'user': user.to_dict()
        }), 200
        
    except AuthError:
        return jsonify({'valid': False, 'error': 'Token invalide'}), 401