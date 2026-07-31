#!/usr/bin/env python3
"""Verify Structure - Valide la structure du projet."""

import subprocess
import sys
from pathlib import Path


def verify_structure(project_dir: Path = None) -> tuple[bool, str]:
    """Vérifie la structure du projet.
    
    Returns:
        (success, message)
    """
    if project_dir is None:
        project_dir = Path.cwd()
    else:
        project_dir = Path(project_dir)
    
    required_dirs = [
        "app/api",
        "app/site",
        "cells",
        "dev-tools",
    ]
    
    for dir_path in required_dirs:
        full_path = project_dir / dir_path
        if not full_path.exists():
            return False, f"Dossier manquant: {dir_path}"
    
    # Vérifier marki.db
    db_path = project_dir / "marki.db"
    api_db_path = project_dir / "app" / "api" / "db" / "marki.db"
    
    if not db_path.exists() and not api_db_path.exists():
        return False, "marki.db non trouvé (ni à la racine ni dans app/api/db/)"
    
    return True, "OK"


if __name__ == "__main__":
    project_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd()
    
    success, msg = verify_structure(project_dir)
    
    if success:
        print("✅ Structure OK")
        sys.exit(0)
    else:
        print(f"❌ {msg}")
        sys.exit(1)
