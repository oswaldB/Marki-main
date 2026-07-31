"""Étape 9: Génération IA - Exécute pi -p pour chaque fichier."""

import subprocess
from pathlib import Path

from rich.console import Console

console = Console()


def step_11_generate_ia(cell_path: Path, dev_plan: dict) -> tuple[bool, list[str]]:
    """Génère le code final via IA pour chaque fichier."""
    console.print("[blue]🤖 Génération IA avec pi -p...")

    files = dev_plan.get("files", [])

    if not files:
        console.print("[yellow]⚠️ Aucun fichier à générer")
        return True, []

    logs_dir = cell_path / "drdice-logs"
    logs_dir.mkdir(parents=True, exist_ok=True)

    generated = []
    errors = []

    console.print(f"[dim]  {len(files)} fichiers à générer:")
    for f in files:
        console.print(f"    [dim]- {f}")

    for idx, file_rel in enumerate(files, 1):
        console.print(f"\n[cyan]  → Traitement fichier {idx}/{len(files)}: {file_rel}")

        file_path = cell_path / file_rel
        abs_path = file_path.absolute()

        prompt = f"Corrige ce fichier selon les commentaires IA : {abs_path}"

        try:
            result = subprocess.run(
                ["pi", "-p", prompt],
                capture_output=True,
                text=True,
                timeout=600
            )

            if result.returncode != 0:
                console.print(f"    [red]✗ Échec")
                errors.append(f"{file_rel}: {result.stderr[:200]}")
                continue



            log_file = logs_dir / f"{file_rel.replace('/', '_')}.log"
            log_file.write_text(result.stdout, encoding="utf-8")

            console.print(f"    [green]✓ Fichier {file_rel} traité")

        except Exception as e:
            console.print(f"    [red]✗ Erreur: {e}")
            errors.append(f"{file_rel}: {e}")

    console.print()

    if generated:
        console.print(f"[green]✅ {len(generated)} fichiers générés avec succès")

    if errors:
        console.print(f"[red]❌ {len(errors)} erreurs")

    return len(errors) == 0, generated
