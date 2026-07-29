"""Étape 11: Commit Git - Versionne les changements."""

import subprocess
from pathlib import Path

from rich.console import Console

console = Console()


def step_14_commit_git(cell_path: Path, cell_name: str, skip_git: bool = False) -> tuple[bool, str]:
    """Crée un commit git avec les changements de la cell.
    
    Args:
        cell_path: Chemin de la cell
        cell_name: Nom de la cell
        skip_git: Si True, ne fait pas le commit
        
    Returns:
        Tuple (ok, hash du commit ou message)
    """
    if skip_git:
        console.print("  [dim]ℹ Skip git (option --skip-git)")
        return True, "skipped"
    
    console.print("[blue]📦 Étape 11: Commit Git...")
    
    try:
        # Vérifier que git est initialisé
        result = subprocess.run(
            ["git", "rev-parse", "--git-dir"],
            cwd=cell_path,
            capture_output=True,
            text=True
        )
        if result.returncode != 0:
            console.print("  [yellow]⚠ Pas de repo git dans la cell")
            # Essayer dans le projet parent
            result = subprocess.run(
                ["git", "rev-parse", "--git-dir"],
                cwd=cell_path.parent.parent.parent,
                capture_output=True,
                text=True
            )
            if result.returncode != 0:
                console.print("  [red]✗ Aucun repo git trouvé")
                return False, "no git"
            git_root = cell_path.parent.parent.parent
        else:
            git_root = cell_path
        
        # git add
        result = subprocess.run(
            ["git", "add", "."],
            cwd=git_root,
            capture_output=True,
            text=True
        )
        if result.returncode != 0:
            console.print(f"  [red]✗ git add échoué: {result.stderr}")
            return False, "add failed"
        
        # Vérifier s'il y a des changements à commiter
        result = subprocess.run(
            ["git", "diff", "--cached", "--quiet"],
            cwd=git_root,
            capture_output=True
        )
        if result.returncode == 0:
            console.print("  [yellow]⚠ Pas de changements à commiter")
            return True, "no changes"
        
        # git commit
        commit_msg = f"feat({cell_name}): implémentation cell dev3"
        result = subprocess.run(
            ["git", "commit", "-m", commit_msg],
            cwd=git_root,
            capture_output=True,
            text=True
        )
        if result.returncode != 0:
            console.print(f"  [red]✗ git commit échoué: {result.stderr}")
            return False, "commit failed"
        
        # Récupérer le hash du commit
        result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=git_root,
            capture_output=True,
            text=True
        )
        commit_hash = result.stdout.strip() if result.returncode == 0 else "unknown"
        
        console.print(f"  [green]✓ Commit créé: {commit_hash}")
        
        # git push (optionnel, si remote configuré)
        result = subprocess.run(
            ["git", "remote"],
            cwd=git_root,
            capture_output=True,
            text=True
        )
        if result.stdout.strip():
            console.print("  [dim]→ Push vers origin...")
            result = subprocess.run(
                ["git", "push", "origin"],
                cwd=git_root,
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                console.print("  [green]✓ Push réussi")
            else:
                console.print(f"  [yellow]⚠ Push échoué: {result.stderr}")
        
        return True, commit_hash
        
    except Exception as e:
        console.print(f"  [red]✗ Erreur git: {e}")
        return False, str(e)
