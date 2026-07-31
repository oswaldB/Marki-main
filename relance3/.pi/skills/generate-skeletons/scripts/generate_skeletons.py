#!/usr/bin/env python3
"""Generate Skeletons - Crée les fichiers templates."""

import json
import sys
from pathlib import Path


def _load_template(template_path: Path, replacements: dict) -> str:
    """Charge un template et remplace les variables."""
    if not template_path.exists():
        return ""
    content = template_path.read_text(encoding="utf-8")
    for key, value in replacements.items():
        content = content.replace(f"{{{key}}}", value)
    return content


def _generate_workflow_registration(workflows: list) -> str:
    """Génère le code d'enregistrement des workflows."""
    if not workflows:
        return ""
    registrations = []
    for wf in workflows:
        wf_var = wf.replace('-', '_')
        registrations.append(f"    '{wf}': {{ execute: {wf_var}Execute }}")
    return ",\n".join(registrations)


def generate_skeletons(cell_path: Path, templates_dir: Path = None) -> tuple[bool, list[str]]:
    """Génère les fichiers squelettes."""
    cell_path = Path(cell_path)
    cell_name = cell_path.name
    
    print("🏗️ Génération des squelettes...")
    
    # Déterminer le type et les workflows
    wf_frontend_dir = cell_path / ".specs" / "wf-frontend"
    workflows = []
    if wf_frontend_dir.exists():
        workflows = [f.stem for f in wf_frontend_dir.glob("*.md")]
    
    cell_type = "backend" if cell_path.parent.name == "services" else "frontend"
    
    if templates_dir is None:
        templates_dir = cell_path.parent.parent.parent / "dev-tools" / "DrDice" / "drdice" / "templates"
    
    squelettes_dir = templates_dir / "static-stack" / "squelettes"
    created_files = []
    
    if cell_type == "frontend":
        alpine_component = f"{cell_name}Page"
        
        # index.html
        template = squelettes_dir / "frontend" / "index.html"
        if template.exists():
            content = _load_template(template, {"cell_name": cell_name, "name": cell_name})
            if workflows:
                first_wf = workflows[0] if workflows[0] != "initial-load" else (workflows[1] if len(workflows) > 1 else "submit")
                content = content.replace("runWorkflow('submit')", f"runWorkflow('{first_wf}')")
            (cell_path / "index.html").write_text(content, encoding="utf-8")
            created_files.append("index.html")
            print("  ✓ index.html")
        
        # main.js
        template = squelettes_dir / "frontend" / "main.js"
        if template.exists():
            content = template.read_text(encoding="utf-8")
            content = content.replace("{cell_name}Page", alpine_component)
            content = content.replace("{cell_name}", cell_name)
            
            if workflows:
                imports = [f"import {{ execute as {wf.replace('-', '_')}Execute }} from './workflows/{wf}.js';" for wf in workflows]
                logs = [f"console.log('{wf}.js loaded');" for wf in workflows]
                content = content.replace("// WORKFLOW_IMPORTS_PLACEHOLDER", "\n".join(imports))
                content = content.replace("    // WORKFLOW_REGISTRATION_PLACEHOLDER", _generate_workflow_registration(workflows))
                content = content.replace("// WORKFLOW_LOGS_PLACEHOLDER", "\n".join(logs))
            
            (cell_path / "main.js").write_text(content, encoding="utf-8")
            created_files.append("main.js")
            print("  ✓ main.js")
        
        # Workflows
        workflows_dir = cell_path / "workflows"
        workflows_dir.mkdir(exist_ok=True)
        workflow_template = squelettes_dir / "frontend" / "workflow.js"
        
        for wf_name in workflows:
            if workflow_template.exists():
                content = _load_template(workflow_template, {
                    "cell_name": cell_name, "name": cell_name, "wf_name": wf_name
                })
            else:
                content = f"""// Workflow: {wf_name}
export async function execute(params = {{}}) {{
    console.log('{wf_name} started');
    // TODO: Implémenter {wf_name}
    console.log('{wf_name} completed');
    return {{ success: true }};
}}
"""
            (workflows_dir / f"{wf_name}.js").write_text(content, encoding="utf-8")
            created_files.append(f"workflows/{wf_name}.js")
            print(f"  ✓ workflows/{wf_name}.js")
    
    else:  # backend
        template = squelettes_dir / "backend" / "index.js"
        if template.exists():
            content = _load_template(template, {"cell_name": cell_name, "name": cell_name})
        else:
            content = f"""// Backend: {cell_name}
console.log('Backend {cell_name} started');
"""
        (cell_path / "index.js").write_text(content, encoding="utf-8")
        created_files.append("index.js")
        print("  ✓ index.js")
    
    print(f"✅ {len(created_files)} squelettes générés")
    return True, created_files


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: generate_skeletons.py <cell-path> [templates-dir]")
        sys.exit(1)
    
    cell_path = Path(sys.argv[1])
    templates_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else None
    
    success, files = generate_skeletons(cell_path, templates_dir)
    
    if success:
        for f in files:
            print(f"  - {f}")
        sys.exit(0)
    else:
        sys.exit(1)
