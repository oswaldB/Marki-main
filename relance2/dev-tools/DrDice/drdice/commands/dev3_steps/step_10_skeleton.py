"""Étape 10: Skeleton Tests - Vérifie que les squelettes répondent correctement."""

import subprocess
from pathlib import Path

from rich.console import Console

console = Console()


def step_10_skeleton_tests(cell_path: Path, cell_name: str, cell_type: str, workflows: list) -> tuple[bool, list[str]]:
    """Teste les squelettes générés.
    
    Args:
        cell_path: Chemin de la cell
        cell_name: Nom de la cell
        cell_type: Type de cell (frontend/backend)
        workflows: Liste des workflows
        
    Returns:
        Tuple (ok, liste des erreurs)
    """
    console.print("[blue]🧪 Tests des squelettes...")
    
    errors = []
    
    if cell_type == "frontend":
        # Test index.html - vérifie la présence du marqueur de squelette
        index_path = cell_path / "index.html"
        if not index_path.exists():
            errors.append("index.html manquant")
        else:
            content = index_path.read_text(encoding="utf-8")
            # Vérifie le pattern "{cell_name} - pret pour dev" ou juste "pret pour dev"
            if f"{cell_name} - pret pour dev" in content or "pret pour dev" in content:
                console.print("  [green]✓ index.html squelette valide")
            else:
                errors.append("index.html ne contient pas le marqueur 'pret pour dev'")
        
        # Test main.js
        main_path = cell_path / "main.js"
        if not main_path.exists():
            errors.append("main.js manquant")
        else:
            content = main_path.read_text(encoding="utf-8")
            if "Alpine.data" in content:
                console.print("  [green]✓ main.js contient Alpine.data")
            else:
                errors.append("main.js: Alpine.data non trouvé")
        
        # Test workflows
        workflows_dir = cell_path / "workflows"
        for wf in workflows:
            wf_path = workflows_dir / f"{wf}.js"
            if not wf_path.exists():
                errors.append(f"Workflow manquant: {wf}.js")
            else:
                content = wf_path.read_text(encoding="utf-8")
                if "export async function execute" in content:
                    console.print(f"  [green]✓ {wf}.js squelette valide")
                else:
                    errors.append(f"{wf}.js: fonction execute manquante")
    
    else:  # backend
        index_path = cell_path / "index.js"
        if not index_path.exists():
            errors.append("index.js manquant")
        else:
            console.print("  [green]✓ index.js squelette valide")
    
    if errors:
        console.print(f"[red]❌ {len(errors)} erreur(s) dans les squelettes")
        return False, errors
    
    console.print("[green]✅ Tous les squelettes sont valides")
    return True, []
