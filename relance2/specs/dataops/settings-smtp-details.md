# Routes API REST - Écran Settings SMTP Details

Analyse des interactions data nécessaires pour l'écran `settings-smtp-details`.

---

## Route 1: Récupérer un profil SMTP

### Description
Retourne les détails complets d'un profil SMTP identifié par son ID. Appelée lors du chargement initial de la page.

### Endpoint
```
GET /api/smtp-profiles/:id
```

### Paramètres d'entrée
| Paramètre | Type   | Obligatoire | Description                |
| :-------- | :----- | :---------- | :------------------------- |
| id        | string | Oui         | Identifiant du profil SMTP |

### Réponse JSON (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "smtp-001",
    "nom": "SMTP Principal",
    "from_email": "noreply@marki.fr",
    "from_name": "Marki",
    "host": "smtp.marki.fr",
    "port": 587,
    "secure": 1,
    "username": "noreply@marki.fr",
    "password": "••••••••",
    "signature_html": "<p>Cordialement,<br><strong>Marki</strong></p>",
    "actif": 1,
    "is_default": 1,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-07-19T14:22:00Z"
  }
}
```

### Requête SQL
```sql
SELECT 
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
  signature_html,
  created_at,
  updated_at
FROM smtp_profiles
WHERE id = :id;
```

---

## Route 2: Mettre à jour un profil SMTP

### Description
Met à jour les paramètres d'un profil SMTP existant. Appelée lors du clic sur "Enregistrer".

### Endpoint
```
PUT /api/smtp-profiles/:id
```

### Paramètres d'entrée (Body JSON)
| Paramètre      | Type    | Obligatoire | Description                                    |
| :------------- | :------ | :---------- | :--------------------------------------------- |
| nom            | string  | Oui         | Nom du profil SMTP                             |
| from_email     | string  | Oui         | Email d'expéditeur                             |
| from_name      | string  | Non         | Nom d'expéditeur affiché                       |
| host           | string  | Oui         | Serveur SMTP                                   |
| port           | integer | Oui         | Port du serveur (ex: 587, 465, 25)             |
| secure         | integer | Oui         | Type de sécurité: 0=none, 1=tls, 2=ssl        |
| username       | string  | Oui         | Nom d'utilisateur SMTP                         |
| password       | string  | Non         | Mot de passe (ignoré si valeur masquée "••••") |
| signature_html | string  | Non         | Signature HTML ajoutée aux emails              |
| actif          | integer | Non         | 1=actif, 0=inactif                             |

### Réponse JSON (200 OK)
```json
{
  "success": true,
  "message": "Profil SMTP mis à jour avec succès",
  "data": {
    "id": "smtp-001",
    "nom": "SMTP Principal",
    "from_email": "noreply@marki.fr",
    "host": "smtp.marki.fr",
    "port": 587,
    "secure": 1,
    "username": "noreply@marki.fr",
    "actif": 1,
    "updated_at": "2024-07-19T15:30:00Z"
  }
}
```

### Requête SQL
```sql
UPDATE smtp_profiles
SET 
  nom = :nom,
  host = :host,
  port = :port,
  secure = :secure,
  username = :username,
  from_email = :from_email,
  from_name = :from_name,
  signature_html = :signature_html,
  actif = :actif,
  updated_at = CURRENT_TIMESTAMP
WHERE id = :id;
```

**Note**: Si `password` est fourni et différent de "••••", ajouter :
```sql
  password = :password,
```

---

## Route 3: Tester la connexion SMTP

### Description
Teste la connexion au serveur SMTP avec les paramètres fournis. Appelée lors du clic sur "Tester la connexion".

### Endpoint
```
POST /api/smtp-profiles/:id/test
```

### Paramètres d'entrée
| Paramètre | Type   | Obligatoire | Description                |
| :-------- | :----- | :---------- | :------------------------- |
| id        | string | Oui         | Identifiant du profil SMTP |

### Réponse JSON (200 OK) - Succès
```json
{
  "success": true,
  "message": "Connexion SMTP réussie",
  "details": "Délai de réponse: 124ms",
  "data": {
    "response_time_ms": 124,
    "server_response": "220 smtp.marki.fr ESMTP ready"
  }
}
```

### Réponse JSON (200 OK) - Échec
```json
{
  "success": false,
  "message": "Échec de la connexion",
  "details": "Impossible de se connecter au serveur SMTP. Vérifiez vos paramètres.",
  "data": {
    "error_code": "ECONNREFUSED",
    "error_message": "Connection refused"
  }
}
```

### Requête SQL (récupération des credentials)
```sql
SELECT 
  host,
  port,
  secure,
  username,
  password
FROM smtp_profiles
WHERE id = :id AND actif = 1;
```

**Note**: Cette route nécessite une implémentation côté serveur pour établir une connexion TCP/TLS au serveur SMTP et effectuer l'authentification (sans envoyer d'email).

---

## Route 4: Basculer l'affichage du mot de passe

### Description
Interaction UI pure (Alpine.js state `showPassword`). **Aucune route API requise**.

---

## Mapping Champs Mockup ↔ Base de données

| Champ Mockup | Champ DB       | Type    | Notes                                          |
| :----------- | :------------- | :------ | :--------------------------------------------- |
| `profil.nom` | `nom`          | TEXT    |                                                |
| `profil.email` | `from_email` | TEXT    |                                                |
| `profil.serveur` | `host`     | TEXT    |                                                |
| `profil.port` | `port`        | INTEGER |                                                |
| `profil.securite` | `secure`  | INTEGER | Mapping: "tls"→1, "ssl"→2, "none"→0          |
| `profil.username` | `username` | TEXT  |                                                |
| `profil.password` | `password` | TEXT  | Masqué par "••••" en lecture                   |
| `profil.signature` | `signature_html` | TEXT |                                             |
| `profil.actif` | `actif`      | INTEGER | 1=actif, 0=inactif                             |

---

## Table concernée

```sql
-- Table: smtp_profiles
CREATE TABLE smtp_profiles (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 587,
  secure INTEGER DEFAULT 0,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT NOT NULL,
  actif INTEGER DEFAULT 1,
  is_default INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  signature_html TEXT
);
```
