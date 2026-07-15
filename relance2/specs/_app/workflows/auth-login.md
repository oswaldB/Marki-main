# auth-login.py - Workflow d'authentification

**Fichier** : `app/workflows/auth-login.py`

## Description

Vérifie les credentials et génère un JWT.

## Logs (print) - OBLIGATOIRE

| Ligne | Instruction | Description |
|-------|-------------|-------------|
| 1 | `print(f"[WORKFLOW.auth-login] START: username={username}")` | Début auth |
| 2 | `print(f"[WORKFLOW.auth-login] STEP: Vérification champs présents")` | Validation input |
| 3 | `print(f"[WORKFLOW.auth-login] ERROR: Champs manquants")` | Missing fields |
| 4 | `print(f"[WORKFLOW.auth-login] STEP: Recherche user '{username}' en DB")` | Recherche DB |
| 5 | `print(f"[WORKFLOW.auth-login] ERROR: User non trouvé")` | Not found |
| 6 | `print(f"[WORKFLOW.auth-login] ERROR: Compte inactif")` | Account inactive |
| 7 | `print(f"[WORKFLOW.auth-login] STEP: Vérification password bcrypt")` | Check password |
| 8 | `print(f"[WORKFLOW.auth-login] ERROR: Mot de passe incorrect")` | Wrong password |
| 9 | `print(f"[WORKFLOW.auth-login] STEP: Génération JWT token")` | Generate JWT |
| 10 | `print(f"[WORKFLOW.auth-login] SUCCESS: Auth réussie, token généré user_id={user_id}")` | Success |
| 11 | `print(f"[WORKFLOW.auth-login] END: Durée={duree}ms")` | End |

## Entrée

```json
{
  "username": "admin",
  "password": "secret"
}
```

## Sortie

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

## Étapes

1. Vérifier présence username/password
2. Rechercher user dans DB
3. Vérifier hash bcrypt du password
4. Générer JWT avec PyJWT
5. Retourner token + infos user

## Erreurs

- 401: Credentials invalides
- 400: Champs manquants
