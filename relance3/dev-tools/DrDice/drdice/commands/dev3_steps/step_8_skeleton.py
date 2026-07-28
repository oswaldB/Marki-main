"""Étape 8: Skeleton Tests - Vérifie que les squelettes sont correctement générés."""

import json
import subprocess
from pathlib import Path

from rich.console import Console

console = Console()


def step_8_skeleton_tests(cell_path: Path, cell_name: str, cell_type: str, workflows: list = None) -> tuple[bool, dict]:
    """Teste que les squelettes sont correctement générés.

    Args:
        cell_path: Chemin de la cell
        cell_name: Nom de la cell
        cell_type: Type de la cell (frontend/backend)
        workflows: Liste des workflows (pour tests Playwright)

    Returns:
        Tuple (ok, résultat des tests)
    """
    console.print("[blue]🧪 Tests des squelettes...")

    # Tests HTTP (Niveau 1)
    script_http = Path(__file__).parent.parent / "dev3_scripts" / "test-skeleton.py"
    
    try:
        result = subprocess.run(
            ["python3", str(script_http), cell_name, cell_type],
            capture_output=True,
            text=True,
            timeout=30
        )

        data = json.loads(result.stdout)
        http_ok = data.get("all_ok", False)

        for test in data.get("tests", []):
            name = test.get("url", "Unknown").split("/")[-1] or "root"
            code = test.get("code", 0)
            ok = test.get("ok", False)
            
            if ok:
                console.print(f"  [green]✅ {name}: HTTP {code}")
            else:
                console.print(f"  [red]❌ {name}: HTTP {code}")

        if not http_ok:
            console.print("[red]❌ Tests HTTP en échec")
            return False, data

    except Exception as e:
        console.print(f"[red]❌ Erreur tests HTTP: {e}")
        return False, {"error": str(e)}

    # Tests Playwright (Niveau 2) - Console logs
    if cell_type == "frontend" and workflows:
        console.print("[dim]🎭 Tests Playwright (console logs)...")
        
        script_playwright = Path(__file__).parent.parent / "dev3_scripts" / "test-skeleton-playwright.py"
        
        try:
            cmd = ["python3", str(script_playwright), cell_name] + workflows
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            pw_data = json.loads(result.stdout)
            pw_ok = pw_data.get("all_ok", False)
            
            for log_result in pw_data.get("results", []):
                expected = log_result.get("expected", "")
                found = log_result.get("found", False)
                
                if found:
                    console.print(f"  [green]✅ Console: '{expected}'")
                else:
                    console.print(f"  [red]❌ Console manquant: '{expected}'")
            
            if not pw_ok:
                console.print("[yellow]⚠️ Tests Playwright incomplets")
                # On continue quand même car c'est optionnel
            else:
                console.print("[green]✅ Console logs OK")
                
        except Exception as e:
            console.print(f"[yellow]⚠️ Tests Playwright échoués: {e}")
            # On continue car Playwright est optionnel
    
    console.print("[green]✅ Tests squelettes OK")
    return True, data
