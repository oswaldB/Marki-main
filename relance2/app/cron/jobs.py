"""
Définition des fonctions de job exécutables par le scheduler.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.workflow_caller import WorkflowCaller
from datetime import datetime


def execute_workflow_job(job_id, workflow_id, payload=None):
    """
    Fonction générique pour exécuter un workflow.
    Appelée par APScheduler.
    
    Args:
        job_id: ID du job cron
        workflow_id: ID du workflow à exécuter
        payload: Données à passer au workflow
    """
    print(f"[CRON JOB] {datetime.now().isoformat()} - Démarrage job '{job_id}' -> workflow '{workflow_id}'")
    print(f"[CRON JOB] Payload reçu: {payload}")
    
    caller = WorkflowCaller()
    
    # Exécution du workflow
    print(f"[CRON JOB] Appel du workflow '{workflow_id}'...")
    result = caller.call_workflow(workflow_id, payload)
    
    # Logging
    print(f"[CRON JOB] Enregistrement du log d'exécution...")
    caller.log_execution(job_id, workflow_id, result)
    
    if result['success']:
        print(f"[CRON JOB] ✅ Job '{job_id}' réussi")
        print(f"[CRON JOB] Réponse: {result['response']}")
    else:
        print(f"[CRON JOB] ❌ Job '{job_id}' échoué: {result['error']}")
    
    print(f"[CRON JOB] {datetime.now().isoformat()} - Fin job '{job_id}'")
    return result


def generate_relances_job():
    """Job spécifique: génération des relances."""
    print(f"[CRON JOB] Démarrage job spécifique: generate-relances-daily")
    result = execute_workflow_job(
        job_id='generate-relances-daily',
        workflow_id='generate-relances',
        payload={'source': 'cron', 'auto_validate': False}
    )
    print(f"[CRON JOB] Fin job generate-relances-daily")
    return result


def cleanup_logs_job():
    """Job spécifique: nettoyage des logs."""
    print(f"[CRON JOB] Démarrage job spécifique: cleanup-old-logs")
    result = execute_workflow_job(
        job_id='cleanup-old-logs',
        workflow_id='cleanup-logs',
        payload={'source': 'cron', 'older_than_days': 30}
    )
    print(f"[CRON JOB] Fin job cleanup-old-logs")
    return result


def check_expired_job():
    """Job spécifique: vérification des éléments expirés."""
    print(f"[CRON JOB] Démarrage job spécifique: check-sequences-expired")
    result = execute_workflow_job(
        job_id='check-sequences-expired',
        workflow_id='check-expired',
        payload={'source': 'cron'}
    )
    print(f"[CRON JOB] Fin job check-sequences-expired")
    return result


# Mapping nom de job -> fonction
JOB_FUNCTIONS = {
    'generate-relances-daily': generate_relances_job,
    'cleanup-old-logs': cleanup_logs_job,
    'check-sequences-expired': check_expired_job,
}
