#!/usr/bin/env python3
"""Skeleton Tests - Vérifie que les squelettes sont valides."""

import sys
from pathlib import Path


def skeleton_tests(cell_path: Path) -> tuple[bool, list[str]]:
    """Teste les squelettes générés."""
    cell_path = Path(cell_path)
    cell_name = cell_path.name
    
    print("🧪 Tests des squelettes...")
    
    errors = []
    
    # Déterminer le type
    cell_type = "backend" if cell_path.parent.name == "services" else "frontend"
    
    # Trouver les workflows
    workflows_dir = cell_path / "workflows"
    workflows = [f.stem for f in workflows_dir.glob("*.js")] if workflows_dir.exists() else []
    
    if cell_type == "frontend":
        # Test index.html
        index_path = cell_path / "index.html"
        if not index_path.exists():
            errors.append("index.html manquant")
        else:
            content = index_path.read_text(encoding="utf-8")
            if f"{cell_name} - pret pour dev" in content or "pret pour dev" in content:
                print("  ✓ index.html squelette valide")
            else:
                errors.append("index.html ne contient pas le marqueur 'pret pour dev'")
        
        # Test main.js
        main_path = cell_path / "main.js"
        if not main_path.exists():
            errors.append("main.js manquant")
        else:
            content = main_path.read_text(encoding="utf-8")
            if "Alpine.data" in content:
                print("  ✓ main.js contient Alpine.data")
            else:
                errors.append("main.js: Alpine.data non trouvé")
        
        # Test workflows
        for wf in workflows:
            wf_path = workflows_dir / f"{wf}.js"
            if not wf_path.exists():
                errors.append(f"Workflow manquant: {wf}.js")
            else:
                content = wf_path.read_text(encoding="utf-8")
                if "export async function execute" in content:
                    print(f"  ✓ {wf}.js squelette valide")
                else:
                    errors.append(f"{wf}.js: fonction execute manquante")
    
    else:  # backend
        index_path = cell_path / "index.js"
        if not index_path.exists():
            errors.append("index.js manquant")
        else:
            print("  ✓ index.js squelette valide")
    
    if errors:
        print(f"❌ {len(errors)} erreur(s) dans les squelettes")
        return False, errors
    
    print("✅ Tous les squelettes sont valides")
    return True, []


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: skeleton_tests.py <cell-path>")
        sys.exit(1)
    
    cell_path = Path(sys.argv[1])
    
    success, errors = skeleton_tests(cell_path)
    
    if success:
        sys.exit(0)
    else:
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)
