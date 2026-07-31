---
name: check-workflow-tests
description: Vérifie que les tests workflows existent dans .specs/tests-workflows/, génère automatiquement depuis les specs si manquants.
---

# Check Workflow Tests Skill

Vérifie et génère les fichiers de test workflows au format JSON.

## Usage

```bash
/skill:check-workflow-tests <cell-path>
```

## Arguments

- `cell-path` (requis) : Chemin vers le dossier de la cell

## Actions effectuées

1. Liste les workflows depuis wf-frontend/
2. Vérifie s'il existe un fichier test JSON par workflow
3. Génère automatiquement depuis les specs si manquant

## Exemple

```bash
/skill:check-workflow-tests cells/users
# Output: ✅ 3 fichier(s) de test généré(s)
```
