---
name: commit-git
description: Crée un commit git avec les changements de la cell. Effectue git add, commit et push vers origin.
---

# Commit Git Skill

Versionne les changements de la cell.

## Usage

```bash
/skill:commit-git <cell-name> [project-dir] [--skip-git]
```

## Arguments

- `cell-name` (requis) : Nom de la cell
- `project-dir` (optionnel) : Chemin du projet (défaut: cwd)
- `--skip-git` (optionnel) : Ne pas faire le commit

## Actions effectuées

1. git add .
2. git commit -m "feat({cell}): implémentation cell dev3"
3. git push origin (si remote configuré)

## Exemple

```bash
/skill:commit-git users
# Output: ✅ Commit créé: abc1234
```
