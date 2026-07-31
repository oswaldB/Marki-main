#!/usr/bin/env python3
"""Script de test pour vérifier que les squelettes sont correctement générés.

Usage: python test-skeleton.py <cell_name> <cell_type>
Output: JSON avec résultats des tests
"""

import json
import subprocess
import sys


def test_http(url: str, expected_content: str = None) -> dict:
    """Teste une URL HTTP."""
    try:
        cmd = ["curl", "-s", "-L", "-w", "\n%{http_code}", url]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        
        lines = result.stdout.strip().split("\n")
        code = int(lines[-1]) if lines[-1].isdigit() else 0
        body = "\n".join(lines[:-1])
        
        ok = code == 200
        if expected_content and ok:
            ok = expected_content in body
        
        return {"url": url, "code": code, "ok": ok, "body_preview": body[:200]}
    except Exception as e:
        return {"url": url, "code": 0, "ok": False, "error": str(e)}


def main():
    if len(sys.argv) < 3:
        print("Usage: test-skeleton.py <cell_name> <cell_type>")
        return 1
    
    cell_name = sys.argv[1]
    cell_type = sys.argv[2]
    
    tests = []
    
    if cell_type == "frontend":
        # Test HTML - vérifie HTTP 200 ET contient le texte attendu
        html_test = test_http(
            f"http://dev.markidiags.com/{cell_name}/",
            f"{cell_name} - pret pour dev"
        )
        tests.append(html_test)
        
        # Test JS - vérifie juste HTTP 200
        js_test = test_http(f"http://dev.markidiags.com/{cell_name}/main.js", None)
        js_test["ok"] = js_test["code"] == 200
        tests.append(js_test)
        
    else:  # backend
        # Test endpoint
        tests.append(test_http(f"http://dev.markidiags.com/api/{cell_name}/healthy", "response"))
    
    all_ok = all(t["ok"] for t in tests)
    
    output = {
        "all_ok": all_ok,
        "cell": cell_name,
        "type": cell_type,
        "tests": tests
    }
    
    print(json.dumps(output, indent=2))
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
