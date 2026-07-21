"""
Megafunction pour le cronjob hello-cron.
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List
import uuid


@dataclass
class WorkflowContext:
    """Contexte d'exécution du workflow."""
    workflow_id: str
    started_at: datetime


@dataclass
class WorkflowResult:
    """Résultat d'exécution du workflow."""
    success: bool
    data: Dict[str, Any] = field(default_factory=dict)
    logs: List[str] = field(default_factory=list)


class WorkflowLogger:
    """Logger pour le workflow avec niveaux debug/info/error."""
    
    def __init__(self):
        self.logs: List[str] = []
    
    def debug(self, message: str) -> None:
        """Log un message de niveau debug."""
        log_entry = f"[DEBUG] {datetime.utcnow().isoformat()} - {message}"
        self.logs.append(log_entry)
    
    def info(self, message: str) -> None:
        """Log un message de niveau info."""
        log_entry = f"[INFO] {datetime.utcnow().isoformat()} - {message}"
        self.logs.append(log_entry)
    
    def error(self, message: str) -> None:
        """Log un message de niveau error."""
        log_entry = f"[ERROR] {datetime.utcnow().isoformat()} - {message}"
        self.logs.append(log_entry)


def execute(**kwargs) -> Dict[str, Any]:
    """
    Point d'entrée principal du workflow hello-cron.
    
    Args:
        **kwargs: Arguments passés par l'appelant
        
    Returns:
        Dict contenant le résultat de l'exécution
    """
    logger = WorkflowLogger()
    
    try:
        # 1. Créer le contexte d'exécution
        context = WorkflowContext(
            workflow_id=str(uuid.uuid4()),
            started_at=datetime.utcnow()
        )
        
        # 2. Log WORKFLOW_START avec context
        logger.info(f"WORKFLOW_START - workflow_id={context.workflow_id}")
        
        # 3. Log HELLO_WORLD dans le fichier de log
        log_message = f"[{datetime.utcnow().isoformat()}] HELLO_WORLD - workflow_id={context.workflow_id}\n"
        with open("/var/log/hello-cron.log", "a") as f:
            f.write(log_message)
        
        logger.info("HELLO_WORLD written to /var/log/hello-cron.log")
        
        # 4. Retourner le résultat de succès
        logger.info("WORKFLOW_SUCCESS")
        
        result = WorkflowResult(
            success=True,
            data={'message': 'hello world'},
            logs=logger.logs
        )
        
        return {
            'success': result.success,
            'data': result.data,
            'logs': result.logs
        }
        
    except Exception as e:
        # Gestion des erreurs
        logger.error(f"WORKFLOW_FAILED - {str(e)}")
        
        result = WorkflowResult(
            success=False,
            data={},
            logs=logger.logs
        )
        
        return {
            'success': result.success,
            'data': result.data,
            'logs': result.logs
        }
