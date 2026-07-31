#!/usr/bin/env python3
"""Script de test pour vérifier que tous les services sont UP.

Usage: python test-healthy.py
Output: JSON avec résultats des tests
"""

import json
import subprocess
import sys
from pathlib import Path


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


def test_screen_healthy(base_url="http://dev2.markidiags.com") -> dict:
    """Vérifie que le screen healthy est accessible et fonctionnel."""
    result = test_service("Screen Healthy", f"{base_url}/api/", "GET")
    # Vérifier que le contenu contient les éléments attendus
    try:
        cmd = ["curl", "-s", "-L", f"{base_url}/api/"]
        curl_result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        content = curl_result.stdout.lower()
        
        checks = {
            "has_status": "status" in content or "health" in content,
            "has_healthy": "ok" in content or "healthy" in content,
        }
        result["checks"] = checks
        result["details"] = f"Checks: {sum(checks.values())}/{len(checks)}"
    except Exception as e:
        result["checks"] = {"error": str(e)}
    
    return result


def test_api_healthy(base_url="http://dev2.markidiags.com") -> dict:
    """Vérifie que la route /api/healthy répond correctement et vérifie la BDD."""
    result = test_service("API Healthy", f"{base_url}/api/healthy", "GET")
    
    # Vérifier que le JSON de réponse est valide et contient les checks
    try:
        cmd = ["curl", "-s", "-L", f"{base_url}/api/healthy"]
        curl_result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        data = json.loads(curl_result.stdout)
        
        # Vérifications
        has_db_check = "checks" in data and "database" in data.get("checks", {})
        db_ok = data.get("checks", {}).get("database", {}).get("ok", False) if has_db_check else False
        
        checks = {
            "valid_json": True,
            "has_status": "status" in data,
            "has_db_check": has_db_check,
            "db_connection_ok": db_ok,
        }
        result["checks"] = checks
        result["response"] = data
        
        # Le test passe seulement si la BDD est OK
        result["ok"] = result["ok"] and db_ok
        result["details"] = f"JSON valid, DB: {'OK' if db_ok else 'ERROR'}"
        
    except json.JSONDecodeError:
        result["checks"] = {"valid_json": False, "error": "Invalid JSON"}
        result["details"] = "Invalid JSON response"
        result["ok"] = False
    except Exception as e:
        result["checks"] = {"error": str(e)}
        result["details"] = f"Error: {e}"
        result["ok"] = False
    
    return result


def test_cron_healthy() -> dict:
    """Vérifie que le cron est configuré pour appeler /api/healthy."""
    try:
        # Vérifier si un fichier cron existe et contient l'appel à api/healthy
        cron_paths = [
            Path("/etc/cron.d/marki"),
            Path("/home/ubuntu/marki/relance2/cron.py"),
            Path("/home/ubuntu/marki/relance2/app/cron.py"),
        ]
        
        cron_found = False
        cron_has_healthy_check = False
        cron_content = ""
        
        for cron_path in cron_paths:
            if cron_path.exists():
                cron_found = True
                cron_content = cron_path.read_text()
                if "api/healthy" in cron_content or "healthy" in cron_content.lower():
                    cron_has_healthy_check = True
                break
        
        # Vérifier aussi les crontabs
        try:
            crontab_result = subprocess.run(
                ["crontab", "-l"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if crontab_result.returncode == 0:
                cron_found = True
                if "api/healthy" in crontab_result.stdout:
                    cron_has_healthy_check = True
        except Exception:
            pass
        
        result = {
            "name": "Cron Healthy Check",
            "url": "N/A (file check)",
            "code": 200 if cron_found and cron_has_healthy_check else (200 if cron_found else 0),
            "ok": cron_has_healthy_check,
            "details": "Cron configured with healthy check" if cron_has_healthy_check else (
                "Cron found but no healthy check configured" if cron_found else "No cron found"
            ),
            "checks": {
                "cron_exists": cron_found,
                "has_healthy_endpoint": cron_has_healthy_check
            }
        }
        return result
        
    except Exception as e:
        return {
            "name": "Cron Healthy Check",
            "url": "N/A",
            "code": 0,
            "ok": False,
            "error": str(e)
        }


def main():
    """Point d'entrée principal."""
    # Forcer l'URL de base à dev2.markidiags.com
    base_url = "http://dev2.markidiags.com"
    
    tests = [
        {"name": "Screen Healthy (HTML)", "url": f"{base_url}/api/", "method": "GET"},
        {"name": "API Healthy (JSON)", "url": f"{base_url}/api/healthy", "method": "GET"},
    ]

    results = []
    all_ok = True

    # Tests de base
    for test in tests:
        result = test_service(test["name"], test["url"], test["method"])
        results.append(result)
        if not result["ok"]:
            all_ok = False

    # Tests spécifiques détaillés
    screen_result = test_screen_healthy(base_url)
    results.append(screen_result)
    if not screen_result["ok"]:
        all_ok = False
    
    api_result = test_api_healthy(base_url)
    results.append(api_result)
    if not api_result["ok"]:
        all_ok = False
    
    cron_result = test_cron_healthy()
    results.append(cron_result)
    if not cron_result["ok"]:
        all_ok = False

    output = {
        "all_ok": all_ok,
        "tests": results
    }

    print(json.dumps(output, indent=2))
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
