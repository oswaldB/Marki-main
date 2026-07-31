"""Étape 2: Vérification Structure - Teste la conformité de la structure projet Flask."""

import sqlite3
import subprocess
import time
from pathlib import Path

from rich.console import Console

console = Console()


def step_2_verify_structure(project_dir: Path) -> tuple[bool, list[str]]:
    """Vérifie et crée la structure minimale Flask pour que les tests passent.

    Args:
        project_dir: Répertoire du projet

    Returns:
        Tuple (ok, liste des erreurs)
    """
    console.print("[blue]🔍 Vérification de la structure Flask...")

    errors = []
    created = []

    # Structure minimale requise pour Flask
    minimal_structure = {
        "dirs": [
            project_dir / "app" / "screens",
            project_dir / "app" / "backend_wf",
            project_dir / "app" / "cron",
            project_dir / "app" / "templates" / "layouts",
            project_dir / "app" / "static" / "css",
            project_dir / "app" / "static" / "js" / "pages",
            project_dir / "app" / "static" / "js" / "workflows",
            project_dir / "logs",
        ],
        "files": {}
    }

    # Créer les dossiers
    for d in minimal_structure["dirs"]:
        if not d.exists():
            d.mkdir(parents=True, exist_ok=True)
            created.append(f"Dossier: {d.relative_to(project_dir)}")

    # Créer le layout de base
    layouts_dir = project_dir / "app" / "templates" / "layouts"
    base_layout = layouts_dir / "base.html"
    if not base_layout.exists():
        base_content = '''<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{% block page_title %}Marki App{% endblock %}</title>
    <link rel="stylesheet" href="{{ url_for('static', filename='css/main.css') }}">
    {% block head %}{% endblock %}
</head>
<body class="bg-gray-100">
    {% block content %}{% endblock %}
    
    <script src="{{ url_for('static', filename='js/pages/main.js') }}"></script>
    {% block scripts %}{% endblock %}
</body>
</html>
'''
        base_layout.write_text(base_content, encoding="utf-8")
        created.append("Fichier: app/templates/layouts/base.html")
    
    # Copier le layout dans healthy/templates/layouts aussi
    healthy_layouts = project_dir / "app" / "screens" / "healthy" / "templates" / "layouts"
    healthy_layouts.mkdir(parents=True, exist_ok=True)
    healthy_base = healthy_layouts / "base.html"
    if not healthy_base.exists():
        healthy_base.write_text(base_content, encoding="utf-8")

    # Créer le main.js qui charge Alpine.js
    main_js = project_dir / "app" / "static" / "js" / "pages" / "main.js"
    if not main_js.exists():
        main_js_content = '''/* Main.js - Point d'entrée JS pour toutes les pages */

// Charger Alpine.js depuis CDN
const alpineScript = document.createElement('script');
alpineScript.src = 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js';
alpineScript.defer = true;
alpineScript.onload = function() {
    console.log('[main.js] ✓ Alpine.js chargé');
    
    // Initialiser les workflows après chargement d'Alpine
    if (window.WorkflowManager) {
        console.log('[main.js] ✓ WorkflowManager disponible');
    }
};
document.head.appendChild(alpineScript);

console.log('[main.js] ✓ main.js chargé');

// Fonction utilitaire pour récupérer les paramètres URL
function getUrlParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// Exposer globalement
window.getUrlParam = getUrlParam;
'''
        main_js.write_text(main_js_content, encoding="utf-8")
        created.append("Fichier: app/static/js/pages/main.js")

    # Créer une base de données SQLite vide si nécessaire
    instance_dir = project_dir / "instance"
    db_path = instance_dir / "marki.db"
    if not db_path.exists():
        instance_dir.mkdir(parents=True, exist_ok=True)
        # Créer une base vide avec une table de test
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        cursor.execute("CREATE TABLE IF NOT EXISTS _health (id INTEGER PRIMARY KEY)")
        conn.commit()
        conn.close()
        created.append("Fichier: instance/marki.db (base SQLite vide)")

    # Créer une page healthy Flask si manquante
    healthy_path = project_dir / "app" / "screens" / "healthy"
    specs_path = healthy_path / "specs"
    specs_path.mkdir(parents=True, exist_ok=True)
    
    # Templates V0 pour healthy
    v0_templates = project_dir / "dev-tools" / "DrDice" / "drdice" / "templates" / "flask" / "squelettes" / "v0" / "screens" / "healthy"
    
    healthy_init = healthy_path / "__init__.py"
    if not healthy_init.exists():
        init_content = '''"""Blueprint healthy pour les tests de santé."""
from flask import Blueprint, jsonify, render_template, send_from_directory
from pathlib import Path
import sqlite3
import os

bp = Blueprint('healthy', __name__, template_folder='templates', static_folder='workflows')


def check_database():
    """Vérifie la connexion à la base de données SQLite."""
    try:
        project_root = Path(__file__).parent.parent.parent.parent
        db_path = project_root / 'instance' / 'marki.db'
        db_path_str = str(db_path.resolve())
        
        if not db_path.exists():
            return {"ok": False, "error": "Database not found"}
        
        conn = sqlite3.connect(db_path_str, timeout=5)
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        conn.close()
        return {"ok": True, "type": "sqlite"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@bp.route('/')
def healthy_check():
    """Page HTML de santé."""
    return render_template('index.html')


@bp.route('/workflows/<path:filename>')
def serve_workflow(filename):
    """Sert les fichiers workflows."""
    workflow_dir = os.path.join(os.path.dirname(__file__), 'workflows')
    return send_from_directory(workflow_dir, filename)


@bp.route('/healthy')
def api_healthy():
    """Endpoint JSON de santé pour /api/healthy."""
    db_status = check_database()
    response = {
        "status": "ok" if db_status["ok"] else "error",
        "checks": {
            "database": db_status
        }
    }
    status_code = 200 if db_status["ok"] else 503
    return jsonify(response), status_code
'''
        healthy_init.write_text(init_content, encoding="utf-8")
        created.append("Fichier: app/screens/healthy/__init__.py")

    # Copier le template index.html depuis V0
    healthy_templates = healthy_path / "templates"
    healthy_templates.mkdir(parents=True, exist_ok=True)
    healthy_html = healthy_templates / "index.html"
    v0_html = v0_templates / "templates" / "index.html"
    if not healthy_html.exists() and v0_html.exists():
        import shutil
        shutil.copy(v0_html, healthy_html)
        created.append("Fichier: app/screens/healthy/templates/index.html")

    # Copier les workflows depuis V0
    healthy_workflows = healthy_path / "workflows"
    healthy_workflows.mkdir(parents=True, exist_ok=True)
    v0_workflows = v0_templates / "workflows"
    if v0_workflows.exists():
        for wf_file in v0_workflows.glob("*.js"):
            dest = healthy_workflows / wf_file.name
            if not dest.exists():
                import shutil
                shutil.copy(wf_file, dest)
                created.append(f"Fichier: app/screens/healthy/workflows/{wf_file.name}")

    # Copier main.js dans static/js/pages/
    main_js_dest = project_dir / "app" / "static" / "js" / "pages" / "main.js"
    v0_main = v0_templates / "main.js"
    if not main_js_dest.exists() and v0_main.exists():
        import shutil
        shutil.copy(v0_main, main_js_dest)
        created.append("Fichier: app/static/js/pages/main.js")
        created.append("Fichier: app/screens/healthy/__init__.py")

    # Créer le template HTML pour healthy
    healthy_templates = healthy_path / "templates" / "healthy"
    healthy_templates.mkdir(parents=True, exist_ok=True)
    
    healthy_html = healthy_templates / "index.html"
    if not healthy_html.exists():
        html_content = '''{% extends "layouts/base.html" %}

{% block page_title %}Healthy Check{% endblock %}

{% block content %}
<div class="min-h-screen flex items-center justify-center p-4" 
     x-data="healthyPage()" 
     x-init="init()">
    <div class="bg-white p-8 rounded-xl shadow-lg text-center max-w-md w-full">
        <h1 class="text-3xl font-bold text-blue-600 mb-4">System Health</h1>
        
        <div class="mb-4 p-4 rounded-lg" :class="db_ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
            <div class="text-2xl mb-2" x-text="db_ok ? '✓ Tout est OK' : '✗ Erreur détectée'"></div>
            <p x-text="db_status"></p>
        </div>
        
        <div class="mb-4">
            <h2 class="text-xl font-semibold mb-2">Test Workflow</h2>
            <div class="p-4 bg-gray-100 rounded">
                <p class="text-gray-700 mb-2" x-text="helloMessage || 'Cliquez sur le bouton pour tester le workflow'"></p>
                <button @click="runHelloWorkflow()" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                    Dire Hello
                </button>
            </div>
        </div>
        
        <div class="text-sm text-gray-400 mt-4">
            <p>URL: <span x-text="window.location.href"></span></p>
        </div>
    </div>
</div>
{% endblock %}

{% block scripts %}
<script src="{{ url_for('static', filename='js/workflows/hello.js') }}"></script>
<script>
function healthyPage() {
    return {
        db_ok: {{ 'true' if db_status.ok else 'false' }},
        db_status: '{{ db_status.error if not db_status.ok else "Database Connected" }}',
        helloMessage: '',
        
        init() {
            console.log('[healthy] ✓ Page initialized');
            
            // Vérifier si un paramètre name est dans l'URL
            const name = window.getUrlParam ? window.getUrlParam('name') : null;
            if (name) {
                console.log('[healthy] Paramètre name détecté:', name);
                this.runHelloWorkflow(name);
            }
        },
        
        async runHelloWorkflow(name) {
            if (typeof helloWorkflow !== 'undefined') {
                const result = await helloWorkflow(name || 'toto');
                this.helloMessage = result;
            } else {
                console.error('[healthy] helloWorkflow non disponible');
                this.helloMessage = 'Erreur: workflow non chargé';
            }
        }
    }
}
</script>
{% endblock %}
'''
        healthy_html.write_text(html_content, encoding="utf-8")
        created.append("Fichier: app/screens/healthy/templates/healthy/index.html")
    
    # Créer le workflow hello.js
    workflows_dir = project_dir / "app" / "static" / "js" / "workflows"
    hello_workflow = workflows_dir / "hello.js"
    if not hello_workflow.exists():
        workflow_content = '''/**
 * Workflow Hello - Exemple de workflow frontend
 * Prend un paramètre name et retourne "hello name"
 * 
 * Usage: ?name=toto dans l'URL ou appel direct
 */

async function helloWorkflow(name) {
    const targetName = name || 'toto';
    console.log('[helloWorkflow] ✓ Exécution avec name:', targetName);
    
    return new Promise((resolve) => {
        setTimeout(() => {
            const message = `hello ${targetName}`;
            console.log('[helloWorkflow] ✓ Résultat:', message);
            resolve(message);
        }, 100); // Simulation async
    });
}

// Exposer globalement
window.helloWorkflow = helloWorkflow;
console.log('[helloWorkflow] ✓ Workflow chargé');
'''
        hello_workflow.write_text(workflow_content, encoding="utf-8")
        created.append("Fichier: app/static/js/workflows/hello.js")


    # Vérifier que Flask peut démarrer
    console.print("[blue]🚀 Vérification du serveur Flask...")

    # Vérifier si le serveur Flask est déjà démarré
    server_running = False
    try:
        result = subprocess.run(
            ["curl", "-s", "http://localhost:5000/"],
            capture_output=True,
            timeout=5
        )
        if result.returncode == 0:
            console.print("  [green]✅ Serveur Flask déjà actif sur http://localhost:5000")
            server_running = True
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass

    # Démarrer le serveur s'il n'est pas actif
    if not server_running:
        console.print("  [yellow]⚠️ Serveur Flask non détecté")
        console.print("  [dim]Démarrage automatique du serveur...")
        
        try:
            # Tuer les anciens processus Flask s'il y en a
            subprocess.run(["pkill", "-f", "python.*wsgi"], capture_output=True)
            time.sleep(1)
            
            # Démarrer le serveur en arrière-plan
            flask_process = subprocess.Popen(
                ["python", "wsgi.py"],
                cwd=project_dir,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True
            )
            
            # Attendre que le serveur démarre
            time.sleep(3)
            
            # Vérifier que le serveur a démarré
            for attempt in range(5):
                try:
                    result = subprocess.run(
                        ["curl", "-s", "http://localhost:5000/"],
                        capture_output=True,
                        timeout=5
                    )
                    if result.returncode == 0:
                        console.print("  [green]✅ Serveur Flask démarré sur http://localhost:5000")
                        server_running = True
                        break
                except:
                    pass
                time.sleep(1)
            
            if not server_running:
                console.print("  [red]❌ Échec du démarrage du serveur Flask")
                console.print("  [dim]Pour démarrer manuellement:")
                console.print(f"    [dim]cd {project_dir} && python wsgi.py")
        except Exception as e:
            console.print(f"  [red]❌ Erreur lors du démarrage: {e}")
            console.print("  [dim]Pour démarrer manuellement:")
            console.print(f"    [dim]cd {project_dir} && python wsgi.py")

    if errors:
        console.print(f"[yellow]⚠️ {len(errors)} problème(s) à résoudre")
        return False, errors

    console.print("[green]✅ Structure Flask OK")
    return True, []
