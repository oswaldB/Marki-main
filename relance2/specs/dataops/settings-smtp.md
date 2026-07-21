# DataOps - Routes API REST pour Settings SMTP

Analyse basée sur le mockup `mockups/settings-smtp.html` et la table `smtp_profiles` du schéma SQL.

---

## 1. Lister les profils SMTP

### Description
Récupère la liste de tous les profils SMTP configurés pour affichage sur la page d'accueil des paramètres SMTP.

### Endpoint
```
GET /api/smtp-profiles
```

### Paramètres d'entrée
Aucun

### Réponse JSON (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "smtp_001",
      "nom": "SMTP Principal",
      "email": "noreply@marki.fr",
      "serveur": "smtp.marki.fr",
      "port": 587,
      "securite": "tls",
      "actif": true,
      "is_default": true
    },
    {
      "id": "smtp_002",
      "nom": "SMTP Secondaire",
      "email": "relances@marki.fr",
      "serveur": "smtp2.marki.fr",
      "port": 587,
      "securite": "tls",
      "actif": true,
      "is_default": false
    }
  ]
}
```

### Requête SQL
```sql
SELECT 
    id,
    nom,
    from_email as email,
    host as serveur,
    port,
    CASE 
        WHEN secure = 1 THEN 'ssl'
        WHEN secure = 2 THEN 'tls'
        ELSE 'none'
    END as securite,
    actif,
    is_default
FROM smtp_profiles
ORDER BY created_at DESC;
```

---

## 2. Créer un profil SMTP

### Description
Crée un nouveau profil SMTP avec les paramètres fournis dans le formulaire de création.

### Endpoint
```
POST /api/smtp-profiles
```

### Paramètres d'entrée (JSON Body)
```json
{
  "nom": "SMTP Principal",
  "email": "noreply@marki.fr",
  "serveur": "smtp.marki.fr",
  "port": 587,
  "securite": "tls",
  "username": "user@marki.fr",
  "password": "motdepasse",
  "actif": true
}
```

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| nom | string | Oui | Nom du profil |
| email | string | Oui | Email d'envoi (from_email) |
| serveur | string | Oui | Serveur SMTP (host) |
| port | integer | Oui | Port SMTP |
| securite | string | Non | tls, ssl ou none (défaut: tls) |
| username | string | Non | Nom d'utilisateur |
| password | string | Non | Mot de passe |
| actif | boolean | Non | Profil actif (défaut: true) |

### Réponse JSON (201 Created)
```json
{
  "success": true,
  "data": {
    "id": "smtp_003",
    "nom": "SMTP Principal",
    "email": "noreply@marki.fr",
    "serveur": "smtp.marki.fr",
    "port": 587,
    "securite": "tls",
    "actif": true
  },
  "message": "Profil SMTP créé avec succès"
}
```

### Requête SQL
```sql
INSERT INTO smtp_profiles (
    id,
    nom,
    host,
    port,
    secure,
    username,
    password,
    from_email,
    from_name,
    actif,
    is_default,
    created_at,
    updated_at
) VALUES (
    lower(hex(randomblob(16))),
    :nom,
    :serveur,
    :port,
    CASE :securite
        WHEN 'ssl' THEN 1
        WHEN 'tls' THEN 2
        ELSE 0
    END,
    COALESCE(:username, ''),
    COALESCE(:password, ''),
    :email,
    :nom,
    COALESCE(:actif, 1),
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
```

---

## 3. Récupérer un profil SMTP (détail)

### Description
Récupère les détails complets d'un profil SMTP pour l'édition ou l'affichage détaillé.

### Endpoint
```
GET /api/smtp-profiles/:id
```

### Paramètres d'entrée (URL)
| Paramètre | Type | Description |
|-----------|------|-------------|
| id | string | ID du profil SMTP |

### Réponse JSON (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "smtp_001",
    "nom": "SMTP Principal",
    "email": "noreply@marki.fr",
    "serveur": "smtp.marki.fr",
    "port": 587,
    "securite": "tls",
    "username": "user@marki.fr",
    "password": "********",
    "actif": true,
    "is_default": true,
    "signature_html": "<p>...</p>"
  }
}
```

### Requête SQL
```sql
SELECT 
    id,
    nom,
    from_email as email,
    host as serveur,
    port,
    CASE 
        WHEN secure = 1 THEN 'ssl'
        WHEN secure = 2 THEN 'tls'
        ELSE 'none'
    END as securite,
    username,
    '********' as password,
    actif,
    is_default,
    signature_html
FROM smtp_profiles
WHERE id = :id;
```

---

## 4. Mettre à jour un profil SMTP

### Description
Met à jour les paramètres d'un profil SMTP existant.

### Endpoint
```
PUT /api/smtp-profiles/:id
```

### Paramètres d'entrée
**URL:**
| Paramètre | Type | Description |
|-----------|------|-------------|
| id | string | ID du profil SMTP |

**JSON Body:**
```json
{
  "nom": "SMTP Principal Modifié",
  "email": "new@marki.fr",
  "serveur": "smtp.marki.fr",
  "port": 587,
  "securite": "tls",
  "username": "user@marki.fr",
  "password": "nouveaumdp",
  "actif": true
}
```

### Réponse JSON (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "smtp_001",
    "nom": "SMTP Principal Modifié",
    "email": "new@marki.fr",
    "serveur": "smtp.marki.fr",
    "port": 587,
    "securite": "tls",
    "actif": true
  },
  "message": "Profil SMTP mis à jour avec succès"
}
```

### Requête SQL
```sql
UPDATE smtp_profiles
SET 
    nom = COALESCE(:nom, nom),
    host = COALESCE(:serveur, host),
    port = COALESCE(:port, port),
    secure = CASE :securite
        WHEN 'ssl' THEN 1
        WHEN 'tls' THEN 2
        ELSE 0
    END,
    username = COALESCE(:username, username),
    password = COALESCE(:password, password),
    from_email = COALESCE(:email, from_email),
    from_name = COALESCE(:nom, from_name),
    actif = COALESCE(:actif, actif),
    updated_at = CURRENT_TIMESTAMP
WHERE id = :id;
```

---

## 5. Supprimer un profil SMTP

### Description
Supprime définitivement un profil SMTP. Nécessite une confirmation via modal.

### Endpoint
```
DELETE /api/smtp-profiles/:id
```

### Paramètres d'entrée (URL)
| Paramètre | Type | Description |
|-----------|------|-------------|
| id | string | ID du profil SMTP |

### Réponse JSON (200 OK)
```json
{
  "success": true,
  "message": "Profil SMTP supprimé avec succès"
}
```

### Réponse Erreur (409 Conflict)
```json
{
  "success": false,
  "error": "CONSTRAINT_VIOLATION",
  "message": "Ce profil SMTP est utilisé par des relances existantes"
}
```

### Requête SQL
```sql
-- Vérification des contraintes avant suppression
SELECT COUNT(*) as usage_count 
FROM relances 
WHERE smtp_profile_id = :id;

-- Suppression si aucune contrainte
DELETE FROM smtp_profiles 
WHERE id = :id;
```

---

## 6. Tester la connexion SMTP

### Description
Teste la connexion au serveur SMTP avec les paramètres fournis sans envoyer de vrai email.

### Endpoint
```
POST /api/smtp-profiles/:id/test
```

### Paramètres d'entrée (URL)
| Paramètre | Type | Description |
|-----------|------|-------------|
| id | string | ID du profil SMTP |

### Réponse JSON (200 OK)
```json
{
  "success": true,
  "data": {
    "connected": true,
    "response_time_ms": 245,
    "message": "Connexion SMTP établie avec succès"
  }
}
```

### Réponse JSON (200 OK - Échec)
```json
{
  "success": true,
  "data": {
    "connected": false,
    "error": "AUTHENTICATION_FAILED",
    "message": "Échec d'authentification : nom d'utilisateur ou mot de passe incorrect"
  }
}
```

### Requête SQL
```sql
-- Récupération des credentials pour le test
SELECT 
    host,
    port,
    secure,
    username,
    password,
    from_email
FROM smtp_profiles
WHERE id = :id;
```

**Note:** La connexion SMTP réelle est testée côté serveur via une bibliothèque nodemailer ou équivalente.

---

## 7. Définir comme profil par défaut

### Description
Définit un profil SMTP comme profil par défaut (désactive les autres).

### Endpoint
```
PATCH /api/smtp-profiles/:id/default
```

### Paramètres d'entrée (URL)
| Paramètre | Type | Description |
|-----------|------|-------------|
| id | string | ID du profil SMTP |

### Réponse JSON (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "smtp_001",
    "is_default": true
  },
  "message": "Profil défini comme défaut"
}
```

### Requête SQL (Transaction)
```sql
-- Désactiver l'ancien profil par défaut
UPDATE smtp_profiles
SET is_default = 0, updated_at = CURRENT_TIMESTAMP
WHERE is_default = 1;

-- Activer le nouveau profil par défaut
UPDATE smtp_profiles
SET is_default = 1, updated_at = CURRENT_TIMESTAMP
WHERE id = :id;
```

---

## Mapping Champs Mockup ↔ Base de données

| Mockup (UI) | Table SQL | Notes |
|-------------|-----------|-------|
| `profil.nom` | `smtp_profiles.nom` | Nom du profil |
| `profil.email` | `smtp_profiles.from_email` | Email d'envoi |
| `profil.serveur` | `smtp_profiles.host` | Serveur SMTP |
| `profil.port` | `smtp_profiles.port` | Port (587, 465, 25...) |
| `profil.securite` | `smtp_profiles.secure` | Mapping: tls→2, ssl→1, none→0 |
| `profil.username` | `smtp_profiles.username` | Auth SMTP |
| `profil.password` | `smtp_profiles.password` | Auth SMTP (chiffré recommandé) |
| `profil.actif` | `smtp_profiles.actif` | 1=actif, 0=inactif |
| `is_default` | `smtp_profiles.is_default` | Profil par défaut |

---

## Erreurs HTTP Standards

| Code | Signification | Cas d'usage |
|------|---------------|-------------|
| 200 | OK | Requête réussie |
| 201 | Created | Création réussie |
| 400 | Bad Request | Données invalides |
| 401 | Unauthorized | Non authentifié |
| 404 | Not Found | Profil inexistant |
| 409 | Conflict | Contrainte violée (relances liées) |
| 500 | Server Error | Erreur serveur |
