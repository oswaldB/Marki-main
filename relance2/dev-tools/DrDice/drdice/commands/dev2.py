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
from .dev2_server import ensure_server_running, start_server_simple, fix_server_with_ai

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

        # Analyser les modèles D'ABORD pour les avoir disponibles pour les routes
        models = self._analyze_models()
        files.extend(models)
        
        # Puis analyser les routes avec les modèles disponibles
        files.extend(self._analyze_routes(models))
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

    def _analyze_routes(self, models: List[FilePlan] = None) -> List[FilePlan]:
        """Analyse les routes depuis specs/routes/*.md et génère un seul fichier routes.py."""
        files = []
        routes_dir = self.specs_path / "routes"

        if not routes_dir.exists():
            return files

        # Collecte toutes les sources de routes
        route_sources = sorted(routes_dir.glob("*.md"))
        if not route_sources:
            return files

        # Extrait les noms des modèles disponibles pour les imports
        model_names = []
        if models:
            for model in models:
                if model.context and "model_name" in model.context:
                    model_names.append(model.context["model_name"])

        # Génère un seul fichier routes.py avec toutes les routes
        files.append(FilePlan(
            path="routes.py",
            file_type="route",
            instructions=[
                "Implémente TOUTES les routes depuis specs/routes/*.md",
                "Chaque route correspond à un fichier .md dans specs/routes/",
                "Si des données sont nécessaires: importe les modèles depuis .models",
                "Retourne render_template() ou jsonify()",
                "Pas de SQL direct ici, utilise les modèles"
            ],
            sources=route_sources,
            context={"model_names": model_names}
        ))

        return files

    def _analyze_templates(self) -> List[FilePlan]:
        """Analyse les templates depuis specs/mockups/*.html."""
        files = []
        mockups_dir = self.specs_path / "mockups"

        if not mockups_dir.exists():
            return files

        files.append(FilePlan(
            path=f"templates/{self.cell_name}/index.html",
            file_type="template_main",
            instructions=[
                "Code pixel-perfect depuis specs/mockups/*.html",
                "Choisis le layout: layouts/base.html (pages simples sans nav: login, register) ou layouts/layout_app.html (pages avec nav: dashboard)",
                "Définit les blocs appropriés selon le layout choisi",
                "x-data avec x-init sur le container principal"
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

    # Chemin vers les templates de squelettes
    TEMPLATES_DIR = Path(__file__).parent.parent / "templates" / "flask" / "squelettes"

    def __init__(self, cell_path: Path, cell_type: str, cell_name: str):
        self.cell_path = cell_path
        self.cell_type = cell_type
        self.cell_name = cell_name

    def _load_template(self, template_name: str, **kwargs) -> str:
        """Charge un template et remplace les variables."""
        # Déterminer le sous-dossier selon le type de cell
        if self.cell_type == "screens":
            subdir = "screens"
        elif self.cell_type == "backend-wf":
            subdir = "backend"
        elif self.cell_type == "cron":
            subdir = "cron"
        else:
            subdir = "screens"  # fallback
        
        template_path = self.TEMPLATES_DIR / subdir / template_name
        if not template_path.exists():
            # Fallback: générer un contenu minimal
            return f'"""\nTODO IA: Implémenter selon les specs\n"""\n'
        
        template = template_path.read_text(encoding="utf-8")
        
        # Remplacer les variables {var} par leur valeur
        for key, value in kwargs.items():
            template = template.replace(f"{{{key}}}", str(value))
        
        return template

    def _load_template_screen(self, template_name: str, **kwargs) -> str:
        """Charge un template depuis le dossier screens/."""
        template_path = self.TEMPLATES_DIR / "screens" / template_name
        if not template_path.exists():
            return f'"""\nTODO IA: Implémenter selon les specs\n"""\n'
        
        template = template_path.read_text(encoding="utf-8")
        for key, value in kwargs.items():
            template = template.replace(f"{{{key}}}", str(value))
        return template

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
        
        # Sécurité: vérifier qu'on n'écrit pas en dehors de app/
        if "app" not in str(full_path):
            console.print(f"[red]❌ ERREUR: Tentative d'écriture hors de app/: {full_path}")
            return None
        
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
        model_name = fp.context.get("model_name", "Model") if fp.context else "Model"
        instructions = "\n".join("+ " + i for i in fp.instructions)
        fields = fp.context.get("fields", []) if fp.context else []
        fields_desc = "\n".join(f"#   - {f.get('name', 'field')}: {f.get('type', 'str')}" for f in fields) if fields else f"#   (voir specs/models/{model_name}.md)"
        return self._load_template(
            "model.py",
            instructions=instructions,
            model_name=model_name.title(),
            fields_desc=fields_desc
        )

    def _skeleton_route(self, fp: FilePlan) -> str:
        instructions = "\n".join("+ " + i for i in fp.instructions)
        
        # Génère les imports des modèles si disponibles
        model_imports = ""
        if fp.context and "model_names" in fp.context:
            model_names = fp.context["model_names"]
            if model_names:
                model_imports = "\n".join([f"# from .models.{m.lower()} import {m.title()}" for m in model_names])
        
        # Génère des placeholders pour chaque route trouvée dans les specs
        route_placeholders = []
        for i, source in enumerate(fp.sources):
            route_name = source.stem
            # La première route est la route principale = '/'
            if i == 0:
                route_placeholders.append(f'''
@bp.route('/')
def {route_name}():
    """
    Route {route_name} - implémenter selon specs/routes/{route_name}.md
    """
    return render_template('{self.cell_name}/index.html')
''')
            else:
                route_placeholders.append(f'''
@bp.route('/{route_name}')
def {route_name}():
    """
    Route {route_name} - implémenter selon specs/routes/{route_name}.md
    """
    # TODO IA: Implémenter cette route
    pass
''')
        
        routes_code = "".join(route_placeholders) if route_placeholders else ""
        
        return self._load_template(
            "route.py",
            instructions=instructions,
            model_imports=model_imports if model_imports else "# Exemple: from .models.user import User",
            routes_code=routes_code,
            cell_name=self.cell_name
        )
    def _skeleton_template_main(self, fp: FilePlan) -> str:
        instructions = "\n".join("+ " + i for i in fp.instructions) if fp.instructions else "+ Code pixel-perfect depuis specs/mockups/*.html"
        return self._load_template(
            "template_main.html",
            instructions=instructions,
            cell_name=self.cell_name
        )
    def _skeleton_template_alpine(self, fp: FilePlan) -> str:
        instructions = "\n".join("+ " + i for i in fp.instructions)
        return self._load_template(
            "template_alpine.html",
            instructions=instructions,
            cell_name=self.cell_name
        )
    def _skeleton_workflow_frontend(self, fp: FilePlan) -> str:
        wf_name = fp.context.get("workflow_name", "workflow") if fp.context else "workflow"
        instructions = "\n".join("+ " + i for i in fp.instructions)
        wf_data_name = wf_name.replace("-", "").title()
        return self._load_template(
            "workflow_frontend.html",
            instructions=instructions,
            wf_name=wf_name,
            wf_data_name=wf_data_name
        )
    def _skeleton_workflow_init(self, fp: FilePlan) -> str:
        instructions = "\n".join("+ " + i for i in fp.instructions)
        return self._load_template(
            "workflow_init.html",
            instructions=instructions
        )
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
        """Orchestre le processus de test selon la phase."""
        if phase == "server_startup":
            return self._test_server_startup()
        elif phase == "squelettes":
            return self._test_skeletons()
        elif phase == "code":
            return self._test_code()
        else:
            return False, [f"Phase inconnue: {phase}"]
    
    def _test_server_startup(self) -> Tuple[bool, List[str]]:
        """Phase 1: Test au démarrage du serveur - vérifie uniquement les logs serveur."""
        console.print(f"[blue]🔨 Tests (server_startup)...")
        
        # Vérification serveur
        console.print("  [dim]1. Vérification serveur Flask...")
        if not _check_server():
            console.print("  [yellow]  ⚠️ Serveur non démarré, tentative de démarrage...")
            server_ok, startup_errors = _start_server(self.project_dir)
            if not server_ok:
                console.print("  [red]  ❌ Impossible de démarrer le serveur")
                return False, startup_errors
            console.print("  [green]  ✅ Serveur démarré")
        else:
            console.print("  [green]  ✅ Serveur Flask actif")
        
        # Attendre que le serveur soit prêt
        console.print("  [dim]2. Attente stabilisation serveur (3s)...")
        time.sleep(3)
        
        # Vérification logs serveur
        console.print("  [dim]3. Analyse logs serveur...")
        logs_dir = self._create_logs_dir()
        backend_errors = self._capture_backend_logs(logs_dir, 0)
        
        if backend_errors:
            console.print(f"  [red]  ❌ {len(backend_errors)} erreur(s) serveur détectée(s)")
            for err in backend_errors[:3]:
                console.print(f"    [dim]  - {err[:100]}...")
            return False, backend_errors
        
        console.print("  [green]  ✅ Aucune erreur serveur détectée")
        console.print(f"[green]✅ Tests (server_startup) réussis")
        return True, []
    
    def _test_skeletons(self) -> Tuple[bool, List[str]]:
        """Phase 2: Test après génération des squelettes - vérifie HTTP + contenu."""
        console.print(f"[blue]🔨 Tests (skeletons)...")
        
        # Vérification serveur
        console.print("  [dim]1. Vérification serveur Flask...")
        if not _check_server():
            console.print("  [red]  ❌ Serveur non disponible")
            return False, ["Serveur Flask non démarré"]
        console.print("  [green]  ✅ Serveur Flask actif")
        
        # Test HTTP
        url = self._get_url()
        console.print(f"  [dim]2. Test HTTP GET {url}...")
        http_code, http_ok = self._get_http_status(url)
        if not http_ok:
            console.print(f"  [red]  ❌ HTTP {http_code}")
            return False, [f"HTTP {http_code}"]
        console.print(f"  [green]  ✅ HTTP {http_code}")
        
        # Vérification contenu squelette (pour les screens)
        if self.cell_type == "screens":
            console.print(f"  [dim]3. Vérification contenu squelette...")
            content_ok, content_error = self._check_skeleton_content(url)
            if not content_ok:
                console.print(f"  [red]  ❌ {content_error}")
                return False, [content_error]
            console.print(f"  [green]  ✅ Contenu squelette OK")
        
        # Logs backend
        logs_dir = self._create_logs_dir()
        console.print("  [dim]4. Analyse logs backend...")
        backend_errors = self._capture_backend_logs(logs_dir, 0)
        
        if backend_errors:
            console.print(f"  [yellow]  ⚠️ {len(backend_errors)} erreur(s) backend")
            return False, backend_errors
        
        console.print("  [green]  ✅ Aucune erreur backend")
        console.print(f"[green]✅ Tests (skeletons) réussis")
        return True, []
    
    def _test_code(self) -> Tuple[bool, List[str]]:
        """Phase 3: Test après génération IA - récupère console web + logs serveur."""
        console.print(f"[blue]🔨 Tests (code)...")
        
        # Vérification serveur
        console.print("  [dim]1. Vérification serveur Flask...")
        if not _check_server():
            console.print("  [red]  ❌ Serveur non disponible")
            return False, ["Serveur Flask non démarré"]
        console.print("  [green]  ✅ Serveur Flask actif")
        
        url = self._get_url()
        logs_dir = self._create_logs_dir()
        screenshot_path = logs_dir / "screenshots" / f"{self.cell_name}.png"
        frontend_log = logs_dir / "frontend.json"
        
        # Test Playwright avec attente 10s pour capturer tous les logs
        console.print("  [dim]2. Test Playwright (attente 10s pour logs)...")
        test_ok, frontend_errors, output = self._run_playwright_test(url, screenshot_path, frontend_log, wait_time=10000)
        
        # Afficher stats console
        if frontend_log.exists():
            try:
                with open(frontend_log, 'r') as f:
                    log_data = json.load(f)
                    msg_count = len(log_data.get('console', []))
                    error_count = len(log_data.get('errors', []))
                    console.print(f"  [dim]  📄 {msg_count} messages console, {error_count} erreurs")
            except:
                pass
        
        if not test_ok:
            console.print("  [red]  ❌ Playwright: erreurs détectées")
            for err in frontend_errors[:3]:
                console.print(f"    [dim]  - {err}")
        else:
            console.print(f"  [green]  ✅ Playwright: page OK")
        
        # Vérification squelette remplacé (pour les screens)
        if self.cell_type == "screens":
            console.print(f"  [dim]3. Vérification remplacement squelette...")
            skeleton_replaced, skeleton_error = self._check_no_skeleton_text(url)
            if not skeleton_replaced:
                console.print(f"  [red]  ❌ {skeleton_error}")
                return False, [skeleton_error]
            console.print(f"  [green]  ✅ Squelette remplacé")
        
        # Logs backend
        console.print("  [dim]4. Analyse logs backend...")
        backend_errors = self._capture_backend_logs(logs_dir, 0)
        
        if backend_errors:
            console.print(f"  [yellow]  ⚠️ {len(backend_errors)} erreur(s) backend")
            for err in backend_errors[:3]:
                console.print(f"    [dim]  - {err[:100]}...")
        else:
            console.print("  [green]  ✅ Aucune erreur backend")
        
        # Génération rapport
        all_errors = frontend_errors + backend_errors
        self._generate_report(logs_dir, 200, len(backend_errors) == 0)
        console.print(f"  [dim]5. Rapport généré: {logs_dir / 'report.json'}")
        
        # Résumé amélioré des erreurs
        if all_errors:
            # Classifier les erreurs
            network_errors = [e for e in all_errors if "[NETWORK]" in e or "404" in e.lower()]
            console_errors = [e for e in all_errors if "[CONSOLE]" in e and "error" in e.lower()]
            warning_errors = [e for e in all_errors if "warning" in e.lower() or "tailwind" in e.lower()]
            other_errors = [e for e in all_errors if e not in network_errors + console_errors + warning_errors]
            
            unique_issues = len(set(
                e.split(":")[0] if ":" in e else e 
                for e in all_errors 
                if "warning" not in e.lower()
            ))
            
            console.print(f"\n  [dim]📊 Résumé des erreurs:")
            if network_errors:
                console.print(f"    [red]  • {len(network_errors)} erreur(s) réseau (404)")
            if console_errors:
                console.print(f"    [red]  • {len(console_errors)} erreur(s) JS console")
            if warning_errors:
                console.print(f"    [yellow]  • {len(warning_errors)} warning(s)")
            if backend_errors:
                console.print(f"    [red]  • {len(backend_errors)} erreur(s) backend")
            
            console.print(f"\n[red]❌ Tests (code) échoués ({unique_issues} problème(s) unique(s), {len(all_errors)} entrées)")
        else:
            console.print(f"[green]✅ Tests (code) réussis")
        
        success = len([e for e in all_errors if "warning" not in e.lower()]) == 0
        return success, all_errors
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
    def _check_skeleton_content(self, url: str) -> Tuple[bool, str]:
        """Vérifie que la page contient le message de squelette attendu."""
        expected_text = f"Page {self.cell_name} en cours de développement"
        try:
            result = subprocess.run(
                ["curl", "-s", "-L", url],
                capture_output=True, text=True, timeout=10
            )
            content = result.stdout
            if expected_text in content:
                return True, ""
            else:
                return False, f"Texte squelette non trouvé: '{expected_text}'"
        except (subprocess.TimeoutExpired, FileNotFoundError) as e:
            return False, f"Erreur récupération contenu: {e}"
    def _check_no_skeleton_text(self, url: str) -> Tuple[bool, str]:
        """Vérifie que le texte du squelette n'existe plus (après génération IA)."""
        forbidden_texts = [
            f"Page {self.cell_name} en cours de développement",
            "Ce squelette sera enrichi par l'IA dans l'étape suivante."
        ]
        try:
            result = subprocess.run(
                ["curl", "-s", "-L", url],
                capture_output=True, text=True, timeout=10
            )
            content = result.stdout
            for forbidden in forbidden_texts:
                if forbidden in content:
                    return False, f"Texte squelette encore présent: '{forbidden}'"
            return True, ""
        except (subprocess.TimeoutExpired, FileNotFoundError) as e:
            return False, f"Erreur récupération contenu: {e}"
    def _run_playwright_test(self, url: str, screenshot_path: Path, log_path: Path, wait_time: int = 3000) -> Tuple[bool, List[str], str]:
        """Lance le test Playwright avec temps d'attente configurable."""
        # Chercher le script dans plusieurs emplacements possibles
        possible_paths = [
            self.project_dir / "scripts" / "test-frontend.py",
            self.project_dir / "dev-tools" / "DrDice" / "scripts" / "test-frontend.py",
            self.project_dir / ".archive" / "scripts" / "test-frontend.py",
        ]
        
        test_script = None
        for path in possible_paths:
            if path.exists():
                test_script = path
                break
        
        if not test_script:
            return False, ["Script test-frontend.py non trouvé (cherché dans: " + ", ".join(str(p) for p in possible_paths) + ")"], ""
        venv_python = self.project_dir / "venv" / "bin" / "python"
        python_exe = str(venv_python) if venv_python.exists() else sys.executable
        try:
            result = subprocess.run(
                [python_exe, str(test_script), url, str(screenshot_path), str(log_path), str(wait_time)],
                capture_output=True, text=True, timeout=60
            )
            output = result.stdout + result.stderr
            errors = []
            if log_path.exists():
                try:
                    with open(log_path, 'r') as f:
                        data = json.load(f)
                    # Nouvelle structure: errors contient source, type, message
                    for err in data.get('errors', []):
                        source = err.get('source', 'unknown')
                        msg_type = err.get('type', 'error')
                        msg_text = err.get('message', str(err))
                        errors.append(f"[{source.upper()}] [{msg_type}] {msg_text}")
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
## Fichier à implémenter: {file_plan.path}
## Contenu actuel (squelette avec instructions IA):
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
3. Remplace les commentaires INSTRUCTIONS par du code réel
4. Supprime les baliges Jinja2 {{% raw %}} et {{% endraw %}} si présentes
## Format de réponse
Réponds UNIQUEMENT avec le code complet du fichier, sans balises markdown, sans explications.
Le code doit être prêt à être écrit directement dans le fichier.
IMPORTANT:
- Le contenu doit être COMPLET et fonctionnel
- Respecte scrupuleusement les patterns de logging WORKFLOW_START, etc.
- N'inclus PAS de balises Jinja2 {{% raw %}} ou {{% endraw %}} dans le code final
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
            
            # Sécurité: vérifier qu'on n'écrit pas en dehors de app/
            if "app" not in str(full_path):
                console.print(f"[red]❌ ERREUR: Tentative d'écriture hors de app/: {full_path}")
                return False
            
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
def _git_commit(project_dir: Path, cell_name: str, files_count: int = 0) -> Tuple[bool, str]:
    """Commit les changements avec message descriptif et retour explicite."""
    try:
        # Vérifier s'il y a des changements à commit
        status_result = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=str(project_dir),
            capture_output=True, text=True, check=False
        )
        
        if not status_result.stdout.strip():
            console.print("  [dim]  ℹ️ Aucun changement à commit")
            return True, "Aucun changement"
        
        # Stage
        console.print("  [dim]  📦 git add .")
        subprocess.run(
            ["git", "add", "."],
            cwd=str(project_dir),
            capture_output=True, check=False
        )
        
        # Commit avec message descriptif
        commit_msg = f"feat({cell_name}): implémentation complète\n\n- {files_count} fichiers générés\n- Tests passés"
        console.print(f'  [dim]  📝 git commit -m "feat({cell_name}): ..."')
        
        commit_result = subprocess.run(
            ["git", "commit", "-m", commit_msg],
            cwd=str(project_dir),
            capture_output=True, text=True, check=False
        )
        
        if commit_result.returncode != 0:
            error_msg = commit_result.stderr.strip() if commit_result.stderr else "Erreur inconnue"
            console.print(f"  [red]  ❌ Échec du commit: {error_msg}")
            return False, error_msg
        
        # Push
        remote_check = subprocess.run(
            ["git", "remote"],
            cwd=str(project_dir),
            capture_output=True, check=False
        )
        
        if remote_check.stdout.strip():
            branch_name = f"feature/cell-{cell_name.replace('_', '-')}"
            console.print(f"  [dim]  🚀 git push origin {branch_name}")
            
            push_result = subprocess.run(
                ["git", "push", "-u", "origin", branch_name],
                cwd=str(project_dir),
                capture_output=True, text=True, check=False
            )
            
            if push_result.returncode != 0:
                error_msg = push_result.stderr.strip() if push_result.stderr else "Échec du push"
                console.print(f"  [yellow]  ⚠️ Push échoué: {error_msg}")
                return False, error_msg
            
            console.print(f"  [green]  ✅ Commit et push réussis sur {branch_name}")
            return True, branch_name
        else:
            console.print("  [green]  ✅ Commit local réussi (pas de remote configuré)")
            return True, "local"
            
    except FileNotFoundError:
        console.print("  [red]  ❌ Git non disponible")
        return False, "Git non disponible"
def _create_pull_request(project_dir: Path, cell_name: str, branch_name: str) -> Tuple[bool, str]:
    """Crée une pull request via gh CLI avec retour explicite."""
    try:
        # Vérifier que gh est installé
        gh_check = subprocess.run(
            ["gh", "--version"],
            capture_output=True, check=False
        )
        
        if gh_check.returncode != 0:
            console.print("  [yellow]  ⚠️ GitHub CLI (gh) non installé - PR non créée")
            return False, "gh non installé"
        
        # Vérifier l'authentification
        auth_check = subprocess.run(
            ["gh", "auth", "status"],
            cwd=str(project_dir),
            capture_output=True, check=False
        )
        
        if auth_check.returncode != 0:
            console.print("  [yellow]  ⚠️ Non authentifié sur GitHub - PR non créée")
            return False, "Non authentifié"
        
        # Créer la PR
        pr_title = f"feat: implémentation cell {cell_name}"
        pr_body = f"## Cell {cell_name}\n\nImplémentation complète avec:\n- Squelettes fonctionnels\n- Code généré par IA\n- Tests automatisés passés\n\n### Fichiers créés\n- Routes, modèles, templates\n- Workflows frontend/backend"
        
        console.print(f'  [dim]  🔀 gh pr create --title "{pr_title}" ...')
        
        pr_result = subprocess.run(
            [
                "gh", "pr", "create",
                "--title", pr_title,
                "--body", pr_body,
                "--base", "main"
            ],
            cwd=str(project_dir),
            capture_output=True, text=True, check=False
        )
        
        if pr_result.returncode != 0:
            # La PR existe peut-être déjà
            if "already exists" in pr_result.stderr.lower() or "already exists" in pr_result.stdout.lower():
                console.print("  [dim]  ℹ️ Une PR existe déjà pour cette branche")
                return True, "PR existante"
            
            error_msg = pr_result.stderr.strip() if pr_result.stderr else "Échec de création"
            console.print(f"  [yellow]  ⚠️ Création PR échouée: {error_msg}")
            return False, error_msg
        
        # Extraire l'URL de la PR
        pr_url = pr_result.stdout.strip()
        console.print(f"  [green]  ✅ Pull Request créée: {pr_url}")
        return True, pr_url
        
    except FileNotFoundError:
        console.print("  [yellow]  ⚠️ GitHub CLI non disponible")
        return False, "gh non trouvé"

def _generate_data_mapping(cell_path: Path, cell_type: str, cell_name: str) -> Path:
    """
    Génère le fichier data-mapping.md dans cell/specs/ à partir du template.
    Ce document référence les workflows frontend pour chaque bouton du mockup,
    les routes utilisées par les workflows et par index.html.
    """
    data_mapping_path = cell_path / "specs" / "data-mapping.md"
    
    # Ne pas écraser si existe déjà
    if data_mapping_path.exists():
        console.print(f"  [dim]  ℹ️ data-mapping.md existe déjà, conservation du fichier existant")
        return data_mapping_path
    
    # Déterminer le sous-dossier selon le type de cell
    if cell_type == "screens":
        subdir = "screens"
    elif cell_type == "backend-wf":
        subdir = "backend"
    elif cell_type == "cron":
        subdir = "cron"
    else:
        subdir = "screens"
    
    # Charger le template
    template_path = Path(__file__).parent.parent / "templates" / "flask" / "squelettes" / subdir / "data-mapping.md"
    
    if template_path.exists():
        template_content = template_path.read_text(encoding="utf-8")
        # Remplacer les variables
        content = template_content.replace("{cell_name}", cell_name)
        content = content.replace("{date}", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    else:
        # Template minimal si le template n'existe pas
        content = f"""# Data Mapping - {cell_name}

## Description
Ce document référence les workflows et routes pour la cell `{cell_name}`.

## À compléter
- [ ] Identifier les boutons du mockup et leurs workflows frontend
- [ ] Lister les routes utilisées par les workflows
- [ ] Lister les routes utilisées par index.html
- [ ] Vérifier que toutes les routes existent dans specs/routes/

*Généré le {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}*
"""
    
    # Écrire le fichier
    data_mapping_path.write_text(content, encoding="utf-8")
    console.print(f"  [green]  ✅ data-mapping.md créé dans specs/")
    console.print(f"  [dim]     📋 Complétez-le avec les workflows frontend pour chaque bouton")
    
    return data_mapping_path

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
def _create_devok(cell_path: Path, cell_name: str) -> None:
    """Crée le fichier devok.md pour marquer la cell comme développée."""
    devok_path = cell_path / "specs" / "devok.md"
    
    content = f"""# Développement OK
## Cell: {cell_name}
**Statut:** ✅ Développée avec succès
**Date:** {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
**Méthode:** dev2 (plan/squelettes/IA incrémentale)
**Fichiers générés:**
- Blueprint et routes
- Modèles (si applicable)
- Templates (si écran)
- Workflows frontend/backend (si applicable)
**Tests:**
- [x] Squelettes fonctionnels testés
- [x] Code généré testé
---
Ce fichier indique que la cell a été développée.
Ne pas supprimer manuellement sauf pour forcer un re-développement.
"""
    
    devok_path.write_text(content, encoding="utf-8")
    console.print(f"  [green]  ✅ devok.md créé")
def _cleanup_tracking(tracking_path: Path) -> None:
    """Supprime le fichier de tracking."""
    if tracking_path.exists():
        tracking_path.unlink()
# =============================================================================
# REGISTER BLUEPRINT (PROGRAMMATIQUE)
# =============================================================================
def ensure_layouts_loader_in_app_py(project_dir: Path) -> bool:
    """
    Configure le ChoiceLoader pour les templates globaux dans app/__init__.py.
    Permet à tous les blueprints d'accéder à app/templates/ (layouts communs).
    """
    app_init = project_dir / "app" / "__init__.py"
    if not app_init.exists():
        return False
    
    content = app_init.read_text(encoding="utf-8")
    
    # Vérifier si déjà configuré (on vérifie le nouveau chemin templates/)
    if "global_templates_dir" in content or "templates_loader" in content:
        return True
    
    # Si ancienne version avec layouts/, on met à jour
    if "layouts_loader" in content:
        content = content.replace("'layouts'", "'templates'")
        content = content.replace("layouts_loader", "templates_loader")
        content = content.replace("# Configuration du loader pour layouts globaux", 
                                   "# Configuration du loader pour templates globaux")
        app_init.write_text(content, encoding="utf-8")
        console.print(f"  [green]  ✅ ChoiceLoader mis à jour pour app/templates/")
        return True
    
    # Ajouter l'import de ChoiceLoader et FileSystemLoader après les imports existants
    lines = content.split("\n")
    
    # Trouver où insérer les imports jinja2 (après les imports flask)
    import_idx = 0
    for i, line in enumerate(lines):
        if line.startswith("from flask") or line.startswith("import flask"):
            import_idx = i + 1
    
    # Insérer les imports jinja2
    jinja_import = "from jinja2 import FileSystemLoader, ChoiceLoader"
    lines.insert(import_idx, jinja_import)
    
    # Mettre à jour l'index après insertion
    for i, line in enumerate(lines):
        if "def create_app" in line:
            # Trouver la fin de la fonction (ligne avec return app)
            for j in range(i + 1, len(lines)):
                if lines[j].strip().startswith("return app"):
                    # Insérer avant le return app
                    indent = len(lines[j]) - len(lines[j].lstrip())
                    indent_str = " " * indent
                    
                    loader_code = [
                        "",
                        f"{indent_str}# Configuration du template loader global",
                        f"{indent_str}# Permet aux blueprints d'accéder à app/templates/ (layouts communs)",
                        f"{indent_str}base_dir = os.path.dirname(os.path.abspath(__file__))",
                        f"{indent_str}global_templates_dir = os.path.join(base_dir, 'templates')",
                        f"{indent_str}app.jinja_loader = ChoiceLoader([",
                        f"{indent_str}    app.jinja_loader,",
                        f"{indent_str}    FileSystemLoader(global_templates_dir)",
                        f"{indent_str}])",
                    ]
                    
                    for k, code_line in enumerate(loader_code):
                        lines.insert(j + k, code_line)
                    break
            break
    
    new_content = "\n".join(lines)
    app_init.write_text(new_content, encoding="utf-8")
    console.print(f"  [green]  ✅ ChoiceLoader pour app/templates/ configuré dans app/__init__.py")
    return True

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


def _apply_corrections_from_verification(cell_path: Path, verification_text: str, console) -> int:
    """
    Parse la réponse de vérification et applique automatiquement les corrections.
    Retourne le nombre de corrections appliquées.
    """
    import re
    
    corrections_applied = 0
    
    # Pattern pour extraire les blocs de code avec leur chemin de fichier
    # Format attendu: fichier: chemin/du/fichier\n```python\ncontenu\n```
    file_pattern = r'(?:fichier|file)\s*[:=]\s*["\']?([^"\'\n]+)["\']?\s*(?:\n|$).*?(?:```python\n|```\n)(.*?)(?:\n```)'
    
    # Rechercher tous les blocs de correction
    matches = re.findall(file_pattern, verification_text, re.DOTALL | re.IGNORECASE)
    
    if not matches:
        # Essayer un autre pattern: recherche de sections "Corrections proposées"
        # avec des blocs de code
        code_blocks = re.findall(r'```python\n(.*?)\n```', verification_text, re.DOTALL)
        
        # Si on trouve des blocs de code sans chemin de fichier explicite,
        # essayer de déterminer le fichier à partir du contexte
        if code_blocks:
            for block in code_blocks:
                # Chercher une indication de fichier dans le texte avant le bloc
                preceding_text = verification_text[:verification_text.find(block)]
                file_match = re.search(r'(?:dans|pour|file|fichier)\s+[`\']?(\S+\.(?:py|html))[`\']?', preceding_text, re.IGNORECASE)
                if file_match:
                    target_file = file_match.group(1)
                    # Nettoyer le markdown
                    target_file = target_file.replace('**', '').replace('`', '').strip()
                    target_path = cell_path / target_file
                    if target_path.exists():
                        target_path.write_text(block.strip(), encoding="utf-8")
                        console.print(f"    [green]✅ Corrigé: {target_file}")
                        corrections_applied += 1
        return corrections_applied
    
    # Traiter les correspondances trouvées
    for filepath, content in matches:
        filepath = filepath.strip()
        
        # Nettoyer le markdown (enlever ** et ` qui encadrent le chemin)
        filepath = filepath.replace('**', '').replace('`', '').strip()
        
        # Nettoyer le chemin (enlever les préfixes comme app/screens/login/)
        if 'app/' in filepath:
            filepath = filepath.split('app/')[-1]
        
        target_path = cell_path / filepath
        
        # Sécurité: vérifier qu'on n'écrit pas en dehors de la cell
        if not str(target_path).startswith(str(cell_path)):
            console.print(f"    [red]❌ Chemin hors scope ignoré: {filepath}")
            continue
        
        try:
            target_path.parent.mkdir(parents=True, exist_ok=True)
            target_path.write_text(content.strip(), encoding="utf-8")
            console.print(f"    [green]✅ Corrigé: {filepath}")
            corrections_applied += 1
        except Exception as e:
            console.print(f"    [red]❌ Erreur écriture {filepath}: {e}")
    
    return corrections_applied


def _enrich_buttons_with_ids(cell_path: Path, cell_name: str, plan: DevPlan, console, project_dir: Path) -> Optional[Path]:
    """
    Enrichit les boutons dans index.html avec des IDs uniques CSS
    et vérifie qu'ils ont un @click vers un workflow frontend.
    Crée le fichier all-buttons-with-id.md listant tous les boutons.
    """
    import re
    
    index_html_path = cell_path / "templates" / cell_name / "index.html"
    if not index_html_path.exists():
        return None
    
    content = index_html_path.read_text(encoding="utf-8")
    
    # Trouver tous les boutons
    button_pattern = r'<button[^>]*>(.*?)</button>'
    buttons = list(re.finditer(button_pattern, content, re.DOTALL | re.IGNORECASE))
    
    if not buttons:
        return None
    
    # Collecter les informations sur les boutons
    buttons_info = []
    modified_content = content
    offset = 0
    
    for i, match in enumerate(buttons):
        btn_tag = match.group(0)
        btn_text = match.group(1).strip()
        
        # Générer un ID unique
        btn_id = f"btn-{cell_name}-{i+1:02d}"
        
        # Vérifier si le bouton a déjà un id
        if 'id=' not in btn_tag.lower():
            # Ajouter l'id au tag button
            new_tag = btn_tag.replace('<button', f'<button id="{btn_id}"', 1)
            
            # Calculer la position ajustée avec l'offset
            start_pos = match.start() + offset
            end_pos = match.end() + offset
            
            modified_content = modified_content[:start_pos] + new_tag + modified_content[end_pos:]
            offset += len(new_tag) - len(btn_tag)
        else:
            # Extraire l'id existant
            id_match = re.search(r'id=["\']([^"\']+)["\']', btn_tag)
            if id_match:
                btn_id = id_match.group(1)
            new_tag = btn_tag
        
        # Vérifier si @click est présent
        has_click = '@click' in btn_tag or 'x-on:click' in btn_tag
        click_handler = ""
        
        if has_click:
            click_match = re.search(r'[@:]click=["\']([^"\']+)["\']', btn_tag)
            if click_match:
                click_handler = click_match.group(1)
        
        buttons_info.append({
            'id': btn_id,
            'text': btn_text,
            'has_click': has_click,
            'click_handler': click_handler,
            'tag': new_tag
        })
    
    # Écrire le fichier index.html modifié
    index_html_path.write_text(modified_content, encoding="utf-8")
    
    # Vérifier via IA que tous les boutons ont un workflow frontend associé
    alpinejs_path = cell_path / "templates" / "alpinejs.html"
    workflows_dir = cell_path / "templates" / "workflows"
    
    workflow_files = []
    if workflows_dir.exists():
        workflow_files = list(workflows_dir.glob("*.html"))
    
    # Construire le contexte pour l'IA
    check_prompt = f"""Tu es un expert Alpine.js. Vérifie que chaque bouton de la cell '{cell_name}' a un @click qui appelle une fonction définie dans un workflow frontend.

## Boutons trouvés:
"""
    for btn in buttons_info:
        click_status = f"@click={btn['click_handler']}" if btn['has_click'] else "PAS DE @CLICK"
        check_prompt += f"- ID: {btn['id']}, Texte: '{btn['text']}', {click_status}\n"
    
    check_prompt += "\n## Workflows frontend disponibles:\n"
    for wf_file in workflow_files:
        wf_content = wf_file.read_text(encoding="utf-8")[:1000]
        check_prompt += f"\n=== {wf_file.name} ===\n{wf_content}\n"
    
    if alpinejs_path.exists():
        alpine_content = alpinejs_path.read_text(encoding="utf-8")[:2000]
        check_prompt += f"\n=== alpinejs.html (début) ===\n{alpine_content}\n"
    
    check_prompt += """
## Ta mission:

Pour CHAQUE bouton:
1. Vérifie que le @click appelle une fonction existante dans un workflow frontend
2. Si un bouton n'a pas de @click, indique "❌ PAS DE @CLICK"
3. Si le @click appelle une fonction inexistante, indique "❌ FONCTION INEXISTANTE: [nom]"
4. Si tout est OK, indique "✅ [nom_fonction] défini dans [fichier_workflow]"

## Format de réponse:

```
VERIFICATION DES BOUTONS:

- btn-[cell]-01: [texte] -> ✅|❌ [détails]
- btn-[cell]-02: [texte] -> ✅|❌ [détails]
...

RÉCAPITULATIF:
- Boutons OK: X
- Boutons sans @click: X
- Boutons avec fonction inexistante: X

ACTIONS RECOMMANDÉES:
- [si besoin] Ajouter @click="nomWorkflow()" au bouton [id]
- [si besoin] Créer le workflow [nom] dans workflows/[nom].html
```

Réponds UNIQUEMENT avec ce format.
"""
    
    try:
        result = subprocess.run(
            ["pi", "-p"],
            input=check_prompt,
            capture_output=True, text=True, timeout=120
        )
        
        verification_result = result.stdout.strip() if result.returncode == 0 else "Erreur vérification"
    except Exception as e:
        verification_result = f"Erreur: {e}"
    
    # Créer le fichier all-buttons-with-id.md
    buttons_md_content = f"""# Boutons de la cell {cell_name}

## Liste des boutons avec IDs

| ID | Texte | @click | Statut |
|----|-------|--------|--------|
"""
    for btn in buttons_info:
        status = "✅" if btn['has_click'] else "❌"
        click_info = btn['click_handler'] if btn['has_click'] else "AUCUN"
        buttons_md_content += f"| {btn['id']} | {btn['text']} | {click_info} | {status} |\n"
    
    buttons_md_content += f"""

## Vérification automatique

```
{verification_result}
```

## Pour le test Playwright

Les IDs CSS à utiliser pour les tests:
"""
    for btn in buttons_info:
        buttons_md_content += f"- `#{btn['id']}` - {btn['text']}\n"
    
    buttons_md_path = cell_path / "specs" / "all-buttons-with-id.md"
    buttons_md_path.write_text(buttons_md_content, encoding="utf-8")
    
    return buttons_md_path


def _test_buttons_click(cell_path: Path, cell_name: str, buttons_file: Path, tester: CellTester, console, project_dir: Path) -> Tuple[bool, List[str]]:
    """
    Test Playwright qui clique sur tous les boutons et vérifie que les workflows sont appelés.
    """
    import json
    
    # Lire le fichier des boutons
    buttons_content = buttons_file.read_text(encoding="utf-8")
    
    # Extraire les IDs des boutons
    import re
    button_ids = re.findall(r'\|\s*(btn-[^\s|]+)', buttons_content)
    button_ids = [bid.strip() for bid in button_ids if bid.strip().startswith('btn-')]
    
    if not button_ids:
        return True, []
    
    url = f"http://localhost:5000/{cell_name}"
    
    # Convertir button_ids en format string pour le script
    button_ids_str = str(button_ids)
    
    # Créer un script Playwright temporaire pour tester les clics
    # Note: On utilise des doubles accolades {{ }} pour échapper les f-strings
    test_script_content = f'''#!/usr/bin/env python3
"""Test de clics sur tous les boutons."""

import asyncio
import json
import sys
from playwright.async_api import async_playwright

async def test_buttons():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        
        # Collecter les logs console
        console_logs = []
        page.on("console", lambda msg: console_logs.append({{
            "type": msg.type,
            "text": msg.text
        }}))
        
        # Naviguer vers la page
        await page.goto("{url}")
        await page.wait_for_load_state("networkidle")
        await asyncio.sleep(2)  # Attendre Alpine.js
        
        results = {{
            "buttons_tested": [],
            "errors": []
        }}
        
        button_ids = {button_ids_str}
        
        for btn_id in button_ids:
            try:
                # Vérifier que le bouton existe
                selector = f"#{{btn_id}}"
                btn = await page.query_selector(selector)
                if not btn:
                    results["errors"].append(f"Bouton #{{btn_id}} non trouvé")
                    continue
                
                # Récupérer le @click
                onclick = await btn.get_attribute("@click") or await btn.get_attribute("x-on:click") or ""
                
                # Capturer les logs avant le clic
                logs_before = len(console_logs)
                
                # Cliquer sur le bouton
                await btn.click()
                await asyncio.sleep(1)  # Attendre l'exécution
                
                # Vérifier les nouveaux logs
                new_logs = console_logs[logs_before:]
                workflow_called = any("WORKFLOW_START" in str(log.get("text", "")) for log in new_logs)
                
                results["buttons_tested"].append({{
                    "id": btn_id,
                    "onclick": onclick,
                    "workflow_called": workflow_called,
                    "logs": [log["text"] for log in new_logs[:3]]
                }})
                
                if not workflow_called and onclick:
                    results["errors"].append(f"#{{btn_id}}: @click='{{onclick}}' mais aucun WORKFLOW_START détecté")
                    
            except Exception as e:
                results["errors"].append(f"#{{btn_id}}: Erreur - {{str(e)}}")
        
        await browser.close()
        
        # Écrire les résultats
        output_path = "{cell_path}/logs/buttons_test_result.json"
        with open(output_path, "w") as f:
            json.dump(results, f, indent=2)
        
        # Retourner le code de sortie
        if results["errors"]:
            print(json.dumps({{"success": False, "errors": results["errors"], "tested": len(results["buttons_tested"])}}))
            sys.exit(1)
        else:
            print(json.dumps({{"success": True, "tested": len(results["buttons_tested"])}}))
            sys.exit(0)

asyncio.run(test_buttons())
'''
    
    test_script_path = cell_path / "logs" / "test_buttons_click.py"
    test_script_path.write_text(test_script_content, encoding="utf-8")
    
    # Exécuter le test
    try:
        result = subprocess.run(
            [sys.executable, str(test_script_path)],
            capture_output=True, text=True, timeout=60
        )
        
        # Parser le résultat
        try:
            output = json.loads(result.stdout.strip())
            if output.get("success"):
                return True, []
            else:
                return False, output.get("errors", ["Erreur inconnue"])
        except json.JSONDecodeError:
            return False, ["Erreur parsing résultat test"]
            
    except subprocess.TimeoutExpired:
        return False, ["Timeout du test de clics"]
    except Exception as e:
        return False, [f"Erreur test clics: {e}"]


# =============================================================================
# SERVER UTILITIES - Import from dev2_server module
# =============================================================================
from .dev2_server import (
    ensure_server_running as _ensure_server_running,
    start_server_simple,
    fix_server_with_ai,
    _check_server,
    _wait_for_server
)


def _start_server(project_dir: Path) -> Tuple[bool, List[str]]:
    """Wrapper pour compatibilité avec CellTester.
    
    Retourne (succès, liste_d_erreurs) au lieu de (succès, string_erreur).
    """
    success, error_log = start_server_simple(project_dir)
    if success:
        return True, []
    # Convertir le log d'erreur en liste de lignes
    error_lines = error_log.strip().split('\n') if error_log else ["Erreur inconnue"]
    return False, error_lines


def _restart_server(project_dir: Path) -> bool:
    """Redémarre le serveur Flask (kill + start)."""
    import os
    
    console.print("  [yellow]🛑 Arrêt du serveur existant...")
    
    # Tuer les processus Flask existants
    try:
        subprocess.run(["pkill", "-f", "flask run"], capture_output=True, check=False)
        subprocess.run(["pkill", "-f", "python.*run.py"], capture_output=True, check=False)
        time.sleep(2)
    except Exception:
        pass
    
    console.print("  [blue]🚀 Redémarrage du serveur...")
    success, error_log = start_server_simple(project_dir)
    
    if not success:
        console.print(f"  [red]❌ Échec du redémarrage")
        # Proposer correction IA
        if fix_server_with_ai(project_dir, error_log):
            console.print("  [blue]🔄 Nouvelle tentative après corrections...")
            success, _ = start_server_simple(project_dir)
            if success:
                console.print("  [green]✅ Serveur redémarré avec succès!")
                return True
        return False
    
    return True


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
        
        server_ok = _ensure_server_running(project_dir)
        
        # Si le serveur ne démarre pas, afficher message simple
        if not server_ok:
            console.print("[red]❌ Impossible de démarrer automatiquement le serveur Flask")
            console.print()
            console.print("[yellow]💡 Solutions:")
            console.print("   1. Démarrez manuellement: python run.py")
            console.print("   2. Puis relancez avec: drdice dev2 --cell NOM_CELL --skip-server-check")
            console.print("   3. Ou sautez les tests: drdice dev2 --cell NOM_CELL --skip-tests")
            console.print()
            return 1
                
    for cell in cells:
        console.print()
        console.print(f"[cyan]{'═' * 40}")
        console.print(f"[cyan]📦 {cell.name}")
        console.print(f"[cyan]{'═' * 40}")
        cell_path_str = str(cell.path)
        if "/screens/" in cell_path_str:
            cell_type = "screens"
        elif "/backend_wf/" in cell_path_str:
            cell_type = "backend-wf"
        elif "/cron/" in cell_path_str:
            cell_type = "cron"
        else:
            cell_type = "screens"
        # ═══════════════════════════════════════════════════════════════
        # VÉRIFICATION DES SPECS REQUISES
        # ═══════════════════════════════════════════════════════════════
        
        specs_dir = cell.path / "specs"
        routes_dir = specs_dir / "routes"
        models_dir = specs_dir / "models"
        
        # Vérifier routes/ (obligatoire sauf pour cron)
        if cell_type != "cron":
            has_routes = routes_dir.exists() and any(routes_dir.glob("*.md"))
            if not has_routes:
                console.print(f"[red]❌ ERREUR: specs/routes/ est vide ou inexistant")
                console.print(f"[dim]   La cell '{cell.name}' doit avoir au moins un fichier .md dans specs/routes/")
                console.print(f"[dim]   Créez les specs de routes avant de lancer dev2.")
                console.print()
                continue  # Passe à la cell suivante
        
        # Warning si models/ est vide (optionnel mais suspect)
        if models_dir.exists() and not any(models_dir.glob("*.md")):
            console.print(f"[yellow]⚠️  WARNING: specs/models/ existe mais est vide")
            console.print(f"[dim]   Aucun modèle ne sera généré pour cette cell.")
        
        # ═══════════════════════════════════════════════════════════════
        # GÉNÉRATION DU DATA-MAPPING
        # ═══════════════════════════════════════════════════════════════
        
        console.print(f"[blue]📋 Vérification data-mapping...")
        _generate_data_mapping(cell.path, cell_type, cell.name)
        
        branch_name = None
        if not skip_git:
            console.print("[blue]🔨 1. Setup Git...")
            branch_name = _git_setup(project_dir, cell.name)
            if branch_name:
                console.print(f"  [green]  ✅ Branche créée/checked out: {branch_name}")
            else:
                console.print("  [yellow]  ⚠️ Git non initialisé ou erreur - continuation sans git")
        else:
            console.print("[blue]🔨 1. Setup Git...")
            console.print("  [dim]  ℹ️ Git skipé (--skip-git)")
        console.print("[blue]🔨 2. Analyse des specs...")
        analyzer = SpecsAnalyzer(cell.path, cell_type)
        plan = analyzer.analyze()
        console.print(f"[green]  ✅ {len(plan.files)} fichiers à générer")
        if not skip_clean:
            console.print("[blue]🔨 3. Nettoyage de la cell...")
            _clean_cell(cell.path)
            console.print("[green]  ✅ Cell nettoyée")
        else:
            console.print("[blue]🔨 3. Nettoyage de la cell...")
            console.print("  [dim]  ℹ️ Skipé (--skip-clean)")
        tracking_path = _create_tracking_artifact(cell.path, plan)
        console.print("[blue]🔨 4. Génération des squelettes...")
        skeleton_gen = SkeletonGenerator(cell.path, cell_type, cell.name)
        skeleton_files = skeleton_gen.generate(plan)
        console.print(f"[green]  ✅ {len(skeleton_files)} squelettes créés")
        
        # Enregistrer le blueprint IMMÉDIATEMENT après génération des squelettes
        # pour que Flask puisse servir les routes
        console.print("[blue]🔨 5. Enregistrement du blueprint dans app/__init__.py...")
        register_blueprint_in_app_py(cell_type, cell.name, project_dir)
        
        # Configurer le ChoiceLoader pour les layouts (une seule fois suffit)
        console.print("  [dim]  📝 Configuration du loader de layouts...")
        ensure_layouts_loader_in_app_py(project_dir)
        
        # Redémarrer le serveur pour prendre en compte le nouveau blueprint
        console.print("  [dim]  🔄 Redémarrage du serveur Flask...")
        restart_ok = _restart_server(project_dir)
        if not restart_ok:
            console.print("  [yellow]  ⚠️ Redémarrage échoué, tentative de continuation...")
        
        # Phase 1: Test au démarrage du serveur
        console.print("[blue]🔨 5b. Tests de démarrage serveur...")
        tester = CellTester(cell.path, cell_type, cell.name, project_dir)
        startup_ok, startup_errors = tester.run_tests(phase="server_startup")
        if not startup_ok:
            console.print("[red]  ❌ Tests démarrage échoués")
            console.print(f"[dim]     Erreurs: {startup_errors[:5]}")
            continue
        console.print("[green]  ✅ Tests démarrage passés")
        
        console.print("[blue]🔨 6. Tests des squelettes...")
        test_ok, errors = tester.run_tests(phase="squelettes")
        if not test_ok:
            console.print("[red]  ❌ Tests squelettes échoués")
            console.print(f"[dim]     Erreurs: {errors[:5]}")
            continue
        console.print("[green]  ✅ Tests squelettes passés")
        console.print()
        console.print(f"[cyan]{'─' * 40}")
        console.print("[green]✅ Squelettes testés. Lancement automatique de la génération IA...")
        console.print(f"[cyan]{'─' * 40}")
        console.print()
        console.print("[blue]🔨 7. Génération IA des fichiers...")
        prompt_gen = PromptGenerator(cell.path, cell.name)
        dev2_logs_dir = cell.path / "dev2-logs"
        dev2_logs_dir.mkdir(exist_ok=True)
        for file_plan in plan.files:
            console.print(f"  [blue]  🤖 {file_plan.path}")
            prompt = prompt_gen.generate_prompt(file_plan)
            prompt_path = dev2_logs_dir / f"{file_plan.path.replace('/', '_')}.prompt.txt"
            prompt_path.write_text(prompt, encoding="utf-8")
            try:
                result = subprocess.run(
                    ["pi", "-p"],
                    input=prompt,
                    capture_output=True, text=True, timeout=300
                )
                if result.returncode != 0:
                    console.print(f"    [red]  ❌ Erreur pi: {result.stderr[:200]}")
                    continue
                # Écrire directement la réponse dans le fichier
                response_text = result.stdout.strip()
                
                # Sauvegarder la réponse pour debug
                response_path = dev2_logs_dir / f"{file_plan.path.replace('/', '_')}.response.txt"
                response_path.write_text(response_text, encoding="utf-8")
                
                # Nettoyer la réponse (enlever les balises markdown si présentes)
                if response_text.startswith('```'):
                    # Enlever la première ligne ```python ou ```
                    lines = response_text.split('\n')
                    if lines[0].startswith('```'):
                        lines = lines[1:]
                    if lines[-1].startswith('```'):
                        lines = lines[:-1]
                    response_text = '\n'.join(lines)
                
                # Écrire le fichier
                full_path = cell.path / file_plan.path
                full_path.parent.mkdir(parents=True, exist_ok=True)
                full_path.write_text(response_text, encoding="utf-8")
                
                console.print(f"    [green]  ✅ {file_plan.path}")
                _update_tracking_status(tracking_path, file_plan.path, "done")
            except subprocess.TimeoutExpired:
                console.print(f"    [red]  ❌ Timeout pi")
                continue
            except Exception as e:
                console.print(f"    [red]  ❌ Erreur écriture: {e}")
                continue
        
        # Étape 7a: Vérification du data-mapping
        console.print("[blue]🔨 7a. Vérification du data-mapping...")
        data_mapping_path = cell.path / "specs" / "data-mapping.md"
        if data_mapping_path.exists():
            data_mapping_content = data_mapping_path.read_text(encoding="utf-8")
            
            # Vérifier que le data-mapping est rempli (pas juste le template)
            if "## Workflows Frontend" in data_mapping_content and "- [ ]" not in data_mapping_content:
                console.print("  [green]  ✅ Data-mapping complet et rempli")
            else:
                console.print("  [yellow]  ⚠️ Data-mapping incomplet ou non rempli")
                console.print("  [dim]     Vérification automatique du data-mapping...")
                
                # Vérifier automatiquement le data-mapping via IA
                dm_check_prompt = f"""Tu es un expert en architecture Flask/Alpine.js.

Analyse le data-mapping de la cell '{cell.name}' et vérifie sa cohérence avec les fichiers générés.

## Data-mapping actuel:
```markdown
{data_mapping_content[:2000]}
```

## Fichiers générés:
"""
                # Ajouter les fichiers générés au prompt
                for fp in plan.files:
                    full_path = cell.path / fp.path
                    if full_path.exists() and fp.path.endswith(('.py', '.html')):
                        file_content = full_path.read_text(encoding="utf-8")
                        dm_check_prompt += f"\n=== {fp.path} ===\n```\n{file_content[:1500]}\n```\n"
                
                dm_check_prompt += """
## Ta mission:

1. Vérifie que TOUS les boutons/interactions du mockup ont un workflow frontend associé
2. Vérifie que les routes utilisées par les workflows existent bien dans routes.py
3. Vérifie que les routes utilisées par index.html existent bien
4. Identifie les incohérences (routes manquantes, workflows orphelins, etc.)

## Format de réponse:

```
ANALYSE DU DATA-MAPPING:

Boutons/Interactions trouvés:
- [bouton] -> workflow: [nom] ✅|❌

Routes utilisées par workflows:
- [route] -> défini dans routes.py: ✅|❌

Routes utilisées par index.html:
- [route] -> défini dans routes.py: ✅|❌

Incohérences détectées:
1. [description du problème]

Corrections nécessaires:
- [fichier]: [action à faire]
```

Réponds UNIQUEMENT avec le format ci-dessus. Si tout est cohérent, indique "✅ Data-mapping cohérent".
"""
                try:
                    dm_result = subprocess.run(
                        ["pi", "-p"],
                        input=dm_check_prompt,
                        capture_output=True, text=True, timeout=120
                    )
                    
                    if dm_result.returncode == 0:
                        dm_response = dm_result.stdout.strip()
                        
                        # Sauvegarder l'analyse
                        dm_log = cell.path / "logs" / f"data_mapping_check_{datetime.now().strftime('%H%M%S')}.txt"
                        dm_log.parent.mkdir(parents=True, exist_ok=True)
                        dm_log.write_text(dm_response, encoding="utf-8")
                        
                        if "✅ Data-mapping cohérent" in dm_response or "aucune incohérence" in dm_response.lower():
                            console.print("  [green]  ✅ Analyse data-mapping: tout est cohérent")
                        else:
                            console.print("  [yellow]  ⚠️ Incohérences data-mapping détectées - correction automatique...")
                            console.print(f"  [dim]     Log: {dm_log.relative_to(project_dir)}")
                            
                            # Afficher les incohérences trouvées
                            for line in dm_response.split('\n')[:20]:
                                if line.strip().startswith('-') or '❌' in line:
                                    console.print(f"    [dim]  {line}")
                            
                            # Lancer la correction automatique via pi
                            console.print("  [blue]    🤖 Correction automatique des incohérences...")
                            
                            dm_fix_prompt = f"""Tu es un expert en architecture Flask/Alpine.js.

Corrige les incohérences data-mapping détectées dans la cell '{cell.name}'.

## Analyse précédente (incohérences détectées):
```
{dm_response}
```

## Fichiers actuels à corriger:
"""
                            # Ajouter le contenu des fichiers concernés
                            for fp in plan.files:
                                full_path = cell.path / fp.path
                                if full_path.exists() and fp.path.endswith(('.py', '.html')):
                                    file_content = full_path.read_text(encoding="utf-8")
                                    dm_fix_prompt += f"\n=== {fp.path} ===\n```\n{file_content[:2000]}\n```\n"
                            
                            dm_fix_prompt += """
## Ta mission:

1. Analyse les incohérences détectées dans l'analyse ci-dessus
2. Génère le code corrigé pour chaque fichier problématique
3. Assure la cohérence entre:
   - Les routes définies dans routes.py
   - Les workflows frontend dans templates/workflows/
   - Les appels API dans les workflows
   - Les templates HTML

## Format de réponse:

```yaml
fichiers:
  - chemin: "routes.py"
    contenu: |
      # code complet corrigé
  - chemin: "templates/workflows/nom.html"
    contenu: |
      # code complet corrigé
```

Réponds UNIQUEMENT avec le format YAML ci-dessus. Si aucune correction n'est nécessaire, indique "✅ Aucune correction requise".
"""
                            
                            try:
                                dm_fix_result = subprocess.run(
                                    ["pi", "-p"],
                                    input=dm_fix_prompt,
                                    capture_output=True, text=True, timeout=180
                                )
                                
                                if dm_fix_result.returncode == 0:
                                    dm_fix_response = dm_fix_result.stdout.strip()
                                    
                                    # Sauvegarder la réponse de correction
                                    dm_fix_log = cell.path / "logs" / f"data_mapping_fix_{datetime.now().strftime('%H%M%S')}.txt"
                                    dm_fix_log.write_text(dm_fix_response, encoding="utf-8")
                                    
                                    if "Aucune correction" in dm_fix_response or "✅" in dm_fix_response:
                                        console.print("  [dim]    ℹ️ Aucune correction automatique applicable")
                                    else:
                                        # Appliquer les corrections
                                        fix_count = _apply_corrections_from_verification(cell.path, dm_fix_response, console)
                                        if fix_count > 0:
                                            console.print(f"  [green]    ✅ {fix_count} correction(s) data-mapping appliquée(s)")
                                        else:
                                            console.print("  [yellow]    ⚠️ Corrections reçues mais non appliquées (format non reconnu)")
                                            console.print(f"  [dim]       Voir: {dm_fix_log.relative_to(project_dir)}")
                                else:
                                    console.print(f"  [red]    ❌ Erreur correction pi: {dm_fix_result.stderr[:150]}")
                                    
                            except subprocess.TimeoutExpired:
                                console.print("  [red]    ❌ Timeout correction data-mapping")
                            except Exception as e:
                                console.print(f"  [red]    ❌ Erreur correction: {e}")
                    else:
                        console.print(f"  [yellow]  ⚠️ Erreur vérification data-mapping: {dm_result.stderr[:100]}")
                        
                except Exception as e:
                    console.print(f"  [yellow]  ⚠️ Erreur vérification data-mapping: {e}")
        else:
            console.print("  [yellow]  ⚠️ Data-mapping non trouvé - génération automatique...")
            _generate_data_mapping(cell.path, cell_type, cell.name)
        
        # Étape 7b: Enrichissement des boutons (screens uniquement)
        buttons_file = None
        if cell_type == "screens":
            console.print("[blue]🔨 7b. Enrichissement des boutons (IDs et vérification @click)...")
            buttons_file = _enrich_buttons_with_ids(cell.path, cell.name, plan, console, project_dir)
            if buttons_file:
                console.print(f"  [green]  ✅ Boutons enrichis - fichier créé: {buttons_file.name}")
            else:
                console.print("  [dim]  ℹ️ Pas de boutons à enrichir")
        
        # Nettoyer le dossier dev2-logs avant les tests pour éviter les conflits
        if dev2_logs_dir.exists():
            console.print(f"  [dim]  🧹 Nettoyage {dev2_logs_dir.relative_to(project_dir)}...")
            shutil.rmtree(dev2_logs_dir)
            dev2_logs_dir.mkdir(exist_ok=True)
        
        # Étape 7c: Vérification de conformité par l'IA avec guide (après enrichissement des boutons)
        console.print("[blue]🔨 7c. Vérification de conformité par l'IA...")
        
        # Charger la checklist de conformité selon le type de cell
        cell_type_folder = "screens" if cell_type == "screens" else ("backend" if cell_type == "backend-wf" else "cron")
        conformite_template = Path(__file__).parent.parent / "templates" / "flask" / "squelettes" / cell_type_folder / "conformite.md"
        conformite_checklist = ""
        if conformite_template.exists():
            conformite_content = conformite_template.read_text(encoding="utf-8")
            # Remplacer {cell_name} par le nom réel
            conformite_checklist = conformite_content.replace("{cell_name}", cell.name)
        else:
            conformite_checklist = "# Checklist de conformité non disponible\n# Vérification standard..."
        
        # Construire le contexte avec tous les fichiers générés
        verification_context = f"""Tu es un expert en revue de code Flask/Alpine.js. Vérifie la conformité du code généré pour la cell '{cell.name}'.

## Checklist de Conformité à compléter

Tu dois vérifier CHAQUE point de la checklist suivante et indiquer si c'est ✅ OK ou ❌ À CORRIGER.

{conformite_checklist}

## Fichiers à vérifier:
"""
        
        # Ajouter le contenu de tous les fichiers générés
        for fp in plan.files:
            full_path = cell.path / fp.path
            if full_path.exists():
                file_content = full_path.read_text(encoding="utf-8")
                verification_context += f"\n=== {fp.path} ===\n```\n{file_content[:3000]}\n```\n"
        
        # Ajouter les informations sur les boutons enrichis (si applicable)
        if cell_type == "screens" and buttons_file and buttons_file.exists():
            buttons_content = buttons_file.read_text(encoding="utf-8")
            verification_context += f"\n=== Boutons enrichis (all-buttons-with-id.md) ===\n```\n{buttons_content[:2000]}\n```\n"
        
        verification_context += """
## Ta mission:

1. Pour CHAQUE point de la checklist ci-dessus, indique:
   - ✅ Si le point est respecté
   - ❌ Si le point nécessite une correction + description du problème

2. Remplis la section "Notes de Vérification" avec:
   - **Problèmes détectés**: Liste des problèmes avec références aux lignes de code
   - **Corrections proposées**: Code corrigé pour chaque problème
   - **Statut final**: Conforme ou Corrections nécessaires

3. Si aucune correction n'est nécessaire, réponds: "✅ Tous les points de la checklist sont respectés"

## Format de réponse attendu:

```
VERIFICATION DE LA CHECKLIST:

Structure du Blueprint:
- [x] Le blueprint est correctement nommé ✅
- [ ] Les noms de fonctions correspondent... ❌ Problème: ...

Boutons:
- [x] Tous les boutons ont un ID unique ✅
- [x] Tous les boutons ont un @click vers un workflow ✅
...

Routes:
- [x] Format correct ✅
...

NOTES DE VÉRIFICATION:

**Problèmes détectés:**
1. [fichier:ligne] Description du problème

**Corrections proposées:**
fichier: chemin/du/fichier
```python
# code corrigé
```

**Statut final:** ⬜ Conforme / ⬜ Corrections nécessaires
```
"""
        
        try:
            console.print("  [dim]  🤖 Appel à pi -p pour vérification...")
            result = subprocess.run(
                ["pi", "-p"],
                input=verification_context,
                capture_output=True, text=True, timeout=300
            )
            
            if result.returncode == 0:
                response_text = result.stdout.strip()
                
                # Sauvegarder l'analyse
                verification_log = cell.path / "logs" / f"verification_{datetime.now().strftime('%H%M%S')}.txt"
                verification_log.parent.mkdir(parents=True, exist_ok=True)
                verification_log.write_text(response_text, encoding="utf-8")
                
                # Vérifier si des corrections sont nécessaires
                if "✅ Code cohérent" in response_text or "aucune correction" in response_text.lower():
                    console.print("  [green]  ✅ Vérification cohérence: aucune correction nécessaire")
                else:
                    console.print("  [yellow]  ⚠️ Corrections de cohérence détectées - application automatique...")
                    console.print(f"  [dim]     Log sauvegardé: {verification_log.relative_to(project_dir)}")
                    
                    # Application automatique des corrections
                    _apply_corrections_from_verification(cell.path, response_text, console)
                    console.print("  [green]  ✅ Corrections de cohérence appliquées")
            else:
                console.print(f"  [yellow]  ⚠️ Erreur pi: {result.stderr[:200]}")
                
        except subprocess.TimeoutExpired:
            console.print("  [yellow]  ⚠️ Timeout de la vérification")
        except Exception as e:
            console.print(f"  [yellow]  ⚠️ Erreur vérification: {e}")
        
        # Redémarrer le serveur pour prendre en compte le code généré
        console.print("  [blue]  🔄 Redémarrage du serveur Flask (code généré)...")
        restart_ok = _restart_server(project_dir)
        if not restart_ok:
            console.print("  [red]  ❌ Échec du redémarrage du serveur")
            console.print("  [yellow]  💡 Essayez de redémarrer manuellement: python run.py")
            console.print("  [dim]    Puis relancez dev2 avec --skip-server-check")
            continue
        console.print("  [green]  ✅ Serveur redémarré")
        console.print("[blue]🔨 8. Tests du code généré...")
        test_ok, errors = tester.run_tests(phase="code")
        if not test_ok:
            console.print("[red]  ❌ Tests code échoués")
            
            # Compter les erreurs réelles (sans les warnings)
            real_errors = [e for e in errors if "warning" not in e.lower() and "tailwind" not in e.lower()]
            warnings = [e for e in errors if "warning" in e.lower() or "tailwind" in e.lower()]
            
            if real_errors and warnings:
                console.print(f"[dim]     {len(real_errors)} erreur(s) critique(s), {len(warnings)} warning(s)")
            elif real_errors:
                console.print(f"[dim]     {len(real_errors)} erreur(s) critique(s)")
            else:
                console.print(f"[yellow]     {len(warnings)} warning(s) uniquement")
            
            for err in errors[:5]:
                console.print(f"    [dim]  - {err[:100]}")
            
            for err in errors[:5]:
                console.print(f"    [dim]  - {err[:100]}")
            
            # Lancer correction automatique pour toutes les erreurs
            console.print("\n[yellow]🔄 Lancement corrections automatiques via PI...")
            
            # Regrouper les erreurs par type pour correction ciblée
            error_types = {
                "routing": [e for e in errors if "BuildError" in e or "url_for" in e or "endpoint" in e],
                "network": [e for e in errors if "NETWORK" in e or "404" in e],
                "console": [e for e in errors if "[CONSOLE]" in e and "error" in e.lower()],
                "backend": [e for e in errors if e.startswith("[BACK]")],
            }
            
            corrections_applied = []
            
            for error_type, type_errors in error_types.items():
                if not type_errors:
                    continue
                
                console.print(f"\n  [blue]Correction erreurs de type: {error_type} ({len(type_errors)} erreur(s))")
                
                # Construire le prompt specifique selon le type d'erreur
                errors_text = "\n".join(f"- {e}" for e in type_errors[:5])
                
                if error_type == "routing":
                    instructions = f"""Corrige les erreurs de routing Flask (url_for, endpoints).
Regles:
- Les endpoints sont '{cell.name}.nom_fonction'
- Verifiez que les noms dans url_for() correspondent aux fonctions dans routes.py"""
                elif error_type == "network":
                    instructions = """Corrige les erreurs reseau (fichiers manquants, URLs incorrectes).
Regles:
- Verifiez que les fichiers statiques existent dans static/
- Utilisez url_for('static', filename='...') pour les assets
- Corrigez les chemins d'images/CSS/JS"""
                elif error_type == "console":
                    instructions = """Corrige les erreurs JavaScript console.
Regles:
- Verifiez Alpine.js (syntaxe, variables, init)
- Corrigez les references aux variables non definies
- Verifiez les appels API"""
                else:  # backend
                    instructions = """Corrige les erreurs backend Python.
Regles:
- Verifiez les imports (pas circulaires)
- Corrigez les references aux modeles
- Verifiez la syntaxe Python"""
                
                correction_prompt = f"""Tu es un expert Flask/Alpine.js. {instructions}

Cellule: {cell.name}

## Erreurs a corriger
{errors_text}

## Fichiers concernes
"""
                for fp in plan.files:
                    full_path = cell.path / fp.path
                    if full_path.exists():
                        content = full_path.read_text(encoding="utf-8")
                        correction_prompt += f"\n=== {fp.path} ===\n{content[:2500]}\n"
                
                correction_prompt += """
## Reponse attendue

Donne le code corrige au format YAML:
```yaml
fichiers:
  - chemin: "nom/du/fichier.py"
    contenu: |
      # code complet corrige
```

Si aucune correction n'est necessaire pour ce type d'erreur, reponds: "✅ Aucune correction requise"
"""
                
                try:
                    console.print(f"    [dim]🤖 Appel pi -p pour {error_type}...")
                    result = subprocess.run(
                        ["pi", "-p"],
                        input=correction_prompt,
                        capture_output=True, text=True, timeout=300
                    )
                    
                    if result.returncode == 0:
                        response_text = result.stdout.strip()
                        
                        # Sauvegarder la reponse
                        timestamp = datetime.now().strftime('%H%M%S')
                        correction_log = cell.path / "logs" / f"correction_{error_type}_{timestamp}.txt"
                        correction_log.parent.mkdir(parents=True, exist_ok=True)
                        correction_log.write_text(response_text, encoding="utf-8")
                        
                        if "Aucune correction" in response_text or "✅" in response_text:
                            console.print(f"    [dim]ℹ️ Aucune correction requise pour {error_type}")
                        else:
                            console.print(f"    [green]✅ Correction recue pour {error_type}")
                            console.print(f"    [dim]   Log: {correction_log.relative_to(project_dir)}")
                            corrections_applied.append((error_type, response_text))
                    else:
                        console.print(f"    [red]❌ Erreur pi: {result.stderr[:100]}")
                        
                except subprocess.TimeoutExpired:
                    console.print(f"    [red]❌ Timeout correction {error_type}")
                except Exception as e:
                    console.print(f"    [red]❌ Erreur: {e}")
            
            # Afficher le resume des corrections
            if corrections_applied:
                console.print(f"\n[yellow]📝 {len(corrections_applied)} correction(s) recue(s):")
                for err_type, _ in corrections_applied:
                    console.print(f"   - {err_type}")
                console.print(f"\n[cyan]Verifiez les logs dans {cell.path / 'logs'} puis relancez dev2")
            else:
                console.print("\n[yellow]⚠️ Aucune correction automatique applicable")
            
            console.print(f"\n[red]⏸️  Arret - correction manuelle requise")
            _cleanup_tracking(tracking_path)
            continue
            _cleanup_tracking(tracking_path)
            continue
        console.print("[green]✅ Tests code passés")
        
        # Étape 8b: Test de clics sur tous les boutons (screens uniquement)
        if cell_type == "screens":
            console.print()
            console.print("[blue]🔨 8b. Test de clics sur tous les boutons...")
            buttons_file = cell.path / "specs" / "all-buttons-with-id.md"
            if buttons_file.exists():
                buttons_ok, buttons_errors = _test_buttons_click(
                    cell.path, cell.name, buttons_file, tester, console, project_dir
                )
                if buttons_ok:
                    console.print("[green]  ✅ Test de clics sur boutons réussi")
                else:
                    console.print("[red]  ❌ Test de clics sur boutons échoué")
                    for err in buttons_errors[:5]:
                        console.print(f"    [dim]  - {err}")
                    console.print("[yellow]  ⚠️ Continuation malgré les erreurs de clics (non bloquant)")
            else:
                console.print("  [dim]  ℹ️ Fichier all-buttons-with-id.md non trouvé - test sauté")
        
        console.print()
        console.print(f"[cyan]{'─' * 40}")
        
        # Demander confirmation avant de finaliser
        if not Confirm.ask("[yellow]🛑 Le développement est-il terminé? (Créer devok.md + PR)?", default=True):
            console.print("[yellow]⚠️ Développement non finalisé")
            console.print(f"[dim]  Relancez 'drdice dev2 --cell {cell.name}' pour reprendre")
            console.print(f"[cyan]{'─' * 40}")
            _cleanup_tracking(tracking_path)
            continue
        
        console.print(f"[cyan]{'─' * 40}")
        console.print()
        # 9. Commit et Pull Request (seulement si dev fini)
        if not skip_git and branch_name:
            console.print("[blue]🔨 9. Commit des changements...")
            commit_ok, commit_info = _git_commit(project_dir, cell.name, len(plan.files))
            
            if commit_ok and commit_info not in ["Aucun changement", "local"]:
                console.print("[blue]🔨 10. Création de la Pull Request...")
                pr_ok, pr_info = _create_pull_request(project_dir, cell.name, branch_name)
            elif commit_ok and commit_info == "local":
                console.print("  [dim]  ℹ️ Pas de remote - PR non créée")
        else:
            console.print("[blue]🔨 9. Commit des changements...")
            console.print("  [dim]  ℹ️ Git ou branche non configuré - Commit/PR sautés")
        # Créer devok.md pour marquer la cell comme développée (seulement si dev fini)
        console.print("[blue]🔨 Création de devok.md...")
        _create_devok(cell.path, cell.name)
        _cleanup_tracking(tracking_path)
        console.print()
        console.print(f"[green]{'═' * 40}")
        console.print(f"[green]✅ {cell.name} développée avec succès!")
        if not skip_git and branch_name:
            console.print(f"[dim]   Branche: {branch_name}")
        console.print(f"[green]{'═' * 40}")
    return 0
def main():
    """Point d'entrée."""
    return dev2()
if __name__ == "__main__":
    sys.exit(main())
