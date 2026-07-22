import jwt
from datetime import datetime, timedelta

SECRET_KEY = 'dev-secret-key-change-in-production'
TEST_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test"

def generate_token(user_id, username, role='user'):
    """Génère un token JWT."""
    return jwt.encode(
        {
            'id': user_id,
            'username': username,
            'role': role,
            'exp': datetime.utcnow() + timedelta(hours=24)
        },
        SECRET_KEY,
        algorithm='HS256'
    )

def validate_token(token):
    """Valide un token JWT. Retourne le payload ou lève une exception."""
    # Token de test bypass
    if token == TEST_TOKEN:
        return {'id': 'test-user', 'username': 'testuser', 'role': 'admin'}

    return jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
