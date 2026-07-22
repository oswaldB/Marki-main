# Route : API Auth Login

## Description

Endpoint API pour authentifier un utilisateur et créer une session.

## Définition

| Aspect | Valeur |
|--------|--------|
| **Méthode** | POST |
| **URL** | `/api/auth/login` |
| **Fichier** | `app/screens/login/routes/auth_login.py` |

## Requête

**Content-Type:** `application/json`

```json
{
  "username": "admin",
  "password": "admin"
}
```

## Réponse 200 (Succès)

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

## Réponse 401 (Échec auth)

```json
{
  "success": false,
  "error": "Identifiants invalides"
}
```

## Réponse 400 (Champs manquants)

```json
{
  "success": false,
  "error": "Identifiants requis"
}
```

## Implémentation

```python
from flask import request, jsonify
from .. import bp
from ..models.user import User, AuthModel
from ..models.session import Session, SessionModel
from app.middleware.auth.jwt_utils import generate_token
from datetime import datetime, timedelta

@bp.route('/api/auth/login', methods=['POST'])
def auth_login():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '')
    
    if not username or not password:
        return jsonify({'success': False, 'error': 'Identifiants requis'}), 400
    
    user = AuthModel.authenticate(username, password)
    if not user:
        return jsonify({'success': False, 'error': 'Identifiants invalides'}), 401
    
    # Générer token JWT
    token = generate_token(user.id, user.username, user.role)
    
    # Créer session
    expires_at = (datetime.utcnow() + timedelta(hours=24)).isoformat()
    SessionModel.create(
        user_id=user.id,
        token=token,
        expires_at=expires_at,
        ip_address=request.remote_addr,
        user_agent=request.headers.get('User-Agent')
    )
    
    # Mettre à jour last_login
    AuthModel.update_last_login(user.id)
    
    return jsonify({
        'success': True,
        'token': token,
        'user': user.to_dict_secure()
    })
```

## Dépendances

- Modèle `User`
- Modèle `Session`
- `jwt_utils.generate_token`

## Test cURL

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' \
  http://localhost:5000/login/api/auth/login
```
