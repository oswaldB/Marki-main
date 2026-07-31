---
name: skeleton-tests
description: Vérifie que les squelettes générés sont valides. Teste la présence des marqueurs, des fonctions execute, et Alpine.data.
---

# Skeleton Tests Skill

Vérifie que les squelettes répondent correctement.

## Usage

```bash
/skill:skeleton-tests <cell-path>
```

## Arguments

- `cell-path` (requis) : Chemin vers le dossier de la cell

## Actions effectuées

1. Vérifie index.html contient le marqueur
2. Vérifie main.js contient Alpine.data
3. Vérifie chaque workflow a export async function execute

## Exemple

```bash
/skill:skeleton-tests cells/users
# Output: ✅ Tous les squelettes sont valides
```
