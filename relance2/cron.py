#!/usr/bin/env python3
"""Tâches planifiées pour Marki App."""
import urllib.request
import sys

def check_healthy():
    """Appelle l'endpoint /api/healthy pour vérifier la santé du système."""
    try:
        req = urllib.request.Request(
            "http://dev2.markidiags.com/api/healthy",
            headers={"User-Agent": "Marki-Cron/1.0"}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            if response.status == 200:
                print("✓ Health check OK")
                return True
            else:
                print(f"✗ Health check failed: HTTP {response.status}")
                return False
    except Exception as e:
        print(f"✗ Health check error: {e}")
        return False

if __name__ == "__main__":
    # Exécuter le health check
    ok = check_healthy()
    sys.exit(0 if ok else 1)
