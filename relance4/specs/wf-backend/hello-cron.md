# Workflow Backend : Hello Cron

## Objectifs
- Logger "Hello World" toutes les minutes dans un fichier de log
- Démontrer le pattern megafunction avec logging exhaustif

## Description
Ce workflow est un exemple simple de cronjob qui écrit "Hello World" dans un fichier de log toutes les minutes. Il suit le pattern des megafunctions avec:
- WorkflowContext pour le contexte d'exécution
- WorkflowResult pour le résultat standardisé
- WorkflowLogger pour les logs structurés

## Entrées
- Aucune (cron exécuté automatiquement)

## Sorties
```json
{
  "success": true,
  "data": {
    "message": "hello world",
    "log_file": "/var/log/hello-cron.log"
  },
  "logs": [...],
  "execution_time_ms": 42
}
```

## Process

```python
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
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'workflow_id': self.workflow_id,
            'started_at': self.started_at.isoformat(),
            'user_id': self.user_id
        }

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
        
    def info(self, event: str, data: Dict[str, Any] = None):
        self._log('INFO', event, data or {})
    
    def error(self, event: str, data: Dict[str, Any] = None):
        self._log('ERROR', event, data or {})

# Megafunction principale
def execute(**kwargs) -> Dict[str, Any]:
    context = WorkflowContext(
        workflow_id=kwargs.get('workflow_id', str(uuid.uuid4())),
        started_at=datetime.utcnow()
    )
    
    log = WorkflowLogger(context)
    start_time = datetime.utcnow()
    
    log.info('WORKFLOW_START', {
        'workflow': 'hello_cron',
        'context': context.to_dict()
    })
    
    try:
        # Écrire dans le fichier de log
        log_file = '/var/log/hello-cron.log'
        with open(log_file, 'a') as f:
            f.write(f"[{datetime.utcnow().isoformat()}] Hello World\n")
        
        log.info('HELLO_WORLD_LOGGED', {'log_file': log_file})
        
        execution_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        
        log.info('WORKFLOW_SUCCESS', {'execution_time_ms': execution_time})
        
        return WorkflowResult(
            success=True,
            data={'message': 'hello world', 'log_file': log_file},
            logs=log.get_logs(),
            execution_time_ms=execution_time
        ).to_dict()
        
    except Exception as e:
        execution_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        
        log.error('WORKFLOW_FAILED', {
            'error': str(e),
            'execution_time_ms': execution_time
        })
        
        return WorkflowResult(
            success=False,
            data=None,
            logs=log.get_logs(),
            execution_time_ms=execution_time,
            error=str(e)
        ).to_dict()
```

## Configuration Cron

```bash
# Crontab - exécute toutes les minutes
* * * * * /usr/bin/python3 /chemin/absolu/app/cron/run_hello.py >> /var/log/hello-cron.log 2>&1
```

## Script d'appel

```python
# app/cron/run_hello.py
import sys
import os

# Ajouter le parent au path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from workflows.hello_cron import execute

if __name__ == '__main__':
    result = execute()
    print(result)
```

## Logs

Les logs sont écrits dans:
- Console: via logging
- Fichier: `/var/log/hello-cron.log`

## Tests

```bash
# Exécuter manuellement le workflow
python app/cron/run_hello.py

# Vérifier les logs
tail -f /var/log/hello-cron.log
```
