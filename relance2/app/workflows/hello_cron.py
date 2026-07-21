"""
Megafunction pour cronjob: hello_cron
Écrit un message dans un fichier log quotidiennement.
"""

import uuid
from datetime import datetime
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional


@dataclass
class WorkflowContext:
    """Contexte d'exécution du workflow."""
    workflow_id: str
    started_at: datetime
    inputs: Dict[str, Any] = field(default_factory=dict)


@dataclass
class WorkflowResult:
    """Résultat d'exécution du workflow."""
    success: bool
    data: Dict[str, Any] = field(default_factory=dict)
    logs: List[Dict[str, Any]] = field(default_factory=list)
    error: Optional[str] = None


class WorkflowLogger:
    """Logger pour les workflows avec structure JSON."""
    
    def __init__(self):
        self.logs: List[Dict[str, Any]] = []
    
    def _log(self, level: str, event: str, data: Optional[Dict[str, Any]] = None) -> None:
        """Ajoute un log structuré."""
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": level,
            "event": event,
            "data": data or {}
        }
        self.logs.append(log_entry)
    
    def debug(self, event: str, data: Optional[Dict[str, Any]] = None) -> None:
        """Log niveau DEBUG."""
        self._log("DEBUG", event, data)
    
    def info(self, event: str, data: Optional[Dict[str, Any]] = None) -> None:
        """Log niveau INFO."""
        self._log("INFO", event, data)
    
    def error(self, event: str, data: Optional[Dict[str, Any]] = None) -> None:
        """Log niveau ERROR."""
        self._log("ERROR", event, data)


def execute(**kwargs) -> Dict[str, Any]:
    """
    Megafunction exécutée par le scheduler cron.
    
    Args:
        **kwargs: Paramètres optionnels passés par le scheduler
        
    Returns:
        Dict contenant le résultat sérialisé du workflow
    """
    logger = WorkflowLogger()
    
    try:
        # Création du contexte d'exécution
        context = WorkflowContext(
            workflow_id=str(uuid.uuid4()),
            started_at=datetime.utcnow(),
            inputs=kwargs
        )
        
        # Log de démarrage
        logger.info("WORKFLOW_START", {
            "workflow_id": context.workflow_id,
            "started_at": context.started_at.isoformat()
        })
        
        # Action métier: écriture dans le fichier log
        log_message = f"[{datetime.utcnow().isoformat()}] HELLO_WORLD: Bonjour depuis le cron !\n"
        
        # Écriture locale dans le fichier de log
        with open("/var/log/hello-cron.log", "a") as f:
            f.write(log_message)
        
        logger.info("HELLO_WORLD", {"message": log_message.strip()})
        
        # Log de succès
        logger.info("WORKFLOW_SUCCESS", {
            "workflow_id": context.workflow_id,
            "duration_ms": (datetime.utcnow() - context.started_at).total_seconds() * 1000
        })
        
        # Construction du résultat
        result = WorkflowResult(
            success=True,
            data={"message": "hello world"},
            logs=logger.logs
        )
        
        return {
            "success": result.success,
            "data": result.data,
            "logs": result.logs,
            "error": result.error
        }
        
    except Exception as e:
        # Log d'erreur
        logger.error("WORKFLOW_FAILED", {
            "error_type": type(e).__name__,
            "error_message": str(e)
        })
        
        result = WorkflowResult(
            success=False,
            data={},
            logs=logger.logs,
            error=str(e)
        )
        
        return {
            "success": result.success,
            "data": result.data,
            "logs": result.logs,
            "error": result.error
        }
