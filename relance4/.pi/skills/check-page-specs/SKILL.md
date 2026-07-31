---
name: check-page-specs
description: Vérifie si page-specs.md existe, sinon le crée à partir du template. Ajoute les sections de scénarios de test pour chaque workflow.
---

# Check Page Specs Skill

Vérifie ou crée le fichier page-specs.md dans .specs/.

## Usage

```bash
/skill:check-page-specs <cell-path> [templates-dir]
```

## Arguments

- `cell-path` (requis) : Chemin vers le dossier de la cell
- `templates-dir` (optionnel) : Dossier des templates

## Actions effectuées

1. Vérifie si page-specs.md existe déjà
2. Si non, crée depuis le template static-stack/squelettes/specs/page-specs.md
3. Enrichit avec les scénarios de test pour chaque workflow

## Exemple

```bash
/skill:check-page-specs cells/users
# Output: ✅ page-specs.md créé/vérifié
```
