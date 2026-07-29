"""Étape 7: Update Caddyfile - Vérifie que les routes répondent."""

import json
import subprocess
from pathlib import Path

from rich.console import Console
from rich.prompt import Confirm

console = Console()


def step_9_update_caddyfile(cell_path: Path, cell_name: str) -> tuple[bool, dict]:
    """Vérifie que les routes Caddy répondent pour la cell.

    Args:
        cell_path: Chemin de la cell
        cell_name: Nom de la cell

    Returns:
        Tuple (ok, résultat des tests)
    """
    console.print("[blue]🌐 Vérification des routes Caddy...")

    # Tester la route
    script_path = Path(__file__).parent.parent / "dev3_scripts" / "test-routes.py"

    try:
        result = subprocess.run(
            ["python3", str(script_path), cell_name],
            capture_output=True,
            text=True,
            timeout=30
        )

        data = json.loads(result.stdout)
        all_ok = data.get("all_ok", False)

        if all_ok:
            console.print(f"[green]✅ Route OK: http://dev.markidiags.com/{cell_name}/")
            return True, data
        else:
            console.print(f"[yellow]⚠️ Route non accessible: http://dev.markidiags.com/{cell_name}/")
            console.print("  [dim]Vérification de la configuration Caddy...")

            # Afficher la config Caddy actuelle
            caddyfile = Path("/etc/caddy/Caddyfile")
            if caddyfile.exists():
                content = caddyfile.read_text(encoding="utf-8")
                console.print("\n  [dim]Configuration actuelle (extrait):")
                for line in content.split('\n')[:20]:
                    if line.strip():
                        console.print(f"    [dim]{line}")

            console.print("\n  [dim]Pour résoudre:")
            console.print(f"    [dim]1. Vérifier que le fichier existe: app/site/{cell_name}/index.html")
            console.print(f"    [dim]2. Vérifier Caddyfile: cat /etc/caddy/Caddyfile")
            console.print(f"    [dim]3. Reload Caddy: sudo systemctl reload caddy")

            console.print("\n  [yellow]⚠️ Erreur ignorée, continuation...")
            return True, data

    except Exception as e:
        console.print(f"[red]❌ Erreur: {e}")
        return False, {"error": str(e)}
