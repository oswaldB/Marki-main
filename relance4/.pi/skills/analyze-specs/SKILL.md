---
name: analyze-specs
description: Analyse les specs pour identifier le type de cell et les fichiers nécessaires. Parse les workflows depuis wf-frontend et détermine si c'est un frontend ou backend.
---

# Analyze Specs Skill

Analyse les specs pour identifier le type de cell et les fichiers nécessaires.

## Usage

```bash
/skill:analyze-specs <cell-path>
```

## Arguments

- `cell-path` (requis) : Chemin vers le dossier de la cell

## Résultat

Retourne un dev_plan avec:
- `cell_name` : Nom de la cell
- `cell_type` : frontend ou backend
- `files` : Liste des fichiers nécessaires
- `workflows` : Liste des workflows

## Exemple

```bash
/skill:analyze-specs cells/users
# Output: ✅ Analyse OK: users (frontend, 5 fichiers, 3 workflows)
```
