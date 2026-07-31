#!/usr/bin/env python3
"""Healthy Test Couch - Teste que tous les services sont UP."""

import json
import subprocess
import sys
from pathlib import Path


def healthy_test_couch(project_dir: Path = None) -> tuple[bool, list]:
    """Teste que tous les services sont UP."""
    if project_dir is None:
        project_dir = Path.cwd()
    else:
        project_dir = Path(project_dir)
    
    print("🏥 Tests de santé des services...")
    
    # Chercher le script test-healthy.py
    script_paths = [
        project_dir / "dev-tools" / "DrDice" / "drdice" / "commands" / "dev3_scripts" / "test-healthy.py",
        Path(__file__).parent.parent.parent / "dev3_scripts" / "test-healthy.py",
    ]
    
    script_path = None
    for sp in script_paths:
        if sp.exists():
            script_path = sp
            break
    
    if not script_path:
        # Test manuel si script non trouvé
        import urllib.request
        try:
            req = urllib.request.Request("http://localhost:3001/api/health")
            response = urllib.request.urlopen(req, timeout=5)
            return True, [{"name": "Bun API", "ok": True, "code": response.status}]
        except Exception as e:
            return False, [{"name": "Bun API", "ok": False, "error": str(e)}]
    
    try:
        result = subprocess.run(
            ["python3", str(script_path)],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        data = json.loads(result.stdout)
        all_ok = data.get("all_ok", False)
        tests = data.get("tests", [])
        
        for test in tests:
            name = test.get("name", "Unknown")
            ok = test.get("ok", False)
            if ok:
                print(f"  ✅ {name}")
            else:
                print(f"  ❌ {name}")
        
        return all_ok, tests
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False, []


if __name__ == "__main__":
    project_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd()
    
    success, tests = healthy_test_couch(project_dir)
    
    if success:
        print("✅ Tous les services sont UP")
        sys.exit(0)
    else:
        print("❌ Certains services ne répondent pas")
        sys.exit(1)
