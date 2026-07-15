# auth.py - Routes d'authentification

**Fichier** : `app/routes/auth.py`  
**Blueprint** : `auth_bp` (préfixe `/api/auth`)

## Logs (print) - OBLIGATOIRE POUR CHAQUE ROUTE

Chaque fonction de route doit contenir les `print()` suivants:

| Route | Ligne | Instruction | Description |
|-------|-------|-------------|-------------|
| `POST /api/auth/login` | 1 | `print(f"[API.AUTH.LOGIN] START: Tentative connexion username={username}")` | Début |
| `POST /api/auth/login` | 2 | `print(f"[API.AUTH.LOGIN] STEP: Recherche utilisateur '{username}'")` | Recherche user |
| `POST /api/auth/login` | 3 | `print(f"[API.AUTH.LOGIN] ERROR: Utilisateur non trouvé")` | Non trouvé |
| `POST /api/auth/login` | 4 | `print(f"[API.AUTH.LOGIN] ERROR: Compte désactivé")` | Désactivé |
| `POST /api/auth/login` | 5 | `print(f"[API.AUTH.LOGIN] ERROR: Mot de passe incorrect")` | Bad password |
| `POST /api/auth/login` | 6 | `print(f"[API.AUTH.LOGIN] STEP: Génération JWT token")` | Génération token |
| `POST /api/auth/login` | 7 | `print(f"[API.AUTH.LOGIN] SUCCESS: Login réussi user_id={user_id}")` | Succès |
| `POST /api/auth/logout` | 1 | `print(f"[API.AUTH.LOGOUT] START: user_id={g.current_user.id}")` | Début logout |
| `POST /api/auth/logout` | 2 | `print(f"[API.AUTH.LOGOUT] SUCCESS: Déconnexion effectuée")` | Succès logout |
| `GET /api/auth/me` | 1 | `print(f"[API.AUTH.ME] START: Récupération profil user_id={g.current_user.id}")` | Début me |
| `GET /api/auth/me` | 2 | `print(f"[API.AUTH.ME] SUCCESS: Profil retourné")` | Succès me |
| `require_auth` | 1 | `print(f"[API.AUTH.REQUIRE] START: Vérification token")` | Début vérif |
| `require_auth` | 2 | `print(f"[API.AUTH.REQUIRE] ERROR: Token manquant")` | Token missing |
| `require_auth` | 3 | `print(f"[API.AUTH.REQUIRE] ERROR: Token invalide ou expiré")` | Token invalid |
| `require_auth` | 4 | `print(f"[API.AUTH.REQUIRE] ERROR: Utilisateur non trouvé/inactif")` | User not found |
| `require_auth` | 5 | `print(f"[API.AUTH.REQUIRE] SUCCESS: Authentification OK user={user.username}")` | Auth OK |

## Routes

### POST `/api/auth/login`

Authentification utilisateur, retourne un JWT.

**Request:**
```json
{
  "username": "admin",
  "password": "secret"
}
```

**Response 200:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

**Response 401:**
```json
{"error": "Invalid credentials"}
```

### POST `/api/auth/logout`

Déconnexion (côté client supprime le token).

**Response:**
```json
{"success": true}
```

### GET `/api/auth/me`

Profil de l'utilisateur connecté (nécessite token).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": 1,
  "username": "admin",
  "role": "admin",
  "email": "admin@marki.fr"
}
```

## Décorateur `require_auth`

Utilisé sur les routes protégées :

```python
@require_auth
def protected_route():
    user = g.current_user
    return jsonify({"message": f"Hello {user.username}"})
```
