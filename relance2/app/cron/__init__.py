"""
Module cron - Système de planification des workflows backend.

Usage:
    from cron import init_cron
    
    # Dans create_app()
    init_cron(app)
"""
from cron.scheduler import init_cron, scheduler

__all__ = ['init_cron', 'scheduler']
