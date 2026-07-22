"""Main routes for login cell"""

from flask import Blueprint, render_template, jsonify, request
from ..models.user import User

bp = Blueprint('index', __name__)


@bp.route('/')
@bp.route('/login')
def login_page():
    """Render login page"""
    return render_template('index.html')


@bp.route('/api/auth/me', methods=['GET'])
def get_current_user():
    """Get current authenticated user from token"""
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Token manquant'}), 401
    
    token = auth_header.split(' ')[1]
    user = User.verify_token(token)
    
    if not user:
        return jsonify({'error': 'Token invalide ou expiré'}), 401
    
    return jsonify({'user': user.to_dict()}), 200
