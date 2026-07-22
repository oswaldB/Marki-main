# Route : API Auth Me

## Description

Récupère les informations de l'utilisateur connecté.

## Définition

| Aspect | Valeur |
|--------|--------|
| **Méthode** | GET |
| **URL** | `/api/auth/me` |
| **Fichier** | `app/screens/login/routes/auth_me.py` |

## Requête

**Header:** `Authorization: Bearer <token>`

## Réponse 200 (Succès)

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

## Réponse 401 (Token invalide/expiré)

```json
{
  "success": false,
  "error": "Token invalide ou expiré"
}
```

## Réponse 404 (Utilisateur non trouvé)

```json
{
  "success": false,
  "error": "Utilisateur non trouvé"
}
```

## Implémentation

```python
from flask import request, jsonify
from .. import bp
from ..models.user import AuthModel
from ..models.session import SessionModel
from app.middleware.auth.jwt_utils import validate_token

@bp.route('/api/auth/me', methods=['GET'])
def auth_me():
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return jsonify({'success': False, 'error': 'Token manquant'}), 401
    
    token = auth_header.split(' ')[1]
    
    try:
        if not SessionModel.is_valid(token):
            return jsonify({'success': False, 'error': 'Session expirée'}), 401
        
        payload = validate_token(token)
        user = AuthModel.get_by_id(payload['id'])
        
        if not user:
            return jsonify({'success': False, 'error': 'Utilisateur non trouvé'}), 404
        
        return jsonify({
            'success': True,
            'user': user.to_dict_secure()
        })
    except Exception:
        return jsonify({'success': False, 'error': 'Token invalide'}), 401
```

## Dépendances

- Modèle `User`
- Modèle `Session`
- `jwt_utils.validate_token`
