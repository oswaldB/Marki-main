#!/usr/bin/env python3
"""Commande dev3 - Développe les cells avec Bun.js + SQLite (mode automatique)."""

import subprocess
import sys
from pathlib import Path

import click
from rich.console import Console
from rich.panel import Panel

console = Console()


@click.command()
@click.option("--project-dir", type=click.Path(exists=True, file_okay=False), help="Chemin du projet")
@click.option("--cell", "cell_name", help="Développer une cell spécifique")
@click.option("--step", type=int, default=1, help="Démarrer à une étape spécifique")
def dev3(project_dir, cell_name, step):
    """Étapes 1-4: Développement automatique avec Bun.js + SQLite."""
    
    if project_dir is None:
        project_dir = Path.cwd()
    else:
        project_dir = Path(project_dir)
    
    # Trouver les cells
    cells_to_dev = find_cells(project_dir, cell_name)
    
    if not cells_to_dev:
        console.print(Panel.fit("Aucune cell à développer", style="yellow"))
        return 0
    
    console.print(Panel.fit(f"🚀 dev3 (Bun.js + SQLite) - {len(cells_to_dev)} cell(s)", style="bold blue"))
    
    # Exécution automatique
    total = len(cells_to_dev)
    
    for i, cell_path in enumerate(cells_to_dev, 1):
        console.print(f"\n[cyan]📦 [{i}/{total}] {cell_path.name}")
        
        result = run_steps_auto(project_dir, cell_path, step)
        if result != 0:
            return result
    
    console.print(Panel.fit("🎉 Toutes les étapes sont terminées!", style="green"))
    return 0


def find_cells(project_dir, cell_name):
    """Trouve les cells à développer."""
    cells = []
    
    if cell_name:
        for path in project_dir.rglob(".specs"):
            if path.parent.name == cell_name:
                valide_md = path / "valide.md"
                devok_md = path / "devok.md"
                if valide_md.exists() and not devok_md.exists():
                    cells.append(path.parent)
                    break
    else:
        for path in project_dir.rglob(".specs"):
            if path.parent.name == "healthy":
                continue
            valide_md = path / "valide.md"
            devok_md = path / "devok.md"
            if valide_md.exists() and not devok_md.exists():
                cells.append(path.parent)
    
    return cells


def run_steps_auto(project_dir, cell_path, start_step):
    """Exécute les étapes automatiquement."""
    
    from .dev3_steps import (
        step_1_git_setup,
        step_2_verify_structure,
    )
    
    step = start_step
    
    while True:
        if step == 1:
            console.print("  [dim]→ Étape 1: Git Setup")
            branch_name = step_1_git_setup(project_dir, cell_path.name)
            if branch_name:
                console.print(f"  [green]✅ Branche: {branch_name}")
            else:
                return 1
            step = 2
            
        elif step == 2:
            console.print("  [dim]→ Étape 2: Vérification Structure")
            ok, _ = step_2_verify_structure(project_dir)
            if ok:
                console.print("  [green]✅ Structure OK")
            else:
                return 1
            step = 3
            
        elif step == 3:
            console.print("  [dim]→ Étape 3: Healthy Test")
            ok, _ = run_healthy_test_bun(project_dir)
            if ok:
                console.print("  [green]✅ Services OK")
            else:
                return 1
            step = 4
            
        elif step == 4:
            console.print("  [dim]→ Étape 4: Data Mapping (Schéma + Types)")
            ok, msg = run_data_mapping_bun(project_dir, cell_path)
            if ok:
                console.print(f"  [green]✅ {msg}")
            else:
                console.print(f"  [red]❌ {msg}")
                return 1
            step = 5
            
        elif step == 5:
            console.print("  [dim]→ Étape 5: Génération page-specs.md")
            ok, msg = run_generate_page_specs(project_dir, cell_path)
            if ok:
                console.print(f"  [green]✅ {msg}")
            else:
                console.print(f"  [yellow]⚠️ {msg}")
            step = 6
            
        else:
            break
    
    return 0


def run_healthy_test_bun(project_dir):
    """Test: Bun.js + Caddy + HTTP."""
    import urllib.request
    import time
    
    console.print("    [dim]→ Vérification Bun.js...")
    result = subprocess.run(["which", "bun"], capture_output=True, text=True)
    if result.returncode != 0:
        return False, "Bun.js non installé"
    
    console.print("    [dim]→ Rechargement Caddy...")
    subprocess.run(["sudo", "systemctl", "reload", "caddy"], capture_output=True)
    time.sleep(1)
    
    console.print("    [dim]→ Démarrage API Bun.js...")
    api_dir = project_dir / "app" / "api"
    result = subprocess.run(["pgrep", "-f", "bun.*app/api/index.ts"], capture_output=True)
    if result.returncode != 0:
        if not (api_dir / "node_modules").exists():
            subprocess.run(["bun", "install"], cwd=str(api_dir), capture_output=True)
        subprocess.Popen(["bun", "run", "dev"], cwd=str(api_dir), 
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, 
                        start_new_session=True)
        time.sleep(3)
    
    try:
        req = urllib.request.Request("http://localhost:3001/api/health")
        response = urllib.request.urlopen(req, timeout=5)
        return True, "OK"
    except Exception as e:
        return False, str(e)


def run_data_mapping_bun(project_dir, cell_path):
    """Génère schema.sql et types depuis marki.db."""
    import sqlite3
    
    api_dir = project_dir / "app" / "api"
    db_path = api_dir / "db" / "marki.db"
    
    if not db_path.exists():
        root_db = project_dir / "marki.db"
        if root_db.exists():
            import shutil
            shutil.copy2(root_db, db_path)
            console.print(f"    [green]✅ marki.db copié")
        else:
            return False, "marki.db non trouvé"
    
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        tables = [row[0] for row in cursor.fetchall()]
        
        # Générer schema.sql
        schema_sql = "-- Schéma généré depuis marki.db\n\n"
        for table in tables:
            cursor.execute(f"PRAGMA table_info({table})")
            columns = cursor.fetchall()
            
            schema_sql += f"CREATE TABLE IF NOT EXISTS {table} (\n"
            col_defs = []
            for col in columns:
                cid, name, type_, notnull, dflt_value, pk = col
                col_def = f"    {name} {type_}"
                if pk: col_def += " PRIMARY KEY"
                if notnull: col_def += " NOT NULL"
                col_defs.append(col_def)
            schema_sql += ",\n".join(col_defs)
            schema_sql += "\n);\n\n"
        
        (api_dir / "db" / "schema.sql").write_text(schema_sql)
        
        # Générer types TypeScript
        ts_types = "// Types générés depuis marki.db\n\n"
        ts_types += "import { Database } from 'bun:sqlite';\n\n"
        ts_types += "let db: Database | null = null;\n\n"
        ts_types += "export function getDB(): Database {\n"
        ts_types += "  if (!db) { db = new Database('" + str(db_path) + "'); }\n"
        ts_types += "  return db;\n}\n\n"
        
        for table in tables:
            cursor.execute(f"PRAGMA table_info({table})")
            columns = cursor.fetchall()
            interface_name = table.replace('_', ' ').title().replace(' ', '')
            ts_types += f"export interface {interface_name} {{\n"
            for col in columns:
                cid, name, type_, notnull, dflt_value, pk = col
                ts_type = "number" if "INTEGER" in type_ or "REAL" in type_ else "string"
                optional = "" if notnull or pk else "?"
                ts_types += f"  {name}{optional}: {ts_type};\n"
            ts_types += "}\n\n"
        
        (api_dir / "db" / "index.ts").write_text(ts_types)
        
        conn.close()
        return True, f"Schéma généré: {len(tables)} tables"
        
    except Exception as e:
        return False, str(e)


def run_generate_page_specs(project_dir, cell_path):
    """Étape 5: Génère page-specs.md avec analyse du contexte."""
    import sqlite3
    
    specs_dir = cell_path / ".specs"
    specs_file = specs_dir / "page-specs.md"
    
    # Lire le template de base
    template_path = project_dir / "dev-tools" / "DrDice" / "drdice" / "templates" / "static-stack" / "squelettes" / "specs" / "page-specs.md"
    template_content = ""
    if template_path.exists():
        template_content = template_path.read_text()
    
    # Collecter le contexte de la cell
    context_files = []
    
    # Lire tous les fichiers dans .specs/ (sauf exclus)
    excluded = ["valide.md", "devok.md", "page-specs.md"]
    if specs_dir.exists():
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
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        tables = [row[0] for row in cursor.fetchall()]
        conn.close()
    except:
        pass
    
    # Générer page-specs.md au format template mais avec valeurs Bun.js
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

6. **IDs des Boutons** : Chaque bouton DOIT avoir un ID unique au format `btn-{{action}}`
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
"""
    
    for table in tables:
        specs_content += f"- `{table}`\n"
    
    specs_content += f"""
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
Fichiers trouvés: {', '.join(context_files) if context_files else 'Aucun'}
"""
    
    specs_file.write_text(specs_content)
    return True, f"page-specs.md généré ({len(tables)} tables, {len(context_files)} fichiers contexte)"
