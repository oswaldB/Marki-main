"""
Workflow backend - Authentification
Routes API pour la gestion de l'authentification
"""
from flask import Blueprint, request, jsonify
from functools import wraps
import jwt
import datetime
from models.user import User
import sqlite3
import os

wf_auth = Blueprint('wf_auth', __name__, url_prefix='/api/auth')

JWT_SECRET = os.environ.get('JWT_SECRET', 'dev-secret-key-change-in-production')
JWT_EXPIRATION = 24  # hours

def get_db_connection():
    """Get SQLite database connection"""
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

def generate_token(user_id, username, email, role):
    """Generate JWT token"""
    payload = {
        'user_id': user_id,
        'username': username,
        'email': email,
        'role': role,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=JWT_EXPIRATION)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

def verify_token(token):
    """Verify JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def token_required(f):
    """Decorator to protect routes with JWT"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'error': 'Token malformed'}), 401
        
        if not token:
            return jsonify({'error': 'Token missing'}), 401
        
        payload = verify_token(token)
        if not payload:
            return jsonify({'error': 'Token invalid or expired'}), 401
        
        return f(payload, *args, **kwargs)
    return decorated

@wf_auth.route('/login', methods=['POST'])
def login():
    """Authenticate user and return JWT token"""
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password required'}), 400
    
    email = data.get('email')
    password = data.get('password')
    
    # Validate email format
    import re
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        return jsonify({'error': 'Invalid email format'}), 400
    
    # Verify credentials
    user = User.verify_credentials(email, password)
    
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401
    
    # Generate token
    token = generate_token(
        user_id=user['id'],
        username=user['username'],
        email=user['email'],
        role=user['role']
    )
    
    return jsonify({
        'token': token,
        'user': {
            'id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'role': user['role']
        }
    }), 200

@wf_auth.route('/me', methods=['GET'])
@token_required
def get_current_user(payload):
    """Get current authenticated user"""
    user = User.get_by_id(payload['user_id'])
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'user': {
            'id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'role': user['role']
        }
    }), 200

@wf_auth.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password') or not data.get('username'):
        return jsonify({'error': 'Username, email and password required'}), 400
    
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    
    # Validate email format
    import re
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        return jsonify({'error': 'Invalid email format'}), 400
    
    # Check if user exists
    if User.get_by_email(email):
        return jsonify({'error': 'Email already registered'}), 409
    
    # Create user
    user_id = User.create(username, email, password)
    
    if not user_id:
        return jsonify({'error': 'Failed to create user'}), 500
    
    user = User.get_by_id(user_id)
    
    # Generate token
    token = generate_token(
        user_id=user['id'],
        username=user['username'],
        email=user['email'],
        role=user['role']
    )
    
    return jsonify({
        'token': token,
        'user': {
            'id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'role': user['role']
        }
    }), 201

def init_auth_tables():
    """Initialize auth tables in database"""
    User.init_table()