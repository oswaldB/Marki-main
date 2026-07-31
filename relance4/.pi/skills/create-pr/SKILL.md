---
name: create-pr
description: Commit devok.md et crée une Pull Request GitHub via gh CLI. Pousse la branche et crée la PR avec titre et description appropriés.
---

# Create PR Skill

Commit devok.md et crée une Pull Request.

## Usage

```bash
/skill:create-pr <cell-name> [branch-name] [project-dir]
```

## Arguments

- `cell-name` (requis) : Nom de la cell
- `branch-name` (optionnel) : Nom de la branche (défaut: feature/cell-{name})
- `project-dir` (optionnel) : Chemin du projet

## Actions effectuées

1. git add devok.md
2. git commit -m "docs({cell}): marque cell comme développée"
3. git push origin {branch}
4. gh pr create --title "feat({cell}): implémentation complète"

## Exemple

```bash
/skill:create-pr users feature/cell-users
# Output: ✅ Pull Request créée: https://github.com/...
```
