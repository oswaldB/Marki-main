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
            console.print("  [dim]→ Étape 4: Data Mapping")
            ok, msg = run_data_mapping_bun(project_dir, cell_path)
            if ok:
                console.print(f"  [green]✅ {msg}")
            else:
                return 1
            step = 5
            
        else:
            break
    
    return 0


if __name__ == "__main__":
    dev3()
