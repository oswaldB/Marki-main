"""Étape 8: Génération des Squelettes Flask - Crée les fichiers templates avec instructions."""

import json
from pathlib import Path

from rich.console import Console

console = Console()


def _load_template(template_path: Path, replacements: dict) -> str:
    """Charge un template et remplace les variables."""
    if not template_path.exists():
        return ""
    content = template_path.read_text(encoding="utf-8")
    for key, value in replacements.items():
        content = content.replace(f"{{{key}}}", str(value))
    return content


def _get_cell_type(cell_path: Path) -> str:
    """Détermine le type de cell selon son chemin."""
    path_str = str(cell_path)
    if "/screens/" in path_str:
        return "screens"
    elif "/backend_wf/" in path_str or "/backend-wf/" in path_str:
        return "backend-wf"
    elif "/cron/" in path_str:
        return "cron"
    return "screens"


def step_8_generate_skeletons(cell_path: Path, dev_plan: dict, templates_dir: Path) -> tuple[bool, list[str]]:
    """Génère les fichiers squelettes Flask pour la cell.

    Args:
        cell_path: Chemin de la cell
        dev_plan: Plan de développement
        templates_dir: Répertoire des templates

    Returns:
        Tuple (ok, liste des fichiers créés)
    """
    console.print("[blue]🏗️ Génération des squelettes Flask...")

    cell_name = dev_plan.get("cell_name", cell_path.name)
    cell_type = _get_cell_type(cell_path)
    
    # Utiliser les templates Flask v0
    squelettes_dir = templates_dir / "flask" / "squelettes" / "v0"
    created_files = []

    if cell_type == "screens":
        # __init__.py (blueprint)
        template = squelettes_dir / "screens" / "blueprint.py"
        if template.exists():
            content = _load_template(template, {"cell_name": cell_name, "name": cell_name})
        else:
            content = f'''"""Blueprint {cell_name}"""
from flask import Blueprint

bp = Blueprint('{cell_name}', __name__, template_folder='templates')

from . import routes
'''
        (cell_path / "__init__.py").write_text(content, encoding="utf-8")
        created_files.append("__init__.py")

        # routes.py - Génération directe sans template complexe
        routes_content = f'''"""Routes {cell_name}"""
from flask import render_template, jsonify, request
from . import bp


@bp.route('/')
def index():
    """Page {cell_name}."""
    return render_template('{cell_name}/index.html')


@bp.route('/api/{cell_name}', methods=['GET', 'POST'])
def api_{cell_name}():
    """API {cell_name}."""
    if request.method == 'POST':
        data = request.get_json() or {{}}
        return jsonify({{"status": "ok", "received": data}})
    return jsonify({{"status": "ok", "data": []}})
'''
        (cell_path / "routes.py").write_text(routes_content, encoding="utf-8")
        created_files.append("routes.py")

        # templates/{cell}/index.html
        templates_dir_cell = cell_path / "templates" / cell_name
        templates_dir_cell.mkdir(parents=True, exist_ok=True)
        
        template_html = squelettes_dir / "screens" / "index.html"
        if template_html.exists():
            content = _load_template(template_html, {"cell_name": cell_name, "name": cell_name})
        else:
            content = f'''{{% extends "layouts/base.html" %}}

{{% block title %}}{cell_name}{{% endblock %}}

{{% block content %}}
<div x-data="{cell_name}Data()" class="container mx-auto p-4">
    <h1 class="text-2xl font-bold">{cell_name}</h1>
    <p>Page {cell_name} en cours de développement...</p>
</div>
{{% endblock %}}

{{% block scripts %}}
<script>
function {cell_name}Data() {{
    return {{
        loading: false,
        init() {{
            console.log('{cell_name} initialized');
        }}
    }}
}}
</script>
{{% endblock %}}
'''
        (templates_dir_cell / "index.html").write_text(content, encoding="utf-8")
        created_files.append(f"templates/{cell_name}/index.html")

        # Créer le workflow dans le dossier de la cell (workflows frontend)
        cell_workflows_dir = cell_path / "workflows"
        cell_workflows_dir.mkdir(parents=True, exist_ok=True)
        
        workflow_template = squelettes_dir / "workflows" / "hello.js"
        if workflow_template.exists():
            workflow_content = _load_template(workflow_template, {"cell_name": cell_name})
            workflow_file = cell_workflows_dir / "hello.js"
            workflow_file.write_text(workflow_content, encoding="utf-8")
            created_files.append(f"workflows/hello.js")

        # models (si besoin selon dev_plan)
        if dev_plan.get("models"):
            models_dir = cell_path / "models"
            models_dir.mkdir(exist_ok=True)
            
            for model in dev_plan.get("models", []):
                model_file = models_dir / f"{model}.py"
                if not model_file.exists():
                    model_template = squelettes_dir / "screens" / "model.py"
                    if model_template.exists():
                        content = _load_template(model_template, {"model_name": model, "cell_name": cell_name})
                    else:
                        content = f'''"""Modèle {model}"""
from dataclasses import dataclass
from typing import Optional, List
import sqlite3

@dataclass
class {model.title()}:
    id: Optional[int] = None
    
    @classmethod
    def get_by_id(cls, id: int) -> Optional["{model.title()}"]:
        # TODO: Implémenter la requête SQL
        pass
    
    def save(self) -> None:
        # TODO: Implémenter la sauvegarde
        pass
'''
                    model_file.write_text(content, encoding="utf-8")
                    created_files.append(f"models/{model}.py")

    elif cell_type == "backend-wf":
        # __init__.py (blueprint sans template)
        template = squelettes_dir / "backend" / "blueprint.py"
        if template.exists():
            content = _load_template(template, {"cell_name": cell_name, "name": cell_name})
        else:
            content = f'''"""Backend workflow {cell_name}"""
from flask import Blueprint

bp = Blueprint('{cell_name}', __name__)

from . import routes
'''
        (cell_path / "__init__.py").write_text(content, encoding="utf-8")
        created_files.append("__init__.py")

        # routes/wf_*.py
        routes_dir = cell_path / "routes"
        routes_dir.mkdir(exist_ok=True)
        
        wf_backend_template = squelettes_dir / "backend" / "workflow_backend.py"
        for wf in dev_plan.get("workflows", []):
            if wf_backend_template.exists():
                content = _load_template(wf_backend_template, {"cell_name": cell_name, "name": cell_name, "wf_name": wf})
            else:
                content = f'''"""Workflow {wf}"""
from flask import jsonify, request
from . import bp

@bp.route('/api/{wf}', methods=['POST'])
def {wf}_endpoint():
    data = request.get_json() or {{}}
    # TODO: Implémenter le workflow
    return jsonify({{"success": True, "workflow": "{wf}"}})
'''
            (routes_dir / f"wf_{wf}.py").write_text(content, encoding="utf-8")
            created_files.append(f"routes/wf_{wf}.py")

    elif cell_type == "cron":
        # __init__.py
        template = squelettes_dir / "cron" / "blueprint.py"
        if template.exists():
            content = _load_template(template, {"cell_name": cell_name, "name": cell_name})
        else:
            content = f'''"""Cron {cell_name}"""
from flask import Blueprint
from app import scheduler

bp = Blueprint('cron_{cell_name}', __name__)

from . import cron

# Enregistrement du job
@scheduler.task('interval', id='{cell_name}_job', minutes=60)
def scheduled_job():
    with scheduler.app.app_context():
        cron.execute()
'''
        (cell_path / "__init__.py").write_text(content, encoding="utf-8")
        created_files.append("__init__.py")

        # cron.py
        cron_template = squelettes_dir / "cron" / "cron_job.py"
        if cron_template.exists():
            content = _load_template(cron_template, {"cell_name": cell_name, "name": cell_name})
        else:
            content = f'''"""Cron job {cell_name}"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

def execute() -> Dict[str, Any]:
    """Exécution du cron {cell_name}"""
    logger.info(f'[{{cell_name}}] CRON_START')
    try:
        # TODO: Implémenter la logique
        logger.info(f'[{{cell_name}}] CRON_SUCCESS')
        return {{"success": True}}
    except Exception as e:
        logger.error(f'[{{cell_name}}] CRON_FAILED: {{e}}')
        return {{"success": False, "error": str(e)}}
'''
        (cell_path / "cron.py").write_text(content, encoding="utf-8")
        created_files.append("cron.py")

    console.print(f"[green]✅ {len(created_files)} squelettes Flask générés")
    return True, created_files
