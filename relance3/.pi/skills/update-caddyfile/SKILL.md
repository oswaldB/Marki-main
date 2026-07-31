---
name: update-caddyfile
description: Vérifie que les routes Caddy répondent pour la cell. Teste http://dev.markidiags.com/{cell}/ et affiche la configuration Caddy.
---

# Update Caddyfile Skill

Vérifie que les routes Caddy répondent.

## Usage

```bash
/skill:update-caddyfile <cell-name> [project-dir]
```

## Arguments

- `cell-name` (requis) : Nom de la cell
- `project-dir` (optionnel) : Chemin du projet

## Actions effectuées

1. Teste la route http://dev.markidiags.com/{cell}/
2. Affiche la configuration Caddy actuelle
3. Donne des indications si la route ne répond pas

## Exemple

```bash
/skill:update-caddyfile users
# Output: ✅ Route OK: http://dev.markidiags.com/users/
```
