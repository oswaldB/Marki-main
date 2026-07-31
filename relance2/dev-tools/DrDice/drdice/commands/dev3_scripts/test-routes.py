#!/usr/bin/env python3
"""Script de test pour vérifier que les routes Caddy répondent.

Usage: python test-routes.py <cell_name>
Output: JSON avec résultats des tests
"""

import json
import subprocess
import sys


def test_route(name: str, url: str) -> dict:
    """Teste une route et retourne le résultat."""
    try:
        cmd = ["curl", "-s", "-L", "-o", "/dev/null", "-w", "%{http_code}"]
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
    if len(sys.argv) < 2:
        print("Usage: test-routes.py <cell_name>")
        return 1

    cell_name = sys.argv[1]

    # Tester la route de la cell
    tests = [
        {
            "name": f"Cell {cell_name}",
            "url": f"http://dev.markidiags.com/{cell_name}/"
        },
    ]

    results = []
    all_ok = True

    for test in tests:
        result = test_route(test["name"], test["url"])
        results.append(result)
        if not result["ok"]:
            all_ok = False

    output = {
        "all_ok": all_ok,
        "cell": cell_name,
        "tests": results
    }

    print(json.dumps(output, indent=2))
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
