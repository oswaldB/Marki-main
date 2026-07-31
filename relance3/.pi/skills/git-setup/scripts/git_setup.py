#!/usr/bin/env python3
"""Git Setup - Crée une branche pour une cell."""

import subprocess
import sys
from pathlib import Path


def git_setup(cell_name: str, project_dir: Path = None) -> tuple[bool, str]:
    """Crée une branche git pour la cell.
    
    Returns:
        (success, branch_name or error_message)
    """
    if project_dir is None:
        project_dir = Path.cwd()
    
    # Vérifier si on est dans un repo git
    result = subprocess.run(
        ["git", "rev-parse", "--git-dir"],
        cwd=str(project_dir),
        capture_output=True,
        text=True
    )
    if result.returncode != 0:
        return False, "Pas un repository Git"
    
    # Vérifier la branche courante
    result = subprocess.run(
        ["git", "branch", "--show-current"],
        cwd=str(project_dir),
        capture_output=True,
        text=True
    )
    current_branch = result.stdout.strip()
    
    # Créer la branche dev-{cell_name}
    branch_name = f"dev-{cell_name}"
    
    if current_branch == branch_name:
        return True, branch_name
    
    if current_branch.startswith("dev-") and current_branch != branch_name:
        return False, f"Déjà sur une autre branche dev: {current_branch}"
    
    # Créer et checkout la branche
    subprocess.run(
        ["git", "checkout", "-b", branch_name],
        cwd=str(project_dir),
        capture_output=True
    )
    
    return True, branch_name


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: git_setup.py <cell-name> [project-dir]")
        sys.exit(1)
    
    cell_name = sys.argv[1]
    project_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else Path.cwd()
    
    success, result = git_setup(cell_name, project_dir)
    
    if success:
        print(f"✅ Branche: {result}")
        sys.exit(0)
    else:
        print(f"❌ {result}")
        sys.exit(1)
