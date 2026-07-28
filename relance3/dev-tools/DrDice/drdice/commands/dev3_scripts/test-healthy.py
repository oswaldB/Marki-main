#!/usr/bin/env python3
"""Script de test pour vérifier que tous les services sont UP.

Usage: python test-healthy.py
Output: JSON avec résultats des tests
"""

import json
import subprocess
import sys


def test_service(name: str, url: str, method: str = "GET") -> dict:
    """Teste un service et retourne le résultat."""
    try:
        cmd = ["curl", "-s", "-L", "-o", "/dev/null", "-w", "%{http_code}"]
        if method == "POST":
            cmd.extend(["-X", "POST"])
        cmd.append(url)

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        code = int(result.stdout.strip()) if result.stdout.strip().isdigit() else 0
        ok = code == 200

        return {"name": name, "url": url, "code": code, "ok": ok}

    except subprocess.TimeoutExpired:
        return {"name": name, "url": url, "code": 0, "ok": False, "error": "timeout"}
    except Exception as e:
        return {"name": name, "url": url, "code": 0, "ok": False, "error": str(e)}


def main():
    """Point d'entrée principal."""
    tests = [
        {"name": "Frontend", "url": "http://dev.markidiags.com/healthy/", "method": "GET"},
        {"name": "CouchDB", "url": "http://dev.markidiags.com/couchdb/healthy", "method": "GET"},
        {"name": "Server", "url": "http://dev.markidiags.com/api/healthy", "method": "GET"},
    ]

    results = []
    all_ok = True

    for test in tests:
        result = test_service(test["name"], test["url"], test["method"])
        results.append(result)
        if not result["ok"]:
            all_ok = False

    output = {
        "all_ok": all_ok,
        "tests": results
    }

    print(json.dumps(output, indent=2))
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
