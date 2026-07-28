"""Étape 4: Analyse des Specs - Parse les specs pour identifier type et fichiers nécessaires."""

from pathlib import Path

from rich.console import Console

console = Console()


def step_4_analyze_specs(cell_path: Path) -> tuple[bool, dict]:
    """Analyse les specs pour identifier le type de cell et les fichiers nécessaires.

    Args:
        cell_path: Chemin de la cell

    Returns:
        Tuple (ok, dev_plan dict)
    """
    console.print("[blue]📄 Analyse des specs...")

    specs_dir = cell_path / ".specs"
    if not specs_dir.exists():
        console.print(f"[red]❌ Dossier .specs non trouvé dans {cell_path}")
        return False, {"error": "Specs non trouvées"}

    # Vérifier valide.md
    valide_md = specs_dir / "valide.md"
    if not valide_md.exists():
        console.print(f"[yellow]⚠️ valide.md non trouvé")

    # Déterminer le type de cell
    cell_name = cell_path.name
    parent_name = cell_path.parent.name

    if parent_name == "services" or "/server/" in str(cell_path):
        cell_type = "backend"
        files_needed = ["index.js", "package.json"]
        # Vérifier si cron.js nécessaire
        wf_backend_dir = specs_dir / "wf-backend"
        if wf_backend_dir.exists():
            for wf_file in wf_backend_dir.glob("*.md"):
                content = wf_file.read_text(encoding="utf-8")
                if "cron" in content.lower() or "schedule" in content.lower():
                    files_needed.append("cron.js")
                    break
    else:
        cell_type = "frontend"
        files_needed = ["index.html", "main.js"]

        # Compter les workflows
        wf_frontend_dir = specs_dir / "wf-frontend"
        workflows = []
        if wf_frontend_dir.exists():
            for wf_file in wf_frontend_dir.glob("*.md"):
                wf_name = wf_file.stem
                workflows.append(wf_name)
                files_needed.append(f"workflows/{wf_name}.js")

    # Lire les règles globales
    rules_content = ""
    rules_file = specs_dir / "rules.md"
    if rules_file.exists():
        rules_content = rules_file.read_text(encoding="utf-8")

    dev_plan = {
        "cell_name": cell_name,
        "cell_type": cell_type,
        "cell_path": str(cell_path),
        "files": files_needed,
        "workflows": workflows if cell_type == "frontend" else [],
        "has_specs": valide_md.exists(),
        "rules": rules_content[:500] if rules_content else "",
    }

    console.print(f"  [dim]Type: {cell_type}")
    console.print(f"  [dim]Fichiers: {len(files_needed)}")
    if workflows:
        console.print(f"  [dim]Workflows: {', '.join(workflows)}")
    console.print(f"[green]✅ Analyse OK: {cell_name}")

    return True, dev_plan
