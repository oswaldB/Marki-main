from flask import Flask
from flask_apscheduler import APScheduler
import os

scheduler = APScheduler()

def create_app():
    """Crée l'application Flask avec la configuration de base."""
    app = Flask(__name__)

    # Config
    app.config['SECRET_KEY'] = 'dev-secret-key-change-in-production'
    app.config['DATABASE'] = os.path.join(
        os.path.dirname(__file__), 'data', 'marki.db'
    )
    app.config['SCHEDULER_API_ENABLED'] = True

    # Démarrer scheduler
    scheduler.init_app(app)
    scheduler.start()

    return app
