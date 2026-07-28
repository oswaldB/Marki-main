"""Étape 6: Génération des Squelettes - Crée les fichiers templates avec instructions."""

from pathlib import Path

from rich.console import Console

console = Console()


def _load_template(template_path: Path, replacements: dict) -> str:
    """Charge un template et remplace les variables."""
    if not template_path.exists():
        return ""
    content = template_path.read_text(encoding="utf-8")
    for key, value in replacements.items():
        content = content.replace(f"{{{key}}}", value)
    return content


def step_6_generate_skeletons(cell_path: Path, dev_plan: dict, templates_dir: Path) -> tuple[bool, list[str]]:
    """Génère les fichiers squelettes pour la cell.

    Args:
        cell_path: Chemin de la cell
        dev_plan: Plan de développement (type, fichiers, etc.)
        templates_dir: Dossier des templates

    Returns:
        Tuple (ok, liste des fichiers créés)
    """
    console.print("[blue]🏗️ Génération des squelettes...")

    cell_name = dev_plan["cell_name"]
    cell_type = dev_plan["cell_type"]

    squelettes_dir = templates_dir / "static-stack" / "squelettes"
    created_files = []

    if cell_type == "frontend":
        # index.html
        template = squelettes_dir / "frontend" / "index.html"
        content = _load_template(template, {"cell_name": cell_name, "name": cell_name})
        output_file = cell_path / "index.html"
        output_file.write_text(content, encoding="utf-8")
        created_files.append("index.html")

        # main.js avec imports statiques des workflows
        template = squelettes_dir / "frontend" / "main.js"
        content = template.read_text(encoding="utf-8")
        
        workflows = dev_plan.get("workflows", [])
        if workflows:
            # Générer les imports
            imports = []
            logs = []
            for wf in workflows:
                imports.append(f"import {{ execute as {wf.replace('-', '_')}Execute }} from './workflows/{wf}.js';")
                logs.append(f"console.log('{wf}.js loaded');")
            
            content = content.replace(
                "// WORKFLOW_IMPORTS_PLACEHOLDER",
                "\n".join(imports)
            )
            content = content.replace(
                "// WORKFLOW_LOGS_PLACEHOLDER",
                "\n".join(logs)
            )
        else:
            content = content.replace("// WORKFLOW_IMPORTS_PLACEHOLDER", "")
            content = content.replace("// WORKFLOW_LOGS_PLACEHOLDER", "")
        
        output_file = cell_path / "main.js"
        output_file.write_text(content, encoding="utf-8")
        created_files.append("main.js")

        # Workflows
        workflows_dir = cell_path / "workflows"
        workflows_dir.mkdir(exist_ok=True)

        workflow_template = squelettes_dir / "frontend" / "workflow.js"
        for wf_name in dev_plan.get("workflows", []):
            content = _load_template(workflow_template, {
                "cell_name": cell_name,
                "name": cell_name,
                "wf_name": wf_name
            })
            output_file = workflows_dir / f"{wf_name}.js"
            output_file.write_text(content, encoding="utf-8")
            created_files.append(f"workflows/{wf_name}.js")

    else:  # backend
        # index.js
        template = squelettes_dir / "backend" / "index.js"
        content = _load_template(template, {"cell_name": cell_name, "name": cell_name})
        output_file = cell_path / "index.js"
        output_file.write_text(content, encoding="utf-8")
        created_files.append("index.js")

        # package.json
        template = squelettes_dir / "backend" / "package.json"
        content = _load_template(template, {"cell_name": cell_name, "name": cell_name})
        output_file = cell_path / "package.json"
        output_file.write_text(content, encoding="utf-8")
        created_files.append("package.json")

        # cron.js si nécessaire
        if "cron.js" in dev_plan.get("files", []):
            template = squelettes_dir / "cron" / "cron.js"
            content = _load_template(template, {"cell_name": cell_name, "name": cell_name})
            output_file = cell_path / "cron.js"
            output_file.write_text(content, encoding="utf-8")
            created_files.append("cron.js")

    console.print(f"[green]✅ {len(created_files)} squelettes générés")
    for f in created_files:
        console.print(f"  [dim]{f}")

    return True, created_files
