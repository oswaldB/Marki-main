---
name: git-setup
description: Crée une branche Git pour une cell de développement. Utilisé dans le workflow dev3 pour préparer l'environnement Git avant le développement d'une cell.
---

# Git Setup Skill

Crée une branche Git dédiée pour une cell avec la convention `dev-{cell-name}`.

## Usage

```bash
# Via la commande skill
/skill:git-setup <cell-name> [project-dir]

# Ou directement via le script
python3 .pi/skills/git-setup/scripts/git_setup.py <cell-name> [project-dir]
```

## Arguments

- `cell-name` (requis) : Nom de la cell à développer
- `project-dir` (optionnel) : Chemin du projet (défaut: cwd)

## Résultat

- Crée et checkout la branche `dev-{cell-name}`
- Retourne le nom de la branche créée
- Échoue si déjà sur une branche dev-* différente

## Exemple

```bash
/skill:git-setup users
# Output: ✅ Branche: dev-users
```
