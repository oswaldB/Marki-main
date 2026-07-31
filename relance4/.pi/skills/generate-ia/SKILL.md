---
name: generate-ia
description: Génère le code final via IA avec pi -p pour chaque fichier. Exécute pi -p sur chaque fichier squelette pour le corriger selon les specs.
---

# Generate IA Skill

Génère le code final via IA avec `pi -p`.

## Usage

```bash
/skill:generate-ia <cell-path>
```

## Arguments

- `cell-path` (requis) : Chemin vers le dossier de la cell

## Actions effectuées

1. Liste les fichiers à générer depuis dev_plan
2. Exécute `pi -p "Corrige ce fichier..."` pour chaque fichier
3. Sauvegarde les logs dans drdice-logs/

## Exemple

```bash
/skill:generate-ia cells/users
# Output: ✅ 5 fichiers générés avec succès
```
