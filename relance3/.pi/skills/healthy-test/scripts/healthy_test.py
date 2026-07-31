#!/usr/bin/env python3
"""Healthy Test - Vérifie Bun.js + Caddy + API."""

import subprocess
import sys
import time
import urllib.request
from pathlib import Path


def healthy_test(project_dir: Path = None) -> tuple[bool, str]:
    """Teste que les services sont opérationnels.
    
    Returns:
        (success, message)
    """
    if project_dir is None:
        project_dir = Path.cwd()
    else:
        project_dir = Path(project_dir)
    
    print("  → Vérification Bun.js...")
    result = subprocess.run(["which", "bun"], capture_output=True, text=True)
    if result.returncode != 0:
        return False, "Bun.js non installé"
    
    print("  → Rechargement Caddy...")
    subprocess.run(["sudo", "systemctl", "reload", "caddy"], capture_output=True)
    time.sleep(1)
    
    print("  → Démarrage API Bun.js...")
    api_dir = project_dir / "app" / "api"
    
    # Vérifier si déjà running
    result = subprocess.run(
        ["pgrep", "-f", "bun.*app/api/index.ts"],
        capture_output=True
    )
    
    if result.returncode != 0:
        # Installer deps si nécessaire
        if not (api_dir / "node_modules").exists():
            subprocess.run(["bun", "install"], cwd=str(api_dir), capture_output=True)
        
        # Démarrer l'API
        subprocess.Popen(
            ["bun", "run", "dev"],
            cwd=str(api_dir),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True
        )
        time.sleep(3)
    
    # Test health endpoint
    try:
        req = urllib.request.Request("http://localhost:3001/api/health")
        response = urllib.request.urlopen(req, timeout=5)
        return True, "OK"
    except Exception as e:
        return False, str(e)


if __name__ == "__main__":
    project_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd()
    
    success, msg = healthy_test(project_dir)
    
    if success:
        print("✅ Services OK")
        sys.exit(0)
    else:
        print(f"❌ {msg}")
        sys.exit(1)
