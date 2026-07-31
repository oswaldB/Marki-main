---
name: data-mapping
description: Génère schema.sql et types TypeScript depuis marki.db. Extrait le schéma SQLite et crée les types TypeScript pour l'API Bun.js.
---

# Data Mapping Skill

Génère les fichiers de schéma et types depuis la base SQLite marki.db.

## Usage

```bash
# Via la commande skill
/skill:data-mapping [project-dir]

# Ou directement via le script
python3 .pi/skills/data-mapping/scripts/data_mapping.py [project-dir]
```

## Arguments

- `project-dir` (optionnel) : Chemin du projet (défaut: cwd)

## Fichiers générés

- `app/api/db/schema.sql` - Schéma SQL complet
- `app/api/db/index.ts` - Types TypeScript + helper getDB()

## Actions effectuées

1. Copie marki.db vers app/api/db/ si nécessaire
2. Extrait les tables et colonnes via PRAGMA
3. Génère schema.sql avec CREATE TABLE
4. Génère index.ts avec interfaces TypeScript

## Résultat

- Retourne `(True, "Schéma généré: X tables")` si succès
- Retourne `(False, "message")` si erreur

## Exemple

```bash
/skill:data-mapping
# Output: ✅ Schéma généré: 12 tables
```
