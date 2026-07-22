"""Utilitaires JWT pour l'authentification."""

import jwt
import datetime
from functools import wraps
from flask import current_app, request, jsonify


def generate_token(user_id, username, role):
    """
    Génère un token JWT.
    
    Args:
        user_id: ID de l'utilisateur
        username: Nom d'utilisateur
        role: Rôle de l'utilisateur
    
    Returns:
        Token JWT encodé
    """
    payload = {
        'id': user_id,
        'username': username,
        'role': role,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24),
        'iat': datetime.datetime.utcnow()
    }
    
    secret = current_app.config.get('JWT_SECRET', 'dev-secret-key-change-in-production')
    return jwt.encode(payload, secret, algorithm='HS256')


def validate_token(token):
    """
    Valide un token JWT.
    
    Args:
        token: Token JWT à valider
    
    Returns:
        Payload décodé si valide
    
    Raises:
        jwt.ExpiredSignatureError: Si le token est expiré
        jwt.InvalidTokenError: Si le token est invalide
    """
    secret = current_app.config.get('JWT_SECRET', 'dev-secret-key-change-in-production')
    return jwt.decode(token, secret, algorithms=['HS256'])


def jwt_required(f):
    """
    Décorateur pour protéger les routes nécessitant une authentification.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            return jsonify({'error': 'Token manquant'}), 401
        
        try:
            # Format: "Bearer <token>"
            parts = auth_header.split()
            if len(parts) != 2 or parts[0].lower() != 'bearer':
                return jsonify({'error': 'Format de token invalide'}), 401
            
            token = parts[1]
            payload = validate_token(token)
            
            # Ajoute l'utilisateur au contexte de la requête
            from models.auth import AuthModel
            user = AuthModel.find_by_id(payload['id'])
            
            if not user:
                return jsonify({'error': 'Utilisateur non trouvé'}), 401
            
            request.current_user = user
            request.token_payload = payload
            
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expiré'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token invalide'}), 401
        
        return f(*args, **kwargs)
    
    return decorated_function