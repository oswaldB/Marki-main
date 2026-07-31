#!/usr/bin/env python3
"""Analyze Specs - Parse les specs pour identifier type et fichiers nécessaires."""

import json
import sys
from pathlib import Path


def analyze_specs(cell_path: Path) -> tuple[bool, dict]:
    """Analyse les specs pour identifier le type de cell et les fichiers nécessaires.
    
    Returns:
        (ok, dev_plan)
    """
    cell_path = Path(cell_path)
    
    print("📄 Analyse des specs...")
    
    specs_dir = cell_path / ".specs"
    if not specs_dir.exists():
        print(f"❌ Dossier .specs non trouvé dans {cell_path}")
        return False, {"error": "Specs non trouvées"}
    
    # Vérifier valide.md
    valide_md = specs_dir / "valide.md"
    if not valide_md.exists():
        print("⚠️ valide.md non trouvé")
    
    # Déterminer le type de cell
    cell_name = cell_path.name
    parent_name = cell_path.parent.name
    
    if parent_name == "services" or "/server/" in str(cell_path):
        cell_type = "backend"
        files_needed = ["index.js", "package.json"]
        # Vérifier si cron.js nécessaire
        wf_backend_dir = specs_dir / "wf-backend"
        if wf_backend_dir.exists():
            for wf_file in wf_backend_dir.glob("*.md"):
                content = wf_file.read_text(encoding="utf-8")
                if "cron" in content.lower() or "schedule" in content.lower():
                    files_needed.append("cron.js")
                    break
        workflows = []
    else:
        cell_type = "frontend"
        files_needed = ["index.html", "main.js"]
        
        # Compter les workflows
        wf_frontend_dir = specs_dir / "wf-frontend"
        workflows = []
        if wf_frontend_dir.exists():
            for wf_file in wf_frontend_dir.glob("*.md"):
                wf_name = wf_file.stem
                workflows.append(wf_name)
                files_needed.append(f"workflows/{wf_name}.js")
    
    # Lire les règles globales
    rules_content = ""
    rules_file = specs_dir / "rules.md"
    if rules_file.exists():
        rules_content = rules_file.read_text(encoding="utf-8")
    
    dev_plan = {
        "cell_name": cell_name,
        "cell_type": cell_type,
        "cell_path": str(cell_path),
        "files": files_needed,
        "workflows": workflows,
        "has_specs": valide_md.exists(),
        "rules": rules_content[:500] if rules_content else "",
    }
    
    print(f"  Type: {cell_type}")
    print(f"  Fichiers: {len(files_needed)}")
    if workflows:
        print(f"  Workflows: {', '.join(workflows)}")
    print(f"✅ Analyse OK: {cell_name}")
    
    return True, dev_plan


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: analyze_specs.py <cell-path>")
        sys.exit(1)
    
    cell_path = Path(sys.argv[1])
    
    success, dev_plan = analyze_specs(cell_path)
    
    if success:
        print(f"\nDev Plan:")
        print(json.dumps(dev_plan, indent=2, ensure_ascii=False))
        sys.exit(0)
    else:
        print(f"❌ {dev_plan.get('error', 'Erreur')}")
        sys.exit(1)
