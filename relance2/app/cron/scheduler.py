"""
Initialisation et gestion du scheduler APScheduler.
"""
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.events import EVENT_JOB_EXECUTED, EVENT_JOB_ERROR, EVENT_JOB_MISSED
from cron.config import SCHEDULER_CONFIG, get_enabled_jobs, get_job_by_id
from cron.jobs import JOB_FUNCTIONS, execute_workflow_job


class CronScheduler:
    """Wrapper APScheduler pour Flask."""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.scheduler = None
        return cls._instance
    
    def init_scheduler(self):
        """Initialise le scheduler avec la configuration."""
        if self.scheduler is None:
            self.scheduler = BackgroundScheduler(**SCHEDULER_CONFIG)
            self._add_listeners()
            print("[CRON] Scheduler initialisé")
        return self
    
    def _add_listeners(self):
        """Ajoute les listeners d'événements."""
        def job_executed_listener(event):
            print(f"[CRON SCHEDULER] ✅ Job exécuté: {event.job_id}")
        
        def job_error_listener(event):
            print(f"[CRON SCHEDULER] ❌ Erreur job {event.job_id}: {event.exception}")
        
        def job_missed_listener(event):
            print(f"[CRON SCHEDULER] ⚠️ Job manqué: {event.job_id}")
        
        self.scheduler.add_listener(job_executed_listener, EVENT_JOB_EXECUTED)
        self.scheduler.add_listener(job_error_listener, EVENT_JOB_ERROR)
        self.scheduler.add_listener(job_missed_listener, EVENT_JOB_MISSED)
        print(f"[CRON SCHEDULER] Listeners d'événements ajoutés")
    
    def register_jobs(self):
        """Enregistre tous les jobs configurés."""
        jobs = get_enabled_jobs()
        print(f"[CRON SCHEDULER] Enregistrement de {len(jobs)} jobs")
        
        for job_config in jobs:
            job_id = job_config['id']
            print(f"[CRON SCHEDULER] Configuration job: {job_id}")
            
            # Supprimer si existe déjà
            if self.scheduler.get_job(job_id):
                self.scheduler.remove_job(job_id)
                print(f"[CRON SCHEDULER] Job existant supprimé: {job_id}")
            
            # Déterminer la fonction à exécuter
            if job_id in JOB_FUNCTIONS:
                func = JOB_FUNCTIONS[job_id]
                args = ()  # La fonction encapsule déjà les params
                print(f"[CRON SCHEDULER] Fonction spécifique trouvée pour {job_id}")
            else:
                # Fonction générique pour jobs dynamiques
                func = execute_workflow_job
                args = (job_id, job_config['workflow_id'], job_config.get('payload', {}))
                print(f"[CRON SCHEDULER] Fonction générique pour {job_id}")
            
            # Construction des arguments du trigger
            trigger_args = {'trigger': job_config['trigger']}
            
            if job_config['trigger'] == 'cron':
                if 'hour' in job_config:
                    trigger_args['hour'] = job_config['hour']
                if 'minute' in job_config:
                    trigger_args['minute'] = job_config['minute']
                if 'day_of_week' in job_config:
                    trigger_args['day_of_week'] = job_config['day_of_week']
                if 'day' in job_config:
                    trigger_args['day'] = job_config['day']
            
            elif job_config['trigger'] == 'interval':
                if 'hours' in job_config:
                    trigger_args['hours'] = job_config['hours']
                if 'minutes' in job_config:
                    trigger_args['minutes'] = job_config['minutes']
                if 'seconds' in job_config:
                    trigger_args['seconds'] = job_config['seconds']
            
            # Ajout du job
            self.scheduler.add_job(
                func=func,
                args=args,
                id=job_id,
                name=job_config.get('name', job_id),
                replace_existing=True,
                **trigger_args
            )
            
            print(f"[CRON SCHEDULER] ✅ Job enregistré: {job_id} ({trigger_args})")
        
        print(f"[CRON SCHEDULER] Tous les jobs sont enregistrés")
        return self
    
    def start(self):
        """Démarre le scheduler."""
        if self.scheduler and not self.scheduler.running:
            self.scheduler.start()
            print("[CRON SCHEDULER] ✅ Scheduler démarré")
        return self
    
    def shutdown(self, wait=True):
        """Arrête le scheduler."""
        if self.scheduler and self.scheduler.running:
            self.scheduler.shutdown(wait=wait)
            print("[CRON SCHEDULER] Scheduler arrêté")
        return self
    
    def get_status(self):
        """Retourne le statut du scheduler et des jobs."""
        if not self.scheduler:
            print("[CRON SCHEDULER] Status: scheduler non initialisé")
            return {'running': False, 'jobs': []}
        
        jobs = []
        for job in self.scheduler.get_jobs():
            jobs.append({
                'id': job.id,
                'name': job.name,
                'next_run': job.next_run_time.isoformat() if job.next_run_time else None,
                'trigger': str(job.trigger)
            })
        
        status = {
            'running': self.scheduler.running,
            'jobs': jobs
        }
        print(f"[CRON SCHEDULER] Status: {status}")
        return status
    
    def trigger_job(self, job_id, run_now=False):
        """
        Déclenche un job manuellement ou modifie sa prochaine exécution.
        
        Args:
            job_id: ID du job à déclencher
            run_now: Si True, exécute immédiatement (si possible)
        """
        print(f"[CRON SCHEDULER] trigger_job appelé: job_id={job_id}, run_now={run_now}")
        job = get_job_by_id(job_id)
        if not job:
            print(f"[CRON SCHEDULER] ❌ Job '{job_id}' non trouvé dans la config")
            return {'success': False, 'error': 'Job non trouvé'}
        
        if run_now:
            # Exécution manuelle immédiate
            print(f"[CRON SCHEDULER] Exécution immédiate du job '{job_id}'")
            result = execute_workflow_job(
                job_id=job_id,
                workflow_id=job['workflow_id'],
                payload=job.get('payload', {})
            )
            print(f"[CRON SCHEDULER] Résultat exécution: {result}")
            return {'success': True, 'result': result}
        
        # Modification de la prochaine exécution
        scheduled_job = self.scheduler.get_job(job_id)
        if scheduled_job:
            next_run = scheduled_job.next_run_time.isoformat() if scheduled_job.next_run_time else None
            print(f"[CRON SCHEDULER] Prochaine exécution pour '{job_id}': {next_run}")
            return {
                'success': True,
                'next_run': next_run
            }
        
        print(f"[CRON SCHEDULER] ❌ Job '{job_id}' non trouvé dans le scheduler")
        return {'success': False, 'error': 'Job non trouvé dans le scheduler'}


# Singleton pour import facile
scheduler = CronScheduler()


def init_cron(app):
    """
    Initialise le cron pour l'application Flask.
    À appeler dans create_app().
    """
    print("[CRON SCHEDULER] Initialisation du cron...")
    scheduler.init_scheduler()
    scheduler.register_jobs()
    scheduler.start()
    
    # Enregistrer le shutdown propre
    import atexit
    atexit.register(lambda: scheduler.shutdown())
    
    print("[CRON SCHEDULER] Initialisation terminée")
    return scheduler
