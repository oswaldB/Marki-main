"""Étape 3: Healthy Test - Teste que tous les services sont UP."""

import subprocess
from pathlib import Path

from rich.console import Console

console = Console()


def step_3_healthy_test() -> tuple[bool, list[dict]]:
    """Teste que tous les services sont UP en appelant le script externe.

    Returns:
        Tuple (ok, liste des résultats de test)
    """
    console.print("[blue]🏥 Tests de santé des services...")

    script_path = Path(__file__).parent.parent / "dev3_scripts" / "test-healthy.py"

    try:
        result = subprocess.run(
            ["python3", str(script_path)],
            capture_output=True,
            text=True,
            timeout=30
        )

        # Parse JSON output
        import json
        data = json.loads(result.stdout)

        all_ok = data.get("all_ok", False)
        tests = data.get("tests", [])

        # Display results
        for test in tests:
            name = test.get("name", "Unknown")
            code = test.get("code", 0)
            ok = test.get("ok", False)

            if ok:
                console.print(f"  [green]✅ {name}: HTTP {code}")
            else:
                console.print(f"  [red]❌ {name}: HTTP {code}")

        if all_ok:
            console.print("[green]✅ Tous les services sont UP")
        else:
            console.print("[red]❌ Certains services ne répondent pas (bloquant)")

        return all_ok, tests

    except Exception as e:
        console.print(f"[red]❌ Erreur: {e}")
        return False, []
