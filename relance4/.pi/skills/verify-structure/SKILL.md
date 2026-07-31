---
name: verify-structure
description: Vérifie que la structure du projet DrDice est conforme. Valide la présence des dossiers requis (app/api, app/site, cells, etc.) pour le développement avec Bun.js + SQLite.
---

# Verify Structure Skill

Valide que le projet a la structure attendue pour le workflow dev3.

## Usage

```bash
# Via la commande skill
/skill:verify-structure [project-dir]

# Ou directement via le script
python3 .pi/skills/verify-structure/scripts/verify_structure.py [project-dir]
```

## Arguments

- `project-dir` (optionnel) : Chemin du projet (défaut: cwd)

## Vérifications effectuées

- ✅ Dossier `app/api/` existe
- ✅ Dossier `app/site/` existe
- ✅ Dossier `cells/` existe
- ✅ Dossier `dev-tools/` existe
- ✅ Fichier `marki.db` existe (à la racine ou dans app/api/db/)

## Résultat

- Retourne `(True, "OK")` si tout est conforme
- Retourne `(False, "message")` si une vérification échoue

## Exemple

```bash
/skill:verify-structure
# Output: ✅ Structure OK
```
