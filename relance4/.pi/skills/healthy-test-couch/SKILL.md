---
name: healthy-test-couch
description: Teste que tous les services sont UP en appelant le script test-healthy.py. Vérifie Caddy, Bun.js et les routes API.
---

# Healthy Test Couch Skill

Teste que tous les services sont UP.

## Usage

```bash
/skill:healthy-test-couch [project-dir]
```

## Actions effectuées

1. Exécute le script test-healthy.py
2. Parse les résultats JSON
3. Affiche le statut de chaque service

## Exemple

```bash
/skill:healthy-test-couch
# Output: ✅ Tous les services sont UP
```
