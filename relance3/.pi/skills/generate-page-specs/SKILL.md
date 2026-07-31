---
name: generate-page-specs
description: Génère le fichier page-specs.md pour une cell. Analyse le contexte (fichiers .specs, tables marki.db) et produit le document de référence prioritaire pour le développement.
---

# Generate Page Specs Skill

Génère le fichier `page-specs.md` dans `.specs/` d'une cell.

## Usage

```bash
# Via la commande skill
/skill:generate-page-specs <cell-path>

# Ou directement via le script
python3 .pi/skills/generate-page-specs/scripts/generate_page_specs.py <cell-path>
```

## Arguments

- `cell-path` (requis) : Chemin vers le dossier de la cell

## Analyse effectuée

1. Lit les fichiers dans `.specs/` (sauf valide.md, devok.md, page-specs.md)
2. Explore les sous-dossiers mockups/, wf-frontend/, wf-backend/, data/
3. Liste les tables depuis marki.db

## Fichier généré

- `{cell}/.specs/page-specs.md` avec:
  - Partie 1: Use Cases (Gherkin)
  - Partie 2: Choix Techniques (Stack Bun.js + SQLite)
  - Partie 3: Workflows Frontend
  - Partie 4: Data Mapping (tables utilisées)
  - Contexte analysé (fichiers trouvés)

## Résultat

- Retourne `(True, "page-specs.md généré (X tables, Y fichiers)")` si succès
- Retourne `(False, "message")` si erreur

## Exemple

```bash
/skill:generate-page-specs cells/users
# Output: ✅ page-specs.md généré (5 tables, 8 fichiers contexte)
```
