---
name: git-setup-couch
description: Crée et checkout la branche Git feature/cell-{name} pour le développement d'une cell. Utilisé dans le workflow dev3-couch pour préparer l'environnement Git.
---

# Git Setup Couch Skill

Crée une branche Git dédiée pour une cell avec la convention `feature/cell-{name}`.

## Usage

```bash
/skill:git-setup-couch <cell-name> [project-dir]
```

## Arguments

- `cell-name` (requis) : Nom de la cell à développer
- `project-dir` (optionnel) : Chemin du projet (défaut: cwd)

## Résultat

- Crée et checkout la branche `feature/cell-{name}`
- Retourne le nom de la branche créée

## Exemple

```bash
/skill:git-setup-couch users
# Output: ✅ Branche: feature/cell-users
```
