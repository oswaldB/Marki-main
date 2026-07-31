---
name: verify-structure-couch
description: Vérifie et crée la structure Bun.js + SQLite pour le projet. Crée les dossiers app/api, app/site, configure Caddy et démarre les services.
---

# Verify Structure Couch Skill

Valide et crée la structure du projet pour le stack Bun.js + SQLite.

## Usage

```bash
/skill:verify-structure-couch [project-dir]
```

## Actions effectuées

1. Crée les dossiers requis (app/api/db, app/api/routes, app/site/healthy)
2. Crée package.json, index.ts, schema.sql pour Bun.js
3. Copie marki.db vers app/api/db/
4. Configure /etc/caddy/Caddyfile
5. Démarre Caddy et l'API Bun.js

## Exemple

```bash
/skill:verify-structure-couch
# Output: ✅ Structure Bun.js OK et services démarrés
```
