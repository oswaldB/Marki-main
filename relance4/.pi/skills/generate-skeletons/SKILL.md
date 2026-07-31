---
name: generate-skeletons
description: Génère les fichiers squelettes pour la cell. Crée index.html, main.js, workflows/*.js depuis les templates.
---

# Generate Skeletons Skill

Génère les fichiers templates avec instructions pour le développement.

## Usage

```bash
/skill:generate-skeletons <cell-path> [templates-dir]
```

## Arguments

- `cell-path` (requis) : Chemin vers le dossier de la cell
- `templates-dir` (optionnel) : Dossier des templates

## Actions effectuées

1. Charge les templates depuis static-stack/squelettes/
2. Génère index.html et main.js (frontend) ou index.js (backend)
3. Crée les fichiers workflow.js pour chaque workflow
4. Génère la page de test workflows

## Exemple

```bash
/skill:generate-skeletons cells/users
# Output: ✅ 5 squelettes générés
```
