"""API routes for authentication."""

from flask import Blueprint, request, jsonify, current_app
from models.auth import AuthModel, AuthError

api_auth_bp = Blueprint('api_auth', __name__, url_prefix='/api/auth')


@api_auth_bp.route('/login', methods=['POST'])
def login():
    """
    POST /api/auth/login
    Authentifie un utilisateur et retourne un token JWT.
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Données manquantes'}), 400
    
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'error': 'Email et mot de passe requis'}), 400
    
    try:
        result = AuthModel.authenticate(email, password)
        
        return jsonify({
            'token': result['token'],
            'user': result['user'].to_dict()
        }), 200
        
    except AuthError as e:
        current_app.logger.warning(f"Auth failed for {email}: {str(e)}")
        return jsonify({'error': 'Identifiants invalides'}), 401
    except Exception as e:
        current_app.logger.error(f"Login error: {str(e)}")
        return jsonify({'error': 'Erreur serveur'}), 500


@api_auth_bp.route('/me', methods=['GET'])
def me():
    """
    GET /api/auth/me
    Vérifie le token et retourne l'utilisateur courant.
    """
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Token manquant'}), 401
    
    token = auth_header.split(' ')[1]
    
    try:
        user = AuthModel.verify_token(token)
        return jsonify({'user': user.to_dict()}), 200
        
    except AuthError as e:
        return jsonify({'error': str(e)}), 401
    except Exception as e:
        current_app.logger.error(f"Token verification error: {str(e)}")
        return jsonify({'error': 'Erreur serveur'}), 500


@api_auth_bp.route('/logout', methods=['POST'])
def logout():
    """
    POST /api/auth/logout
    Déconnexion (côté client: suppression du token).
    """
    return jsonify({'message': 'Déconnexion réussie'}), 200