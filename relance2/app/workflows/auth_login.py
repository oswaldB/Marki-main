"""
Workflow: Auth Login

Workflow dédié pour l'authentification utilisateur avec logging complet.
"""

import uuid
import datetime
import jwt
from flask import current_app
from ..db import get_db


def auth_login_workflow(username, password):
    """Authenticate user with full workflow logging."""
    workflow_id = str(uuid.uuid4())
    print(f"[WORKFLOW.AUTH_LOGIN] START: {workflow_id}, username={username}")
    
    db = get_db()
    cursor = db.cursor()
    
    try:
        # Étape 1: Recherche utilisateur
        print(f"[WORKFLOW.AUTH_LOGIN] STEP: Recherche utilisateur '{username}'")
        
        cursor.execute(
            "SELECT * FROM users WHERE username = ? OR email = ?",
            (username, username)
        )
        user = cursor.fetchone()
        
        if not user:
            print(f"[WORKFLOW.AUTH_LOGIN] ERROR: Utilisateur non trouvé")
            return {'success': False, 'error': 'Identifiants invalides'}
        
        print(f"[WORKFLOW.AUTH_LOGIN] STEP: User found, validating password")
        
        # Étape 2: Vérification mot de passe
        if user['password_hash'] != password:
            print(f"[WORKFLOW.AUTH_LOGIN] ERROR: Mot de passe incorrect")
            return {'success': False, 'error': 'Identifiants invalides'}
        
        # Étape 3: Vérification compte actif
        if not user['is_active']:
            print(f"[WORKFLOW.AUTH_LOGIN] ERROR: Compte désactivé")
            return {'success': False, 'error': 'Compte désactivé'}
        
        print(f"[WORKFLOW.AUTH_LOGIN] STEP: Génération JWT token")
        
        # Étape 4: Génération token
        token = jwt.encode(
            {
                'user_id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'role': user['role'],
                'exp': datetime.datetime.utcnow() + datetime.timedelta(days=1),
                'iat': datetime.datetime.utcnow()
            },
            current_app.config['SECRET_KEY'],
            algorithm='HS256'
        )
        
        # Étape 5: Mise à jour last_login
        cursor.execute("""
            UPDATE users 
            SET last_login = CURRENT_TIMESTAMP, login_count = login_count + 1
            WHERE id = ?
        """, (user['id'],))
        
        db.commit()
        
        print(f"[WORKFLOW.AUTH_LOGIN] SUCCESS: User {username} authenticated")
        
        return {
            'success': True,
            'token': token,
            'user': {
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'role': user['role']
            }
        }
        
    except Exception as e:
        print(f"[WORKFLOW.AUTH_LOGIN] ERROR: {str(e)}")
        raise


def auth_logout_workflow(user_id):
    """Logout user with logging."""
    workflow_id = str(uuid.uuid4())
    print(f"[WORKFLOW.AUTH_LOGOUT] START: {workflow_id}, user={user_id}")
    
    try:
        print(f"[WORKFLOW.AUTH_LOGOUT] SUCCESS: Déconnexion effectuée")
        return {'success': True}
        
    except Exception as e:
        print(f"[WORKFLOW.AUTH_LOGOUT] ERROR: {str(e)}")
        raise


def auth_me_workflow(user_id):
    """Get current user info."""
    workflow_id = str(uuid.uuid4())
    print(f"[WORKFLOW.AUTH_ME] START: {workflow_id}, user={user_id}")
    
    db = get_db()
    cursor = db.cursor()
    
    try:
        cursor.execute(
            "SELECT id, username, email, role FROM users WHERE id = ?",
            (user_id,)
        )
        user = cursor.fetchone()
        
        if not user:
            print(f"[WORKFLOW.AUTH_ME] ERROR: Utilisateur non trouvé")
            return {'success': False, 'error': 'Utilisateur non trouvé'}
        
        print(f"[WORKFLOW.AUTH_ME] SUCCESS: Profil retourné")
        
        return {
            'success': True,
            'user': dict(user)
        }
        
    except Exception as e:
        print(f"[WORKFLOW.AUTH_ME] ERROR: {str(e)}")
        raise
