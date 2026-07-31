"""Étape 1: Git Setup - Crée et checkout la branche feature/cell-{name}."""

import subprocess
from pathlib import Path

from rich.console import Console

console = Console()


def _get_git_branch_name(cell_name: str) -> str:
    """Convertit le nom de cell en nom de branche git."""
    return f"feature/cell-{cell_name.replace('_', '-')}"


def step_1_git_setup(project_dir: Path, cell_name: str) -> str | None:
    """Configure git: crée/checkout la branche.
    
    Args:
        project_dir: Répertoire du projet
        cell_name: Nom de la cell
        
    Returns:
        Nom de la branche créée ou None si git non disponible
    """
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--git-dir"],
            cwd=str(project_dir),
            capture_output=True,
            check=False
        )
        if result.returncode != 0:
            return None

        branch_name = _get_git_branch_name(cell_name)
        
        # Créer la branche si elle n'existe pas
        subprocess.run(
            ["git", "checkout", "-b", branch_name],
            cwd=str(project_dir),
            capture_output=True,
            check=False
        )
        # Checkout la branche
        subprocess.run(
            ["git", "checkout", branch_name],
            cwd=str(project_dir),
            capture_output=True,
            check=False
        )

        return branch_name
    except FileNotFoundError:
        return None
