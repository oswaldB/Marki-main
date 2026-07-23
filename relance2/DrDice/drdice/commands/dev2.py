#!/usr/bin/env python3
"""Commande dev2 - Développement plan/squelettes/IA incrémentale."""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import click
import yaml
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Confirm

from ..core.project import Project

console = Console()


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class FilePlan:
    """Plan pour un fichier à générer."""
    path: str
    file_type: str
    instructions: List[str]
    sources: List[Path]
    context: Dict[str, Any] = field(default_factory=dict)


@dataclass
class DevPlan:
    """Plan de développement pour une cell."""
    cell_name: str
    cell_type: str
    files: List[FilePlan]
    dependencies: List[str] = field(default_factory=list)


# =============================================================================
# SPECS ANALYZER
# =============================================================================

class SpecsAnalyzer:
    """Analyse les fichiers de specs et identifie les fichiers nécessaires."""

    def __init__(self, cell_path: Path, cell_type: str):
        self.cell_path = cell_path
        self.cell_name = cell_path.name
        self.cell_type = cell_type
        self.specs_path = cell_path / "specs"

    def analyze(self) -> DevPlan:
        """Analyse complète des specs et retourne le plan de développement."""
        files: List[FilePlan] = []

        if self.cell_type == "screens":
            files.extend(self._analyze_screens())
        elif self.cell_type == "backend-wf":
            files.extend(self._analyze_backend_wf())
        elif self.cell_type == "cron":
            files.extend(self._analyze_cron())

        dependencies = self._analyze_rules()

        return DevPlan(
            cell_name=self.cell_name,
            cell_type=self.cell_type,
            files=files,
            dependencies=dependencies
        )

    def _analyze_screens(self) -> List[FilePlan]:
        """Analyse une cell écran."""
        files = []

        files.append(FilePlan(
            path="__init__.py",
            file_type="blueprint",
            instructions=[
                "Crée un Blueprint Flask selon /specs-global/rules/cellsmvc.md",
                "template_folder='templates' obligatoire pour les écrans",
                "Importe les routes APRÈS la création du blueprint",
                "Ne PAS importer de modèles ici (seulement dans routes)"
            ],
            sources=[self.specs_path / ".." / "specs-global" / "rules" / "cellsmvc.md"]
        ))

        files.extend(self._analyze_routes())
        files.extend(self._analyze_models())
        files.extend(self._analyze_templates())
        files.extend(self._analyze_workflows_frontend())

        return files

    def _analyze_backend_wf(self) -> List[FilePlan]:
        """Analyse une cell backend workflow."""
        files = []

        files.append(FilePlan(
            path="__init__.py",
            file_type="blueprint",
            instructions=[
                "Blueprint SANS template_folder (pas d'interface)",
                "Pour API endpoints ou workflows sans UI"
            ],
            sources=[]
        ))

        wf_backend_dir = self.specs_path / "wf-backend"
        if wf_backend_dir.exists():
            for wf_file in sorted(wf_backend_dir.glob("*.md")):
                wf_name = wf_file.stem
                files.append(FilePlan(
                    path=f"routes/wf_{wf_name}.py",
                    file_type="workflow_backend",
                    instructions=[
                        f"Megafunction Python selon /specs-global/rules/dev-backend.md",
                        "Pattern: WorkflowContext, WorkflowResult, WorkflowLogger",
                        "Logs exhaustifs: WORKFLOW_START, VALIDATION_*, DB_*, WORKFLOW_SUCCESS/ERROR",
                        "Interface: execute(**kwargs) -> Dict[str, Any]",
                        "Jamais d'import circulaire (imports lourds dans les fonctions)"
                    ],
                    sources=[wf_file],
                    context={"workflow_name": wf_name}
                ))

        files.extend(self._analyze_models())

        return files

    def _analyze_cron(self) -> List[FilePlan]:
        """Analyse une cell cron."""
        files = []

        files.append(FilePlan(
            path="__init__.py",
            file_type="blueprint_cron",
            instructions=[
                "Blueprint sans template_folder ni routes",
                "Enregistrement du job APScheduler au démarrage"
            ],
            sources=[]
        ))

        files.append(FilePlan(
            path="cron.py",
            file_type="cron_job",
            instructions=[
                "Megafunction de cron selon dev-backend.md",
                "Même pattern que backend-wf: execute() avec logs exhaustifs",
                "Pas d'HTTP, appel direct depuis APScheduler"
            ],
            sources=[self.specs_path / "wf-backend" / "*.md"]
        ))

        return files

    def _analyze_models(self) -> List[FilePlan]:
        """Analyse les modèles depuis specs/models/*.md."""
        files = []
        models_dir = self.specs_path / "models"

        if not models_dir.exists():
            return files

        for model_file in sorted(models_dir.glob("*.md")):
            model_name = model_file.stem
            content = model_file.read_text(encoding="utf-8")
            fields = self._extract_fields_from_yaml(content)

            files.append(FilePlan(
                path=f"models/{model_name}.py",
                file_type="model",
                instructions=[
                    "Dataclass avec champs depuis specs/models/{name}.md",
                    "Méthodes: from_row(), get_by_id(), get_all(), save(), delete()",
                    "Utilise sqlite3 standard (pas d'ORM)",
                    "Logs exhaustifs: WORKFLOW_START, DB_QUERY_START, WORKFLOW_SUCCESS/ERROR"
                ],
                sources=[model_file],
                context={"fields": fields, "model_name": model_name}
            ))

        return files

    def _analyze_routes(self) -> List[FilePlan]:
        """Analyse les routes depuis specs/routes/*.md."""
        files = []
        routes_dir = self.specs_path / "routes"

        if not routes_dir.exists():
            return files

        for route_file in sorted(routes_dir.glob("*.md")):
            route_name = route_file.stem

            files.append(FilePlan(
                path=f"routes/{route_name}.py",
                file_type="route",
                instructions=[
                    f"Implémente la route selon specs/routes/{route_name}.md",
                    "Si des données sont nécessaires: importe les modèles depuis ..models",
                    "Retourne render_template() ou jsonify()",
                    "Pas de SQL direct ici, utilise les modèles"
                ],
                sources=[route_file]
            ))

        files.append(FilePlan(
            path="routes/__init__.py",
            file_type="routes_init",
            instructions=[
                "Importe toutes les routes depuis les fichiers dans /routes/",
                "Un fichier = une route ou un workflow backend",
                "Pas de logique ici, seulement des imports"
            ],
            sources=[]
        ))

        return files

    def _analyze_templates(self) -> List[FilePlan]:
        """Analyse les templates depuis specs/mockups/*.html."""
        files = []
        mockups_dir = self.specs_path / "mockups"

        if not mockups_dir.exists():
            return files

        files.append(FilePlan(
            path="templates/index.html",
            file_type="template_main",
            instructions=[
                "Code pixel-perfect depuis specs/mockups/*.html",
                "Étend OBLIGATOIREMENT le layout de base: {% extends \"base.html\" %}",
                "x-data avec x-init sur le container principal",
                "Alpine.js chargé en bas du body avec defer"
            ],
            sources=list(mockups_dir.glob("*.html"))
        ))

        files.append(FilePlan(
            path="templates/alpinejs.html",
            file_type="template_alpine",
            instructions=[
                "ORDRE OBLIGATOIRE: 1. Props 2. Getters+Helpers 3. Workflows 4. Init",
                "Logger global const log = {...} AVANT Alpine.data",
                "Toutes les props réactives définies D'ABORD",
                "Puis getters (get xxx())",
                "Puis helpers (formatXxx())",
                "Puis inclusion des workflows/",
                "FINalement workflow-init.html"
            ],
            sources=[]
        ))

        return files

    def _analyze_workflows_frontend(self) -> List[FilePlan]:
        """Analyse les workflows frontend."""
        files = []
        wf_dir = self.specs_path / "wf-frontend"

        if not wf_dir.exists():
            return files

        files.append(FilePlan(
            path="templates/workflows/workflow-init.html",
            file_type="workflow_init",
            instructions=[
                "Seulement la fonction init() et méthodes utilitaires",
                "PAS DE PROPS ICI (elles sont dans alpinejs.html)",
                "init() appelle les workflows nécessaires au démarrage",
                "Vérifie auth (token localStorage) redirige vers /login si absent"
            ],
            sources=[]
        ))

        for wf_file in sorted(wf_dir.glob("*.md")):
            wf_name = wf_file.stem
            files.append(FilePlan(
                path=f"templates/workflows/{wf_name}.html",
                file_type="workflow_frontend",
                instructions=[
                    f"Megafunction décrite dans specs/wf-frontend/{wf_name}.md",
                    "Pattern: workflowId, startTime, log.info('WORKFLOW_START'), try/catch/finally",
                    "Logs: WORKFLOW_START, VALIDATION_*, API_CALL_*, STATE_UPDATE, WORKFLOW_SUCCESS/ERROR",
                    "Met à jour les props définies dans alpinejs.html"
                ],
                sources=[wf_file],
                context={"workflow_name": wf_name}
            ))

        return files

    def _analyze_rules(self) -> List[str]:
        """Analyse les règles et dépendances globales."""
        dependencies = []

        rules_files = [
            self.cell_path.parent.parent / "specs-global" / "rules" / "cellsmvc.md",
            self.cell_path.parent.parent / "specs-global" / "rules" / "dev-backend.md",
            self.cell_path.parent.parent / "specs-global" / "rules" / "dev-frontend.md",
        ]

        for rules_file in rules_files:
            if rules_file.exists():
                dependencies.append(str(rules_file))

        return dependencies

    def _extract_fields_from_yaml(self, content: str) -> List[Dict[str, Any]]:
        """Extrait les champs depuis le YAML frontmatter."""
        fields = []

        if content.startswith("---"):
            try:
                end = content.find("---", 3)
                if end > 0:
                    yaml_content = content[3:end].strip()
                    data = yaml.safe_load(yaml_content)
                    if data and "fields" in data:
                        fields = data["fields"]
            except yaml.YAMLError:
                pass

        return fields


# =============================================================================
# SKELETON GENERATOR
# =============================================================================

class SkeletonGenerator:
    """Génère les fichiers squelettes avec instructions détaillées."""

    def __init__(self, cell_path: Path, cell_type: str, cell_name: str):
        self.cell_path = cell_path
        self.cell_type = cell_type
        self.cell_name = cell_name

    def generate(self, plan: DevPlan) -> List[Path]:
        """Génère tous les fichiers squelettes selon le plan."""
        generated = []

        for file_plan in plan.files:
            file_path = self._generate_skeleton(file_plan)
            if file_path:
                generated.append(file_path)

        return generated

    def _generate_skeleton(self, file_plan: FilePlan) -> Optional[Path]:
        """Génère un fichier squelette spécifique."""
        full_path = self.cell_path / file_plan.path
        full_path.parent.mkdir(parents=True, exist_ok=True)

        content = self._get_skeleton_content(file_plan)
        full_path.write_text(content, encoding="utf-8")

        return full_path

    def _get_skeleton_content(self, file_plan: FilePlan) -> str:
        """Retourne le contenu du squelette selon le type."""
        generators = {
            "blueprint": self._skeleton_blueprint,
            "blueprint_cron": self._skeleton_blueprint_cron,
            "model": self._skeleton_model,
            "route": self._skeleton_route,
            "routes_init": self._skeleton_routes_init,
            "template_main": self._skeleton_template_main,
            "template_alpine": self._skeleton_template_alpine,
            "workflow_frontend": self._skeleton_workflow_frontend,
            "workflow_init": self._skeleton_workflow_init,
            "workflow_backend": self._skeleton_workflow_backend,
            "cron_job": self._skeleton_cron_job,
        }

        generator = generators.get(file_plan.file_type, self._skeleton_generic)
        return generator(file_plan)

    def _skeleton_blueprint(self, fp: FilePlan) -> str:
        instructions = "\n".join("+ " + i for i in fp.instructions)
        return f'''"""
TODO IA:
{instructions}
"""

from flask import Blueprint

bp = Blueprint('{self.cell_name}', __name__, template_folder='templates')

from . import routes  # noqa: F401
'''

    def _skeleton_blueprint_cron(self, fp: FilePlan) -> str:
        instructions = "\n".join("+ " + i for i in fp.instructions)
        return f'''"""
TODO IA:
{instructions}
"""

from flask import Blueprint
from app import scheduler

bp = Blueprint('cron_{self.cell_name}', __name__)

from . import cron

# Enregistrement du job
@scheduler.task('interval', id='{self.cell_name}_job', minutes=60)
def scheduled_job():
    with scheduler.app.app_context():
        cron.execute()
'''

    def _skeleton_model(self, fp: FilePlan) -> str:
        model_name = fp.context.get("model_name", "Model")
        # Récupérer les champs depuis le contexte ou utiliser des champs par défaut
        fields = fp.context.get("fields", [])
        if not fields:
            fields = [{"name": "name", "type": "str"}, {"name": "created_at", "type": "datetime"}]
        
        # Générer les champs pour la dataclass
        field_defs = ["    id: Optional[int] = None"]
        for field_info in fields:
            fname = field_info.get("name", "field")
            ftype = field_info.get("type", "str")
            if ftype == "str":
                field_defs.append(f"    {fname}: str = ''")
            elif ftype == "int":
                field_defs.append(f"    {fname}: Optional[int] = None")
            elif ftype == "datetime":
                field_defs.append(f"    {fname}: Optional[datetime] = None")
            else:
                field_defs.append(f"    {fname}: Optional[str] = None")
        
        fields_str = "\n".join(field_defs)
        
        return f'''import logging
import sqlite3
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Dict, List, Any, Optional

from ...database import get_db

logger = logging.getLogger(__name__)


@dataclass
class {model_name.title()}:
{fields_str}
    
    @classmethod
    def from_row(cls, row: sqlite3.Row) -> "{model_name.title()}":
        """Crée une instance depuis une ligne DB"""
        return cls(**{{key: row[key] for key in row.keys()}})
    
    @classmethod
    def get_by_id(cls, id: int) -> Optional["{model_name.title()}"]:
        """Récupère par ID"""
        db = get_db()
        row = db.execute("SELECT * FROM {model_name.lower()} WHERE id = ?", (id,)).fetchone()
        return cls.from_row(row) if row else None
    
    @classmethod
    def get_all(cls) -> List["{model_name.title()}"]:
        """Récupère tous les enregistrements"""
        db = get_db()
        rows = db.execute("SELECT * FROM {model_name.lower()} ORDER BY id DESC").fetchall()
        return [cls.from_row(row) for row in rows]
    
    def save(self) -> None:
        """INSERT ou UPDATE"""
        db = get_db()
        if self.id:
            # Update - à compléter selon les champs réels
            pass
        else:
            # Insert - à compléter selon les champs réels
            pass
    
    def delete(self) -> None:
        """DELETE"""
        if self.id:
            db = get_db()
            db.execute("DELETE FROM {model_name.lower()} WHERE id = ?", (self.id,))
            db.commit()
            self.id = None
'''

    def _skeleton_route(self, fp: FilePlan) -> str:
        route_name = Path(fp.path).stem
        return f'''from flask import render_template, jsonify, request
from .. import bp


@bp.route('/')
def {route_name}():
    """Route {route_name} - Cell {self.cell_name}"""
    # Version squelette fonctionnelle - sera enrichie par l'IA
    return jsonify({{"status": "ok", "cell": "{self.cell_name}", "route": "{route_name}"}})
'''

    def _skeleton_routes_init(self, fp: FilePlan) -> str:
        # Générer les imports dynamiquement selon les fichiers existants
        imports = []
        routes_dir = self.cell_path / "routes"
        if routes_dir.exists():
            for f in sorted(routes_dir.glob("*.py")):
                if f.name != "__init__.py":
                    imports.append(f"from .{f.stem} import *")
        
        imports_str = "\n".join(imports) if imports else "# Les imports seront générés automatiquement"
        
        return f'''"""Routes initialization for {self.cell_name}"""
{imports_str}
'''

    def _skeleton_template_main(self, fp: FilePlan) -> str:
        # Template fonctionnel minimal sans dépendances externes
        return f'''<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{self.cell_name}</title>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <style>
        body {{ font-family: system-ui, sans-serif; padding: 2rem; }}
        .container {{ max-width: 800px; margin: 0 auto; }}
        h1 {{ color: #333; }}
    </style>
</head>
<body>
    <div class="container" x-data="{self.cell_name}()">
        <h1>{self.cell_name}</h1>
        <p>Cell squelette fonctionnel</p>
        <div x-show="loading">Chargement...</div>
        <div x-show="error" style="color: red" x-text="error"></div>
        <button @click="loadData()">Tester</button>
        <pre x-show="data"><code x-text="JSON.stringify(data, null, 2)"></code></pre>
    </div>
    <script>
        function {self.cell_name}() {{
            return {{
                loading: false,
                error: null,
                data: null,
                async loadData() {{
                    this.loading = true;
                    this.error = null;
                    try {{
                        const response = await fetch('/{self.cell_name}/');
                        this.data = await response.json();
                    }} catch (e) {{
                        this.error = e.message;
                    }} finally {{
                        this.loading = false;
                    }}
                }}
            }}
        }}
    </script>
</body>
</html>
'''

    def _skeleton_template_alpine(self, fp: FilePlan) -> str:
        # Le JS est inline dans index.html pour le squelette fonctionnel
        return ''

    def _skeleton_workflow_frontend(self, fp: FilePlan) -> str:
        # Pour le squelette fonctionnel, les workflows sont inline dans le template HTML
        # Ce fichier sera utilisé par l'IA pour la version enrichie
        return ''

    def _skeleton_workflow_init(self, fp: FilePlan) -> str:
        # Pour le squelette fonctionnel, l'init est inline dans le template HTML
        return ''

    def _skeleton_workflow_backend(self, fp: FilePlan) -> str:
        instructions = "\n".join("+ " + i for i in fp.instructions)
        wf_name = fp.context.get("workflow_name", "workflow")
        return f'''"""
TODO IA:
{instructions}
"""

import logging
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)


@dataclass
class WorkflowContext:
    workflow_id: str
    started_at: datetime
    user_id: Optional[str] = None
    request_id: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class WorkflowResult:
    success: bool
    data: Any
    logs: List[Dict[str, Any]]
    execution_time_ms: int
    error: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class WorkflowLogger:
    """Logger avec contexte de workflow"""
    
    def __init__(self, context: WorkflowContext):
        self.context = context
        self.logs = []
    
    def _log(self, level: str, event: str, data: Dict[str, Any]):
        entry = {{
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'level': level,
            'event': event,
            'workflow_id': self.context.workflow_id,
            'data': data
        }}
        self.logs.append(entry)
        
        msg = f"[{{self.context.workflow_id}}] [{{event}}] {{data}}"
        if level == 'ERROR':
            logger.error(msg)
        elif level == 'WARNING':
            logger.warning(msg)
        elif level == 'DEBUG':
            logger.debug(msg)
        else:
            logger.info(msg)
    
    def debug(self, event: str, data: Dict[str, Any] = None):
        self._log('DEBUG', event, data or {{}})
    
    def info(self, event: str, data: Dict[str, Any] = None):
        self._log('INFO', event, data or {{}})
    
    def error(self, event: str, data: Dict[str, Any] = None):
        self._log('ERROR', event, data or {{}})
    
    def get_logs(self) -> List[Dict[str, Any]]:
        return self.logs


# MEGAFUNCTION PRINCIPALE
def execute(**kwargs) -> Dict[str, Any]:
    """
    Workflow: {wf_name}
    Description: Selon specs/wf-backend/{wf_name}.md
    """
    context = WorkflowContext(
        workflow_id=kwargs.get('workflow_id', str(uuid.uuid4())),
        started_at=datetime.utcnow(),
        user_id=kwargs.get('user_id'),
        request_id=kwargs.get('request_id')
    )
    
    log = WorkflowLogger(context)
    start_time = datetime.utcnow()
    
    log.info('WORKFLOW_START', {{
        'workflow': '{wf_name}',
        'input_keys': list(kwargs.keys()),
        'context': context.to_dict()
    }})
    
    try:
        # TODO IA: Étape 1 - Validation
        log.debug('VALIDATION_START', {{'input': kwargs}})
        # validated = _validate_input(kwargs, log)
        
        # TODO IA: Étape 2 - Traitement
        log.debug('PROCESSING_START')
        # result = _process_data(validated, log)
        
        execution_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        
        log.info('WORKFLOW_SUCCESS', {{'execution_time_ms': execution_time}})
        
        return WorkflowResult(
            success=True,
            data={{}},
            logs=log.get_logs(),
            execution_time_ms=execution_time
        ).to_dict()
        
    except Exception as e:
        execution_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        
        log.error('WORKFLOW_FAILED', {{
            'error_type': type(e).__name__,
            'error_message': str(e),
            'execution_time_ms': execution_time
        }})
        
        return WorkflowResult(
            success=False,
            data=None,
            logs=log.get_logs(),
            execution_time_ms=execution_time,
            error=str(e)
        ).to_dict()


# Route Flask
from .. import bp

@bp.route('/api/{wf_name}', methods=['POST'])
def {wf_name}_endpoint():
    from flask import request, jsonify
    
    data = request.get_json() or {{}}
    result = execute(
        **data,
        workflow_id=str(uuid.uuid4()),
        user_id=request.headers.get('X-User-Id')
    )
    
    return jsonify(result), 200 if result['success'] else 500
'''

    def _skeleton_cron_job(self, fp: FilePlan) -> str:
        instructions = "\n".join("+ " + i for i in fp.instructions)
        return f'''"""
TODO IA:
{instructions}
"""

import logging
import uuid
from datetime import datetime
from typing import Dict, Any

logger = logging.getLogger(__name__)


def execute() -> Dict[str, Any]:
    """
    Workflow cron: {self.cell_name}
    Exécuté périodiquement par APScheduler
    """
    workflow_id = str(uuid.uuid4())
    start_time = datetime.utcnow()
    
    logger.info(f'[{{workflow_id}}] CRON_START: {self.cell_name}')
    
    try:
        # TODO IA: Logique métier selon specs/wf-backend/
        
        logger.info(f'[{{workflow_id}}] CRON_SUCCESS')
        return {{'success': True, 'workflow_id': workflow_id}}
        
    except Exception as e:
        logger.error(f'[{{workflow_id}}] CRON_FAILED: {{e}}')
        return {{'success': False, 'error': str(e), 'workflow_id': workflow_id}}
'''

    def _skeleton_generic(self, fp: FilePlan) -> str:
        instructions = "\n".join("+ " + i for i in fp.instructions)
        return f'''"""
TODO IA:
{instructions}
"""

# TODO IA: Implémentation selon les specs
'''


# =============================================================================
# CELL TESTER
# =============================================================================

class CellTester:
    """Gère le processus de test automatisé."""

    def __init__(self, cell_path: Path, cell_type: str, cell_name: str, project_dir: Path):
        self.cell_path = cell_path
        self.cell_type = cell_type
        self.cell_name = cell_name
        self.project_dir = project_dir

    def run_tests(self, phase: str = "skeletons") -> Tuple[bool, List[str]]:
        """Orchestre le processus de test complet."""
        console.print(f"[blue]🔨 Tests ({phase})...")

        # Utilise les fonctions module-level pour la cohérence
        if not _check_server():
            console.print("  [yellow]⚠️ Serveur non démarré, tentative de démarrage...")
            server_ok, startup_errors = _start_server(self.project_dir)
            if not server_ok:
                console.print("  [red]❌ Impossible de démarrer le serveur")
                return False, startup_errors
            console.print("  [green]✅ Serveur démarré pour les tests")

        url = self._get_url()
        http_code, http_ok = self._get_http_status(url)

        # Les squelettes doivent être fonctionnels - pas de 404 accepté
        if not http_ok:
            console.print(f"  [red]❌ HTTP {http_code}")
            logs_dir = self._create_logs_dir()
            backend_errors = self._capture_backend_logs(logs_dir, 0)
            return False, [f"HTTP {http_code}"] + backend_errors

        logs_dir = self._create_logs_dir()
        screenshot_path = logs_dir / "screenshots" / f"{self.cell_name}.png"
        frontend_log = logs_dir / "frontend.json"

        test_ok, frontend_errors, output = self._run_playwright_test(url, screenshot_path, frontend_log)
        backend_errors = self._capture_backend_logs(logs_dir, 0)

        all_errors = frontend_errors + backend_errors
        if all_errors:
            console.print("  [red]Erreurs détectées, analyse IA...")
            analysis = self._analyze_with_ai(all_errors, frontend_log, logs_dir)
            return analysis[0] == "PASS", all_errors

        self._generate_report(logs_dir, http_code, test_ok and len(backend_errors) == 0)

        return test_ok and len(backend_errors) == 0, all_errors

    def _get_url(self) -> str:
        """Détermine l'URL selon le type de cell."""
        if self.cell_type == "screens":
            return f"http://localhost:5000/{self.cell_name}"
        elif self.cell_type == "backend-wf":
            return f"http://localhost:5000/api/{self.cell_name}"
        else:
            return f"http://localhost:5000/{self.cell_name}"

    def _create_logs_dir(self) -> Path:
        """Crée le dossier de logs pour ce test."""
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        logs_dir = self.cell_path / "logs" / timestamp
        logs_dir.mkdir(parents=True, exist_ok=True)
        (logs_dir / "screenshots").mkdir(exist_ok=True)
        return logs_dir

    def _get_http_status(self, url: str) -> Tuple[int, bool]:
        """Vérifie le code HTTP de l'URL (suit les redirections)."""
        try:
            # -L : suit les redirections
            result = subprocess.run(
                ["curl", "-s", "-L", "-o", "/dev/null", "-w", "%{http_code}", url],
                capture_output=True, text=True, timeout=10
            )
            code = result.stdout.strip()
            # 200-399 sont OK (y compris redirections 301, 302, 308)
            is_ok = code.isdigit() and 200 <= int(code) < 400
            return int(code) if code.isdigit() else 0, is_ok
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return 0, False

    def _run_playwright_test(self, url: str, screenshot_path: Path, log_path: Path) -> Tuple[bool, List[str], str]:
        """Lance le test Playwright."""
        test_script = self.project_dir / "scripts" / "test-frontend.py"
        if not test_script.exists():
            return False, ["Script test-frontend.py non trouvé"], ""

        venv_python = self.project_dir / "venv" / "bin" / "python"
        python_exe = str(venv_python) if venv_python.exists() else sys.executable

        try:
            result = subprocess.run(
                [python_exe, str(test_script), url, str(screenshot_path), str(log_path)],
                capture_output=True, text=True, timeout=60
            )
            output = result.stdout + result.stderr

            errors = []
            if log_path.exists():
                try:
                    with open(log_path, 'r') as f:
                        data = json.load(f)
                    for msg in data.get('messages', []):
                        if msg.get('type') == 'error':
                            errors.append(f"[CONSOLE] {msg.get('text', str(msg))}")
                except (json.JSONDecodeError, IOError):
                    pass

            test_passed = result.returncode == 0 and len(errors) == 0
            return test_passed, errors, output

        except subprocess.TimeoutExpired:
            return False, ["Timeout du test Playwright"], ""
        except Exception as e:
            return False, [f"Erreur test: {e}"], ""

    def _capture_backend_logs(self, logs_dir: Path, log_before: int) -> List[str]:
        """Capture les erreurs backend depuis flask_server.log."""
        flask_log = self.project_dir / "flask_server.log"
        if not flask_log.exists():
            return []

        errors = []
        try:
            with open(flask_log, 'r') as f:
                lines = f.readlines()

            log_after = len(lines)
            if log_after > log_before:
                new_lines = lines[log_before:]
                for line in new_lines:
                    if any(kw in line for kw in ["ERROR", "Exception", "Traceback", "ImportError", "NoAppException", "ModuleNotFoundError"]):
                        errors.append(f"[BACK] {line.strip()}")

                backend_log = logs_dir / "backend.log"
                with open(backend_log, 'w') as f:
                    f.writelines(new_lines)

            return errors[:20]

        except IOError:
            return []

    def _analyze_with_ai(self, errors: List[str], frontend_log: Path, logs_dir: Path) -> Tuple[str, str]:
        """Analyse les erreurs via IA (pi -p)."""
        frontend_data = ""
        if frontend_log.exists():
            try:
                frontend_data = frontend_log.read_text(encoding="utf-8")
            except IOError:
                pass

        backend_data = ""
        backend_log = logs_dir / "backend.log"
        if backend_log.exists():
            try:
                backend_data = backend_log.read_text(encoding="utf-8")
            except IOError:
                pass

        errors_str = "\n".join(errors[:10])
        prompt = f"""
Tu es un expert en debugging Flask/Alpine.js.

Analyse les logs de test suivants et détermine si le test passe ou échoue.

## Contexte
Cell: {self.cell_name}
Type: {self.cell_type}

## Logs Frontend (console navigateur)
```json
{frontend_data[:3000]}
```

## Logs Backend (Flask)
```
{backend_data[:3000]}
```

## Erreurs consolidées
```
{errors_str}
```

## Ta mission
1. Analyse les erreurs frontend (console JS, Alpine.js)
2. Analyse les erreurs backend (Flask, imports, SQL)
3. Identifie la cause racine des problèmes
4. Détermine si c'est un échec bloquant ou un warning

## Format de réponse
Réponds UNIQUEMENT avec ce format:

```
RÉSULTAT: PASS|FAIL

RAISONS:
- [PASS] Description si tout est OK
- [FAIL] Description de chaque erreur bloquante

ACTIONS RECOMMANDÉES:
- Action 1 à prendre pour corriger
- Action 2 à prendre
```
"""

        try:
            result = subprocess.run(
                ["pi", "-p", prompt],
                capture_output=True, text=True, timeout=60
            )

            response = result.stdout.strip()

            result_match = re.search(r'RÉSULTAT:\s*(PASS|FAIL)', response, re.IGNORECASE)
            result_str = result_match.group(1).upper() if result_match else "FAIL"

            return result_str, response

        except Exception as e:
            return "FAIL", f"Erreur analyse IA: {e}"

    def _generate_report(self, logs_dir: Path, http_code: int, test_passed: bool) -> None:
        """Génère le rapport JSON du test."""
        report = {
            "cell": self.cell_name,
            "timestamp": datetime.now().isoformat(),
            "url": self._get_url(),
            "status": "tested",
            "http_code": http_code,
            "test_passed": test_passed,
            "files": {
                "frontend": "frontend.json",
                "backend": "backend.log",
                "screenshot": f"screenshots/{self.cell_name}.png",
                "output": "test_output.log"
            }
        }
        (logs_dir / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")


# =============================================================================
# PROMPT GENERATOR
# =============================================================================

class PromptGenerator:
    """Génère les prompts pour chaque fichier squelette."""

    def __init__(self, cell_path: Path, cell_name: str):
        self.cell_path = cell_path
        self.cell_name = cell_name

    def generate_prompt(self, file_plan: FilePlan) -> str:
        """Génère un prompt spécifique pour un fichier squelette."""
        skeleton_path = self.cell_path / file_plan.path
        skeleton_content = ""
        if skeleton_path.exists():
            skeleton_content = skeleton_path.read_text(encoding="utf-8")

        specs_content = ""
        for source in file_plan.sources:
            if source.exists():
                specs_content += f"\n=== {source.name} ===\n"
                specs_content += source.read_text(encoding="utf-8")

        prompt = f"""
Tu es un développeur Flask expert.

Implémente le code COMPLET pour ce fichier en suivant les INSTRUCTIONS dans le fichier squelette.

## Fichier squelette ({file_plan.path})
```python
{skeleton_content}
```

## Specs source
```yaml
{specs_content[:5000]}
```

## Ta mission
1. Lis les INSTRUCTIONS dans le squelette (commentaires # TODO IA:)
2. Génère le code COMPLET et fonctionnel
3. Remplace les commentaires INSTRUCTIONS par du code
4. Réponds avec le fichier complet en YAML format:

```yaml
fichier:
  chemin: {file_plan.path}
  contenu: |
    # code complet ici avec indentation correcte
```

IMPORTANT:
- Le chemin doit être relatif à la cell (ex: routes/index.py)
- Le contenu doit être COMPLET et fonctionnel
- Respecte scrupuleusement les patterns de logging WORKFLOW_START, etc.
"""

        return prompt


# =============================================================================
# YAML EXTRACTOR
# =============================================================================

class YamlExtractor:
    """Extrait le code depuis les réponses YAML de l'IA."""

    @staticmethod
    def extract(response: str, cell_path: Path, dev2_logs_dir: Path, filename: str) -> bool:
        """Extrait et écrit le fichier depuis la réponse YAML."""
        try:
            cleaned = YamlExtractor._clean_yaml_response(response)

            response_path = dev2_logs_dir / f"{filename}.response.yaml"
            response_path.write_text(cleaned, encoding="utf-8")

            data = yaml.safe_load(cleaned)

            if not data or "fichier" not in data:
                console.print("[red]❌ Structure YAML invalide - clé 'fichier' manquante")
                return False

            fichier = data["fichier"]
            filepath = fichier.get("chemin", "").strip()
            filecontent = fichier.get("contenu", "")

            if not filepath:
                console.print("[red]❌ Chemin manquant dans la réponse")
                return False

            full_path = cell_path / filepath
            full_path.parent.mkdir(parents=True, exist_ok=True)

            if isinstance(filecontent, str):
                full_path.write_text(filecontent.strip(), encoding="utf-8")
            else:
                full_path.write_text(str(filecontent), encoding="utf-8")

            console.print(f"  [green]✅ {filepath}")
            return True

        except yaml.YAMLError as e:
            console.print(f"[red]❌ Erreur YAML: {e}")
            return False
        except Exception as e:
            console.print(f"[red]❌ Erreur extraction: {e}")
            return False

    @staticmethod
    def _clean_yaml_response(content: str) -> str:
        """Nettoie la réponse pour extraire le YAML."""
        pattern = r'```yaml\s*\n(.*?)(?:\n```|\Z)'
        match = re.search(pattern, content, re.DOTALL)
        if match:
            return match.group(1).strip()

        pattern = r'```\s*\n(.*?)\n```'
        match = re.search(pattern, content, re.DOTALL)
        if match:
            return match.group(1).strip()

        return content.strip()


# =============================================================================
# UTILITAIRES GIT
# =============================================================================

def _git_setup(project_dir: Path, cell_name: str) -> Optional[str]:
    """Configure git: crée/checkout la branche."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--git-dir"],
            cwd=str(project_dir),
            capture_output=True, check=False
        )
        if result.returncode != 0:
            return None

        branch_name = f"feature/cell-{cell_name.replace('_', '-')}"

        subprocess.run(
            ["git", "checkout", "-b", branch_name],
            cwd=str(project_dir),
            capture_output=True, check=False
        )
        subprocess.run(
            ["git", "checkout", branch_name],
            cwd=str(project_dir),
            capture_output=True, check=False
        )

        return branch_name
    except FileNotFoundError:
        return None


def _git_commit(project_dir: Path, cell_name: str) -> bool:
    """Commit les changements et push la branche."""
    try:
        subprocess.run(
            ["git", "add", "."],
            cwd=str(project_dir),
            capture_output=True, check=False
        )

        subprocess.run(
            ["git", "commit", "-m", f"feat({cell_name}): implémentation cell"],
            cwd=str(project_dir),
            capture_output=True, check=False
        )

        remote_check = subprocess.run(
            ["git", "remote"],
            cwd=str(project_dir),
            capture_output=True, check=False
        )
        if remote_check.stdout.strip():
            branch_name = f"feature/cell-{cell_name.replace('_', '-')}"
            subprocess.run(
                ["git", "push", "-u", "origin", branch_name],
                cwd=str(project_dir),
                capture_output=True, check=False
            )

        return True
    except FileNotFoundError:
        return False


# =============================================================================
# UTILITAIRES CELL
# =============================================================================

def _clean_cell(cell_path: Path) -> None:
    """Nettoie la cell: supprime tout sauf specs/."""
    if cell_path.exists():
        for item in cell_path.iterdir():
            if item.name != "specs":
                if item.is_dir():
                    shutil.rmtree(item)
                else:
                    item.unlink()

    (cell_path / "routes").mkdir(parents=True, exist_ok=True)
    (cell_path / "models").mkdir(parents=True, exist_ok=True)
    (cell_path / "templates").mkdir(parents=True, exist_ok=True)
    (cell_path / "templates" / "workflows").mkdir(parents=True, exist_ok=True)
    (cell_path / "logs").mkdir(parents=True, exist_ok=True)


def _create_tracking_artifact(cell_path: Path, plan: DevPlan) -> Path:
    """Crée le fichier de tracking dans specs/."""
    tracking_path = cell_path / "specs" / ".dev2-tracking.yaml"

    tracking_data = {
        "cell": plan.cell_name,
        "type": plan.cell_type,
        "status": "in_progress",
        "started_at": datetime.now().isoformat(),
        "files": {}
    }

    for file_plan in plan.files:
        tracking_data["files"][file_plan.path] = {
            "status": "todo_squelette",
            "type": file_plan.file_type
        }

    tracking_path.write_text(yaml.dump(tracking_data), encoding="utf-8")
    return tracking_path


def _update_tracking_status(tracking_path: Path, filepath: str, status: str) -> None:
    """Met à jour le statut d'un fichier dans le tracking."""
    if not tracking_path.exists():
        return

    data = yaml.safe_load(tracking_path.read_text(encoding="utf-8"))
    if filepath in data.get("files", {}):
        data["files"][filepath]["status"] = status
    tracking_path.write_text(yaml.dump(data), encoding="utf-8")


def _cleanup_tracking(tracking_path: Path) -> None:
    """Supprime le fichier de tracking."""
    if tracking_path.exists():
        tracking_path.unlink()


# =============================================================================
# REGISTER BLUEPRINT (PROGRAMMATIQUE)
# =============================================================================

def register_blueprint_in_app_py(cell_type: str, cell_name: str, project_dir: Path) -> bool:
    """
    Met à jour app/__init__.py pour enregistrer le blueprint d'une nouvelle cell.
    Méthode PROGRAMMATIQUE - pas d'IA.
    """
    app_init = project_dir / "app" / "__init__.py"
    if not app_init.exists():
        return False

    content = app_init.read_text(encoding="utf-8")

    if cell_type == "screens":
        url_prefix = f"/{cell_name}"
    elif cell_type == "backend-wf":
        url_prefix = f"/api/{cell_name}"
    elif cell_type == "cron":
        url_prefix = None
    else:
        url_prefix = f"/{cell_name}"

    if f"{cell_name}_bp" in content:
        return True

    lines = content.split("\n")

    import_line = f"from .{cell_type}.{cell_name} import bp as {cell_name}_bp"

    last_import_idx = -1
    for i, line in enumerate(lines):
        if line.startswith("from .") and "import bp" in line:
            last_import_idx = i

    if last_import_idx >= 0:
        lines.insert(last_import_idx + 1, import_line)
    else:
        for i, line in enumerate(lines):
            if line.startswith("from ") or line.startswith("import "):
                last_import_idx = i
        lines.insert(last_import_idx + 1, import_line)

    if url_prefix and cell_type != "cron":
        register_line = f"    app.register_blueprint({cell_name}_bp, url_prefix='{url_prefix}')"

        in_create_app = False
        return_idx = -1
        for i, line in enumerate(lines):
            if "def create_app" in line:
                in_create_app = True
            if in_create_app and line.strip().startswith("return"):
                return_idx = i
                break

        if return_idx >= 0:
            lines.insert(return_idx, register_line)

    new_content = "\n".join(lines)
    app_init.write_text(new_content, encoding="utf-8")

    console.print(f"  [green]✅ Blueprint '{cell_name}' enregistré dans app/__init__.py")
    return True


# =============================================================================
# SERVER UTILITIES (Module level)
# =============================================================================

def _wait_for_server(max_attempts: int = 30, delay: float = 1.0) -> bool:
    """Attend que le serveur Flask soit prêt avec plusieurs tentatives."""
    for i in range(max_attempts):
        try:
            result = subprocess.run(
                ["curl", "-s", "http://localhost:5000/"],
                capture_output=True, timeout=2
            )
            if result.returncode == 0:
                return True
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass
        time.sleep(delay)
    return False


def _check_server() -> bool:
    """Vérifie si Flask répond sur le port 5000."""
    try:
        result = subprocess.run(
            ["curl", "-s", "http://localhost:5000/"],
            capture_output=True, timeout=5
        )
        return result.returncode == 0
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return False


def _get_venv_python(project_dir: Path) -> Optional[Path]:
    """Trouve le Python du venv s'il existe."""
    # Linux/Mac
    venv_python = project_dir / "venv" / "bin" / "python"
    if venv_python.exists():
        return venv_python
    
    # Windows
    venv_python = project_dir / "venv" / "Scripts" / "python.exe"
    if venv_python.exists():
        return venv_python
    
    # Autres noms courants
    for venv_name in [".venv", "env", ".env"]:
        venv_python = project_dir / venv_name / "bin" / "python"
        if venv_python.exists():
            return venv_python
        venv_python = project_dir / venv_name / "Scripts" / "python.exe"
        if venv_python.exists():
            return venv_python
    
    return None


def _start_server(project_dir: Path) -> Tuple[bool, List[str]]:
    """Démarre le serveur Flask via le script d'initialisation ou directement."""
    
    # Trouver le Python à utiliser (venv ou système)
    venv_python = _get_venv_python(project_dir)
    python_exe = str(venv_python) if venv_python else sys.executable
    
    if venv_python:
        console.print(f"  [dim]📦 Utilisation du venv: {venv_python}")
    else:
        console.print("  [yellow]⚠️ Aucun venv trouvé, utilisation du Python système")
    
    # Essayer les scripts d'initialisation
    init_script = project_dir / "scripts" / "03-init-boilerplate.sh"
    if not init_script.exists():
        init_script = project_dir / "scripts" / "03-init-dev.sh"
    
    # Si script existe, l'utiliser (il active probablement le venv lui-même)
    if init_script.exists():
        try:
            console.print("  [blue]🚀 Démarrage via script d'initialisation...")
            
            # Injecter le PATH du venv pour que le script l'utilise
            env = os.environ.copy()
            if venv_python:
                venv_bin = venv_python.parent
                env['PATH'] = str(venv_bin) + os.pathsep + env.get('PATH', '')
                env['VIRTUAL_ENV'] = str(venv_python.parent.parent)
            
            subprocess.Popen(
                ["bash", str(init_script)],
                cwd=str(project_dir),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True,
                env=env
            )

            console.print("  [dim]⏳ Attente du démarrage (max 30s)...")
            if _wait_for_server(max_attempts=30, delay=1.0):
                console.print("  [green]✅ Serveur démarré sur http://localhost:5000")
                return True, []

            return False, ["Serveur Flask ne répond pas après démarrage via script"]

        except Exception as e:
            return False, [f"Erreur démarrage via script: {e}"]
    
    # Fallback: lancer Flask directement avec le Python du venv
    console.print("  [blue]🚀 Démarrage direct de Flask...")
    try:
        env = os.environ.copy()
        env['FLASK_APP'] = 'app:create_app()'
        env['FLASK_ENV'] = 'development'
        
        # Si venv, configurer l'environnement
        if venv_python:
            venv_path = venv_python.parent.parent
            env['VIRTUAL_ENV'] = str(venv_path)
            env['PATH'] = str(venv_python.parent) + os.pathsep + env.get('PATH', '')
            # Supprimer PYTHONHOME s'il existe pour éviter les conflits
            env.pop('PYTHONHOME', None)
        
        subprocess.Popen(
            [python_exe, "-m", "flask", "run", "--host=0.0.0.0", "--port=5000"],
            cwd=str(project_dir),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
            env=env
        )
        
        console.print("  [dim]⏳ Attente du démarrage (max 30s)...")
        if _wait_for_server(max_attempts=30, delay=1.0):
            console.print("  [green]✅ Serveur démarré sur http://localhost:5000")
            return True, []
            
        return False, ["Serveur Flask ne répond pas après lancement direct"]
        
    except Exception as e:
        return False, [f"Erreur lancement direct: {e}"]


def _restart_server(project_dir: Path) -> bool:
    """Redémarre le serveur Flask (kill + start)."""
    import signal
    import os
    
    console.print("  [yellow]🛑 Arrêt du serveur existant...")
    
    # Tuer tous les processus Flask
    try:
        # Chercher et tuer les processus Flask
        subprocess.run(
            ["pkill", "-f", "flask run"],
            capture_output=True, check=False
        )
        subprocess.run(
            ["pkill", "-f", "python.*flask"],
            capture_output=True, check=False
        )
        # Attendre que les processus meurent
        time.sleep(2)
    except Exception:
        pass
    
    # Vérifier que le serveur est bien arrêté
    for _ in range(5):
        if not _check_server():
            break
        time.sleep(1)
    
    console.print("  [blue]🚀 Redémarrage du serveur...")
    server_ok, errors = _start_server(project_dir)
    
    if not server_ok:
        console.print(f"  [red]❌ Échec du redémarrage:")
        for err in errors[:3]:
            console.print(f"    [dim]{err}")
    
    return server_ok


def _ensure_server_running(project_dir: Path) -> bool:
    """Vérifie que le serveur est démarré, le démarre si nécessaire."""
    if _check_server():
        console.print("  [dim]✅ Serveur Flask déjà démarré")
        return True
    
    console.print("  [yellow]⚠️ Serveur non démarré, tentative de démarrage...")
    server_ok, errors = _start_server(project_dir)
    if not server_ok:
        console.print(f"  [red]❌ Échec du démarrage du serveur:")
        for err in errors:
            console.print(f"    [dim]{err}")
    return server_ok


# =============================================================================
# COMMANDE PRINCIPALE
# =============================================================================

@click.command()
@click.option(
    "--project-dir",
    type=click.Path(exists=True, file_okay=False),
    help="Chemin du projet",
)
@click.option("--cell", "cell_name", help="Développer une cell spécifique")
@click.option("--skip-git", is_flag=True, help="Ne pas gérer git")
@click.option("--skip-clean", is_flag=True, help="Ne pas nettoyer avant dev")
@click.option("--skip-server-check", is_flag=True, help="Ne pas vérifier/démarrer le serveur")
def dev2(project_dir: str | None, cell_name: str | None, skip_git: bool, skip_clean: bool, skip_server_check: bool) -> int:
    """Développe les cells avec approche plan/squelettes/IA incrémentale."""

    if project_dir is None:
        project_dir = Path.cwd()
    else:
        project_dir = Path(project_dir)

    project = Project(project_dir)

    if cell_name:
        cell = project.find_cell(cell_name)
        if not cell:
            console.print(f"[red]❌ Cell '{cell_name}' non trouvée")
            return 1
        cells = [cell]
    else:
        cells = project.get_cells_to_develop()

    if not cells:
        console.print(Panel.fit("Aucune cell à développer", style="yellow"))
        console.print("Conditions: specs/valide.md existe ET specs/devok.md absent")
        return 0

    console.print(Panel.fit(f"Développement dev2: {len(cells)} cell(s)", style="blue"))
    for cell in cells:
        console.print(f"  • {cell.name} ({cell.cell_type.value})")

    if not Confirm.ask("\nContinuer le développement?", default=True):
        return 0

    try:
        subprocess.run(["pi", "--version"], capture_output=True, check=False)
    except FileNotFoundError:
        console.print("[red]❌ Commande 'pi' non disponible")
        return 1

    # Vérifier/démarrer le serveur Flask
    if not skip_server_check:
        console.print()
        console.print("[blue]🔍 Vérification du serveur Flask...")
        if not _ensure_server_running(project_dir):
            console.print("[red]❌ Impossible de continuer sans serveur Flask")
            return 1

    for cell in cells:
        console.print()
        console.print(f"[cyan]{'═' * 40}")
        console.print(f"[cyan]📦 {cell.name}")
        console.print(f"[cyan]{'═' * 40}")

        cell_path_str = str(cell.path)
        if "/screens/" in cell_path_str:
            cell_type = "screens"
        elif "/backend-wf/" in cell_path_str or "/backend_wf/" in cell_path_str:
            cell_type = "backend-wf"
        elif "/cron/" in cell_path_str:
            cell_type = "cron"
        else:
            cell_type = "screens"

        branch_name = None
        if not skip_git:
            branch_name = _git_setup(project_dir, cell.name)
            if branch_name:
                console.print(f"[dim]🌿 Branche: {branch_name}")

        console.print("[blue]🔨 Analyse des specs...")
        analyzer = SpecsAnalyzer(cell.path, cell_type)
        plan = analyzer.analyze()
        console.print(f"[green]✅ {len(plan.files)} fichiers à générer")

        if not skip_clean:
            console.print("[blue]🔨 Nettoyage de la cell...")
            _clean_cell(cell.path)
            console.print("[green]✅ Cell nettoyée")

        tracking_path = _create_tracking_artifact(cell.path, plan)

        console.print("[blue]🔨 Génération des squelettes...")
        skeleton_gen = SkeletonGenerator(cell.path, cell_type, cell.name)
        skeleton_files = skeleton_gen.generate(plan)
        console.print(f"[green]✅ {len(skeleton_files)} squelettes créés")

        # Enregistrer le blueprint IMMÉDIATEMENT après génération des squelettes
        # pour que Flask puisse servir les routes
        console.print("[blue]🔨 Enregistrement du blueprint dans app/__init__.py...")
        register_blueprint_in_app_py(cell_type, cell.name, project_dir)
        
        # Redémarrer le serveur pour prendre en compte le nouveau blueprint
        console.print("[blue]🔄 Redémarrage du serveur Flask...")
        _restart_server(project_dir)

        console.print("[blue]🔨 Tests des squelettes...")
        tester = CellTester(cell.path, cell_type, cell.name, project_dir)
        test_ok, errors = tester.run_tests(phase="squelettes")

        if not test_ok:
            console.print("[red]❌ Tests squelettes échoués")
            console.print(f"[dim]Erreurs: {errors[:5]}")
            continue

        console.print("[green]✅ Tests squelettes passés")

        console.print("[blue]🔨 Génération IA des fichiers...")
        prompt_gen = PromptGenerator(cell.path, cell.name)
        dev2_logs_dir = cell.path / "dev2-logs"
        dev2_logs_dir.mkdir(exist_ok=True)

        for file_plan in plan.files:
            console.print(f"  [blue]Génération: {file_plan.path}")

            prompt = prompt_gen.generate_prompt(file_plan)

            prompt_path = dev2_logs_dir / f"{file_plan.path.replace('/', '_')}.prompt.txt"
            prompt_path.write_text(prompt, encoding="utf-8")

            try:
                result = subprocess.run(
                    ["pi", "-p", prompt],
                    capture_output=True, text=True, timeout=300
                )

                if result.returncode != 0:
                    console.print(f"    [red]❌ Erreur pi")
                    continue

                extractor = YamlExtractor()
                if extractor.extract(result.stdout, cell.path, dev2_logs_dir, file_plan.path.replace('/', '_')):
                    _update_tracking_status(tracking_path, file_plan.path, "done")
                else:
                    _update_tracking_status(tracking_path, file_plan.path, "error")

            except subprocess.TimeoutExpired:
                console.print(f"    [red]❌ Timeout pi")
                continue

        console.print("[blue]🔨 Tests du code généré...")
        test_ok, errors = tester.run_tests(phase="code")

        if not test_ok:
            console.print("[red]❌ Tests code échoués")
            continue

        console.print("[green]✅ Tests code passés")

        if not skip_git and branch_name:
            console.print("[blue]🔨 Commit git...")
            _git_commit(project_dir, cell.name)

        _cleanup_tracking(tracking_path)

        console.print(f"[green]✅ {cell.name} développée avec succès!")

    return 0


def main():
    """Point d'entrée."""
    return dev2()


if __name__ == "__main__":
    sys.exit(main())
