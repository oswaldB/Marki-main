# Documentation de dev2.py

## Vue d'ensemble

La commande `dev2` utilise une approche **plan/squelettes/IA incrémentale** :

1. **Git setup** : Création et checkout de la branche `feature/cell-{name}`
2. **Analyse** : Parse les specs pour identifier les fichiers nécessaires et le type de cell (screen simple, screen avec service, service pur, cron job)
3. **Nettoyage** : Vider le contenu de tous les dossiers sauf `specs/` (routes/, models/, templates/, etc.)
4. **Artefact de tracking** : Création dans `specs/` d'un fichier de suivi indiquant l'état de chaque fichier (todo squelette → todo code → done)
5. **Squelettes** : Création de fichiers squelettes avec instructions détaillées en leur sein
6. **Tests squelettes** : Processus de test automatisé avec analyse IA des logs :
   - **Vérification serveur** : `curl localhost:5000` pour s'assurer que Flask répond
   - **Démarrage** : Si le serveur est down, tentative de démarrage via `scripts/03-init-boilerplate.sh`, capture des erreurs de démarrage (stderr, `flask_server.log`)
   - **Test HTTP** : Vérification du code HTTP de la route (200 ou 302 attendu, erreurs 500+ capturées)
   - **Test Playwright** : Chargement de la page, capture des logs console navigateur (erreurs JS), screenshot
   - **Logs backend** : Capture des erreurs Flask depuis `flask_server.log` (ERROR, Exception, Traceback, ImportError)
   - **Analyse IA** : Les logs frontend (JSON), backend (texte) et la sortie du test sont envoyés à `pi -p` qui détermine si les tests passent ou s'il faut corriger
   - **Structure des logs** : `app/{type}/{cell}/logs/{timestamp}/` contient `report.json`, `frontend.json`, `backend.log`, `errors.txt`, `test_output.log`, `screenshots/{cell}.png`
7. **Correction squelettes** : Si les tests échouent, loop de correction via `pi -p` avec proposition de solutions à l'utilisateur, jusqu'à ce que les tests passent
8. **Génération IA** : Plusieurs appels `pi -p` (un par fichier squelette) pour générer le code final
9. **Tests code** : Même processus que l'étape 6 (tests automatisés avec Playwright, logs backend, analyse IA via `pi -p`) :
10. **Correction code** : Si les tests échouent, loop de correction via `pi -p` jusqu'à ce que les tests passent
11. **Git** : Commit, push et création de pull request
12. **Cleanup** : Suppression de l'artefact de tracking

Chaque squelette contient des instructions en commentaires (`# TODO IA: ...`) pour guider la génération.

## Architecture générale

```
┌─────────────────────────────────────────────────────────────────┐
│                         dev2.py                                 │
├─────────────────────────────────────────────────────────────────┤
│  1. Détection des cells à développer                             │
│     └── Fichier specs/valide.md existe ET specs/devok.md absent │
│                                                                 │
│  2. Pour chaque cell :                                           │
│     a. Nettoyage de la cell (sauf specs/)                       │
│     b. ANALYSE (SpecsAnalyzer)                                │
│        └── Parse les specs → identifie modèles, routes, etc.  │
│     c. SQUELETTES (SkeletonGenerator)                           │
│        └── Crée fichiers avec INSTRUCTIONS en leur sein        │
│                                                                 │
│  3. Pour chaque fichier squelette :                              │
│     a. PROMPT (PromptGenerator)                               │
│        └── Génère prompt spécifique au fichier               │
│     b. GÉNÉRATION IA (pi -p)                                  │
│        └── Un appel par fichier, IA lit instructions          │
│     c. EXTRACTION (YamlExtractor)                             │
│        └── Écrit le fichier final                             │
│                                                                 │
│  4. Finalisation :                                               │
│     a. Mise à jour app.py (blueprint) - programmatique        │
└─────────────────────────────────────────────────────────────────┘
```

## Classes principales

### `SpecsAnalyzer`

Analyse les fichiers de specs et identifie les fichiers nécessaires.

**Méthodes d'analyse :**
- `_analyze_models()` → Liste de modèles avec champs extraits
- `_analyze_routes()` → Routes avec méthodes HTTP et paths
- `_analyze_workflows()` → Workflows frontend/backend avec actions
- `_analyze_rules()` → Règles et dépendances globales

**Données extraites :**
```python
DevPlan(
    cell_name="xxx",
    cell_type="screens",
    files=[
        FilePlan(
            path="models/user.py",
            file_type="model",
            instructions=["Modèle: User", "Champs: id, email, ..."],
            sources=[Path("specs/models/user.md")],
            context={"fields": [...]}
        ),
        ...
    ]
)
```

### `SkeletonGenerator`

Crée les fichiers squelettes avec **instructions détaillées en leur sein**. Chaque squelette est autonome et contient toutes les informations nécessaires pour que l'IA génère le code final.

**Principe :** Les instructions sont dans le fichier lui-même, pas dans un document externe. L'IA lit le squelette et ses instructions pour produire le code complet.

---

**Nouveau format de présentation des squelettes (conforme cellsmvc) :**

Les fichiers squelettes suivent strictement les règles définies dans `/specs-global/rules/cellsmvc.md`, `/specs-global/rules/dev-backend.md` et `/specs-global/rules/dev-frontend.md`.

---

#### Cell Écran (`app/screens/{cell}/`)

##### Fichier `/__init__.py`
```python
"""
TODO IA:
+ Crée un Blueprint Flask selon /specs-global/rules/cellsmvc.md
+ template_folder='templates' obligatoire pour les écrans
+ Importe les routes APRÈS la création du blueprint
+ Ne PAS importer de modèles ici (seulement dans routes)
"""

from flask import Blueprint

bp = Blueprint('{cell}', __name__, template_folder='templates')

from . import routes  # noqa: F401
```

**Note sur app.py** : L'enregistrement du blueprint dans `app/__init__.py` se fait de manière **programmatique** (pas d'IA). Voici le code de `register_blueprint_in_app_py()` :

```python
def register_blueprint_in_app_py(cell_type: str, cell_name: str, project_dir: Path) -> bool:
    """
    Met à jour app/__init__.py pour enregistrer le blueprint d'une nouvelle cell.
    
    Args:
        cell_type: 'screens', 'backend-wf', ou 'cron'
        cell_name: Nom de la cellule
        project_dir: Chemin racine du projet
    
    Returns:
        True si la modification a réussi, False sinon
    """
    app_init = project_dir / "app" / "__init__.py"
    if not app_init.exists():
        return False
    
    content = app_init.read_text(encoding="utf-8")
    
    # Déterminer url_prefix selon le type
    if cell_type == "screens":
        url_prefix = f"/{cell_name}"
    elif cell_type == "backend-wf":
        url_prefix = f"/api/{cell_name}"
    elif cell_type == "cron":
        url_prefix = None  # Cron n'a pas de routes HTTP
    else:
        url_prefix = f"/{cell_name}"
    
    # Vérifier si déjà présent
    if f"{cell_name}_bp" in content:
        return True
    
    lines = content.split("\n")
    
    # 1. Ajouter l'import
    import_line = f"from .{cell_type}.{cell_name} import bp as {cell_name}_bp"
    
    # Trouver la dernière ligne d'import de blueprint
    last_import_idx = -1
    for i, line in enumerate(lines):
        if line.startswith("from .") and "import bp" in line:
            last_import_idx = i
    
    if last_import_idx >= 0:
        lines.insert(last_import_idx + 1, import_line)
    else:
        # Ajouter après les imports standards
        for i, line in enumerate(lines):
            if line.startswith("from ") or line.startswith("import "):
                last_import_idx = i
        lines.insert(last_import_idx + 1, import_line)
    
    # 2. Ajouter l'enregistrement (sauf pour cron sans routes)
    if url_prefix and cell_type != "cron":
        register_line = f"    app.register_blueprint({cell_name}_bp, url_prefix='{url_prefix}')"
        
        # Trouver create_app et ajouter avant le return
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
    
    # Écrire le fichier
    new_content = "\n".join(lines)
    app_init.write_text(new_content, encoding="utf-8")
    
    print(f"✅ Blueprint '{cell_name}' enregistré dans app/__init__.py")
    print(f"   Import: {import_line}")
    if url_prefix:
        print(f"   URL: {url_prefix}")
    
    return True
```

##### Fichier `/routes/__init__.py`
```python
"""
TODO IA:
+ Importe toutes les routes depuis les fichiers dans /routes/
+ Un fichier = une route ou un workflow backend
+ Pas de logique ici, seulement des imports
"""

from .index import index
# TODO IA: Importer les autres routes/workflows selon specs/routes/*.md
```

##### Fichier `/routes/index.py`
```python
"""
TODO IA:
+ Implémente la route GET /{cell} selon specs/routes/index.md
+ Si des données sont nécessaires: importe les modèles depuis ..models
+ Retourne render_template('index.html', ...)
+ Si API endpoint: retourne jsonify(...)
+ Pas de SQL direct ici, utilise les modèles
"""

from flask import render_template, jsonify, request
from .. import bp


@bp.route('/')
def index():
    # TODO IA: Logique selon specs/routes/index.md
    return render_template('index.html')
```

##### Fichier `/models/{name}.py`
```python
"""
TODO IA:
+ Dataclass avec champs depuis specs/models/{name}.md
+ Méthodes: from_row(), get_by_id(), get_all(), save(), delete()
+ Utilise sqlite3 standard (pas d'ORM)
+ Logs exhaustifs: WORKFLOW_START, DB_QUERY_START, WORKFLOW_SUCCESS/ERROR
"""

import logging
import uuid
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)


@dataclass
class {name}:
    id: Optional[int] = None
    # TODO IA: Champs selon specs/models/{name}.md
    
    @classmethod
    def from_row(cls, row: sqlite3.Row) -> "{name}":
        """Crée une instance depuis une ligne DB"""
        pass
    
    @classmethod
    def get_by_id(cls, id: int) -> Optional["{name}"]:
        """Récupère par ID avec logging exhaustif"""
        pass
    
    def save(self) -> None:
        """INSERT ou UPDATE avec logging"""
        pass
```

##### Fichier `/templates/index.html`
```html
<!--
TODO IA:
+ Code pixel-perfect depuis specs/mockups/*.html
+ Étend OBLIGATOIREMENT le layout de base: {% extends "base.html" %} ou {% extends "layout/base.html" %} 
+ Le layout se trouve dans app/layout/ - trouve celui qui correspond le plus au mockup
+ Si aucun layout n'est trouvé, crée specs/actions-user.md avec l'instruction de créer le layout
+ x-data="{cell}" x-init="init()" sur le container principal
+ Alpine.js chargé en bas du body avec defer (via le layout ou ici)
+ Inclusion de alpinejs.html à la fin
-->
{% extends "base.html" %}

{% block title %}{{ cell_name }}{% endblock %}

{% block content %}
<div x-data="{cell}" x-init="init()">
    <!-- Structure depuis specs/mockups/ -->
</div>

<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
{% include 'alpinejs.html' %}
{% endblock %}
```

##### Fichier `/templates/alpinejs.html`
```html
<!--
TODO IA:
+ ORDRE OBLIGATOIRE: 1. Props 2. Getters+Helpers 3. Workflows 4. Init
+ Logger global const log = {...} AVANT Alpine.data
+ Toutes les props réactives définies D'ABORD
+ Puis getters (get xxx())
+ Puis helpers (formatXxx())
+ Puis inclusion des workflows/
+ FINalement workflow-init.html (qui utilise les props et workflows)
-->
<script>
// Logger global obligatoire
const log = {
    debug: (event, data) => console.log(`[DEBUG][${event}]`, JSON.stringify(data)),
    info: (event, data) => console.log(`[INFO][${event}]`, JSON.stringify(data)),
    warn: (event, data) => console.warn(`[WARN][${event}]`, JSON.stringify(data)),
    error: (event, data) => console.error(`[ERROR][${event}]`, JSON.stringify(data))
};

document.addEventListener('alpine:init', () => {
    Alpine.data('{cell}', () => ({
        // ========================================
        // 1. PROPS RÉACTIVES (définies D'ABORD)
        // ========================================
        loading: false,
        error: null,
        items: [],
        selectedItem: null,
        filters: { search: '', status: '' },
        
        // Pagination
        currentPage: 1,
        itemsPerPage: 20,
        
        // ========================================
        // 2. GETTERS (avec les props)
        // ========================================
        get filteredItems() {
            // TODO IA: Logique de filtrage selon specs/wf-frontend/
            return this.items;
        },
        
        get totalPages() {
            return Math.ceil(this.filteredItems.length / this.itemsPerPage) || 1;
        },
        
        get paginatedItems() {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            return this.filteredItems.slice(start, start + this.itemsPerPage);
        },
        
        // ========================================
        // 3. HELPERS (avec les props)
        // ========================================
        formatDate(dateStr) {
            if (!dateStr) return '-';
            return new Date(dateStr).toLocaleDateString('fr-FR');
        },
        
        formatMoney(amount) {
            return new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'EUR'
            }).format(amount);
        },
        
        // ========================================
        // 4. WORKFLOWS (générés programmatiquement par SkeletonGenerator)
        // ========================================
        // Le SkeletonGenerator lit specs/wf-frontend/ et génère automatiquement:
        // {% include 'workflows/<nom>.html' %}, pour chaque workflow trouvé
        // L'IA ne génère PAS ces lignes, elle reçoit le squelette déjà complet
        {% include 'workflows/initial-load.html' %},
        {% include 'workflows/save-data.html' %},
        
        // ========================================
        // 5. INIT (EN DERNIER - dépend des props et workflows)
        // ========================================
        {% include 'workflows/workflow-init.html' %}
    }));
});
</script>
```

##### Fichier `/templates/workflows/workflow-init.html`
```html
<!--
TODO IA:
+ Seulement la fonction init() et méthodes utilitaires
+ PAS DE PROPS ICI (elles sont dans alpinejs.html)
+ init() appelle les workflows nécessaires au démarrage
+ Vérifie auth (token localStorage) redirige vers /login si absent
-->
// Initialisation (doit être en dernier dans Alpine.data)
init: function() {
    log.info('PAGE_INIT', { page: '{cell}', timestamp: Date.now() });
    
    // Vérification auth
    const token = localStorage.getItem('token');
    if (!token) {
        log.warn('AUTH_MISSING');
        window.location.href = '/login';
        return;
    }
    
    // Lancer chargement initial
    this.initialLoad();
}
```

##### Fichier `/templates/workflows/{wf-name}.html`
```html
<!--
TODO IA:
+ Megafunction décrite dans specs/wf-frontend/{wf-name}.md
+ Pattern: workflowId, startTime, log.info('WORKFLOW_START'), try/catch/finally
+ Logs: WORKFLOW_START, VALIDATION_*, API_CALL_*, STATE_UPDATE, WORKFLOW_SUCCESS/ERROR
+ Met à jour les props définies dans alpinejs.html
-->
// Megafunction: {wf-name}
{wf-name}: async function() {
    const workflowId = crypto.randomUUID();
    const startTime = Date.now();
    
    log.info('WORKFLOW_START', { workflowId, workflow: '{wf-name}' });
    
    this.loading = true;
    this.error = null;
    
    try {
        const token = localStorage.getItem('token');
        
        log.debug('API_CALL_START', { endpoint: '/api/{endpoint}' });
        
        const response = await fetch('/api/{endpoint}', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ /* données */ })
        });
        
        log.debug('API_RESPONSE_RECEIVED', { status: response.status });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // Mise à jour des props
        this.items = data.items || data;
        log.debug('STATE_UPDATE', { itemCount: this.items.length });
        
        log.info('WORKFLOW_SUCCESS', { 
            workflowId, 
            duration: Date.now() - startTime 
        });
        
    } catch (error) {
        this.error = error.message;
        log.error('WORKFLOW_ERROR', { 
            workflowId, 
            error: error.message 
        });
    } finally {
        this.loading = false;
    }
}
```

---

#### Cell Backend Workflow (`app/backend-wf/{cell}/`)

##### Fichier `/__init__.py`
```python
"""
TODO IA:
+ Blueprint SANS template_folder (pas d'interface)
+ Pour API endpoints ou workflows sans UI
"""

from flask import Blueprint

bp = Blueprint('{cell}', __name__)

from . import routes
```

**Note sur app.py** : L'enregistrement du blueprint dans `app/__init__.py` se fait également de manière **programmatique** pour les backend-wf (voir code dans la section Cell Écran).

##### Fichier `/routes/wf_{name}.py`
```python
"""
TODO IA:
+ Megafunction Python selon /specs-global/rules/dev-backend.md
+ Pattern: WorkflowContext, WorkflowResult, WorkflowLogger
+ Logs exhaustifs: WORKFLOW_START, VALIDATION_*, DB_*, WORKFLOW_SUCCESS/ERROR
+ Interface: execute(**kwargs) -> Dict[str, Any]
+ Jamais d'import circulaire (imports lourds dans les fonctions)
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
        entry = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'level': level,
            'event': event,
            'workflow_id': self.context.workflow_id,
            'data': data
        }
        self.logs.append(entry)
        
        msg = f"[{self.context.workflow_id}] [{event}] {data}"
        if level == 'ERROR':
            logger.error(msg)
        elif level == 'WARNING':
            logger.warning(msg)
        elif level == 'DEBUG':
            logger.debug(msg)
        else:
            logger.info(msg)
    
    def debug(self, event: str, data: Dict[str, Any] = None):
        self._log('DEBUG', event, data or {})
    
    def info(self, event: str, data: Dict[str, Any] = None):
        self._log('INFO', event, data or {})
    
    def error(self, event: str, data: Dict[str, Any] = None):
        self._log('ERROR', event, data or {})
    
    def get_logs(self) -> List[Dict[str, Any]]:
        return self.logs


# MEGAFUNCTION PRINCIPALE
def execute(**kwargs) -> Dict[str, Any]:
    """
    Workflow: {name}
    Description: Selon specs/wf-backend/{name}.md
    """
    context = WorkflowContext(
        workflow_id=kwargs.get('workflow_id', str(uuid.uuid4())),
        started_at=datetime.utcnow(),
        user_id=kwargs.get('user_id'),
        request_id=kwargs.get('request_id')
    )
    
    log = WorkflowLogger(context)
    start_time = datetime.utcnow()
    
    log.info('WORKFLOW_START', {
        'workflow': '{name}',
        'input_keys': list(kwargs.keys()),
        'context': context.to_dict()
    })
    
    try:
        # Étape 1: Validation
        log.debug('VALIDATION_START', {'input': kwargs})
        validated = _validate_input(kwargs, log)
        log.info('VALIDATION_COMPLETE', {'validated_keys': list(validated.keys())})
        
        # Étape 2: Traitement
        log.debug('PROCESSING_START')
        result = _process_data(validated, log)
        log.info('PROCESSING_COMPLETE', {'result': result})
        
        execution_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        
        log.info('WORKFLOW_SUCCESS', {
            'execution_time_ms': execution_time,
            'records_processed': len(result.get('items', []))
        })
        
        return WorkflowResult(
            success=True,
            data=result,
            logs=log.get_logs(),
            execution_time_ms=execution_time
        ).to_dict()
        
    except Exception as e:
        execution_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        
        log.error('WORKFLOW_FAILED', {
            'error_type': type(e).__name__,
            'error_message': str(e),
            'execution_time_ms': execution_time
        })
        
        return WorkflowResult(
            success=False,
            data=None,
            logs=log.get_logs(),
            execution_time_ms=execution_time,
            error=str(e)
        ).to_dict()


def _validate_input(data: Dict[str, Any], log: WorkflowLogger) -> Dict[str, Any]:
    """Valide les entrées"""
    # TODO IA: Validation selon specs/wf-backend/{name}.md
    required = ['param1']  # À adapter
    for field in required:
        if field not in data:
            log.error('VALIDATION_ERROR', {'missing_field': field})
            raise ValueError(f"Champ requis manquant: {field}")
    return data


def _process_data(params: Dict[str, Any], log: WorkflowLogger) -> Dict[str, Any]:
    """Logique métier"""
    # TODO IA: Import local pour éviter circulaires
    # from ..models import SomeModel
    
    log.debug('PROCESSING_DETAIL', {'params': params})
    
    # Logique métier ici
    
    return {'status': 'ok', 'items': []}


# Route Flask
@bp.route('/api/{endpoint}', methods=['POST'])
def {name}_endpoint():
    from flask import request, jsonify
    
    data = request.get_json() or {}
    result = execute(
        **data,
        workflow_id=str(uuid.uuid4()),
        user_id=request.headers.get('X-User-Id')
    )
    
    return jsonify(result), 200 if result['success'] else 500
```

---

#### Cell Cron (`app/cron/{cell}/`)

##### Fichier `/__init__.py`
```python
"""
TODO IA:
+ Blueprint sans template_folder ni routes
+ Enregistrement du job APScheduler au démarrage
"""

from flask import Blueprint
from app import scheduler

bp = Blueprint('cron_{cell}', __name__)

from . import cron

# Enregistrement du job
@scheduler.task('interval', id='{cell}_job', minutes=60)  # Adapter intervalle
 def scheduled_job():
    with scheduler.app.app_context():
        cron.execute()
```

##### Fichier `/cron.py`
```python
"""
TODO IA:
+ Megafunction de cron selon dev-backend.md
+ Même pattern que backend-wf: execute() avec logs exhaustifs
+ Pas d'HTTP, appel direct depuis APScheduler
"""

import logging
import uuid
from datetime import datetime
from typing import Dict, Any

logger = logging.getLogger(__name__)


def execute() -> Dict[str, Any]:
    """
    Workflow cron: {cell}
    Exécuté périodiquement par APScheduler
    """
    workflow_id = str(uuid.uuid4())
    start_time = datetime.utcnow()
    
    logger.info(f'[{workflow_id}] CRON_START: {cell}')
    
    try:
        # TODO IA: Logique métier selon specs/wf-backend/
        
        logger.info(f'[{workflow_id}] CRON_SUCCESS')
        return {'success': True, 'workflow_id': workflow_id}
        
    except Exception as e:
        logger.error(f'[{workflow_id}] CRON_FAILED: {e}')
        return {'success': False, 'error': str(e), 'workflow_id': workflow_id}
```

---

### `CellTester`

Gère le processus de test automatisé et l'analyse des logs via IA.

**Processus de test complet :**

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROCESSUS DE TEST                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. VÉRIFICATION SERVEUR                                       │
│     └── curl http://localhost:5000                              │
│     └── Si OK → passe à l'étape 3                              │
│     └── Si KO → passe à l'étape 2                              │
│                                                                  │
│  2. DÉMARRAGE SERVEUR                                          │
│     └── Lance scripts/03-init-boilerplate.sh                  │
│     └── Capture stderr immédiat                                 │
│     └── Attend 3 secondes                                       │
│     └── Retry curl                                            │
│     └── Si toujours KO → logs erreurs de démarrage            │
│                                                                  │
│  3. TEST HTTP                                                  │
│     └── curl http://localhost:5000/{cell}                       │
│     └── Capture code HTTP (200, 302 = OK)                      │
│     └── Si 500+ → capture logs backend immédiatement          │
│     └── Si OK → passe à l'étape 4                             │
│                                                                  │
│  4. TEST PLAYWRIGHT                                            │
│     └── Lance navigateur headless (Chromium)                  │
│     └── Charge la page                                         │
│     └── Intercepte console.log/console.error                  │
│     └── Capture screenshot                                     │
│     └── Sauvegarde logs frontend en JSON                      │
│                                                                  │
│  5. CAPTURE LOGS BACKEND                                       │
│     └── Lit flask_server.log (nouvelles lignes)               │
│     └── Filtre ERROR, Exception, Traceback, ImportError       │
│     └── Sauvegarde dans backend.log                           │
│                                                                  │
│  6. ANALYSE IA                                                 │
│     └── Construit prompt avec tous les logs                   │
│     └── Appel pi -p pour analyse                              │
│     └── Résultat: PASS ou FAIL + raisons                      │
│                                                                  │
│  7. SI FAIL → CORRECTION                                       │
│     └── Prépare contexte (logs + code)                        │
│     └── Appel pi -p pour correction                           │
│     └── Applique correction si utilisateur valide             │
│     └── Retour à l'étape 1                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Structure des logs générés :**

```
app/{type}/{cell}/logs/{timestamp}/
├── report.json                    # Rapport principal du test
│   {
│     "cell": "{cell_name}",
│     "timestamp": "2025-01-15T14:30:00",
│     "url": "http://localhost:5000/{cell}",
│     "status": "tested",
│     "http_code": 200,
│     "test_passed": true,
│     "files": {
│       "frontend": "frontend.json",
│       "backend": "backend.log",
│       "screenshot": "screenshots/{cell}.png",
│       "output": "test_output.log"
│     }
│   }
├── frontend.json                  # Logs console navigateur (JSON)
│   {
│     "timestamp": "...",
│     "url": "...",
│     "messages": [
│       {"type": "log", "text": "[INFO][PAGE_INIT] ..."},
│       {"type": "error", "text": "ReferenceError: x is not defined"}
│     ],
│     "errors": [...]
│   }
├── backend.log                    # Erreurs Flask capturées (texte)
│   [2025-01-15 14:30:01] ERROR: ImportError in routes/index.py
│   [2025-01-15 14:30:01] Traceback (most recent call last):
│     File "/app/.../routes/index.py", line 15, in index
│       from ..models import User
│   ImportError: cannot import name 'User'
├── test_output.log                # Sortie brute du test Playwright
├── errors.txt                     # Erreurs consolidées (frontend + backend)
└── screenshots/
    └── {cell}.png                 # Capture d'écran de la page
```

**Prompt d'analyse IA :**

```python
ANALYSIS_PROMPT = """
Tu es un expert en debugging Flask/Alpine.js.

Analyse les logs de test suivants et détermine si le test passe ou échoue.

## Contexte
Cell: {cell_name}
Type: {cell_type}
URL testée: {url}
Code HTTP: {http_code}

## Logs Frontend (console navigateur)
```json
{frontend_logs}
```

## Logs Backend (Flask)
```
{backend_logs}
```

## Erreurs consolidées
```
{errors}
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
```

**Prompt de correction IA :**

```python
FIX_PROMPT = """
Tu es un développeur Flask/Alpine.js expert.

La cell '{cell_name}' a des erreurs lors des tests.

## Erreurs détectées
{error_analysis}

## Logs détaillés Frontend
```json
{frontend_logs}
```

## Logs Backend
```
{backend_logs}
```

## Code actuel
```python
{current_code}
```

## Ta mission
1. Analyse les erreurs ci-dessus (frontend ET backend)
2. Identifie la cause racine (ImportError, NoAppException, etc.)
3. Corrige le code pour résoudre TOUTES les erreurs
4. Donne le fichier corrigé COMPLET

Réponds avec le fichier corrigé prêt à l'emploi.
"""
```

**Fonctions principales :**

| Fonction | Description |
|----------|-------------|
| `run_tests(cell)` | Orchestrateur principal du test |
| `_check_server()` | Vérifie si Flask répond sur port 5000 |
| `_start_server(project_dir)` | Démarre Flask via script d'initialisation |
| `_test_http(url)` | Vérifie le code HTTP de la route |
| `_run_playwright(url, log_path, screenshot_path)` | Test frontend avec Playwright |
| `_capture_backend_logs(project_dir, logs_dir, log_before)` | Capture erreurs Flask |
| `_analyze_with_ai(logs, cell)` | Analyse des logs via pi -p |
| `_auto_fix(cell, errors)` | Correction automatique via pi -p |

---

### `PromptGenerator`

Génère un **prompt spécifique pour chaque fichier squelette**.

**Important** : L'IA écrit directement le code dans le fichier squelette existant. Pas besoin de générer un fichier YAML séparé - l'IA remplace le contenu du squelette par le code final.

**Pour chaque fichier, le prompt contient :**
1. Le contenu du fichier squelette avec ses INSTRUCTIONS
2. Les specs sources pertinentes (models, routes, etc.)
3. La demande de génération du code complet (remplacement du squelette)
**Exemple de prompt pour un modèle :**
```
Tu es un développeur Flask expert.

Implémente le code COMPLET pour ce modèle en suivant les INSTRUCTIONS dans le fichier squelette.

## Fichier squelette
```python
[squelette models/user.py avec INSTRUCTIONS détaillées]
```

## Specs source
```yaml
[Contenu de specs/models/user.md]
```

## Ta mission
1. Lis les INSTRUCTIONS dans le squelette
2. Génère le code COMPLET et fonctionnel
3. Remplace les commentaires INSTRUCTIONS par du code
4. Réponds avec le fichier complet en YAML

```yaml
fichier:
  chemin: /home/ubuntu/marki/relances2/app/models/user.py //chemin absolu.
  contenu: |
    # code complet ici
```
```

### `YamlExtractor`

Extrait le fichier final depuis la réponse YAML de l'IA, un fichier à la fois.

**Processus pour chaque fichier :**
1. Nettoie la réponse (extrait entre ```yaml ... ```)
2. Parse avec `yaml.safe_load()`
3. Écrit le fichier dans la cellule (remplace le squelette)
4. Sauvegarde le prompt et la réponse dans dev2-logs/

**Format attendu par fichier :**
```yaml
fichier:
  chemin: models/user.py
  contenu: |
    # code complet généré par l'IA
```

## Fonctions utilitaires

| Fonction | Description |
|----------|-------------|
| `register_blueprint_in_app_py()` | **Programmatique** - Ajoute l'import et l'enregistrement du blueprint dans `app/__init__.py` |
| `_clean()` | Supprime tout sauf `specs/`, recrée structure |
| `_run_pi_prompt()` | Exécute `pi -p` avec timeout 300s |

### `register_blueprint_in_app_py(cell_type, cell_name)`

Met à jour `app/__init__.py` pour enregistrer le blueprint de la nouvelle cell.

**Processus programmatique (pas d'IA) :**

1. **Lit** le fichier `app/__init__.py`
2. **Détecte** la section d'imports des blueprints (pattern `from .{type} import`)
3. **Ajoute** l'import : `from .{cell_type}.{cell_name} import bp as {cell_name}_bp`
4. **Détecte** la fonction `create_app()`
5. **Ajoute** l'enregistrement : `app.register_blueprint({cell_name}_bp, url_prefix='/{cell_name}')`
6. **Écrit** le fichier modifié

**Exemple de modification :**

```python
# Avant dans app/__init__.py:
from .screens.dashboard import bp as dashboard_bp

def create_app():
    app = Flask(__name__)
    app.register_blueprint(dashboard_bp, url_prefix='/dashboard')
    return app

# Après ajout de la cell "impayes":
from .screens.dashboard import bp as dashboard_bp
from .screens.impayes import bp as impayes_bp  # AJOUTÉ

def create_app():
    app = Flask(__name__)
    app.register_blueprint(dashboard_bp, url_prefix='/dashboard')
    app.register_blueprint(impayes_bp, url_prefix='/impayes')  # AJOUTÉ
    return app
```

**Gestion des types :**
- `screens/{cell}` → `url_prefix='/{cell}'`
- `backend-wf/{cell}` → `url_prefix='/api/{cell}'`
- `cron/{cell}` → Pas d'URL prefix (enregistrement APScheduler dans le blueprint lui-même)

## Format des specs attendues

### Modèles (`specs/models/*.md`)

Avec YAML frontmatter :
```markdown
---
fields:
  - name: id
    type: int
    primary_key: true
  - name: email
    type: str
    unique: true
---

Description du modèle...
```

### Routes (`specs/routes/*.md`)

```markdown
---
path: /users
methods: [GET, POST]
template: users.html
---

Description de la route...
```

### Workflows (`specs/wf-frontend/*.md`)

```markdown
---
trigger: click
source: button#submit
actions:
  - type: fetch
    target: /api/users
    params:
      method: POST
---

Description du workflow...
```

## Fichiers créés par dev2

```
cells/{type}/{cell}/
├── specs/                          # (conservé)
├── __init__.py                     # Blueprint (squelette → code final)
├── models/
│   └── *.py                        # Modèles (squelette → code final)
├── routes/
│   └── __init__.py                 # Routes (squelette → code final)
├── templates/
│   └── *.html                      # Templates (squelette → code final)
├── logs/                           # (créé vide)
└── dev2-logs/                      # Logs de chaque appel pi -p
    ├── __init__.py.prompt.txt
    ├── __init__.py.response.yaml
    ├── models.user.py.prompt.txt
    ├── models.user.py.response.yaml
    └── ...
```

Chaque fichier généré a son propre prompt et sa réponse sauvegardés.


## Options CLI

```bash
drdice dev2 [OPTIONS]
  --project-dir PATH    Chemin du projet
  --cell NAME           Développer une cell spécifique
  --skip-git            Ne pas gérer git
  --skip-clean          Ne pas nettoyer avant dev
```

Note: pas d'option `--skip-tests` car dev2 ne lance pas de tests (à implémenter).

## Flux de données

```
specs/                    
├── models/               
│   └── user.md                 
├── routes/               ┌─────────────┐
│   └── index.md          │  FilePlan   │
└── wf-frontend/          │    List     │
    └── submit.md         └─────────────┘
                                 │
                                 ▼
                         ┌─────────────┐
                         │ Skeleton    │
                         │ Generator   │
                         └─────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
        ┌───────────┐   ┌───────────┐   ┌───────────┐
        │__init__.py│   │models/*.py│   │routes/*.py│
        │+INSTR.    │   │+INSTR.    │   │+INSTR.    │
        └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
              │               │               │
              ▼               ▼               ▼
        ┌───────────┐   ┌───────────┐   ┌───────────┐
        │  pi -p    │   │  pi -p    │   │  pi -p    │
        │ (fichier) │   │ (fichier) │   │ (fichier) │
        └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
              │               │               │
              ▼               ▼               ▼
        ┌───────────┐   ┌───────────┐   ┌───────────┐
        │__init__.py│   │models/*.py│   │routes/*.py│
        │ (final)   │   │ (final)   │   │ (final)   │
        └───────────┘   └───────────┘   └───────────┘
```

Chaque fichier squelette contient ses propres instructions et fait l'objet d'un appel `pi -p` dédié.

## Dépendances externes

- `pi` : Commande de génération IA (via subprocess)
- `git` : Gestion des branches (optionnel)
- `yaml` : Parsing des YAML frontmatter et réponses IA
