"""Scheduler APScheduler pour tâches planifiées Flask."""

from flask_apscheduler import APScheduler
from datetime import datetime

scheduler = APScheduler()


def sync_invoices_job():
    """Tâche planifiée: synchronisation des factures à 00h00."""
    from app.workflows.import_invoice import import_invoices_master
    from app.db import close_db
    
    print(f"[SCHEDULER] [{datetime.now().isoformat()}] Démarrage synchro auto")
    
    try:
        result = import_invoices_master()
        
        if result['success']:
            stats = result['stats']
            print(f"[SCHEDULER] ✓ Succès: {stats['pieces_count']} pièces, "
                  f"{stats['impayes_created']} créés, {stats['impayes_updated']} maj")
        else:
            print(f"[SCHEDULER] ✗ Erreur: {result['error']}")
            
    except Exception as e:
        print(f"[SCHEDULER] ✗ Exception: {str(e)}")
    finally:
        close_db()


def verify_paid_invoices_job():
    """Tâche planifiée: vérifie les factures payées toutes les heures."""
    from app.workflows.verify_paid_invoices import verify_paid_invoices
    from app.db import close_db
    
    print(f"[SCHEDULER] [{datetime.now().isoformat()}] Démarrage verify paid invoices auto")
    
    try:
        result = verify_paid_invoices()
        
        if result['success']:
            stats = result['stats']
            print(f"[SCHEDULER] ✓ Verify: {stats['verifiees']} vérifiées, "
                  f"{stats['mises_a_jour']} mises à jour")
        else:
            print(f"[SCHEDULER] ✗ Erreur verify: {result['error']}")
            
    except Exception as e:
        print(f"[SCHEDULER] ✗ Exception: {str(e)}")
    finally:
        close_db()


def cleanup_orphan_relances_job():
    """Tâche planifiée: supprime les relances orphelines toutes les heures."""
    from app.workflows.cleanup_orphan_relances import cleanup_orphan_relances
    from app.db import close_db
    
    print(f"[SCHEDULER] [{datetime.now().isoformat()}] Démarrage cleanup orphan relances auto")
    
    try:
        result = cleanup_orphan_relances()
        
        if result['success']:
            stats = result['stats']
            print(f"[SCHEDULER] ✓ Cleanup orphan: {stats['relances_orphelines']} orphelines, "
                  f"{stats['relances_supprimees']} supprimées")
        else:
            print(f"[SCHEDULER] ✗ Erreur cleanup orphan: {result['error']}")
            
    except Exception as e:
        print(f"[SCHEDULER] ✗ Exception: {str(e)}")
    finally:
        close_db()


def cleanup_relances_job():
    """Tâche planifiée: nettoie les relances des impayés soldés à 00h10."""
    from app.workflows.cleanup_relances import cleanup_relances_paid
    from app.db import close_db
    
    print(f"[SCHEDULER] [{datetime.now().isoformat()}] Démarrage cleanup relances auto")
    
    try:
        result = cleanup_relances_paid()
        
        if result['success']:
            stats = result['stats']
            print(f"[SCHEDULER] ✓ Cleanup: {stats['relances_verifiees']} vérifiées, "
                  f"{stats['relances_annulees']} annulées")
        else:
            print(f"[SCHEDULER] ✗ Erreur cleanup: {result['error']}")
            
    except Exception as e:
        print(f"[SCHEDULER] ✗ Exception: {str(e)}")
    finally:
        close_db()


def sync_contacts_job():
    """Tâche planifiée: synchronisation des contacts tous les jours à 01h00."""
    from app.workflows.sync_contacts import sync_contacts_master
    from app.db import close_db
    
    print(f"[SCHEDULER] [{datetime.now().isoformat()}] Démarrage sync contacts auto")
    
    try:
        result = sync_contacts_master()
        
        if result['success']:
            stats = result['stats']
            print(f"[SCHEDULER] ✓ Sync contacts: {stats['contacts_updated']} mis à jour, "
                  f"{stats['contacts_skipped']} ignorés")
        else:
            print(f"[SCHEDULER] ✗ Erreur sync contacts: {result.get('error', 'Unknown')}")
            
    except Exception as e:
        print(f"[SCHEDULER] ✗ Exception sync contacts: {str(e)}")
    finally:
        close_db()


def init_scheduler(app):
    """Initialise le scheduler avec l'application Flask."""
    
    class Config:
        SCHEDULER_API_ENABLED = False
        SCHEDULER_EXECUTORS = {
            'default': {'type': 'threadpool', 'max_workers': 1}
        }
        SCHEDULER_JOB_DEFAULTS = {
            'coalesce': True,
            'max_instances': 1,
            'misfire_grace_time': 3600  # 1 heure de tolérance
        }
        
    app.config.from_object(Config)
    
    # Initialiser le scheduler
    scheduler.init_app(app)
    
    # Job 1: Import des factures - tous les jours à 00h00
    scheduler.add_job(
        id='sync_invoices_daily',
        func=sync_invoices_job,
        trigger='cron',
        hour=0,
        minute=0,
        second=0,
        replace_existing=True
    )
    
    # Job 2: Vérification paiements - toutes les heures (à xx:30 pour éviter les conflits)
    scheduler.add_job(
        id='verify_paid_hourly',
        func=verify_paid_invoices_job,
        trigger='cron',
        minute=30,
        second=0,
        replace_existing=True
    )
    
    # Job 3: Cleanup relances - tous les jours à 00h10
    scheduler.add_job(
        id='cleanup_relances_daily',
        func=cleanup_relances_job,
        trigger='cron',
        hour=0,
        minute=10,
        second=0,
        replace_existing=True
    )
    
    # Job 4: Sync contacts - tous les jours à 01h00
    scheduler.add_job(
        id='sync_contacts_daily',
        func=sync_contacts_job,
        trigger='cron',
        hour=1,
        minute=0,
        second=0,
        replace_existing=True
    )
    
    # Démarrer le scheduler
    scheduler.start()
    
    print(f"[SCHEDULER] Scheduler démarré")
    print(f"[SCHEDULER] - Synchro factures: 00h00 quotidien")
    print(f"[SCHEDULER] - Verify paid invoices: toutes les heures (xx:30)")
    print(f"[SCHEDULER] - Cleanup relances: 00h10 quotidien")
    print(f"[SCHEDULER] - Sync contacts: 01h00 quotidien")
