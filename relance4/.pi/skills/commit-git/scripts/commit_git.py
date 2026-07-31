#!/usr/bin/env python3
"""Commit Git - Versionne les changements."""

import subprocess
import sys
from pathlib import Path


def commit_git(cell_name: str, project_dir: Path = None, skip_git: bool = False) -> tuple[bool, str]:
    """Crée un commit git avec les changements."""
    if skip_git:
        print("  ℹ Skip git")
        return True, "skipped"
    
    if project_dir is None:
        project_dir = Path.cwd()
    else:
        project_dir = Path(project_dir)
    
    print("📦 Commit Git...")
    
    try:
        # Trouver le git root
        result = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            cwd=str(project_dir),
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            print("  ❌ Pas de repo git trouvé")
            return False, "no git"
        
        git_root = Path(result.stdout.strip())
        
        # git add
        result = subprocess.run(
            ["git", "add", "."],
            cwd=str(git_root),
            capture_output=True,
            text=True
        )
        if result.returncode != 0:
            print(f"  ❌ git add échoué: {result.stderr}")
            return False, "add failed"
        
        # Vérifier s'il y a des changements
        result = subprocess.run(
            ["git", "diff", "--cached", "--quiet"],
            cwd=str(git_root),
            capture_output=True
        )
        if result.returncode == 0:
            print("  ⚠ Pas de changements à commiter")
            return True, "no changes"
        
        # git commit
        commit_msg = f"feat({cell_name}): implémentation cell dev3"
        result = subprocess.run(
            ["git", "commit", "-m", commit_msg],
            cwd=str(git_root),
            capture_output=True,
            text=True
        )
        if result.returncode != 0:
            print(f"  ❌ git commit échoué: {result.stderr}")
            return False, "commit failed"
        
        # Récupérer le hash
        result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=str(git_root),
            capture_output=True,
            text=True
        )
        commit_hash = result.stdout.strip() if result.returncode == 0 else "unknown"
        
        print(f"  ✅ Commit créé: {commit_hash}")
        
        # git push
        result = subprocess.run(
            ["git", "remote"],
            cwd=str(git_root),
            capture_output=True,
            text=True
        )
        if result.stdout.strip():
            print("  → Push vers origin...")
            result = subprocess.run(
                ["git", "push", "origin"],
                cwd=str(git_root),
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                print("  ✅ Push réussi")
            else:
                print(f"  ⚠ Push échoué: {result.stderr}")
        
        return True, commit_hash
        
    except Exception as e:
        print(f"  ❌ Erreur git: {e}")
        return False, str(e)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: commit_git.py <cell-name> [project-dir] [--skip-git]")
        sys.exit(1)
    
    cell_name = sys.argv[1]
    project_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else Path.cwd()
    skip_git = "--skip-git" in sys.argv
    
    success, result = commit_git(cell_name, project_dir, skip_git)
    
    sys.exit(0 if success else 1)
