from flask import request, jsonify, g
from .. import bp
from ..models.auth import AuthModel, AuthError


@bp.route('/api/auth/login', methods=['POST'])
def api_login():
    """
    API d'authentification.
    POST /api/auth/login
    Body: {"username": "...", "password": "..."}
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Données JSON requises'}), 400
    
    username = data.get('username') or data.get('email')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Identifiant et mot de passe requis'}), 400
    
    try:
        result = AuthModel.authenticate(username, password)
        user_dict = result['user'].to_dict()
        
        return jsonify({
            'token': result['token'],
            'user': user_dict
        }), 200
        
    except AuthError as e:
        return jsonify({'error': str(e)}), 401
    except Exception as e:
        return jsonify({'error': 'Erreur serveur'}), 500


@bp.route('/api/auth/me', methods=['GET'])
def api_me():
    """
    API de vérification de session.
    GET /api/auth/me
    Header: Authorization: Bearer <token>
    """
    auth_header = request.headers.get('Authorization', '')
    token = auth_header.replace('Bearer ', '') if auth_header.startswith('Bearer ') else auth_header
    
    if not token:
        # Vérifier aussi le localStorage fallback via paramètre
        token = request.args.get('token', '')
    
    if not token:
        return jsonify({'error': 'Token manquant'}), 401
    
    try:
        result = AuthModel.verify_token(token)
        return jsonify({
            'user': result['user'].to_dict(),
            'valid': True
        }), 200
        
    except AuthError as e:
        return jsonify({'error': str(e), 'valid': False}), 401
    except Exception as e:
        return jsonify({'error': 'Token invalide'}), 401


@bp.route('/api/auth/logout', methods=['POST'])
def api_logout():
    """
    API de déconnexion.
    POST /api/auth/logout
    Header: Authorization: Bearer <token>
    """
    auth_header = request.headers.get('Authorization', '')
    token = auth_header.replace('Bearer ', '') if auth_header.startswith('Bearer ') else auth_header
    
    if token:
        AuthModel.logout(token)
    
    return jsonify({'success': True}), 200