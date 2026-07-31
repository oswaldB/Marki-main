#!/usr/bin/env python3
"""Git Setup Couch - Crée une branche feature/cell-{name}."""

import subprocess
import sys
from pathlib import Path


def _get_git_branch_name(cell_name: str) -> str:
    """Convertit le nom de cell en nom de branche git."""
    return f"feature/cell-{cell_name.replace('_', '-')}"


def git_setup_couch(cell_name: str, project_dir: Path = None) -> tuple[bool, str]:
    """Configure git: crée/checkout la branche.
    
    Returns:
        (success, branch_name or error_message)
    """
    if project_dir is None:
        project_dir = Path.cwd()
    
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--git-dir"],
            cwd=str(project_dir),
            capture_output=True,
            check=False
        )
        if result.returncode != 0:
            return False, "Pas un repository Git"

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

        return True, branch_name
    except FileNotFoundError:
        return False, "Git non disponible"


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: git_setup_couch.py <cell-name> [project-dir]")
        sys.exit(1)
    
    cell_name = sys.argv[1]
    project_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else Path.cwd()
    
    success, result = git_setup_couch(cell_name, project_dir)
    
    if success:
        print(f"✅ Branche: {result}")
        sys.exit(0)
    else:
        print(f"❌ {result}")
        sys.exit(1)
