#!/usr/bin/env python3
"""Script de test Playwright pour vérifier les console logs des squelettes.

Usage: python test-skeleton-playwright.py <cell_name> <workflow1> <workflow2> ...
Output: JSON avec résultats des tests de console (sur stdout)
Logs: sur stderr
"""

import json
import sys
import time


def log_info(msg):
    """Log sur stderr"""
    print(f"[INFO] {msg}", file=sys.stderr, flush=True)


def log_console(msg):
    """Log console du navigateur sur stderr"""
    print(f"[CONSOLE] {msg}", file=sys.stderr, flush=True)


def main():
    if len(sys.argv) < 2:
        print("Usage: test-skeleton-playwright.py <cell_name> [workflow1] [workflow2] ...", file=sys.stderr)
        return 1

    cell_name = sys.argv[1]
    workflows = sys.argv[2:]

    try:
        from playwright.sync_api import sync_playwright

        expected_logs = [
            "main.js loaded",
        ] + [f"{wf}.js loaded" for wf in workflows]

        captured_logs = []

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            # Capturer les console logs
            def handle_console(msg):
                text = msg.text
                captured_logs.append(text)
                log_console(text)

            page.on("console", handle_console)

            # Naviguer vers la page
            url = f"http://dev.markidiags.com/{cell_name}/"
            log_info(f"Opening {url}")
            page.goto(url)

            # Attendre 5 secondes pour le chargement des scripts
            log_info("Waiting 5 seconds for scripts to load...")
            time.sleep(10)

            browser.close()

        # Vérifier les logs attendus
        results = []
        all_ok = True

        for expected in expected_logs:
            found = any(expected in log for log in captured_logs)
            results.append({
                "expected": expected,
                "found": found
            })
            if not found:
                all_ok = False

        output = {
            "all_ok": all_ok,
            "cell": cell_name,
            "workflows": workflows,
            "captured_logs": captured_logs,
            "expected_logs": expected_logs,
            "results": results
        }

        # Seul le JSON va sur stdout
        print(json.dumps(output, indent=2))
        return 0 if all_ok else 1

    except ImportError:
        error_output = {
            "all_ok": False,
            "error": "Playwright not installed. Run: pip install playwright && playwright install chromium",
            "cell": cell_name
        }
        print(json.dumps(error_output), file=sys.stderr)
        return 1
    except Exception as e:
        error_output = {
            "all_ok": False,
            "error": str(e),
            "cell": cell_name
        }
        print(json.dumps(error_output), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
