# 🔐 Serveur API Sécurisé - Proxy CouchDB

Ce serveur Node.js fait le pont sécurisé entre le frontend (Alpine.js) et CouchDB.

## 🎯 Objectif

**Avant (DANGEREUX)** : Le frontend avait les credentials CouchDB en dur
```javascript
const remoteDB = new PouchDB('https://oswald:Citron6-Mustang8@...');
```

**Après (SÉCURISÉ)** : Le frontend utilise uniquement des tokens JWT
```javascript
const token = localStorage.getItem('auth_token');
fetch('/api/db/find', { headers: { 'Authorization': `Bearer ${token}` }});
```

## 📁 Structure

```
app/server/
├── proxy.js           ← Serveur API principal (AUTH)
├── main.js            ← Ancien serveur simple (optionnel)
├── package.json       ← Dépendances
├── .env.example       ← Variables d'environnement
└── README.md          ← Ce fichier
```

## 🚀 Démarrage

```bash
# 1. Installer les dépendances
npm install

# 2. Copier et configurer l'environnement
cp .env.example .env
# Éditer .env et mettre votre JWT_SECRET

# 3. Démarrer
npm run dev    # Mode dev avec nodemon
npm start      # Mode production
```

## 🔌 Endpoints API

### 🔓 Publics (sans auth)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/health` | Vérification santé |
| POST | `/api/auth/login` | Login (username, password) |

### 🔒 Protégés (nécessite JWT)

Ajouter le header : `Authorization: Bearer <token>`

| Méthode | Endpoint | Description | Rôle |
|---------|----------|-------------|------|
| POST | `/api/auth/logout` | Déconnexion | Tous |
| GET | `/api/me` | Profil utilisateur | Tous |
| GET | `/api/users` | Liste des utilisateurs | Admin |
| POST | `/api/db/find` | Requête Mango | Tous |
| GET | `/api/db/:id` | Récupérer document | Tous |
| POST | `/api/db` | Créer document | Tous |
| PUT | `/api/db/:id` | Modifier document | Tous (own) |
| DELETE | `/api/db/:id` | Supprimer document | Tous (own) |

## 🧪 Exemples d'utilisation

### Login
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"votre-mot-de-passe"}'
```

Réponse :
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "username": "admin",
    "role": "admin"
  }
}
```

### Requête protégée
```bash
curl http://localhost:5001/api/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### Requête Mango (find)
```bash
curl -X POST http://localhost:5001/api/db/find \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "selector": { "table": "users" },
    "limit": 10
  }'
```

## 🔒 Sécurité

- **JWT** : Tokens signés avec secret, expirent après 24h
- **bcrypt** : Mots de passe hashés
- **Sessions** : Stockées dans CouchDB
- **Permissions** : Admin vs User (filtrage automatique)
- **CORS** : Configuré pour dev.markidiags.com

## 🔧 Configuration Caddy

Le Caddyfile doit rediriger `/api/*` vers ce serveur :

```caddyfile
dev.markidiags.com {
    handle_path /api/* {
        reverse_proxy localhost:5001
    }
    
    handle {
        root * /home/ubuntu/marki/relance3/app/site
        file_server
    }
}
```

## 📊 Logs

Les logs affichent :
- Chaque requête (IP, méthode, path)
- Logins réussis/échoués
- Erreurs serveur

## 🚨 Important

- ⚠️ Changer `JWT_SECRET` en production !
- ⚠️ CouchDB doit écouter uniquement localhost (bind_address = 127.0.0.1)
- ⚠️ Le firewall doit bloquer le port 5984 externe
