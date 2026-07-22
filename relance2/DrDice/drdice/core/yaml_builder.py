"""Builder pour créer le document YAML de développement."""

from pathlib import Path
from typing import Any, Dict, List

import yaml

from .cell import Cell, CellType


class YAMLBuilder:
    """Construit le document YAML de développement pour une cell."""
    
    def __init__(self, cell: Cell):
        """Initialise le builder.
        
        Args:
            cell: La cell à traiter
        """
        self.cell = cell
        self.specs_dir = cell.specs_path
        
    def _read_file(self, path: Path, max_chars: int = 3000) -> str:
        """Lit un fichier avec limite de taille et échappe pour YAML."""
        if not path.exists():
            return ""
        try:
            content = path.read_text(encoding="utf-8")[:max_chars]
            # Échapper pour YAML - éviter les lignes commençant par *
            lines = content.split('\n')
            escaped_lines = []
            for line in lines:
                if line.startswith('*') or line.startswith('**'):
                    line = '\\' + line
                escaped_lines.append(line)
            return '\n'.join(escaped_lines)
        except Exception:
            return ""
    
    def _get_specs_files(self, subdir: str) -> Dict[str, str]:
        """Récupère les fichiers de specs d'un sous-répertoire."""
        result = {}
        search_path = self.specs_dir / subdir
        if search_path.exists():
            for md_file in search_path.glob("*.md"):
                result[md_file.stem] = self._read_file(md_file)
        return result
    
    def _build_base_files(self) -> List[Dict[str, Any]]:
        """Construit les fichiers de base."""
        fichiers = []
        # CHEMIN ABSOLU - Chemin complet depuis la racine du système de fichiers
        cell_path_abs = str(self.cell.path.absolute())
        
        # 1. Blueprint
        fichiers.append({
            "chemin": f"{cell_path_abs}/__init__.py",
            "type": "python",
            "description": "Blueprint Flask - Point d'entrée de la cell",
            "instructions": (
                "Créer bp = Blueprint('{name}', __name__, template_folder='templates'). "
                "Importer les routes à la fin."
            ),
            "specs_context": "",
            "contenu": "# À IMPLEMENTER: Blueprint Flask",
        })
        
        # 2. alpinejs.html - Initialisation Alpine.js (PAS un layout)
        # Le layout_app.html charge déjà Alpine.js, donc on ne le recharge pas ici
        alpinejs_path = str((self.cell.path / "templates" / "alpinejs.html").absolute())
        fichiers.append({
            "chemin": alpinejs_path,
            "type": "html",
            "description": "Initialisation Alpine.js avec pattern Props → Workflows → Init",
            "instructions": (
                "Définit Alpine.data avec: 1) Props réactives + getters + helpers, "
                "2) Workflows inclus via {{% include %}}, 3) workflow-init.html en DERNIER. "
                "PAS de props dans workflow-init.html. "
                "Note: Alpine.js est déjà chargé par le layout_app.html."
            ),
            "specs_context": "",
            "contenu": f"""<script>
// Logger global pour la page
const log = {{
    debug: (event, data) => console.log(`[DEBUG][${{event}}]`, JSON.stringify(data)),
    info: (event, data) => console.log(`[INFO][${{event}}]`, JSON.stringify(data)),
    warn: (event, data) => console.warn(`[WARN][${{event}}]`, JSON.stringify(data)),
    error: (event, data) => console.error(`[ERROR][${{event}}]`, JSON.stringify(data))
}};

document.addEventListener('alpine:init', () => {{
    Alpine.data('{self.cell.name}', () => ({{
        // =====================================================
        // 1. PROPS RÉACTIVES + GETTERS + HELPERS (DÉFINIR D'ABORD)
        // =====================================================
        
        // UI State
        loading: false,
        saving: false,
        error: null,
        
        // Data
        items: [],
        selectedItem: null,
        
        // Getters calculés (exemples)
        get hasItems() {{
            return this.items && this.items.length > 0;
        }},
        
        // Helpers
        formatDate(dateStr) {{
            if (!dateStr) return '-';
            return new Date(dateStr).toLocaleDateString('fr-FR');
        }},
        
        formatMoney(amount) {{
            return new Intl.NumberFormat('fr-FR', {{ 
                style: 'currency', 
                currency: 'EUR' 
            }}).format(amount || 0);
        }},
        
        // =====================================================
        // 2. WORKFLOWS (ils utilisent les props ci-dessus)
        // =====================================================
        {{% include '{self.cell.name}/workflows/initial-load.html' %}},
        
        // =====================================================
        // 3. WORKFLOW-INIT EN DERNIER (dépend des props + workflows)
        // =====================================================
        {{% include '{self.cell.name}/workflows/workflow-init.html' %}}
    }}));
}});
</script>""",
        })
        
        return fichiers
    
    def _build_routes(self, fichiers: List[Dict[str, Any]]) -> None:
        """Ajoute les fichiers de routes."""
        # CHEMIN ABSOLU - Chemin complet depuis la racine du système de fichiers
        cell_path_abs = str(self.cell.path.absolute())
        routes_path = str((self.cell.path / "routes").absolute())
        
        routes_specs = self._get_specs_files("routes")
        wf_specs = self._get_specs_files("wf-backend")
        
        # routes/__init__.py - imports des routes
        imports_routes = ["index"] if self.cell.cell_type == CellType.ECRAN else []
        imports_routes.extend([wf for wf in wf_specs.keys()])
        
        imports_content = "\n".join([f"from . import {r}" for r in imports_routes]) if imports_routes else "# Pas de routes à importer"
        
        fichiers.append({
            "chemin": f"{routes_path}/__init__.py",
            "type": "python",
            "description": "Package routes",
            "instructions": f"Imports des routes: {', '.join(imports_routes) if imports_routes else 'aucun'}",
            "specs_context": "",
            "contenu": imports_content,
        })
        
        # index.py uniquement pour les écrans
        if self.cell.cell_type == CellType.ECRAN:
            index_spec = routes_specs.get("index", "")
            fichiers.append({
                "chemin": f"{routes_path}/index.py",
                "type": "python",
                "description": "Route GET / (page d'accueil)",
                "instructions": (
                    "@bp.route('/') def index(): return render_template('index.html', ...)"
                ),
                "specs_context": index_spec[:2000],
                "contenu": "# À IMPLEMENTER: Route GET /",
            })
        
        # Routes additionnelles (hors workflows)
        for route_name, spec in routes_specs.items():
            if route_name == "index":
                continue
            fichiers.append({
                "chemin": f"{routes_path}/{route_name}.py",
                "type": "python",
                "description": f"Route /{route_name}",
                "instructions": f"bp.route('/{route_name}') selon les specs",
                "specs_context": spec[:2000],
                "contenu": f"# À IMPLEMENTER: Route /{route_name}",
            })
    
    def _build_templates(self, fichiers: List[Dict[str, Any]]) -> None:
        """Ajoute les templates pour les écrans."""
        if self.cell.cell_type != CellType.ECRAN:
            return
        
        # CHEMIN ABSOLU - Chemin complet depuis la racine du système de fichiers
        templates_path = str((self.cell.path / "templates").absolute())
        workflows_path = str((self.cell.path / "templates" / "workflows").absolute())
        
        # index.html - étend le layout partagé
        # IMPORTANT: AUCUN TAG <script> DANS CE FICHIER - Tout le JS doit être dans alpinejs.html
        index_spec = self._get_specs_files("routes").get("index", "")
        index_html_path = str((self.cell.path / "templates" / "index.html").absolute())
        
        fichiers.append({
            "chemin": index_html_path,
            "type": "html",
            "description": "Page principale de la cell",
            "instructions": (
                "Hériter du layout app ({{% extends 'layouts/layout_app.html' %}}). "
                "Définir page_title, active_page, content. "
                "x-data avec le nom de la cell, x-init=init(). "
                "Le layout inclut déjà Alpine.js. "
                "IMPORTANT: AUCUN TAG <script> DANS CE FICHIER - tout JavaScript doit être dans alpinejs.html"
            ),
            "specs_context": index_spec[:2000],
            "contenu": f"""{{% extends 'layouts/layout_app.html' %}}

{{% block page_title %}}{self.cell.name}{{% endblock %}}
{{% block active_page %}}{self.cell.name}{{% endblock %}}

{{% block content %}}
<div x-data="{self.cell.name}" x-init="init()">
    <!-- Contenu de la page -->
    <div class="max-w-6xl mx-auto">
        
        <!-- État de chargement -->
        <div x-show="loading" class="flex items-center justify-center py-12">
            <div class="text-slate-600">
                <i class="fas fa-spinner fa-spin mr-2"></i>
                Chargement...
            </div>
        </div>
        
        <!-- Affichage erreur -->
        <div x-show="error" class="hidden" :class="{{'error': true}} && 'block'">
            <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                <i class="fas fa-exclamation-circle mr-2"></i>
                <span x-text="error"></span>
            </div>
        </div>
        
        <!-- Contenu principal -->
        <div x-show="!loading && !error">
            <!-- TODO: Implémenter le contenu selon les specs -->
        </div>
    </div>
</div>

{{% include '{self.cell.name}/alpinejs.html' %}}
{{% endblock %}}""",
        })
        
        # Workflows frontend
        wf_specs = self._get_specs_files("wf-frontend")
        for wf_name, spec in wf_specs.items():
            wf_file_path = str((self.cell.path / "templates" / "workflows" / f"{wf_name}.html").absolute())
            fichiers.append({
                "chemin": wf_file_path,
                "type": "html",
                "description": f"Workflow frontend {wf_name}",
                "instructions": "Template avec Alpine.js pour ce workflow. Ne pas inclure workflow-init ici.",
                "specs_context": spec[:2000],
                "contenu": f"""// Mega-function: {wf_name}
{wf_name}: async function() {{
    const workflowId = crypto.randomUUID();
    const startTime = Date.now();
    
    log.info('WORKFLOW_START', {{ 
        workflowId,
        workflow: '{wf_name}',
        page: '{self.cell.name}'
    }});
    
    // À IMPLEMENTER selon les specs
    
    log.info('WORKFLOW_SUCCESS', {{ 
        workflowId,
        duration: Date.now() - startTime
    }});
}}""",
            })
        
        # workflow-init.html (obligatoire selon dev-frontend.md)
        wf_init_path = str((self.cell.path / "templates" / "workflows" / "workflow-init.html").absolute())
        fichiers.append({
            "chemin": wf_init_path,
            "type": "html",
            "description": "Workflow d'initialisation - UNIQUEMENT init() et méthodes utilitaires",
            "instructions": (
                "Ne CONTIENT PAS les props réactives (elles sont dans alpinejs.html). "
                "Seulement la fonction init() qui dépend des props et workflows déjà définis."
            ),
            "specs_context": "",
            "contenu": f"""// Fonction d'initialisation (doit être en dernier dans Alpine.data)
init: function() {{
    log.info('PAGE_INIT', {{ 
        page: '{self.cell.name}',
        timestamp: Date.now()
    }});
    
    // Vérifier auth
    const token = localStorage.getItem('token');
    if (!token) {{
        log.warn('AUTH_MISSING');
        window.location.href = '/login';
        return;
    }}
    
    // Lancer le chargement initial si la méthode existe
    if (typeof this.initialLoad === 'function') {{
        this.initialLoad();
    }}
}}""",
        })
    
    def _build_models(self, fichiers: List[Dict[str, Any]]) -> None:
        """Ajoute les modèles."""
        # CHEMIN ABSOLU - Chemin complet depuis la racine du système de fichiers
        models_path = str((self.cell.path / "models").absolute())
        
        models_specs = self._get_specs_files("models")
        schema = self._read_file(self.specs_dir / "A LIRE EN PREMIER" / "schema.sql")
        
        # models/__init__.py
        fichiers.append({
            "chemin": f"{models_path}/__init__.py",
            "type": "python",
            "description": "Modèles de données",
            "instructions": (
                "Fonctions sqlite3 brutes selon schema.sql. PAS D'ORM. "
                "Imports locaux recommandés pour éviter les dépendances circulaires."
            ),
            "specs_context": schema[:2000],
            "contenu": "# À IMPLEMENTER: Modèles avec sqlite3 (pas d'ORM)",
        })
        
        # Modèles additionnels
        for model_name, spec in models_specs.items():
            if model_name == "__init__":
                continue
            fichiers.append({
                "chemin": f"{models_path}/{model_name}.py",
                "type": "python",
                "description": f"Modèle {model_name}",
                "instructions": "Implémenter selon les specs",
                "specs_context": spec[:2000],
                "contenu": f"# À IMPLEMENTER: Modèle {model_name}",
            })
    
    def _build_workflows_backend(self, fichiers: List[Dict[str, Any]]) -> None:
        """Ajoute les workflows backend (megafunctions pattern)."""
        # CHEMIN ABSOLU - Chemin complet depuis la racine du système de fichiers
        project_root = self.cell.project_root
        routes_path = str((self.cell.path / "routes").absolute())
        
        wf_specs = self._get_specs_files("wf-backend")
        
        # Pour chaque workflow, créer la megafunction dans app/workflows/
        for wf_name, spec in wf_specs.items():
            # Nom du fichier workflow : <cell_name>_<wf_name>.py
            workflow_file = f"{self.cell.name}_{wf_name}.py"
            # CHEMIN ABSOLU depuis la racine du projet
            workflows_root = str((project_root / "app" / "workflows" / workflow_file).absolute())
            
            fichiers.append({
                "chemin": workflows_root,
                "type": "python",
                "description": f"Megafunction backend: {wf_name}",
                "instructions": (
                    "Workflow Python avec structure: WorkflowContext, WorkflowResult, "
                    "WorkflowLogger, et fonction execute(**kwargs). "
                    "Logging exhaustif obligatoire (WORKFLOW_START, WORKFLOW_SUCCESS, etc.). "
                    "Imports locaux pour éviter les dépendances circulaires."
                ),
                "specs_context": spec[:2000],
                "contenu": f'''"""
Workflow: {wf_name}
Cell: {self.cell.name}
"""

import logging
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)


@dataclass
class WorkflowContext:
    """Contexte d'exécution du workflow"""
    workflow_id: str
    started_at: datetime
    user_id: Optional[str] = None
    request_id: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {{
            'workflow_id': self.workflow_id,
            'started_at': self.started_at.isoformat(),
            'user_id': self.user_id,
            'request_id': self.request_id
        }}


@dataclass
class WorkflowResult:
    """Résultat standardisé d'un workflow"""
    success: bool
    data: Any
    logs: List[Dict[str, Any]]
    execution_time_ms: int
    error: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class WorkflowLogger:
    """Logger dédié avec contexte de workflow"""
    
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
        
        log_message = f"[{{self.context.workflow_id}}] [{{event}}] {{data}}"
        if level == 'ERROR':
            logger.error(log_message)
        elif level == 'WARNING':
            logger.warning(log_message)
        elif level == 'DEBUG':
            logger.debug(log_message)
        else:
            logger.info(log_message)
        
    def debug(self, event: str, data: Dict[str, Any] = None):
        self._log('DEBUG', event, data or {{}})
        
    def info(self, event: str, data: Dict[str, Any] = None):
        self._log('INFO', event, data or {{}})
        
    def warning(self, event: str, data: Dict[str, Any] = None):
        self._log('WARNING', event, data or {{}})
        
    def error(self, event: str, data: Dict[str, Any] = None):
        self._log('ERROR', event, data or {{}})
        
    def get_logs(self) -> List[Dict[str, Any]]:
        return self.logs


def execute(**kwargs) -> Dict[str, Any]:
    """
    MEGAFUNCTION: {wf_name}
    
    Args:
        **kwargs: Données d'entrée du workflow
        
    Returns:
        dict: Résultat standardisé avec logs exhaustifs
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
        'cell': '{self.cell.name}',
        'input_keys': list(kwargs.keys()),
        'context': context.to_dict()
    }})
    
    try:
        # Étape 1: Validation
        log.debug('VALIDATION_START', {{ 'input': kwargs }})
        validated = _validate_input(kwargs, log)
        log.info('VALIDATION_COMPLETE', {{ 'validated_keys': list(validated.keys()) }})
        
        # Étape 2: Traitement
        log.debug('PROCESSING_START')
        result = _process_data(validated, log)
        log.info('PROCESSING_COMPLETE', result)
        
        execution_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        
        log.info('WORKFLOW_SUCCESS', {{
            'execution_time_ms': execution_time
        }})
        
        return WorkflowResult(
            success=True,
            data=result,
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


def _validate_input(data: Dict[str, Any], log: WorkflowLogger) -> Dict[str, Any]:
    """Valide et normalise les données d'entrée"""
    # TODO: Implémenter la validation selon les specs
    return data


def _process_data(params: Dict[str, Any], log: WorkflowLogger) -> Dict[str, Any]:
    """Logique métier principale"""
    # TODO: Implémenter la logique métier
    # Imports locaux recommandés : from db import get_connection
    return {{'status': 'ok'}}
''',
            })
            
            # Route Flask qui appelle la megafunction
            fichiers.append({
                "chemin": f"{routes_path}/{wf_name}.py",
                "type": "python",
                "description": f"Route Flask pour le workflow {wf_name}",
                "instructions": (
                    "Endpoint Flask qui reçoit la requête, appelle execute() du workflow, "
                    "et retourne le résultat JSON. Gérer les erreurs 500 si success=False."
                ),
                "specs_context": spec[:2000],
                "contenu": f'''from flask import Blueprint, request, jsonify
import uuid
from app.workflows.{self.cell.name}_{wf_name} import execute

bp = Blueprint('{self.cell.name}_{wf_name}', __name__, url_prefix='/{self.cell.name}')

@bp.route('/{wf_name}', methods=['POST'])
def {wf_name}_endpoint():
    """
    Endpoint: POST /{self.cell.name}/{wf_name}
    Appelle la megafunction {wf_name}
    """
    data = request.get_json() or {{}}
    
    result = execute(
        **data,
        workflow_id=str(uuid.uuid4()),
        user_id=request.headers.get('X-User-Id'),
        request_id=request.headers.get('X-Request-Id')
    )
    
    return jsonify(result), 200 if result['success'] else 500
''',
            })
        
        # Si c'est une cell CRON, ajouter le fichier cron.py
        if self.cell.cell_type == CellType.CRON:
            cron_path = str((self.cell.path / "cron.py").absolute())
            fichiers.append({
                "chemin": cron_path,
                "type": "python",
                "description": "Point d'entrée pour l'exécution cron",
                "instructions": (
                    "Point d'entrée pour exécution périodique. "
                    "Importe et appelle execute() du workflow principal."
                ),
                "specs_context": "",
                "contenu": f'''#!/usr/bin/env python3
"""Point d'entrée pour l'exécution cron de la cell {self.cell.name}."""

import sys
import os

# Ajouter le parent au path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.workflows.{self.cell.name}_main import execute

def main():
    """Exécutée par le cron."""
    result = execute()
    print(f"[{{result['execution_time_ms']}}ms] Success: {{result['success']}}")
    return 0 if result['success'] else 1

if __name__ == '__main__':
    sys.exit(main())
''',
            })
    
    def build(self) -> Dict[str, Any]:
        """Construit le document YAML complet.
        
        Returns:
            Dictionnaire représentant le document YAML
        """
        # Lire le contexte
        rules = self._read_file(
            self.specs_dir / "A LIRE EN PREMIER" / "rules.md"
        )
        schema = self._read_file(
            self.specs_dir / "A LIRE EN PREMIER" / "schema.sql"
        )
        
        # Construire la liste des fichiers
        fichiers = self._build_base_files()
        self._build_routes(fichiers)
        self._build_templates(fichiers)
        self._build_models(fichiers)
        self._build_workflows_backend(fichiers)
        
        # Instructions spécifiques selon le type de cell
        if self.cell.cell_type == CellType.ECRAN:
            arch_details = "Frontend: Alpine.js + Jinja2 templates. Backend: Flask routes pour les API."
        elif self.cell.cell_type == CellType.WORKFLOW_BACKEND:
            arch_details = "Megafunctions pattern: workflows/ avec execute(), routes/ avec endpoints Flask."
        elif self.cell.cell_type == CellType.CRON:
            arch_details = "Cron pattern: workflows/ avec execute(), cron.py comme point d'entrée."
        else:
            arch_details = ""
        
        return {
            "cell": {
                "name": self.cell.name,
                "type": self.cell.cell_type.value,
                # CHEMIN ABSOLU dans les métadonnées
                "path": str(self.cell.path.absolute()),
            },
            "context": {
                "rules": rules[:2000] if rules else "",
                "schema": schema[:2000] if schema else "",
                "architecture": f"cellsmvc - Flask/Alpine.js/Tailwind/SQLite3 (pas d'ORM). {arch_details}",
            },
            "instructions_ia": (
                "Pour chaque fichier, remplacer le champ 'contenu' par du code "
                "fonctionnel complet. Respecter les 'specs_context' et 'instructions'. "
                "Ne garder que les fichiers nécessaires. "
                "Backend: structure megafunctions avec logging exhaustif obligatoire. "
                "IMPORTANT: Les chemins 'chemin' sont des chemins ABSOLUS depuis la racine du système de fichiers."
            ),
            "fichiers": fichiers,
        }
    
    def write(self, output_path: Path | None = None) -> Path:
        """Écrit le document YAML sur disque.
        
        Args:
            output_path: Chemin de sortie (défaut: dev-output.yaml dans la cell)
            
        Returns:
            Chemin du fichier créé
        """
        if output_path is None:
            output_path = self.cell.get_yaml_output_path()
        
        document = self.build()
        
        with open(output_path, "w", encoding="utf-8") as f:
            yaml.dump(
                document,
                f,
                allow_unicode=True,
                sort_keys=False,
                default_flow_style=False,
                width=120,
            )
        
        return output_path
