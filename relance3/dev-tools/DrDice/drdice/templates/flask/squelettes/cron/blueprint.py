"""
TODO IA:
+ Blueprint sans template_folder ni routes
+ Enregistrement du job APScheduler au démarrage
"""

from flask import Blueprint
from app import scheduler

bp = Blueprint('cron_{cell_name}', __name__)

from . import cron

# Enregistrement du job
@scheduler.task('interval', id='{cell_name}_job', minutes=60)
def scheduled_job():
    with scheduler.app.app_context():
        cron.execute()
