---
name: clean-cell
description: Nettoie la cell en supprimant tout sauf .specs/. Préserve les spécifications et supprime les anciennes implémentations.
---

# Clean Cell Skill

Nettoie la cell avant génération.

## Usage

```bash
/skill:clean-cell <cell-path>
```

## Arguments

- `cell-path` (requis) : Chemin vers le dossier de la cell

## Actions effectuées

1. Sauvegarde .specs/
2. Supprime tous les autres fichiers/dossiers
3. Restaure .specs/

## Exemple

```bash
/skill:clean-cell cells/users
# Output: ✅ Cell nettoyée (3 élément(s) supprimé(s))
```
