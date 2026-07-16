from flask import Flask, render_template, request, jsonify
import sqlite3
import jwt
import datetime
from functools import wraps

def get_db():
    """Get database connection"""
    conn = sqlite3.connect('marki.db')
    conn.row_factory = sqlite3.Row
    return conn

def create_app():
    app = Flask(__name__, template_folder='templates', static_folder='static')
    app.config['SECRET_KEY'] = 'votre-secret-jwt-tres-long-pour-marki-2026'
    
    @app.route('/')
    def hello_world():
        return render_template('index.html')
    
    @app.route('/api/hello')
    def api_hello():
        return {'message': 'Hello from backend!', 'status': 'ok'}
    
    # Login page
    @app.route('/login')
    def login_page():
        return render_template('login/index.html')
    
    # Auth API
    @app.route('/api/auth/login', methods=['POST'])
    def auth_login():
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        conn = get_db()
        cursor = conn.cursor()
        
        # Check user credentials
        cursor.execute(
            "SELECT * FROM users WHERE username = ? OR email = ?",
            (username, username)
        )
        user = cursor.fetchone()
        conn.close()
        
        if user and user['password_hash'] == password:  # TODO: use proper password hashing
            # Generate JWT token
            token = jwt.encode(
                {
                    'user_id': user['id'],
                    'username': user['username'],
                    'exp': datetime.datetime.utcnow() + datetime.timedelta(days=1)
                },
                app.config['SECRET_KEY'],
                algorithm='HS256'
            )
            
            return jsonify({
                'token': token,
                'user': {
                    'id': user['id'],
                    'username': user['username'],
                    'email': user['email'],
                    'role': user['role']
                }
            })
        
        return jsonify({'error': 'Identifiants invalides'}), 401
    
    # Verify token
    @app.route('/api/auth/me', methods=['GET'])
    def auth_me():
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Token manquant'}), 401
        
        token = auth_header.split(' ')[1]
        
        try:
            payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            return jsonify({
                'user_id': payload['user_id'],
                'username': payload['username']
            })
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expiré'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token invalide'}), 401
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
