# Backend API - Marki

## Démarrage

```bash
cd backend
npm install  # si pas déjà fait
npm start
```

Le serveur démarre sur `http://localhost:3001` par défaut.

## Variables d'environnement

Créez un fichier `.env`:

```
JWT_SECRET=votre-secret-tres-securise-en-production
API_PORT=3001
```

## Endpoints

### Health Check
```bash
GET http://localhost:3001/health
```

### Authentification

#### Login
```bash
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "email": "admin@adti.fr",
  "password": "admin123"
}
```

Réponse succès (200):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_1784011777906",
    "username": "admin@adti.fr",
    "email": "admin@adti.fr",
    "role": "admin"
  }
}
```

Réponse erreur (401):
```json
{
  "error": "Identifiants invalides"
}
```

## Créer un utilisateur

```bash
cd backend
node scripts/init-admin.js email@example.com motdepasse
```

Ou utiliser `create-user.js` pour plus d'options.

## Architecture

- `api-server.js` - Serveur HTTP minimal
- `auth-login/index.js` - Workflow de login
- `lib/flat-file-db.js` - Base de données flat-file (LokiJS + YAML)
- `data/` - Stockage des données (fichiers YAML)

## Logs

Les logs d'authentification sont dans:
```
backend/auth-login/logs/YYYY-MM-DD.log
```
