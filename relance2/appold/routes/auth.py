"""Routes d'authentification (API)."""

from functools import wraps
from flask import Blueprint, request, jsonify, g, current_app
import jwt
import os
import sys

# Ajoute le parent au path pour les workflows
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from workflows.auth_login import run as auth_login_workflow
from db import get_db

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# Clé secrète JWT (doit correspondre au workflow)
JWT_SECRET = os.environ.get('JWT_SECRET', 'marki-dev-secret-key-change-in-production')


def require_auth(f):
    """Décorateur pour protéger les routes avec JWT."""
    @wraps(f)
    def decorated(*args, **kwargs):
        print(f"[API.AUTH.REQUIRE] START: Vérification token")
        
        auth_header = request.headers.get('Authorization', '')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            print(f"[API.AUTH.REQUIRE] ERROR: Token manquant")
            return jsonify({"error": "Token manquant"}), 401
        
        token = auth_header.split(' ')[1]
        
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            user_id = payload.get('user_id')
            
            # Récupérer l'utilisateur depuis la DB
            db = get_db()
            user = db.execute(
                "SELECT * FROM users WHERE id = ? AND is_active = 1",
                (user_id,)
            ).fetchone()
            
            if user is None:
                print(f"[API.AUTH.REQUIRE] ERROR: Utilisateur non trouvé/inactif")
                return jsonify({"error": "Utilisateur invalide"}), 401
            
            g.current_user = dict(user)
            g.current_user['role'] = payload.get('role', 'user')
            
            print(f"[API.AUTH.REQUIRE] SUCCESS: Authentification OK user={user['username']}")
            
        except jwt.ExpiredSignatureError:
            print(f"[API.AUTH.REQUIRE] ERROR: Token invalide ou expiré")
            return jsonify({"error": "Token expiré"}), 401
        except jwt.InvalidTokenError:
            print(f"[API.AUTH.REQUIRE] ERROR: Token invalide ou expiré")
            return jsonify({"error": "Token invalide"}), 401
        
        return f(*args, **kwargs)
    
    return decorated


@auth_bp.route('/login', methods=['POST'])
def login():
    """Authentification utilisateur, retourne un JWT."""
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '')
    
    print(f"[API.AUTH.LOGIN] START: Tentative connexion username={username}")
    
    try:
        print(f"[API.AUTH.LOGIN] STEP: Recherche utilisateur '{username}'")
        
        # Appel du workflow d'authentification
        result = auth_login_workflow(username, password)
        
        print(f"[API.AUTH.LOGIN] SUCCESS: Login réussi user_id={result['user']['id']}")
        
        return jsonify({
            "token": result['token'],
            "user": result['user']
        }), 200
        
    except ValueError as e:
        error_msg = str(e)
        if "non trouvé" in error_msg or "invalides" in error_msg:
            print(f"[API.AUTH.LOGIN] ERROR: Utilisateur non trouvé")
        elif "désactivé" in error_msg or "inactif" in error_msg:
            print(f"[API.AUTH.LOGIN] ERROR: Compte désactivé")
        elif "Mot de passe" in error_msg:
            print(f"[API.AUTH.LOGIN] ERROR: Mot de passe incorrect")
        else:
            print(f"[API.AUTH.LOGIN] ERROR: {error_msg}")
        
        return jsonify({"error": "Identifiants incorrects"}), 401
        
    except Exception as e:
        print(f"[API.AUTH.LOGIN] ERROR: {str(e)}")
        return jsonify({"error": "Erreur serveur"}), 500


@auth_bp.route('/logout', methods=['POST'])
@require_auth
def logout():
    """Déconnexion (côté client supprime le token)."""
    print(f"[API.AUTH.LOGOUT] START: user_id={g.current_user['id']}")
    print(f"[API.AUTH.LOGOUT] SUCCESS: Déconnexion effectuée")
    return jsonify({"success": True}), 200


@auth_bp.route('/me', methods=['GET'])
@require_auth
def get_me():
    """Profil de l'utilisateur connecté."""
    print(f"[API.AUTH.ME] START: Récupération profil user_id={g.current_user['id']}")
    
    user = {
        "id": g.current_user['id'],
        "username": g.current_user['username'],
        "email": g.current_user.get('email'),
        "role": g.current_user.get('role', 'user'),
        "nom": g.current_user.get('nom'),
        "prenom": g.current_user.get('prenom')
    }
    
    print(f"[API.AUTH.ME] SUCCESS: Profil retourné")
    return jsonify(user), 200
