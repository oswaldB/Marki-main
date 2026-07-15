# users.py - Routes utilisateurs

**Fichier** : `app/routes/users.py`  
**Blueprint** : `users_bp` (préfixe `/api/users`)

## Routes

### GET `/api/users`

Liste paginée des utilisateurs.

**Query params:**
- `page` (int): Numéro de page (défaut: 1)
- `per_page` (int): Items par page (défaut: 20)

**Response:**
```json
{
  "users": [...],
  "total": 50,
  "page": 1,
  "per_page": 20
}
```

### GET `/api/users/:id`

Détail d'un utilisateur.

### POST `/api/users`

Créer un utilisateur (admin uniquement).

**Body:**
```json
{
  "username": "newuser",
  "password": "secret",
  "role": "user",
  "email": "user@marki.fr"
}
```

### PUT `/api/users/:id`

Modifier un utilisateur.

### DELETE `/api/users/:id`

Désactiver un utilisateur (soft delete).

### POST `/api/users/:id/reset-password`

Réinitialiser le mot de passe.

**Body:**
```json
{"new_password": "nouveau_secret"}
```

## Logs (print) - OBLIGATOIRE POUR CHAQUE ROUTE

Chaque fonction de route doit contenir les `print()` suivants:

| Route | Ligne | Instruction | Description |
|-------|-------|-------------|-------------|
| `GET /api/users` | 1 | `print(f"[API.USERS.LIST] START: Récupération liste paginée")` | Début |
| `GET /api/users` | 2 | `print(f"[API.USERS.LIST] STEP: Lecture query params page={page} per_page={per_page}")` | Params |
| `GET /api/users` | 3 | `print(f"[API.USERS.LIST] STEP: Query BDD users")` | Query BDD |
| `GET /api/users` | 4 | `print(f"[API.USERS.LIST] ERROR: Erreur BDD: {str(e)}")` | Erreur BDD |
| `GET /api/users` | 5 | `print(f"[API.USERS.LIST] SUCCESS: {len(users)} users retournés, total={total}")` | Succès |
| `GET /api/users/:id` | 1 | `print(f"[API.USERS.GET] START: Récupération user_id={user_id}")` | Début |
| `GET /api/users/:id` | 2 | `print(f"[API.USERS.GET] STEP: Recherche user_id={user_id}")` | Recherche |
| `GET /api/users/:id` | 3 | `print(f"[API.USERS.GET] ERROR: Utilisateur non trouvé user_id={user_id}")` | Non trouvé |
| `GET /api/users/:id` | 4 | `print(f"[API.USERS.GET] SUCCESS: user_id={user.id} username={user.username}")` | Succès |
| `POST /api/users` | 1 | `print(f"[API.USERS.CREATE] START: Création utilisateur username={username} role={role}")` | Début |
| `POST /api/users` | 2 | `print(f"[API.USERS.CREATE] STEP: Validation champs requis")` | Validation |
| `POST /api/users` | 3 | `print(f"[API.USERS.CREATE] ERROR: Champ manquant: {field}")` | Champ manquant |
| `POST /api/users` | 4 | `print(f"[API.USERS.CREATE] ERROR: Username déjà utilisé '{username}'")` | Doublon |
| `POST /api/users` | 5 | `print(f"[API.USERS.CREATE] STEP: Hash mot de passe (NE JAMAIS logger en clair)")` | Hash password |
| `POST /api/users` | 6 | `print(f"[API.USERS.CREATE] STEP: Insertion BDD")` | Insert BDD |
| `POST /api/users` | 7 | `print(f"[API.USERS.CREATE] ERROR: Erreur BDD: {str(e)}")` | Erreur BDD |
| `POST /api/users` | 8 | `print(f"[API.USERS.CREATE] SUCCESS: user_id={user.id} créé par admin_id={g.current_user.id}")` | Succès |
| `PUT /api/users/:id` | 1 | `print(f"[API.USERS.UPDATE] START: Modification user_id={user_id}")` | Début |
| `PUT /api/users/:id` | 2 | `print(f"[API.USERS.UPDATE] STEP: Recherche user_id={user_id}")` | Recherche |
| `PUT /api/users/:id` | 3 | `print(f"[API.USERS.UPDATE] ERROR: Utilisateur non trouvé user_id={user_id}")` | Non trouvé |
| `PUT /api/users/:id` | 4 | `print(f"[API.USERS.UPDATE] STEP: Update champs username={username} role={role}")` | Update |
| `PUT /api/users/:id` | 5 | `print(f"[API.USERS.UPDATE] ERROR: Erreur BDD: {str(e)}")` | Erreur BDD |
| `PUT /api/users/:id` | 6 | `print(f"[API.USERS.UPDATE] SUCCESS: user_id={user.id} modifié par admin_id={g.current_user.id}")` | Succès |
| `DELETE /api/users/:id` | 1 | `print(f"[API.USERS.DELETE] START: Désactivation user_id={user_id}")` | Début |
| `DELETE /api/users/:id` | 2 | `print(f"[API.USERS.DELETE] STEP: Recherche user_id={user_id}")` | Recherche |
| `DELETE /api/users/:id` | 3 | `print(f"[API.USERS.DELETE] ERROR: Utilisateur non trouvé user_id={user_id}")` | Non trouvé |
| `DELETE /api/users/:id` | 4 | `print(f"[API.USERS.DELETE] STEP: Soft delete (is_active=False)")` | Soft delete |
| `DELETE /api/users/:id` | 5 | `print(f"[API.USERS.DELETE] ERROR: Erreur BDD: {str(e)}")` | Erreur BDD |
| `DELETE /api/users/:id` | 6 | `print(f"[API.USERS.DELETE] SUCCESS: user_id={user.id} désactivé par admin_id={g.current_user.id}")` | Succès |
| `POST /api/users/:id/reset-password` | 1 | `print(f"[API.USERS.RESET_PWD] START: Reset password user_id={user_id}")` | Début |
| `POST /api/users/:id/reset-password` | 2 | `print(f"[API.USERS.RESET_PWD] STEP: Recherche user_id={user_id}")` | Recherche |
| `POST /api/users/:id/reset-password` | 3 | `print(f"[API.USERS.RESET_PWD] ERROR: Utilisateur non trouvé user_id={user_id}")` | Non trouvé |
| `POST /api/users/:id/reset-password` | 4 | `print(f"[API.USERS.RESET_PWD] STEP: Hash nouveau mot de passe (NE JAMAIS logger en clair)")` | Hash password |
| `POST /api/users/:id/reset-password` | 5 | `print(f"[API.USERS.RESET_PWD] ERROR: Erreur BDD: {str(e)}")` | Erreur BDD |
| `POST /api/users/:id/reset-password` | 6 | `print(f"[API.USERS.RESET_PWD] SUCCESS: password réinitialisé user_id={user.id} par admin_id={g.current_user.id}")` | Succès |
