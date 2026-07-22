"""Workflow backend pour la soumission d'authentification."""

from flask import Blueprint, request, jsonify
from models.auth import AuthModel, AuthError

bp = Blueprint('wf_auth_submit', __name__)


@bp.route('/wf/auth/submit', methods=['POST'])
def auth_submit():
    """
    Workflow backend: Soumission authentification.
    
    Reçoit les identifiants, valide et retourne le résultat.
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'success': False, 'error': 'Données manquantes'}), 400
    
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({
            'success': False, 
            'error': 'Email et mot de passe requis'
        }), 400
    
    try:
        result = AuthModel.authenticate(email, password)
        return jsonify({
            'success': True,
            'token': result['token'],
            'user': result['user'].to_dict()
        }), 200
        
    except AuthError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 401