---
name: post-gen-tests
description: Tests Post-Génération - Vérifie que le code généré par IA est valide. Teste fichiers, boutons, Alpine.data, workflows, look & feel.
---

# Post Gen Tests Skill

Vérifie que le code généré par IA est valide.

## Usage

```bash
/skill:post-gen-tests <cell-path>
```

## Arguments

- `cell-path` (requis) : Chemin vers le dossier de la cell

## Actions effectuées

1. Vérifie que les fichiers existent et ne sont pas vides
2. Vérifie les boutons (ID btn-*, @click runWorkflow)
3. Vérifie Alpine.data dans main.js
4. Vérifie les workflows ont export async function execute
5. Compare avec les mockups

## Exemple

```bash
/skill:post-gen-tests cells/users
# Output: ✅ Tests post-génération passés
```
