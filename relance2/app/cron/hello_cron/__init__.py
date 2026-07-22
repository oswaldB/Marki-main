from flask import Blueprint
from app import scheduler
import datetime

bp = Blueprint('hello_cron', __name__)

@scheduler.task('interval', id='hello_heartbeat', seconds=60)
def heartbeat():
    now = datetime.datetime.now()
    print(f'[CRON {now.strftime("%H:%M:%S")}] Heartbeat - app vivante ✓')
