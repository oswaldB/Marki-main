"""Routes API pour l'authentification (/api/auth/*)."""

from flask import jsonify, request
from ..auth_bp import auth_bp
from ..models.auth import AuthModel, AuthError


@auth_bp.route('/login', methods=['POST'])
def api_auth_login():
    """
    POST /api/auth/login
    Authentification utilisateur, retourne un JWT.
    """
    data = request.get_json() or {}
    username = data.get('username', '').strip() or data.get('email', '').strip()
    password = data.get('password', '')
    
    if not username or not password:
        return jsonify({"error": "Identifiants invalides"}), 401
    
    try:
        result = AuthModel.authenticate(username, password)
        user = result['user']
        
        return jsonify({
            "token": result['token'],
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role
            }
        }), 200
        
    except AuthError:
        return jsonify({"error": "Identifiants invalides"}), 401


@auth_bp.route('/me', methods=['GET'])
def api_auth_me():
    """
    GET /api/auth/me
    Vérifie le token et retourne les informations de l'utilisateur.
    """
    auth_header = request.headers.get('Authorization', '')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({"error": "Token manquant"}), 401
    
    token = auth_header.split(' ')[1]
    
    try:
        user = AuthModel.verify_token(token)
        
        return jsonify({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role
        }), 200
        
    except AuthError:
        return jsonify({"error": "Token invalide"}), 401


@auth_bp.route('/logout', methods=['POST'])
def api_auth_logout():
    """
    POST /api/auth/logout
    Déconnexion (côté client supprime le token).
    """
    return jsonify({"success": True, "message": "Déconnecté"}), 200


@auth_bp.route('/verify', methods=['POST'])
def api_auth_verify():
    """
    POST /api/auth/verify
    Vérifie la validité d'un token (pour le rechargement initial de page).
    """
    data = request.get_json() or {}
    token = data.get('token')
    
    if not token:
        return jsonify({"error": "Token manquant"}), 401
    
    try:
        user = AuthModel.verify_token(token)
        
        return jsonify({
            "valid": True,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role
            }
        }), 200
        
    except AuthError:
        return jsonify({"valid": False, "error": "Token invalide"}), 401