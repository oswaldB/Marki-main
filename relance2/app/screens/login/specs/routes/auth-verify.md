# Route : API Auth Verify

## Description

Vérifie si un token JWT est valide sans retourner les infos utilisateur.

## Définition

| Aspect | Valeur |
|--------|--------|
| **Méthode** | POST |
| **URL** | `/api/auth/verify` |
| **Fichier** | `app/screens/login/routes/auth_verify.py` |

## Requête

**Content-Type:** `application/json`

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Réponse 200 (Valide)

```json
{
  "success": true,
  "valid": true
}
```

## Réponse 200 (Invalide)

```json
{
  "success": true,
  "valid": false,
  "error": "Session expirée ou révoquée"
}
```

## Réponse 200 (Token manquant)

```json
{
  "success": true,
  "valid": false,
  "error": "Token manquant"
}
```

## Implémentation

```python
from flask import request, jsonify
from .. import bp
from ..models.session import SessionModel
from app.middleware.auth.jwt_utils import validate_token

@bp.route('/api/auth/verify', methods=['POST'])
def auth_verify():
    data = request.get_json()
    token = data.get('token', '')
    
    if not token:
        return jsonify({'success': True, 'valid': False, 'error': 'Token manquant'})
    
    try:
        if not SessionModel.is_valid(token):
            return jsonify({'success': True, 'valid': False, 'error': 'Session expirée ou révoquée'})
        
        validate_token(token)
        return jsonify({'success': True, 'valid': True})
    except Exception as e:
        return jsonify({'success': True, 'valid': False, 'error': str(e)})
```

## Dépendances

- Modèle `Session`
- `jwt_utils.validate_token`

## Utilisation

Cette route est utilisée par le workflow frontend `initial-load` pour vérifier si un token stocké dans localStorage est toujours valide avant de rediriger vers le dashboard.
