# Route : API Auth Logout

## Description

Endpoint API pour déconnecter un utilisateur (révoque sa session).

## Définition

| Aspect | Valeur |
|--------|--------|
| **Méthode** | POST |
| **URL** | `/api/auth/logout` |
| **Fichier** | `app/screens/login/routes/auth_logout.py` |

## Requête

**Header:** `Authorization: Bearer <token>`

```json
{}
```

## Réponse 200 (Succès)

```json
{
  "success": true,
  "message": "Déconnexion réussie"
}
```

## Réponse 401 (Token invalide)

```json
{
  "success": false,
  "error": "Token invalide"
}
```

## Implémentation

```python
from flask import request, jsonify
from .. import bp
from ..models.session import SessionModel
from app.middleware.auth.jwt_utils import validate_token

@bp.route('/api/auth/logout', methods=['POST'])
def auth_logout():
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return jsonify({'success': False, 'error': 'Token manquant'}), 401
    
    token = auth_header.split(' ')[1]
    
    try:
        validate_token(token)
        session = SessionModel.get_by_token(token)
        if session:
            SessionModel.revoke(session.id)
        return jsonify({'success': True, 'message': 'Déconnexion réussie'})
    except Exception:
        return jsonify({'success': False, 'error': 'Token invalide'}), 401
```

## Dépendances

- Modèle `Session`
- `jwt_utils.validate_token`
