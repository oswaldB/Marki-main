"""
Backend Workflow: Authentication
Route: POST /api/auth/login
"""

from flask import Blueprint, request, jsonify
from ..models.user import User

bp = Blueprint('wf_auth', __name__)


@bp.route('/login', methods=['POST'])
def login():
    """
    Authenticate user and return JWT token
    
    Request:
        POST /api/auth/login
        Content-Type: application/json
        {
            "email": "admin@marki.fr",
            "password": "votre-mot-de-passe"
        }
    
    Response 200:
        {
            "token": "eyJhbGciOiJIUzI1NiIs...",
            "user": {
                "id": "user_xxx",
                "username": "admin",
                "email": "admin@marki.fr",
                "role": "admin"
            }
        }
    
    Response 401:
        {
            "error": "Identifiants invalides"
        }
    """
    data = request.get_json()
    
    # Validate request
    if not data:
        return jsonify({'error': 'Données manquantes'}), 400
    
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    
    if not email or not password:
        return jsonify({'error': 'Email et mot de passe requis'}), 400
    
    # Authenticate user
    user = User.authenticate(email, password)
    
    if not user:
        return jsonify({'error': 'Identifiants invalides'}), 401
    
    # Generate token
    token = user.generate_token()
    
    return jsonify({
        'token': token,
        'user': user.to_dict()
    }), 200
