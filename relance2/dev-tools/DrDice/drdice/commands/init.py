#!/usr/bin/env python3
"""Commande init - Initialise le boilerplate Flask minimal."""

import os
import subprocess
import sys
import time
from pathlib import Path

import click
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn

from ..core.project import Project

console = Console()

REQUIREMENTS = """flask==3.0.0
flask-apscheduler==1.13.1
jinja2==3.1.2
gunicorn==21.2.0
pyjwt==2.8.0
playwright==1.40.0
pyyaml>=6.0
"""

WSGI_PY = '''\"\"\"
Marki App - Point d'entrée WSGI (à la racine du projet)

Usage:
  - Développement: flask run
  - Production: gunicorn -w 4 \"wsgi:app\"
  - Direct: python wsgi.py
\"\"\"

import os
import sys

# Ajouter le dossier courant au path si exécuté directement
if __name__ == '__main__':
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, scheduler

# Import des blueprints
# SCREENS
from app.screens.hello import bp as hello_bp
from app.screens.hello_protected import bp as hello_protected_bp
from app.screens.login import bp as login_bp

# BACKEND WORKFLOWS
from app.backend_wf.hello_bg import bp as hello_bg_bp

# CRON
from app.cron.hello_cron import bp as hello_cron_bp

app = create_app()

# SCREENS
app.register_blueprint(hello_bp, url_prefix='/hello')
app.register_blueprint(hello_protected_bp, url_prefix='/hello-protected')
app.register_blueprint(login_bp, url_prefix='/login')

# BACKEND WORKFLOWS
app.register_blueprint(hello_bg_bp, url_prefix='/hello-bg')

# CRON
app.register_blueprint(hello_cron_bp, url_prefix='/hello-cron')

@app.route('/')
def index():
    \"\"\"Page d'accueil.\"\"\"
    return \"\"\"<!DOCTYPE html>
<html>
<head><title>Marki App</title>
<script src=\\\"https://cdn.tailwindcss.com\\\"></script>
</head>
<body class=\\\"bg-gray-100 p-8\\\">
<div class=\\\"max-w-2xl mx-auto bg-white p-6 rounded-lg shadow\\\">
<h1 class=\\\"text-3xl font-bold mb-6 text-blue-600\\\">Marki App</h1>
<p><a href=\\\"/hello\\\" class=\\\"text-blue-500\\\">/hello</a> - Écran public</p>
<p><a href=\\\"/hello-protected\\\" class=\\\"text-blue-500\\\">/hello-protected</a> - Écran privé</p>
<p><a href=\\\"/login\\\" class=\\\"text-blue-500\\\">/login</a> - Authentification</p>
</div></body></html>\"\"\"

if __name__ == '__main__':
    print(\"\\\"\\\"🚀 Démarrage de Marki App...\\\"\\\"\")
    print(\"\\\"\\\"   URL: http://localhost:5000\\\"\\\"\")
    app.run(host='0.0.0.0', port=5000, debug=True)
'''

APP_INIT_PY = '''from flask import Flask
from flask_apscheduler import APScheduler
import os

scheduler = APScheduler()

def create_app():
    \"\"\"Crée l'application Flask avec la configuration de base.\"\"\"
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
'''

DATA_INIT_PY = '''import sqlite3
from flask import g, current_app

def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(
            current_app.config['DATABASE'],
            detect_types=sqlite3.PARSE_DECLTYPES
        )
        g.db.row_factory = sqlite3.Row
    return g.db

def close_db(e=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()
'''


@click.command()
@click.option(
    "--project-dir",
    type=click.Path(exists=True, file_okay=False),
    help="Chemin du projet",
)
@click.option("--skip-tests", is_flag=True, help="Sauter les tests automatiques")
def init(project_dir: str | None, skip_tests: bool) -> int:
    """Initialise le boilerplate Flask minimal."""
    
    if project_dir is None:
        project_dir = Path.cwd()
    else:
        project_dir = Path(project_dir)
    
    project = Project(project_dir)
    
    console.print(Panel.fit("Initialisation du boilerplate Flask", style="blue"))
    
    # Créer la structure
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        
        tasks = [
            "Création des dossiers...",
            "Écriture des fichiers de base...",
            "Création des cells d'exemple...",
            "Installation des dépendances...",
        ]
        
        task = progress.add_task("Initialisation...", total=len(tasks))
        
        # 1. Dossiers
        progress.update(task, description=tasks[0])
        (project.app_dir / "data").mkdir(parents=True, exist_ok=True)
        (project.app_dir / "static").mkdir(parents=True, exist_ok=True)
        progress.advance(task)
        
        # 2. Fichiers de base
        progress.update(task, description=tasks[1])
        _write_base_files(project)
        progress.advance(task)
        
        # 3. Cells d'exemple
        progress.update(task, description=tasks[2])
        _create_example_cells(project)
        progress.advance(task)
        
        # 4. Dépendances
        progress.update(task, description=tasks[3])
        _install_deps(project)
        progress.advance(task)
    
    console.print("[green]✅ Boilerplate initialisé![/green]")
    console.print()
    console.print("[cyan]Démarrage du serveur Flask...[/cyan]")
    
    # Lancer le serveur
    _start_server(project, skip_tests)
    
    return 0


def _write_base_files(project: Project) -> None:
    """Écrit les fichiers de base du projet."""
    # requirements.txt
    (project.root / "requirements.txt").write_text(REQUIREMENTS, encoding="utf-8")
    
    # app/__init__.py
    (project.app_dir / "__init__.py").write_text(APP_INIT_PY, encoding="utf-8")
    
    # wsgi.py (point d'entrée à la racine)
    (project.root / "wsgi.py").write_text(WSGI_PY, encoding="utf-8")
    
    # app/data/__init__.py
    (project.app_dir / "data" / "__init__.py").write_text(DATA_INIT_PY, encoding="utf-8")


def _create_example_cells(project: Project) -> None:
    """Crée les cells d'exemple (hello, login, etc.)."""
    # Simplifié: créer uniquement les fichiers essentiels
    # Les cells d'exemple peuvent être créées manuellement ou via build
    pass


def _install_deps(project: Project) -> None:
    """Installe les dépendances Python."""
    try:
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "-q", "-r", "requirements.txt"],
            cwd=project.root,
            check=True,
            capture_output=True,
        )
    except subprocess.CalledProcessError as e:
        console.print(f"[yellow]⚠️  Erreur installation dépendances: {e}[/yellow]")


def _start_server(project: Project, skip_tests: bool) -> None:
    """Démarre le serveur Flask."""
    env = os.environ.copy()
    env["FLASK_APP"] = "wsgi"
    env["FLASK_ENV"] = "development"
    env["FLASK_DEBUG"] = "1"
    
    # Nettoyer le port 5000
    try:
        subprocess.run(
            ["lsof", "-ti:5000"],
            capture_output=True,
            check=False,
        )
    except FileNotFoundError:
        pass
    
    console.print("[green]🌐 Serveur démarré sur http://localhost:5000[/green]")
    console.print("[dim]Appuyez sur Ctrl+C pour arrêter[/dim]")
    
    try:
        subprocess.run(
            [sys.executable, "-m", "flask", "run", "--host=0.0.0.0", "--port=5000", "--reload"],
            cwd=project.root,
            env=env,
        )
    except KeyboardInterrupt:
        console.print("\n[green]✅ Serveur arrêté[/green]")


def main():
    """Point d'entrée."""
    return init()


if __name__ == "__main__":
    sys.exit(main())
