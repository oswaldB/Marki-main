# Spec Routes : Authentication

## Description

Routes API pour l'authentification utilisateur : login, logout, vérification de token et récupération des informations utilisateur.

## Routes définies

### 1. POST /api/auth/login

**Fichier**: `app/screens/login/routes/auth_login.py`

Authentifie un utilisateur et crée une session.

#### Requête

```json
{
  "username": "admin",
  "password": "admin"
}
```

#### Réponse 200 (Succès)

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_xxx",
    "username": "admin",
    "email": "admin@marki.fr",
    "role": "admin"
  }
}
```

#### Réponse 401 (Échec)

```json
{
  "success": false,
  "error": "Identifiants invalides"
}
```

#### Implémentation

```python
from flask import request, jsonify, current_app
from .. import bp
from ..models.user import User
from ..models.session import Session
from app.middleware.auth.jwt_utils import generate_token
from datetime import datetime, timedelta

@bp.route('/api/auth/login', methods=['POST'])
def auth_login():
    data = request.get_json()
    
    username = data.get('username', '').strip()
    password = data.get('password', '')
    
    if not username or not password:
        return jsonify({'success': False, 'error': 'Identifiants requis'}), 400
    
    # Authentification
    user = User.authenticate(username, password)
    
    if not user:
        return jsonify({'success': False, 'error': 'Identifiants invalides'}), 401
    
    # Générer token JWT
    token = generate_token(user.id, user.username, user.role)
    
    # Créer session en base
    expires_at = (datetime.utcnow() + timedelta(hours=24)).isoformat()
    Session.create(
        user_id=user.id,
        token=token,
        expires_at=expires_at,
        ip_address=request.remote_addr,
        user_agent=request.headers.get('User-Agent')
    )
    
    # Mettre à jour last_login
    User.update_last_login(user.id)
    
    return jsonify({
        'success': True,
        'token': token,
        'user': user.to_dict_secure()
    })
```

---

### 2. POST /api/auth/logout

**Fichier**: `app/screens/login/routes/auth_logout.py`

Déconnecte l'utilisateur en révoquant sa session.

#### Requête

Header: `Authorization: Bearer <token>`

```json
{}
```

#### Réponse 200 (Succès)

```json
{
  "success": true,
  "message": "Déconnexion réussie"
}
```

#### Réponse 401 (Token invalide)

```json
{
  "success": false,
  "error": "Token invalide"
}
```

#### Implémentation

```python
from flask import request, jsonify
from .. import bp
from ..models.session import Session
from app.middleware.auth.jwt_utils import validate_token

@bp.route('/api/auth/logout', methods=['POST'])
def auth_logout():
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return jsonify({'success': False, 'error': 'Token manquant'}), 401
    
    token = auth_header.split(' ')[1]
    
    try:
        # Valider le token JWT
        payload = validate_token(token)
        
        # Révoquer la session
        session = Session.get_by_token(token)
        if session:
            Session.revoke(session.id)
        
        return jsonify({'success': True, 'message': 'Déconnexion réussie'})
    except Exception:
        return jsonify({'success': False, 'error': 'Token invalide'}), 401
```

---

### 3. GET /api/auth/me

**Fichier**: `app/screens/login/routes/auth_me.py`

Récupère les informations de l'utilisateur connecté.

#### Requête

Header: `Authorization: Bearer <token>`

#### Réponse 200 (Succès)

```json
{
  "success": true,
  "user": {
    "id": "user_xxx",
    "username": "admin",
    "email": "admin@marki.fr",
    "role": "admin"
  }
}
```

#### Réponse 401 (Token invalide)

```json
{
  "success": false,
  "error": "Token invalide ou expiré"
}
```

#### Implémentation

```python
from flask import request, jsonify
from .. import bp
from ..models.user import User
from ..models.session import Session
from app.middleware.auth.jwt_utils import validate_token

@bp.route('/api/auth/me', methods=['GET'])
def auth_me():
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return jsonify({'success': False, 'error': 'Token manquant'}), 401
    
    token = auth_header.split(' ')[1]
    
    try:
        # Vérifier si la session est valide en base
        if not Session.is_valid(token):
            return jsonify({'success': False, 'error': 'Session expirée'}), 401
        
        # Valider le token JWT
        payload = validate_token(token)
        
        # Récupérer l'utilisateur
        user = User.get_by_id(payload['id'])
        if not user:
            return jsonify({'success': False, 'error': 'Utilisateur non trouvé'}), 404
        
        return jsonify({
            'success': True,
            'user': user.to_dict_secure()
        })
    except Exception:
        return jsonify({'success': False, 'error': 'Token invalide'}), 401
```

---

### 4. POST /api/auth/verify

**Fichier**: `app/screens/login/routes/auth_verify.py`

Vérifie si un token est valide sans retourner les infos utilisateur.

#### Requête

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Réponse 200 (Valide)

```json
{
  "success": true,
  "valid": true
}
```

#### Réponse 200 (Invalide)

```json
{
  "success": true,
  "valid": false,
  "error": "Token expiré"
}
```

#### Implémentation

```python
from flask import request, jsonify
from .. import bp
from ..models.session import Session
from app.middleware.auth.jwt_utils import validate_token

@bp.route('/api/auth/verify', methods=['POST'])
def auth_verify():
    data = request.get_json()
    token = data.get('token', '')
    
    if not token:
        return jsonify({'success': True, 'valid': False, 'error': 'Token manquant'})
    
    try:
        # Vérifier en base si la session existe et est valide
        if not Session.is_valid(token):
            return jsonify({'success': True, 'valid': False, 'error': 'Session expirée ou révoquée'})
        
        # Valider le JWT
        validate_token(token)
        
        return jsonify({'success': True, 'valid': True})
    except Exception as e:
        return jsonify({'success': True, 'valid': False, 'error': str(e)})
```

## Structure des fichiers

```
app/screens/login/routes/
├── __init__.py
├── index.py           # Route GET /login (page)
├── logout.py          # Route GET /logout (redirect)
├── auth_login.py      # POST /api/auth/login
├── auth_logout.py     # POST /api/auth/logout
├── auth_me.py         # GET /api/auth/me
└── auth_verify.py     # POST /api/auth/verify
```

## Imports communs

```python
from flask import request, jsonify, make_response, redirect, url_for
from .. import bp
from ..models.user import User
from ..models.session import Session
from app.middleware.auth.jwt_utils import generate_token, validate_token, TEST_TOKEN
from datetime import datetime, timedelta
```

## Dépendances

- `flask.Blueprint`
- `app.data.get_db`
- `app.middleware.auth.jwt_utils`
- Modèles `User` et `Session`
- `bcrypt` (pour User.authenticate)
