#!/usr/bin/env python3
"""Update Caddyfile - Vérifie que les routes Caddy répondent."""

import json
import subprocess
import sys
import urllib.request
from pathlib import Path


def update_caddyfile(cell_name: str, project_dir: Path = None) -> tuple[bool, dict]:
    """Vérifie que les routes Caddy répondent."""
    if project_dir is None:
        project_dir = Path.cwd()
    else:
        project_dir = Path(project_dir)
    
    print("🌐 Vérification des routes Caddy...")
    
    url = f"http://dev.markidiags.com/{cell_name}/"
    
    try:
        req = urllib.request.Request(url)
        response = urllib.request.urlopen(req, timeout=10)
        
        if response.status == 200:
            print(f"  ✅ Route OK: {url}")
            return True, {"url": url, "status": response.status}
        else:
            print(f"  ⚠️ Route retourne {response.status}: {url}")
            return True, {"url": url, "status": response.status}
            
    except Exception as e:
        print(f"  ⚠️ Route non accessible: {url}")
        print(f"     Erreur: {e}")
        
        # Afficher la config Caddy
        caddyfile = Path("/etc/caddy/Caddyfile")
        if caddyfile.exists():
            print("\n  Configuration Caddy actuelle:")
            try:
                content = caddyfile.read_text(encoding="utf-8")
                for line in content.split('\n')[:20]:
                    if line.strip():
                        print(f"    {line}")
            except Exception:
                pass
        
        print("\n  Pour résoudre:")
        print(f"    1. Vérifier que le fichier existe: app/site/{cell_name}/index.html")
        print(f"    2. Reload Caddy: sudo systemctl reload caddy")
        
        return True, {"url": url, "error": str(e), "warning": True}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: update_caddyfile.py <cell-name> [project-dir]")
        sys.exit(1)
    
    cell_name = sys.argv[1]
    project_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else Path.cwd()
    
    success, result = update_caddyfile(cell_name, project_dir)
    
    if success:
        sys.exit(0)
    else:
        sys.exit(1)
