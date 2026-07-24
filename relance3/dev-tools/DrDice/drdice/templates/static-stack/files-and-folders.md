# Structure du Projet - Static Stack

Structure minimale requise pour le stack **Caddy + PouchDB/CouchDB + Alpine.js + Express**.

> **Note** : Structure minimale = minimum viable pour démarrer. Le projet peut contenir plus de cells.

---

## ## Arborescence minimale

```
~/marki/relance3/
├── app/
│   ├── site/
│   │   ├── healthy/                # Cell healthy - même structure qu'une cell normale
│   │   │   ├── index.html
│   │   │   ├── main.js
│   │   │   ├── workflows/
│   │   │   └── .specs/
│   │   │       ├── valide.md
│   │   │       └── devok.md
│   ├── server/
│   │   ├── index.js                # Point d'entrée serveur + proxy CouchDB
│   │   └── services/               # Services backend (Express)
│   │       └── healthy/
│   │           ├── index.js

/etc/caddy/
└── Caddyfile                       # Configuration Caddy
```

## Arborescence classique

```
~/marki/relance3/
├── app/
│   ├── .drdice/
│   │   ├── pages.json              # Liste des pages frontend (généré à l'étape 6)
│   │   └── test-results/           # Logs des tests
│   │       ├── skeleton-test-report.json
│   │       ├── healthy-test-report.json
│   │       ├── postgen-test-report.json
│   │       └── pi-analysis.md
│   ├── site/
│   │   ├── healthy/                # Cell healthy - même structure qu'une cell normale
│   │   │   ├── index.html
│   │   │   ├── main.js
│   │   │   ├── workflows/
│   │   │   └── .specs/
│   │   │       ├── valide.md
│   │   │       └── devok.md
│   │   ├── {cell-name}/            # Cells frontend (écrans)
│   │   │   ├── index.html
│   │   │   ├── main.js
│   │   │   ├── workflows/
│   │   │   │   └── *.js
│   │   │   └── .specs/
│   │   │       ├── valide.md
│   │   │       ├── devok.md
│   │   │       ├── mockups/
│   │   │       ├── wf-frontend/
│   │   │       └── wf-backend/
│   │   └── tests/
│   │       └── test-workflows.html # Page de test pour workflows 
│   ├── server/
│   │   ├── index.js                # Point d'entrée serveur + proxy CouchDB
│   │   └── services/               # Services backend (Express)
│   │       └── {cell-name}/
│   │           ├── index.js
│   │           ├── cron.js         # Optionnel : planification
│   │           ├── package.json
│   │           └── .specs/
│   │               ├── valide.md
│   │               ├── devok.md
│   │               └── wf-backend/
│   └── (autres fichiers si besoin)
└── (autres fichiers projet, scripts, etc.)

/etc/caddy/
└── Caddyfile                       # Configuration Caddy
```

---

## Détails par dossier

### `/app/.drdice/`

Métadonnées et configuration du projet DrDice.

| Fichier/Dossier | Description |
|-----------------|-------------|
| `pages.json` | Liste des pages frontend avec leurs URLs. Généré/mis à jour à l'étape 6. |
| `test-results/` | Dossier contenant tous les rapports de tests. |
| `test-results/skeleton-test-report.json` | Rapport des tests squelettes. |
| `test-results/healthy-test-report.json` | Rapport des tests de santé. |
| `test-results/postgen-test-report.json` | Rapport des tests post-génération. |
| `test-results/pi-analysis.md` | Analyse par `pi -p` des résultats de tests. |

#### Format de `pages.json`

```json
{
  "version": "1.0",
  "updated_at": "2025-01-15T14:30:00Z",
  "pages": [
    {
      "cell": "dashboard",
      "path": "/dashboard",
      "url": "http://dev.markidiags.com/dashboard",
      "type": "frontend",
      "has_workflows": true
    },
    {
      "cell": "users",
      "path": "/users",
      "url": "http://dev.markidiags.com/users",
      "type": "frontend",
      "has_workflows": true
    }
  ]
}
```

---

### `/app/site/`

Code source frontend (client-side).

| Dossier | Description |
|---------|-------------|
| `healthy/` | Cell de health check - même structure qu'une cell normale (requis). |
| `{cell-name}/` | Cells frontend - chaque dossier est un écran indépendant. |
| `tests/` | Pages de test (générées automatiquement). |

#### Structure d'une cell frontend (`/app/site/{name}/`)

| Fichier | Description |
|---------|-------------|
| `index.html` | Structure HTML avec Alpine.js. |
| `main.js` | Point d'entrée JavaScript, init PouchDB, charge workflows. |
| `workflows/*.js` | Workflows frontend (un fichier par workflow). |
| `.specs/` | Specs de la cell (préservé pendant le nettoyage). |
| `.specs/valide.md` | Marqueur que la cell est prête pour dev. |
| `.specs/devok.md` | Marqueur que la cell est développée. |
| `.specs/mockups/` | Mockups HTML de référence. |
| `.specs/wf-frontend/` | Specs des workflows frontend. |
| `.specs/wf-backend/` | Specs des workflows backend (si applicable). |
| `drdice-logs/` | Logs des prompts `pi -p` (génération IA). |

---

### `/app/site/healthy/`

Cell de health check obligatoire. Même structure qu'une cell frontend normale.

| Fichier | Description |
|---------|-------------|
| `index.html` | Structure HTML. |
| `main.js` | Point d'entrée JavaScript. |
| `workflows/` | Workflows (si applicable). |
| `.specs/` | Specs de la cell. |
| `.specs/valide.md` | Marqueur que la cell est prête pour dev. |
| `.specs/devok.md` | Marqueur que la cell est développée. |

---

### `/app/site/tests/`

Pages de test générées automatiquement.

| Fichier | Description |
|---------|-------------|
| `test-workflows.html` | Page de test pour workflows. Charge PouchDB depuis `marki-test`, trigger workflows, affiche logs. |

---

### `/app/server/`

Code source backend (server-side).

| Fichier/Dossier | Description |
|-----------------|-------------|
| `index.js` | Point d'entrée Express + configuration proxy vers CouchDB. |
| `services/` | Services backend - chaque sous-dossier est un service API. |

#### Structure d'une cell service (`/app/server/services/{name}/`)

| Fichier | Description |
|---------|-------------|
| `index.js` | Serveur Express avec routes API. |
| `cron.js` | Optionnel : planification des tâches (appelle fonctions de `index.js`). |
| `package.json` | Dépendances Node.js (généré par IA, pas en squelette). |
| `.specs/` | Specs du service (préservé pendant le nettoyage). |
| `.specs/valide.md` | Marqueur que le service est prêt pour dev. |
| `.specs/devok.md` | Marqueur que le service est développé. |
| `.specs/wf-backend/` | Specs des workflows backend. |
| `drdice-logs/` | Logs des prompts `pi -p` (génération IA). |

#### `app/server/index.js`

Responsabilités :
- Démarrer le serveur Express (port 3000 ou 5001)
- Authentification JWT (login/logout)
- **Proxy sécurisé vers CouchDB** : toutes les requêtes `/data/*` sont transmises à CouchDB (port 5984) après vérification du token
- Servir les sous-applications dans `services/`

---

### `/etc/caddy/Caddyfile`

Configuration du serveur Caddy.

```caddyfile
# Configuration de base pour dev.markidiags.com
dev.markidiags.com {
    # Auth basic pour tout le site
    basicauth {
        # user: dev, password: Citron6-Mustang8
        dev $2a$14$...hash...
    }
    
    # Route /data/* vers API Node.js (qui fait proxy vers CouchDB)
    handle_path /data/* {
        reverse_proxy localhost:3000
    }
    
    # Route /api/* vers serveur Node.js
    handle_path /api/* {
        reverse_proxy localhost:3000
    }
    
    # Bypass auth pour endpoints health
    handle /healthy {
        reverse_proxy localhost:8080
    }
    
    handle /couchdb/healthy {
        reverse_proxy localhost:5984
    }
    
    handle /server/healthy {
        reverse_proxy localhost:3000
    }
    
    # Static hosting sur app/site/
    handle {
        root * /home/ubuntu/marki/relance3/app/site
        file_server
        try_files {path} {path}/ /{path}/index.html
    }
}
```

---

## Services et ports

| Service | Port | URL accessible | Description |
|---------|------|----------------|-------------|
| Caddy | 80/443 | `http://dev.markidiags.com` | Reverse proxy principal |
| Node.js (API + CouchDB proxy) | 3000 | `http://dev.markidiags.com/data/*` | API + proxy sécurisé vers CouchDB |
| Node.js (API backend) | 3000 | `http://dev.markidiags.com/api/*` | Routes API métier |
| CouchDB | 5984 | `localhost:5984` uniquement | **Non exposé publiquement** |
| Frontend (Caddy static) | - | `http://dev.markidiags.com/` | Static files |

---

## Conventions de nommage

### Cells

- **Frontend** : nom au singulier, minuscules, tirets pour espaces : `user-profile`, `dashboard`, `invoice-list`
- **Backend** : même convention : `user-service`, `sync-service`

### Workflows

- **Fichiers** : `kebab-case.js` : `initial-load.js`, `save-data.js`
- **Fonctions** : `camelCase` : `initialLoad`, `saveData`

### Bases de données

- **Production** : nom du projet : `marki`
- **Test** : suffixe `-test` : `marki-test`

---

## Vérification de la structure

Pour vérifier que la structure est conforme :

```bash
# Vérifier manuellement les points critiques
[ -d ~/marki/relance3/app/site ] && echo "✅ app/site existe"
[ -d ~/marki/relance3/app/site/healthy ] && echo "✅ app/site/healthy existe"
[ -d ~/marki/relance3/app/server ] && echo "✅ app/server existe"
[ -f ~/marki/relance3/app/server/index.js ] && echo "✅ app/server/index.js existe"
[ -d ~/marki/relance3/app/.drdice ] && echo "✅ app/.drdice existe"
[ -f /etc/caddy/Caddyfile ] && echo "✅ Caddyfile existe"
```

---

## Règles immuables

1. **Jamais d'écriture hors de `~/marki/relance3/app/`** pour le code applicatif.
2. **Caddyfile à `/etc/caddy/Caddyfile`** uniquement (pas de copie locale).
3. **Specs préservés** : `.specs/` n'est jamais supprimé.
4. **Logs centralisés** : tous les logs de test dans `app/.drdice/test-results/`.
