# Document `user`

Utilisateurs du système pour l'authentification et la gestion des droits d'accès.

## Structure JSON complète

```json
{
  "_id": "user:{id}",
  "_rev": "1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "type": "user",
  "username": "string",
  "email": "string",
  "password_hash": "string",
  "role": "string",
  "is_active": "boolean",
  "last_login": "ISO8601 | null",
  "login_count": "number",
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "must_reset_password": "boolean"
}
```

## Description des champs

### Identification

| Champ | Type | Description |
|-------|------|-------------|
| `_id` | `string` | Format: `user:{id}` (ex: `user:admin`) |
| `type` | `string` | Toujours `"user"` |

### Informations de connexion

| Champ | Type | Description |
|-------|------|-------------|
| `username` | `string` | Nom d'utilisateur unique |
| `email` | `string` | Adresse email de l'utilisateur |
| `password_hash` | `string` | Mot de passe haché (ou placeholder) |

### Rôles et permissions

| Champ | Type | Description |
|-------|------|-------------|
| `role` | `string` | Niveau d'accès: `"admin"`, `"user"`, `"readonly"`... |
| `is_active` | `boolean` | Le compte est-il actif ? (désactivation sans suppression) |

### Statistiques de connexion

| Champ | Type | Description |
|-------|------|-------------|
| `last_login` | `ISO8601\|null` | Date de dernière connexion réussie |
| `login_count` | `number` | Nombre total de connexions réussies |

### Sécurité

| Champ | Type | Description |
|-------|------|-------------|
| `must_reset_password` | `boolean` | Force le changement de mot de passe à la prochaine connexion |

### Métadonnées

| Champ | Type | Description |
|-------|------|-------------|
| `created_at` | `ISO8601` | Date de création du compte |
| `updated_at` | `ISO8601` | Date de dernière modification |

## Rôles disponibles

| Rôle | Description | Permissions |
|------|-------------|-------------|
| `"admin"` | Administrateur | Toutes les permissions (utilisateurs, config, suppression) |
| `"user"` | Utilisateur standard | Gestion des demandes, envoi de relances |
| `"readonly"` | Lecture seule | Consultation uniquement, pas de modifications |
| `"apporteur"` | Apporteur | Accès limité à ses propres demandes |

## Exemple concret

### Compte admin (créé par défaut)

```json
{
  "_id": "user:admin",
  "type": "user",
  "username": "admin",
  "email": "admin@marki.local",
  "password_hash": "[MIGRATION_REQUISE]",
  "role": "admin",
  "is_active": true,
  "last_login": null,
  "login_count": 0,
  "created_at": "2026-07-28T09:17:08.368Z",
  "updated_at": "2026-07-28T09:17:08.368Z",
  "must_reset_password": true
}
```

### Utilisateur standard

```json
{
  "_id": "user:user123",
  "type": "user",
  "username": "j.dupont",
  "email": "jean.dupont@adti06.com",
  "password_hash": "$2b$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "role": "user",
  "is_active": true,
  "last_login": "2026-07-28T14:30:00.000Z",
  "login_count": 42,
  "created_at": "2026-06-01T10:00:00.000Z",
  "updated_at": "2026-07-28T14:30:00.000Z",
  "must_reset_password": false
}
```

## Champs obligatoires

- `_id` : Format `user:{id}`
- `type` : `"user"`
- `username` : Nom d'utilisateur (unique)
- `email` : Adresse email (unique)
- `role` : Rôle de l'utilisateur

## Gestion des mots de passe

### Migration depuis SQLite

⚠️ **Important** : La table `users` n'existait pas dans SQLite. Un utilisateur `admin` est créé par défaut avec :

```json
"password_hash": "[MIGRATION_REQUISE]",
"must_reset_password": true
```

### Stratégies possibles

1. **Forcer la réinitialisation** (recommandé) :
   - L'utilisateur doit cliquer sur "Mot de passe oublié"
   - Un lien temporaire est envoyé par email
   - Nouveau mot de passe défini par l'utilisateur

2. **Création manuelle** :
   - Créer des utilisateurs via l'interface d'administration
   - Générer un mot de passe temporaire
   - `must_reset_password: true`

3. **Import depuis système externe** :
   - Si migration depuis un système avec utilisateurs existants
   - Re-hachage des mots de passe si même algorithme compatible

### Hachage recommandé

```javascript
// Exemple avec bcrypt
const bcrypt = require('bcrypt');
const saltRounds = 10;

// Création
const password_hash = await bcrypt.hash(password, saltRounds);

// Vérification
const valid = await bcrypt.compare(password, password_hash);
```

## Utilisation avec CouchDB

### Authentification via _session

```bash
# Créer une session
curl -X POST http://localhost:5984/_session \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "name=admin&password=secret"

# Résultat: cookie AuthSession
```

### Avec PouchDB

```javascript
const db = new PouchDB('http://localhost:5984/marki2', {
  auth: {
    username: 'admin',
    password: 'secret'
  }
});

// Ou avec cookie
db.login('admin', 'secret').then(async () => {
  const user = await db.get('user:admin');
});
```

### Filtrage par utilisateur

Les vues peuvent être filtrées par `user_id` pour l'historique :

```javascript
// Dans events d'une demande
doc.events.filter(e => e.user_id === 'user:admin');
```

## Notes importantes

1. **Unicité** : Les champs `username` et `email` doivent être uniques dans la base.

2. **Soft delete** : Utiliser `is_active: false` pour désactiver un compte sans le supprimer (conservation de l'historique).

3. **Audit** : Le champ `must_reset_password` permet de forcer un changement de mot de passe après une suspicion de compromission.

4. **Session CouchDB** : CouchDB gère ses propres sessions via cookies. Les documents `user` sont pour l'application métier.

---

*Document généré pour marki2*
