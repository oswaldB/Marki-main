"""
Configuration des jobs cron.
Format: liste de dicts avec id, workflow, schedule, options
"""
from datetime import datetime

# Configuration des jobs planifiés
CRON_JOBS = [
    {
        'id': 'generate-relances-daily',
        'name': 'Génération quotidienne des relances',
        'workflow_id': 'generate-relances',
        # Syntaxe cron: minute heure jour-mois mois jour-semaine
        # Tous les jours à 8h00
        'trigger': 'cron',
        'hour': 8,
        'minute': 0,
        'payload': {'auto_validate': False},
        'enabled': True
    },
    {
        'id': 'cleanup-old-logs',
        'name': 'Nettoyage des vieux logs',
        'workflow_id': 'cleanup-logs',
        # Tous les dimanches à 3h00
        'trigger': 'cron',
        'day_of_week': 'sun',
        'hour': 3,
        'minute': 0,
        'payload': {'older_than_days': 30},
        'enabled': False  # Désactivé par défaut
    },
    {
        'id': 'check-sequences-expired',
        'name': 'Vérification des séquences expirées',
        'workflow_id': 'check-expired',
        # Toutes les heures
        'trigger': 'interval',
        'hours': 1,
        'payload': {},
        'enabled': True
    }
]

# Configuration du scheduler
SCHEDULER_CONFIG = {
    'jobstores': {
        'default': {
            'type': 'memory'  # Peut être 'sqlalchemy' pour persistance
        }
    },
    'executors': {
        'default': {
            'type': 'threadpool',
            'max_workers': 3
        }
    },
    'job_defaults': {
        'coalesce': True,      # Fusionner les exécutions manquées
        'max_instances': 1,    # Une seule instance du job à la fois
        'misfire_grace_time': 3600  # 1h de tolérance
    },
    'timezone': 'Europe/Paris'
}


def get_enabled_jobs():
    """Retourne uniquement les jobs activés."""
    return [job for job in CRON_JOBS if job.get('enabled', True)]


def get_job_by_id(job_id):
    """Récupère un job par son ID."""
    for job in CRON_JOBS:
        if job['id'] == job_id:
            return job
    return None
