---
name: create-devok
description: Crée le fichier .specs/devok.md marquant la cell comme développée. Génère un rapport avec statut, date, stack utilisée et checklist.
---

# Create Devok Skill

Marque la cell comme développée avec devok.md.

## Usage

```bash
/skill:create-devok <cell-path> [--auto]
```

## Arguments

- `cell-path` (requis) : Chemin vers le dossier de la cell
- `--auto` (optionnel) : Mode automatique sans confirmation

## Actions effectuées

1. Génère le contenu devok.md avec statut, date, stack
2. Ajoute la checklist des étapes dev3
3. Liste les fichiers générés

## Exemple

```bash
/skill:create-devok cells/users --auto
# Output: ✅ devok.md créé: cells/users/.specs/devok.md
```
