# Règles de Développement Backend

## Architecture

### Principe : Megafunctions Python dans Flask

Le backend Flask dans `app/` expose des endpoints REST via `routes/`. Chaque endpoint appelle une **megafunction** dans `app/workflows/` - une fonction Python autonome qui encapsule toute la logique métier.

```
app/
├── app.py                    # App Flask principale (config)
├── db.py                     # Connexion DB partagée
├── routes/                   # Routes Flask (endpoints)
│   ├── auth.py
│   ├── dashboard.py
│   └── ...
├── workflows/                # Megafunctions (logique métier)
│   ├── __init__.py
│   ├── auth_login.py
│   ├── generate_relances.py
│   ├── import_invoice.py
│   └── cleanup_orphan_relances.py
└── static/pages/             # Frontend (voir dev-frontend.md)
```

### Structure d'une Megafunction

Chaque fichier dans `workflows/` expose **une fonction principale** `execute()` qui est appelée par Flask ou le cron:

```python
# workflows/generate_relances.py
"""
Workflow: generate_relances
Description: Génère les relances automatiques pour les impayés
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
        return {
            'workflow_id': self.workflow_id,
            'started_at': self.started_at.isoformat(),
            'user_id': self.user_id,
            'request_id': self.request_id
        }


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
        entry = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'level': level,
            'event': event,
            'workflow_id': self.context.workflow_id,
            'data': data
        }
        self.logs.append(entry)
        
        log_message = f"[{self.context.workflow_id}] [{event}] {data}"
        if level == 'ERROR':
            logger.error(log_message)
        elif level == 'WARNING':
            logger.warning(log_message)
        elif level == 'DEBUG':
            logger.debug(log_message)
        else:
            logger.info(log_message)
        
    def debug(self, event: str, data: Dict[str, Any] = None):
        self._log('DEBUG', event, data or {})
        
    def info(self, event: str, data: Dict[str, Any] = None):
        self._log('INFO', event, data or {})
        
    def warning(self, event: str, data: Dict[str, Any] = None):
        self._log('WARNING', event, data or {})
        
    def error(self, event: str, data: Dict[str, Any] = None):
        self._log('ERROR', event, data or {})
        
    def get_logs(self) -> List[Dict[str, Any]]:
        return self.logs


# ============================================================================
# MEGAFUNCTION PRINCIPALE - Point d'entrée appelé par Flask ou cron
# ============================================================================

def execute(**kwargs) -> Dict[str, Any]:
    """
    MEGAFUNCTION: Génère les relances automatiques pour les impayés
    
    Args:
        **kwargs: Données d'entrée du workflow (depuis request.json ou cron)
        
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
    
    log.info('WORKFLOW_START', {
        'workflow': 'generate_relances',
        'input_keys': list(kwargs.keys()),
        'context': context.to_dict()
    })
    
    try:
        # Étape 1: Validation des entrées
        log.debug('VALIDATION_START', { 'input': kwargs })
        validated = _validate_input(kwargs, log)
        log.info('VALIDATION_COMPLETE', { 'validated_keys': list(validated.keys()) })
        
        # Étape 2: Chargement des données
        log.debug('DATA_LOAD_START')
        data = _load_data(validated, log)
        log.info('DATA_LOAD_COMPLETE', { 'record_count': len(data) })
        
        # Étape 3: Traitement métier
        log.debug('PROCESSING_START')
        result = _process_data(data, log)
        log.info('PROCESSING_COMPLETE', { 
            'processed_count': result.get('count', 0),
            'generated_items': len(result.get('items', []))
        })
        
        # Étape 4: Persistance
        log.debug('PERSISTENCE_START')
        saved = _save_result(result, log)
        log.info('PERSISTENCE_COMPLETE', { 'saved_ids': saved })
        
        execution_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        
        log.info('WORKFLOW_SUCCESS', {
            'execution_time_ms': execution_time,
            'records_processed': len(data)
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
            'error_traceback': __import__('traceback').format_exc(),
            'execution_time_ms': execution_time
        })
        
        return WorkflowResult(
            success=False,
            data=None,
            logs=log.get_logs(),
            execution_time_ms=execution_time,
            error=str(e)
        ).to_dict()


# ============================================================================
# Fonctions privées du workflow (préfixées par _)
# ============================================================================

def _validate_input(data: Dict[str, Any], log: WorkflowLogger) -> Dict[str, Any]:
    """Valide et normalise les données d'entrée"""
    required = ['date_debut', 'date_fin']
    
    for field in required:
        if field not in data:
            log.error('VALIDATION_ERROR', { 
                'missing_field': field, 
                'available': list(data.keys()) 
            })
            raise ValueError(f"Champ requis manquant: {field}")
    
    log.debug('VALIDATION_DETAIL', { 
        'date_debut': data['date_debut'],
        'date_fin': data['date_fin']
    })
    
    return {
        'date_debut': data['date_debut'],
        'date_fin': data['date_fin'],
        'filtre_statut': data.get('filtre_statut', 'tous')
    }


def _load_data(params: Dict[str, Any], log: WorkflowLogger) -> List[Dict]:
    """Charge les impayés depuis la base de données"""
    log.debug('DB_QUERY_START', { 
        'table': 'impayes',
        'filtre': params 
    })
    
    from db import get_connection  # Import local pour éviter les dépendances circulaires
    
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT * FROM impayes 
            WHERE date BETWEEN ? AND ?
            AND statut = COALESCE(?, statut)
        """, (params['date_debut'], params['date_fin'], params.get('filtre_statut')))
        
        rows = cursor.fetchall()
        log.debug('DB_QUERY_RESULT', { 
            'row_count': len(rows),
            'sql': cursor.statement
        })
        return rows
        
    finally:
        cursor.close()


def _process_data(data: List[Dict], log: WorkflowLogger) -> Dict[str, Any]:
    """Logique métier: génère les relances"""
    log.debug('PROCESSING_DETAIL', { 'input_count': len(data) })
    
    processed = []
    for idx, record in enumerate(data):
        log.debug('PROCESSING_RECORD', { 
            'index': idx, 
            'facture_id': record.get('id'),
            'montant': record.get('montant')
        })
        
        # Logique métier de génération de relance...
        processed.append({
            'facture_id': record['id'],
            'type_relance': 'email',
            'montant': record['montant']
        })
        
    return {
        'count': len(processed),
        'items': processed
    }


def _save_result(result: Dict[str, Any], log: WorkflowLogger) -> List[str]:
    """Persiste les relances générées en base"""
    log.debug('SAVE_START', { 'item_count': result.get('count', 0) })
    
    from db import get_connection
    
    conn = get_connection()
    cursor = conn.cursor()
    saved_ids = []
    
    try:
        for item in result['items']:
            cursor.execute("""
                INSERT INTO relances (facture_id, type_relance, montant, created_at)
                VALUES (?, ?, ?, datetime('now'))
            """, (item['facture_id'], item['type_relance'], item['montant']))
            saved_ids.append(cursor.lastrowid)
        
        conn.commit()
        log.debug('SAVE_RESULT', { 'saved_count': len(saved_ids), 'ids': saved_ids })
        return saved_ids
        
    except Exception as e:
        conn.rollback()
        log.error('SAVE_ERROR', { 'error': str(e) })
        raise
    finally:
        cursor.close()
```

### Route Flask appelant la Megafunction

```python
# routes/generate_relances.py (ou app.py)

from flask import Flask, request, jsonify
import uuid
from datetime import datetime

from workflows.generate_relances import execute

app = Flask(__name__)

@app.route('/api/workflow/generate-relances', methods=['POST'])
def generate_relances_endpoint():
    """
    Endpoint Flask qui appelle la megafunction
    """
    # Récupération des données de la requête
    data = request.get_json() or {}
    
    # Appel de la megafunction avec les données + métadonnées
    result = execute(
        **data,
        workflow_id=str(uuid.uuid4()),
        user_id=request.headers.get('X-User-Id'),
        request_id=request.headers.get('X-Request-Id')
    )
    
    # Réponse HTTP
    return jsonify(result), 200 if result['success'] else 500
```

## Règles de Structure

### 1. Une megafunction = un fichier workflow

```python
# ✅ BON: Un workflow = une fonction principale `execute()`
# workflows/generate_relances.py  -> def execute(**kwargs) -> dict
# workflows/auth_login.py         -> def execute(**kwargs) -> dict

# ❌ INTERDIT: Plusieurs endpoints dans un même fichier workflow
```

### 2. Interface standardisée

Toutes les megafunctions doivent avoir la **même signature** (conforme à `workflows/__init__.py`):

```python
def execute(**kwargs) -> Dict[str, Any]:
    """Point d'entrée unique appelé par Flask ou cron"""
    ...
```

### 3. Import local des dépendances

Pour éviter les imports circulaires et les dépendances lourdes au démarrage:

```python
# ✅ BON: Import local à l'intérieur des fonctions privées
def _load_data(params, log):
    from db import get_connection  # Import ici, pas en haut du fichier
    conn = get_connection()
    ...

# ❌ INTERDIT: Import global de modules lourds
from db import get_connection  # En haut du fichier
```

### 4. Gestion des erreurs

La megafunction **ne laisse jamais d'exception non catchée**. Toutes les erreurs sont capturées et retournées dans `WorkflowResult`:

```python
def execute(**kwargs):
    context = WorkflowContext(...)
    log = WorkflowLogger(context)
    
    try:
        result = _do_work()
        return WorkflowResult(success=True, ...).to_dict()
    except Exception as e:
        log.error('WORKFLOW_FAILED', {...})
        return WorkflowResult(success=False, error=str(e), ...).to_dict()
```

## Génération Exhaustive des Logs

### Obligatoire dans chaque megafunction

```python
# Événements à logger obligatoirement:

WORKFLOW_START      # Début avec contexte complet
WORKFLOW_SUCCESS    # Fin réussie avec métriques
WORKFLOW_FAILED     # Échec avec stack trace

VALIDATION_START    # Début validation
VALIDATION_COMPLETE # Validation OK
VALIDATION_ERROR    # Échec avec détails

DB_QUERY_START      # Avant chaque requête SQL
DB_QUERY_RESULT     # Après avec row_count
DB_QUERY_ERROR      # Erreur SQL avec params

API_CALL_START      # Avant appel HTTP externe
API_CALL_COMPLETE   # Réponse avec status
API_CALL_ERROR      # Erreur avec request/response

PROCESSING_START    # Début logique métier
PROCESSING_DETAIL   # Chaque étape intermédiaire
PROCESSING_COMPLETE # Fin avec summary

PERSISTENCE_START   # Avant INSERT/UPDATE
PERSISTENCE_COMPLETE # Après avec IDs générés
```

### Configuration logging Flask

```python
# app.py - Configuration au démarrage
import logging
import sys

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('/var/log/flask-app.log')
    ]
)

# Logger spécifique pour les workflows
workflow_logger = logging.getLogger('workflows')
workflow_logger.setLevel(logging.DEBUG)
```

## Pattern complet: Ajouter un nouveau workflow

### Étape 1: Créer le fichier workflow

```python
# workflows/mon_nouveau_workflow.py

"""
Workflow: mon_nouveau_workflow
Description: Description du workflow
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
    def __init__(self, context):
        self.context = context
        self.logs = []
    
    def _log(self, level, event, data):
        entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': level,
            'event': event,
            'workflow_id': self.context.workflow_id,
            'data': data
        }
        self.logs.append(entry)
        logger.info(f"[{self.context.workflow_id}] {event}: {data}")
    
    def debug(self, event, data=None):
        self._log('DEBUG', event, data or {})
    
    def info(self, event, data=None):
        self._log('INFO', event, data or {})
    
    def error(self, event, data=None):
        self._log('ERROR', event, data or {})
    
    def get_logs(self):
        return self.logs


def execute(**kwargs) -> Dict[str, Any]:
    """Megafunction principale"""
    context = WorkflowContext(
        workflow_id=kwargs.get('workflow_id', str(uuid.uuid4())),
        started_at=datetime.utcnow(),
        user_id=kwargs.get('user_id')
    )
    
    log = WorkflowLogger(context)
    start_time = datetime.utcnow()
    
    log.info('WORKFLOW_START', {'workflow': 'mon_nouveau_workflow'})
    
    try:
        # Logique métier ici
        result = {'status': 'ok'}
        
        return WorkflowResult(
            success=True,
            data=result,
            logs=log.get_logs(),
            execution_time_ms=0
        ).to_dict()
    except Exception as e:
        log.error('WORKFLOW_FAILED', {'error': str(e)})
        return WorkflowResult(
            success=False,
            error=str(e),
            logs=log.get_logs(),
            execution_time_ms=0
        ).to_dict()
```

### Étape 2: Ajouter la route Flask

```python
# routes/mon_nouveau_workflow.py

from flask import Blueprint, request, jsonify
from workflows.mon_nouveau_workflow import execute

bp = Blueprint('mon_nouveau_workflow', __name__)

@bp.route('/api/workflow/mon-nouveau-workflow', methods=['POST'])
def mon_nouveau_workflow_endpoint():
    result = execute(**request.get_json() or {})
    return jsonify(result), 200 if result['success'] else 500
```

### Étape 3: Enregistrer le blueprint dans app.py

```python
# app.py

from routes import mon_nouveau_workflow

app.register_blueprint(mon_nouveau_workflow.bp)
```

## Checklist avant commit

- [ ] Le fichier expose une fonction `execute(**kwargs) -> dict`
- [ ] La fonction retourne toujours un dict avec `success`, `data`, `logs`, `execution_time_ms`
- [ ] Tous les logs obligatoires sont présents
- [ ] Les imports lourds sont faits localement (pas en global)
- [ ] Les erreurs sont toutes capturées et retournées
- [ ] La route Flask correspondante est ajoutée dans `routes/`
- [ ] Le fichier a un docstring avec description du workflow

## Anti-patterns Interdits

❌ **Pas d'état global dans les workflows**:
```python
# INTERDIT
_db_connection = None

def execute(**kwargs):
    global _db_connection
    if _db_connection is None:
        _db_connection = create_connection()
```

❌ **Pas de gestion de requête HTTP dans le workflow**:
```python
# INTERDIT
def execute(**kwargs):
    from flask import request  # Le workflow ne doit pas connaître Flask
    user_agent = request.headers.get('User-Agent')
```

❌ **Pas d'async/await**:
```python
# INTERDIT
async def execute(**kwargs):
    await something()
```

❌ **Pas de print() pour les logs**:
```python
# INTERDIT
print("Starting workflow")  # Utilise logger ou WorkflowLogger
```
