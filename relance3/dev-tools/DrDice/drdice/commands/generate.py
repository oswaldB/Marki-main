#!/usr/bin/env python3
"""Commande generate - Génère cells-listing.md depuis app-map.md"""

import subprocess
import sys
from pathlib import Path

import click
from rich.console import Console
from rich.panel import Panel

console = Console()

CELLS_MVC_STRUCTURE = """
STRUCTURE D'UNE CELL ÉCRAN (à reproduire exactement):
## Cell: <nom_snake_case>
- **Type**: ecran
- **Description**: <description>
- **Structure**:
```
app/<nom_cell>/
├── __init__.py
├── routes/
│   ├── __init__.py
│   ├── index.py
│   ├── api_data.py
│   └── wf_<workflow>.py
├── models/
│   ├── __init__.py
│   ├── <modele1>.py
│   └── <modele2>.py
├── templates/
│   ├── index.html
│   ├── alpinejs.html
│   └── workflows/
│       └── workflow-init.html
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       ├── frontend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
│   │   └── rules.md
    ├── mockups/
    │   └── etat-normal.html
    ├── wf-frontend/
    │   └── workflow-init.md
    ├── wf-backend/
    │   └── sync-missions.md
    ├── models/
    │   └── <modele1>.md
    └── routes/
        └── index.md
```

STRUCTURE D'UNE CELL WORKFLOW BACKEND (wf-bg):
## Cell: <nom_snake_case>
- **Type**: wf-bg
- **Description**: <description>
- **Structure**:
```
app/<nom_cell>/
├── __init__.py
├── routes/
│   ├── __init__.py
│   └── wf_<workflow>.py
├── models/
│   ├── __init__.py
│   ├── <modele1>.py
│   └── <modele2>.py
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── wf-backend/
    │   └── sync-missions.md
    ├── models/
    │   └── <modele1>.md
    └── routes/
        └── wf_<workflow>.md
```

STRUCTURE D'UNE CELL CRON:
## Cell: <nom_snake_case>
- **Type**: cron
- **Description**: <description>
- **Structure**:
```
app/<nom_cell>/
├── __init__.py
├── routes/
│   ├── __init__.py
│   └── api_trigger.py
├── models/
│   ├── __init__.py
│   └── <modele1>.py
├── cron.py
├── logs/
│   └── <timestamp>/
│       ├── backend.log
│       └── report.json
└── specs/
    ├── valide.md
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    ├── wf-backend/
    │   └── cleanup-process.md
    ├── models/
    │   └── <modele1>.md
    └── routes/
        └── api_trigger.md
```
"""


@click.command()
@click.option(
    "--project-dir",
    type=click.Path(exists=True, file_okay=False),
    help="Chemin du projet",
)
@click.option(
    "--app-map",
    type=click.Path(exists=True, dir_okay=False),
    help="Chemin vers app-map.md",
)
@click.option(
    "--output",
    type=click.Path(dir_okay=False),
    help="Chemin de sortie (défaut: specs-global/cells-listing.md)",
)
def generate(project_dir: str | None, app_map: str | None, output: str | None) -> int:
    """Génère cells-listing.md depuis app-map.md via pi -p."""
    
    # Détecter le répertoire projet
    if project_dir is None:
        project_dir = Path.cwd()
        # Chercher specs-global pour confirmer
        if not (project_dir / "specs-global").exists():
            console.print("[red]❌ Pas de specs-global trouvé. Utilisez --project-dir[/red]")
            return 1
    else:
        project_dir = Path(project_dir)
    
    # Définir les chemins
    if app_map is None:
        app_map = project_dir / "specs-global" / "app-map.md"
    
    if output is None:
        output = project_dir / "specs-global" / "cells-listing.md"
    
    app_map = Path(app_map)
    output = Path(output)
    
    if not app_map.exists():
        console.print(f"[red]❌ {app_map} n'existe pas[/red]")
        return 1
    
    console.print(Panel.fit("Génération du cells listing avec pi -p", style="blue"))
    
    # Lire le contenu
    content = app_map.read_text(encoding="utf-8")
    
    # Construire le prompt
    prompt = f"""Tu dois générer un fichier Markdown strict selon l'architecture Cell-Based MVC.

{CELLS_MVC_STRUCTURE}

RÈGLES:
1. Commencer par "# Cells Listing"
2. Chaque cell commence par "## Cell: " + nom_snake_case
3. PAS de section Dépendances
4. Les écrans ont: routes/, models/, templates/, logs/, specs/
5. Les wf-bg ont: routes/, models/, logs/, specs/ (PAS de templates/)
6. Les cron ont: routes/, models/, cron.py, logs/, specs/

Document source:
{content}

Génère UNIQUEMENT le contenu du fichier, ligne 1 = "# Cells Listing":"""
    
    # Exécution avec pi -p
    console.print("[blue]ℹ️  Appel à pi -p...[/blue]")
    try:
        result = subprocess.run(
            ["pi", "-p", prompt],
            capture_output=True,
            text=True,
            timeout=120,
        )
        
        if result.returncode != 0:
            console.print(f"[red]❌ Erreur pi: {result.stderr}[/red]")
            return 1
        
        output_text = result.stdout
        
    except subprocess.TimeoutExpired:
        console.print("[red]❌ Timeout lors de l'appel à pi[/red]")
        return 1
    except FileNotFoundError:
        console.print("[red]❌ Commande 'pi' non trouvée[/red]")
        return 1
    
    # Nettoyer: garder uniquement à partir de "# Cells Listing"
    lines = output_text.split("\n")
    start_idx = 0
    for i, line in enumerate(lines):
        if line.strip().startswith("# Cells Listing"):
            start_idx = i
            break
    
    cleaned_text = "\n".join(lines[start_idx:])
    
    # Écrire le fichier
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(cleaned_text, encoding="utf-8")
    
    # Compter les cells
    cell_count = sum(1 for line in cleaned_text.split("\n") if line.startswith("## Cell:"))
    
    console.print(f"[green]✅ Cells listing généré: {output}[/green]")
    console.print(f"[green]ℹ️  {cell_count} cells identifiées[/green]")
    console.print()
    console.print("[cyan]Prochaine étape:[/cyan]")
    console.print("  drdice-build  # ou python -m drdice.commands.build")
    
    return 0


def main():
    """Point d'entrée pour le script."""
    return generate()


if __name__ == "__main__":
    sys.exit(main())
