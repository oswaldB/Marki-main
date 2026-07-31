---
name: check-mockup-similarity
description: Vérifie que index.html correspond au mockup. Compare la structure DOM, classes Tailwind et IDs. Régénère automatiquement si similarité < 90%.
---

# Check Mockup Similarity Skill

Compare index.html avec le mockup et régénère si nécessaire.

## Usage

```bash
/skill:check-mockup-similarity <cell-path> [--auto]
```

## Arguments

- `cell-path` (requis) : Chemin vers le dossier de la cell
- `--auto` (optionnel) : Mode automatique sans confirmation

## Actions effectuées

1. Trouve le fichier mockup dans .specs/mockups/
2. Compare structure DOM, classes Tailwind, IDs
3. Si similarité < 90%, génère un prompt de correction
4. Exécute pi -p pour corriger index.html
5. Re-vérifie la similarité

## Exemple

```bash
/skill:check-mockup-similarity cells/users --auto
# Output: ✅ Similarité: 94.5% (OK)
```
