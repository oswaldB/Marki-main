#!/usr/bin/env python3
"""Commande build - Construit la structure /app/ organisée par type de cell."""

import re
import sys
from pathlib import Path

import click
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn

from ..core.cell import Cell, CellType
from ..core.project import Project

console = Console()

ALPINEJS_TEMPLATE = '''<!-- templates/{{{{ cell_name }}}}/alpinejs.html -->
<script>
    // Logger global
    const log = {{
        debug: (event, data) => console.log(`[DEBUG][${{event}}]`, JSON.stringify(data)),
        info: (event, data) => console.log(`[INFO][${{event}}]`, JSON.stringify(data)),
        warn: (event, data) => console.warn(`[WARN][${{event}}]`, JSON.stringify(data)),
        error: (event, data) => console.error(`[ERROR][${{event}}]`, JSON.stringify(data))
    }};

    document.addEventListener("alpine:init", () => {{
        Alpine.data("{{{{ cell_name }}}}", () => ({{
            // =====================================================
            // 1. PROPS RÉACTIVES - À PERSONNALISER SELON LA CELL
            // =====================================================

            // UI State (conserver ces 3)
            loading: false,
            saving: false,
            error: null,

            // Data - REMPLACER PAR VOS DONNÉES MÉTIER
            data: [],
            selected: null,

            // Helpers
            formatDate(dateStr) {{
                if (!dateStr) return "-";
                return new Date(dateStr).toLocaleDateString("fr-FR");
            }},

            // =====================================================
            // 2. INIT (depuis workflow-init.html)
            // =====================================================
            {{% include "{{{{ cell_name }}}}/workflows/workflow-init.html" %}}},

            // =====================================================
            // 3. WORKFLOWS MÉTIER
            // =====================================================

        }}));
    }});
</script>'''


@click.command()
@click.option(
    "--project-dir",
    type=click.Path(exists=True, file_okay=False),
    help="Chemin du projet",
)
@click.option(
    "--listing",
    type=click.Path(exists=True, dir_okay=False),
    help="Chemin vers cells-listing.md",
)
def build(project_dir: str | None, listing: str | None) -> int:
    """Construit la structure /app/ depuis cells-listing.md."""
    
    # Détecter le répertoire projet
    if project_dir is None:
        project_dir = Path.cwd()
    else:
        project_dir = Path(project_dir)
    
    if listing is None:
        listing = project_dir / "specs-global" / "cells-listing.md"
    
    listing = Path(listing)
    
    if not listing.exists():
        console.print(f"[red]❌ {listing} n'existe pas[/red]")
        console.print("[yellow]Exécutez d'abord: drdice-generate[/yellow]")
        return 1
    
    console.print(Panel.fit("Construction de la structure /app/", style="blue"))
    
    project = Project(project_dir)
    project.ensure_base_structure()
    
    # Parser les cells
    cells = project.parse_cells_listing()
    
    if not cells:
        console.print("[red]❌ Aucune cell trouvée dans le listing[/red]")
        return 1
    
    console.print(f"[green]ℹ️  {len(cells)} cells à créer[/green]")
    
    # Créer la structure pour chaque cell
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        
        task = progress.add_task("Création des cells...", total=len(cells))
        
        for i, cell in enumerate(cells, 1):
            progress.update(
                task,
                description=f"[{i}/{len(cells)}] {cell.name} ({cell.cell_type.value})"
            )
            _create_cell_structure(cell)
            progress.advance(task)
    
    # Résumé
    console.print()
    console.print("[green]✅ Structure /app/ construite avec succès[/green]")
    console.print()
    
    # Compter
    screens = list(project.screens_dir.iterdir()) if project.screens_dir.exists() else []
    backend_wf = list(project.backend_wf_dir.iterdir()) if project.backend_wf_dir.exists() else []
    cron = list(project.cron_dir.iterdir()) if project.cron_dir.exists() else []
    
    console.print(f"  📁 Screens créés: {len([s for s in screens if s.is_dir()])}")
    console.print(f"  📁 Backend-wf créés: {len([s for s in backend_wf if s.is_dir()])}")
    console.print(f"  📁 Cron créés: {len([s for s in cron if s.is_dir()])}")
    console.print()
    console.print("Structure:")
    console.print("  /app/screens/        → Cells de type écran")
    console.print("  /app/backend_wf/     → Cells de type workflow backend")
    console.print("  /app/cron/           → Cells de type cron")
    console.print()
    console.print("[cyan]Prochaines étapes:[/cyan]")
    console.print("  drdice-init")
    
    return 0


def _create_cell_structure(cell: Cell) -> None:
    """Crée la structure complète d'une cell."""
    
    cell.ensure_structure()
    
    # Fichiers communs
    (cell.path / "__init__.py").touch()
    (cell.path / "routes" / "__init__.py").touch()
    (cell.path / "models" / "__init__.py").touch()
    
    # Copier rules.md et schema.sql depuis les sources globales
    _copy_global_files(cell)
    
    # Créer le fichier workflow-init.md
    (cell.specs_path / "wf-backend" / "workflow-init.md").touch()
    
    # Structure spécifique selon le type
    if cell.cell_type == CellType.ECRAN:
        _create_screen_structure(cell)
    elif cell.cell_type == CellType.WORKFLOW_BACKEND:
        _create_backend_wf_structure(cell)
    elif cell.cell_type == CellType.CRON:
        _create_cron_structure(cell)


def _copy_global_files(cell: Cell) -> None:
    """Copie les fichiers globaux dans la cell."""
    project = Project(cell.project_root)
    
    # rules.md
    rules_src = project.root / "rules" / "rules.md"
    rules_dst = cell.specs_path / "LIRE_EN_PREMIER" / "rules.md"
    if rules_src.exists():
        rules_dst.write_text(rules_src.read_text(), encoding="utf-8")
    else:
        rules_dst.touch()
    
    # schema.sql
    schema_src = project.specs_global / "schema.sql"
    schema_dst = cell.specs_path / "LIRE_EN_PREMIER" / "schema.sql"
    if schema_src.exists():
        schema_dst.write_text(schema_src.read_text(), encoding="utf-8")
    else:
        schema_dst.touch()


def _create_screen_structure(cell: Cell) -> None:
    """Crée la structure spécifique aux écrans."""
    # Fichiers templates
    (cell.path / "templates" / "index.html").touch()
    
    # alpinejs.html avec contenu
    alpine_path = cell.path / "templates" / "alpinejs.html"
    alpine_content = ALPINEJS_TEMPLATE.replace("{{{{ cell_name }}}}", cell.name)
    alpine_path.write_text(alpine_content, encoding="utf-8")
    
    # Workflow init
    (cell.path / "templates" / "workflows" / "workflow-init.html").touch()
    
    # Specs
    (cell.specs_path / "mockups" / "etat-normal.html").touch()
    (cell.specs_path / "wf-frontend" / "workflow-init.md").touch()
    
    # Routes
    (cell.path / "routes" / "index.py").touch()
    (cell.path / "routes" / "api_data.py").touch()


def _create_backend_wf_structure(cell: Cell) -> None:
    """Crée la structure spécifique aux workflows backend."""
    (cell.path / "routes" / f"wf_{cell.name}.py").touch()


def _create_cron_structure(cell: Cell) -> None:
    """Crée la structure spécifique aux cron."""
    (cell.path / "cron.py").touch()
    (cell.path / "routes" / "api_trigger.py").touch()


def main():
    """Point d'entrée."""
    return build()


if __name__ == "__main__":
    sys.exit(main())
