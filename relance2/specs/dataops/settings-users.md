# Data Routes - Settings Users

Définition des routes API REST pour l'écran **Settings > Utilisateurs**.

## Schéma de données

Table principale : `users`

| Colonne | Type | Description |
|---------|------|-------------|
| id | TEXT | Identifiant unique (UUID) |
| username | TEXT | Nom d'utilisateur unique |
| email | TEXT | Email de l'utilisateur |
| password_hash | TEXT | Hash du mot de passe |
| role | TEXT | Rôle: 'admin' ou 'user' |
| is_active | INTEGER | 1 = actif, 0 = inactif |
| last_login | TEXT | Date dernière connexion (ISO 8601) |
| login_count | INTEGER | Nombre de connexions |
| created_at | TEXT | Date création (ISO 8601) |
| updated_at | TEXT | Date modification (ISO 8601) |

## Mapping Frontend → SQL

| Champ Frontend | Colonne SQL | Notes |
|----------------|-------------|-------|
| id | id | Identifiant |
| prenom | - | Généré à partir de username ou ignoré (colonne inexistante) |
| nom | - | Généré à partir de username ou ignoré (colonne inexistante) |
| username | username | Unique, requis |
| email | email | Requis |
| password | password_hash | Hashé côté serveur |
| role | role | 'admin' ou 'user' |
| actif | is_active | Boolean |
| initials | - | Calculé: `username[0:2].upper()` |

---

## Route 1: Lister tous les utilisateurs

### Description
Récupère la liste complète des utilisateurs pour affichage dans le tableau.

### Endpoint
```
GET /api/users
```

### Headers
```
Authorization: Bearer {token}
```

### Paramètres d'entrée
Aucun.

### Réponse JSON (200 OK)
```json
{
  "success": true,
  "users": [
    {
      "id": "uuid-123",
      "username": "jdupont",
      "email": "jean.dupont@marki.fr",
      "role": "admin",
      "is_active": 1,
      "last_login": "2024-01-15T10:30:00Z",
      "login_count": 42,
      "created_at": "2024-01-01T08:00:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Requête SQL
```sql
SELECT 
  id,
  username,
  email,
  role,
  is_active,
  last_login,
  login_count,
  created_at,
  updated_at
FROM users
ORDER BY username ASC;
```

---

## Route 2: Créer un utilisateur

### Description
Crée un nouvel utilisateur avec les informations fournies. Génère un hash du mot de passe.

### Endpoint
```
POST /api/users
```

### Headers
```
Content-Type: application/json
Authorization: Bearer {token}
```

### Paramètres d'entrée (Body JSON)
```json
{
  "username": "jdupont",
  "email": "jean.dupont@marki.fr",
  "password": "motDePasseSecurise123",
  "role": "user"
}
```

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| username | string | Oui | Nom d'utilisateur unique |
| email | string | Oui | Email valide |
| password | string | Oui | Mot de passe (min 8 caractères) |
| role | string | Non | 'admin' ou 'user' (défaut: 'user') |

### Réponse JSON (201 Created)
```json
{
  "success": true,
  "data": {
    "id": "uuid-456",
    "username": "jdupont",
    "email": "jean.dupont@marki.fr",
    "role": "user",
    "is_active": 1,
    "created_at": "2024-01-20T14:30:00Z",
    "updated_at": "2024-01-20T14:30:00Z"
  }
}
```

### Erreurs possibles
- `400` : Données invalides ou champs manquants
- `409` : Username ou email déjà existant
- `403` : Utilisateur non administrateur

### Requête SQL
```sql
INSERT INTO users (
  id,
  username,
  email,
  password_hash,
  role,
  is_active,
  login_count,
  created_at,
  updated_at
) VALUES (
  lower(hex(randomblob(16))),
  :username,
  :email,
  :password_hash,
  COALESCE(:role, 'user'),
  1,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
```

**Notes:**
- `password_hash` doit être généré côté serveur (bcrypt, argon2, etc.)
- Vérifier unicité de `username` et `email` avant insertion

---

## Route 3: Mettre à jour un utilisateur

### Description
Met à jour les informations d'un utilisateur existant. Le mot de passe est optionnel.

### Endpoint
```
PUT /api/users/{id}
```

### Headers
```
Content-Type: application/json
Authorization: Bearer {token}
```

### Paramètres d'entrée
**URL:**
- `id` (string, requis): UUID de l'utilisateur

**Body JSON:**
```json
{
  "email": "nouveau.email@marki.fr",
  "role": "admin",
  "is_active": 1
}
```

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| email | string | Non | Nouvel email |
| role | string | Non | 'admin' ou 'user' |
| is_active | integer/boolean | Non | 1/0 ou true/false |
| password | string | Non | Nouveau mot de passe (optionnel) |

### Réponse JSON (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "uuid-123",
    "username": "jdupont",
    "email": "nouveau.email@marki.fr",
    "role": "admin",
    "is_active": 1,
    "updated_at": "2024-01-20T15:00:00Z"
  }
}
```

### Erreurs possibles
- `400` : Données invalides
- `404` : Utilisateur non trouvé
- `409` : Email déjà utilisé par un autre utilisateur
- `403` : Utilisateur non administrateur

### Requête SQL (sans changement de mot de passe)
```sql
UPDATE users
SET 
  email = COALESCE(:email, email),
  role = COALESCE(:role, role),
  is_active = COALESCE(:is_active, is_active),
  updated_at = CURRENT_TIMESTAMP
WHERE id = :id;
```

### Requête SQL (avec changement de mot de passe)
```sql
UPDATE users
SET 
  email = COALESCE(:email, email),
  role = COALESCE(:role, role),
  is_active = COALESCE(:is_active, is_active),
  password_hash = :password_hash,
  updated_at = CURRENT_TIMESTAMP
WHERE id = :id;
```

---

## Route 4: Supprimer un utilisateur

### Description
Supprime définitivement un utilisateur du système. Opération réservée aux administrateurs.

### Endpoint
```
DELETE /api/users/{id}
```

### Headers
```
Authorization: Bearer {token}
```

### Paramètres d'entrée
**URL:**
- `id` (string, requis): UUID de l'utilisateur à supprimer

### Réponse JSON (200 OK)
```json
{
  "success": true,
  "message": "Utilisateur supprimé avec succès"
}
```

### Erreurs possibles
- `404` : Utilisateur non trouvé
- `403` : Non autorisé (doit être admin ou ne peut pas s'auto-supprimer)

### Requête SQL
```sql
DELETE FROM users WHERE id = :id;
```

---

## Route 5: Récupérer un utilisateur spécifique

### Description
Récupère les détails d'un utilisateur par son ID.

### Endpoint
```
GET /api/users/{id}
```

### Headers
```
Authorization: Bearer {token}
```

### Paramètres d'entrée
**URL:**
- `id` (string, requis): UUID de l'utilisateur

### Réponse JSON (200 OK)
```json
{
  "success": true,
  "user": {
    "id": "uuid-123",
    "username": "jdupont",
    "email": "jean.dupont@marki.fr",
    "role": "admin",
    "is_active": 1,
    "last_login": "2024-01-15T10:30:00Z",
    "login_count": 42,
    "created_at": "2024-01-01T08:00:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

### Erreurs possibles
- `404` : Utilisateur non trouvé

### Requête SQL
```sql
SELECT 
  id,
  username,
  email,
  role,
  is_active,
  last_login,
  login_count,
  created_at,
  updated_at
FROM users
WHERE id = :id
LIMIT 1;
```

---

## Résumé des endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/users` | Lister tous les utilisateurs |
| POST | `/api/users` | Créer un utilisateur |
| GET | `/api/users/{id}` | Récupérer un utilisateur |
| PUT | `/api/users/{id}` | Mettre à jour un utilisateur |
| DELETE | `/api/users/{id}` | Supprimer un utilisateur |

## Notes d'implémentation

1. **Authentification** : Toutes les routes nécessitent un token JWT valide
2. **Autorisation** : Seuls les utilisateurs avec `role = 'admin'` peuvent créer/modifier/supprimer
3. **Hashage mot de passe** : Utiliser bcrypt (coût 12) ou Argon2id côté serveur
4. **Validation** : 
   - Email doit être au format valide
   - Username alphanumérique + underscore, 3-50 caractères
   - Mot de passe minimum 8 caractères
5. **Soft delete** : Pas implémenté (DELETE est définitif)
