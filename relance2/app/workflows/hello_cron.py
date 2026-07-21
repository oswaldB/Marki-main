"""
Workflow: hello_cron
Description: Logger "Hello World" toutes les minutes dans un fichier de log
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
        elif level == 'DEBUG':
            logger.debug(log_message)
        else:
            logger.info(log_message)
    
    def debug(self, event: str, data: Dict[str, Any] = None):
        self._log('DEBUG', event, data or {})
        
    def info(self, event: str, data: Dict[str, Any] = None):
        self._log('INFO', event, data or {})
        
    def error(self, event: str, data: Dict[str, Any] = None):
        self._log('ERROR', event, data or {})
        
    def get_logs(self) -> List[Dict[str, Any]]:
        return self.logs


def execute(**kwargs) -> Dict[str, Any]:
    """
    MEGAFUNCTION: Logger "Hello World" dans un fichier de log
    
    Args:
        **kwargs: Données d'entrée du workflow (depuis cron)
        
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
        'workflow': 'hello_cron',
        'context': context.to_dict()
    })
    
    try:
        log.debug('LOG_FILE_OPEN', {'log_file': '/var/log/hello-cron.log'})
        
        with open('/var/log/hello-cron.log', 'a') as f:
            f.write(f"[{datetime.utcnow().isoformat()}] Hello World\n")
        
        log.info('HELLO_WORLD', {
            'log_file': '/var/log/hello-cron.log',
            'message': 'Hello World'
        })
        
        execution_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        
        log.info('WORKFLOW_SUCCESS', {
            'execution_time_ms': execution_time
        })
        
        return WorkflowResult(
            success=True,
            data={'message': 'hello world', 'log_file': '/var/log/hello-cron.log'},
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
