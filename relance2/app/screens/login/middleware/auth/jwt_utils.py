"""JWT utilities for authentication."""

import jwt
import datetime
from flask import current_app


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
    secret = current_app.config.get('JWT_SECRET', 'dev-secret-key-change-in-production')
    
    payload = {
        'id': user_id,
        'username': username,
        'role': role,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24),
        'iat': datetime.datetime.utcnow()
    }
    
    return jwt.encode(payload, secret, algorithm='HS256')


def validate_token(token):
    """
    Valide un token JWT.
    
    Args:
        token: Token JWT à valider
    
    Returns:
        Payload décodé
    
    Raises:
        jwt.InvalidTokenError: Si le token est invalide
        jwt.ExpiredSignatureError: Si le token est expiré
    """
    secret = current_app.config.get('JWT_SECRET', 'dev-secret-key-change-in-production')
    return jwt.decode(token, secret, algorithms=['HS256'])