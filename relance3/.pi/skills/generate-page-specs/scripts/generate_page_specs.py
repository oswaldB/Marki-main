#!/usr/bin/env python3
"""Generate Page Specs - Crée page-specs.md pour une cell."""

import sqlite3
import sys
from pathlib import Path


def generate_page_specs(cell_path: Path) -> tuple[bool, str]:
    """Génère page-specs.md pour la cell.
    
    Returns:
        (success, message)
    """
    cell_path = Path(cell_path)
    project_dir = cell_path.parent.parent  # cells/{cell} -> remonte 2 niveaux
    specs_dir = cell_path / ".specs"
    specs_file = specs_dir / "page-specs.md"
    
    if not specs_dir.exists():
        return False, f"Dossier .specs non trouvé: {specs_dir}"
    
    # Lire le template (optionnel)
    template_path = (
        project_dir / "dev-tools" / "DrDice" / "drdice" / "templates" / 
        "static-stack" / "squelettes" / "specs" / "page-specs.md"
    )
    template_content = ""
    if template_path.exists():
        template_content = template_path.read_text()
    
    # Collecter le contexte
    context_files = []
    excluded = ["valide.md", "devok.md", "page-specs.md"]
    
    # Fichiers racine .specs/
    for file in specs_dir.iterdir():
        if file.is_file() and file.name not in excluded:
            context_files.append(file.name)
    
    # Sous-dossiers
    for subdir in ["mockups", "wf-frontend", "wf-backend", "data"]:
        subdir_path = specs_dir / subdir
        if subdir_path.exists():
            for file in subdir_path.iterdir():
                if file.is_file():
                    context_files.append(f"{subdir}/{file.name}")
    
    # Récupérer les tables depuis marki.db
    db_path = project_dir / "app" / "api" / "db" / "marki.db"
    tables = []
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        )
        tables = [row[0] for row in cursor.fetchall()]
        conn.close()
    except:
        pass
    
    # Générer le contenu
    tables_list = "\n".join([f"- `{table}`" for table in tables])
    context_str = ", ".join(context_files) if context_files else "Aucun"
    
    specs_content = f"""# Page Specs - {cell_path.name}

> **DOCUMENT DE RÉFÉRENCE PRIORITAIRE**
> 
> Ce fichier définit les règles immuables du projet. 
> **LIT EN PRIORITÉ ABSOLUE avant toute modification de code.**

## Partie 1 : Use Cases (Gherkin)

```gherkin
Feature: {cell_path.name} Page
  En tant qu'utilisateur
  Je veux pouvoir interagir avec la page {cell_path.name}
  Afin de réaliser mes tâches

  Scenario: Chargement initial de la page
    Given je suis sur la page {cell_path.name}
    When la page se charge
    Then les données initiales sont chargées via le workflow "initial-load"
    And l'interface est prête à l'emploi

  Scenario: Interaction utilisateur
    Given je suis sur la page {cell_path.name}
    When je clique sur un bouton d'action
    Then le workflow correspondant est déclenché
    And le workflow appelle l'API Bun.js pour mettre à jour SQLite
```

## Partie 2 : Choix Techniques et Règles du Projet

### Stack Technique
- **Frontend** : Alpine.js 3 + HTML statique
- **Backend** : Bun.js avec API HTTP/WebSocket
- **Database** : SQLite via `bun:sqlite` (côté serveur)
- **Communication** : Workflows frontend appelant l'API HTTP Bun.js
- **Style** : TailwindCSS via CDN

### Règles Absolues (Pas d'Exception)

1. **Passage de paramètres URL** : Utiliser uniquement le hash (`#`)
   - Exemple : `http://dev.markidiags.com/{cell_path.name}#userId=123`
   - Jamais de query params (`?userId=123`)

2. **Appel des Workflows** : Chaque bouton appelle UN workflow
   - Via `runWorkflow('nom-du-workflow')` dans Alpine.js
   - Les workflows sont dans `./workflows/*.js`
   - Les workflows appellent l'API Bun.js via `fetch()` pour lire/écrire dans SQLite

3. **Structure Alpine.js** :
   - Fonction principale dans `main.js` : `{cell_path.name}Page()`
   - Dans `index.html` : `x-data="{cell_path.name}Page()"`
   - Pas de store global, tout est dans la fonction de la page

4. **Data et Persistence** :
   - Toutes les données sont dans SQLite (côté serveur)
   - Les workflows appellent l'API Bun.js pour accéder aux données
   - Pas d'accès direct à SQLite depuis le frontend
   - Les workflows mettent à jour le state Alpine après réponse API

5. **Séparation des Concerns** :
   - `index.html` : structure + Alpine bindings
   - `main.js` : logique Alpine + appel des workflows
   - `workflows/*.js` : logique métier + appels API vers Bun.js/SQLite
   - `api/` côté Bun.js : endpoints REST + requêtes SQL

6. **IDs des Boutons** : Chaque bouton DOIT avoir un ID unique au format `btn-{{{{action}}}}`
   - Exemple : `id="btn-submit"`, `id="btn-cancel"`
   - Jamais d'ID vide ou dupliqué
   - Format obligatoire : commence toujours par `btn-`

7. **Pixel Perfect** : L'implémentation HTML/CSS doit correspondre EXACTEMENT aux mockups
   - Les assets (images,...) sont dans le folder `app/site/assets/`

## Partie 3 : Implémentation

### Workflows Frontend
1. **initial-load** : Appelle l'API pour charger les données
2. **create** : Appelle POST /api/... pour créer
3. **update** : Appelle PUT /api/... pour modifier  
4. **delete** : Appelle DELETE /api/... pour supprimer

### Navigation
- Paramètres via hash : `location.hash`
- Lecture : `new URLSearchParams(location.hash.slice(1))`

## Partie 4 : Data Mapping

### Tables utilisées depuis marki.db
{tables_list}

### Flux de données
```
SQLite (marki.db)
    ↑ ↓
Bun.js API (localhost:3001)
    ↑ ↓
Caddy (dev.markidiags.com/api/*)
    ↑ ↓
fetch('/api/...') dans workflows
    ↑ ↓
Alpine.js State (réactif)
    ↑ ↓
Composant UI (HTML/Tailwind)
```

### Contexte analysé
Fichiers trouvés: {context_str}
"""
    
    specs_file.write_text(specs_content)
    return True, f"page-specs.md généré ({len(tables)} tables, {len(context_files)} fichiers contexte)"


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: generate_page_specs.py <cell-path>")
        sys.exit(1)
    
    cell_path = Path(sys.argv[1])
    
    success, msg = generate_page_specs(cell_path)
    
    if success:
        print(f"✅ {msg}")
        sys.exit(0)
    else:
        print(f"❌ {msg}")
        sys.exit(1)
