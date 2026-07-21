"""Workflow d'authentification - Vérifie les credentials et génère un JWT."""

import bcrypt
import jwt
import os
import time
from datetime import datetime, timedelta

# Clé secrète pour JWT (en production, utiliser une variable d'environnement)
JWT_SECRET = os.environ.get('JWT_SECRET', 'marki-dev-secret-key-change-in-production')
JWT_EXPIRES_HOURS = 24


def run(username, password):
    """
    Vérifie les credentials et génère un JWT.
    
    Args:
        username: Identifiant ou email
        password: Mot de passe
    
    Returns:
        dict: {success, token, user} ou lève une exception
    """
    start_time = time.time()
    
    print(f"[WORKFLOW.auth-login] START: username={username}")
    
    # 1. Vérification des champs
    print(f"[WORKFLOW.auth-login] STEP: Vérification champs présents")
    if not username or not password:
        print(f"[WORKFLOW.auth-login] ERROR: Champs manquants")
        raise ValueError("Username et password requis")
    
    # 2. Recherche de l'utilisateur en DB
    print(f"[WORKFLOW.auth-login] STEP: Recherche user '{username}' en DB")
    
    # Import ici pour éviter les imports circulaires
    import sys
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from db import get_db
    
    db = get_db()
    
    # Recherche par username OU email
    user = db.execute(
        "SELECT * FROM users WHERE username = ? OR email = ?",
        (username, username)
    ).fetchone()
    
    if user is None:
        print(f"[WORKFLOW.auth-login] ERROR: User non trouvé")
        raise ValueError("Identifiants invalides")
    
    # Convertir en dict
    user = dict(user)
    user_id = user['id']
    
    # 3. Vérifier si le compte est actif
    if not user.get('is_active', 1):
        print(f"[WORKFLOW.auth-login] ERROR: Compte inactif")
        raise ValueError("Compte désactivé")
    
    # 4. Vérification du mot de passe (bcrypt)
    print(f"[WORKFLOW.auth-login] STEP: Vérification password bcrypt")
    stored_hash = user.get('password_hash', '')
    
    # Support pour les mots de passe en clair pendant le développement
    # et les hashes bcrypt
    password_valid = False
    
    if stored_hash.startswith('$2'):
        # Hash bcrypt
        password_valid = bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8'))
    else:
        # Mot de passe en clair (développement uniquement)
        password_valid = (password == stored_hash)
    
    if not password_valid:
        print(f"[WORKFLOW.auth-login] ERROR: Mot de passe incorrect")
        raise ValueError("Identifiants invalides")
    
    # 5. Génération du JWT
    print(f"[WORKFLOW.auth-login] STEP: Génération JWT token")
    
    payload = {
        'user_id': user_id,
        'username': user['username'],
        'role': user.get('role', 'user'),
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRES_HOURS),
        'iat': datetime.utcnow()
    }
    
    token = jwt.encode(payload, JWT_SECRET, algorithm='HS256')
    
    # Si token est bytes (PyJWT < 2.0), convertir en string
    if isinstance(token, bytes):
        token = token.decode('utf-8')
    
    duree = int((time.time() - start_time) * 1000)
    print(f"[WORKFLOW.auth-login] SUCCESS: Auth réussie, token généré user_id={user_id}")
    print(f"[WORKFLOW.auth-login] END: Durée={duree}ms")
    
    return {
        'success': True,
        'token': token,
        'user': {
            'id': user_id,
            'username': user['username'],
            'email': user.get('email'),
            'role': user.get('role', 'user'),
            'nom': user.get('nom'),
            'prenom': user.get('prenom')
        }
    }
