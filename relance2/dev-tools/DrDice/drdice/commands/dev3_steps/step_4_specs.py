"""Étape 4: Analyse des Specs - Parse les specs pour identifier type et fichiers nécessaires."""

from pathlib import Path

from rich.console import Console

console = Console()


def step_4_analyze_specs(cell_path: Path, specs_path: Path = None) -> tuple[bool, dict]:
    """Analyse les specs pour identifier le type de cell et les fichiers nécessaires.

    Args:
        cell_path: Chemin de la cell
        specs_path: Chemin vers les specs (dans .specs/<cell>/) - optionnel

    Returns:
        Tuple (ok, dev_plan dict)
    """
    console.print("[blue]📄 Analyse des specs...")

    # Nouvelle structure: specs dans .specs/<cell-name>/
    if specs_path is None:
        specs_path = cell_path.parent.parent.parent / ".specs" / cell_path.name
    
    if not specs_path.exists():
        # Fallback sur ancienne structure
        specs_path = cell_path / "specs"
        if not specs_path.exists():
            console.print(f"[red]❌ Dossier specs non trouvé pour {cell_path.name}")
            return False, {"error": "Specs non trouvées"}

    # Vérifier valide.md
    valide_md = specs_path / "valide.md"
    if not valide_md.exists():
        console.print(f"[yellow]⚠️ valide.md non trouvé")

    # Déterminer le type de cell selon le chemin Flask
    cell_name = cell_path.name
    parent_name = cell_path.parent.name

    if parent_name == "backend_wf" or parent_name == "backend-wf":
        cell_type = "backend-wf"
        files_needed = ["__init__.py", "routes/wf_workflow.py"]
        workflows = []
        
        # Vérifier les workflows backend
        wf_backend_dir = specs_path / "wf-backend"
        if wf_backend_dir.exists():
            for wf_file in wf_backend_dir.glob("*.md"):
                wf_name = wf_file.stem
                workflows.append(wf_name)
                files_needed.append(f"routes/wf_{wf_name}.py")
                
    elif parent_name == "cron":
        cell_type = "cron"
        files_needed = ["__init__.py", "cron.py"]
        workflows = []
        
    else:  # screens (frontend Flask)
        cell_type = "screens"
        files_needed = ["__init__.py", "routes.py"]
        workflows = []

        # Modèles
        models_dir = specs_path / "models"
        models = []
        if models_dir.exists():
            for model_file in models_dir.glob("*.md"):
                model_name = model_file.stem
                models.append(model_name)
                files_needed.append(f"models/{model_name}.py")

        # Workflows frontend
        wf_frontend_dir = specs_path / "wf-frontend"
        if wf_frontend_dir.exists():
            for wf_file in wf_frontend_dir.glob("*.md"):
                wf_name = wf_file.stem
                workflows.append(wf_name)

    # Lire les règles globales
    rules_content = ""
    rules_file = specs_path / "A LIRE EN PREMIER" / "rules.md"
    if rules_file.exists():
        rules_content = rules_file.read_text(encoding="utf-8")

    dev_plan = {
        "cell_name": cell_name,
        "cell_type": cell_type,
        "cell_path": str(cell_path),
        "files": files_needed,
        "workflows": workflows,
        "models": models if cell_type == "screens" else [],
        "has_specs": valide_md.exists(),
        "rules": rules_content[:500] if rules_content else "",
    }

    console.print(f"  [dim]Type: {cell_type}")
    console.print(f"  [dim]Fichiers: {len(files_needed)}")
    if workflows:
        console.print(f"  [dim]Workflows: {', '.join(workflows)}")
    if dev_plan.get("models"):
        console.print(f"  [dim]Modèles: {', '.join(dev_plan['models'])}")
    console.print(f"[green]✅ Analyse OK: {cell_name}")

    return True, dev_plan
