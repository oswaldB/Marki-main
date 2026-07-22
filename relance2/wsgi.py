"""
Point d'entrée WSGI pour Marki App.

Usage:
  - Développement: flask run
  - Production: gunicorn -w 4 "wsgi:app"
  - Direct: python wsgi.py
"""

import os
import sys

# Ajouter le dossier app au path si exécuté directement
if __name__ == '__main__':
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, scheduler
from flask import Flask

# Import des blueprints des cells
# SCREENS (Écrans avec UI)
from app.screens.hello import bp as hello_bp
from app.screens.hello_protected import bp as hello_protected_bp
from app.screens.login import bp as login_bp

# BACKEND WORKFLOWS (API endpoints)
from app.backend_wf.hello_bg import bp as hello_bg_bp

# CRON (Tâches planifiées)
from app.cron.hello_cron import bp as hello_cron_bp

# Création de l'app avec config de base
app = create_app()

# ═══════════════════════════════════════════════════════════════
# ENREGISTREMENT DES BLUEPRINTS - CELLS ACTIVES
# ═══════════════════════════════════════════════════════════════

# SCREENS (Écrans publics et protégés)
app.register_blueprint(hello_bp, url_prefix='/hello')                    # Écran public
app.register_blueprint(hello_protected_bp, url_prefix='/hello-protected') # Écran privé (JWT)
app.register_blueprint(login_bp, url_prefix='/login')                      # Authentification

# BACKEND WORKFLOWS (API endpoints)
app.register_blueprint(hello_bg_bp, url_prefix='/hello-bg')               # API workflow

# CRON (Tâches planifiées - pas de routes HTTP mais nécessaire pour l'init)
app.register_blueprint(hello_cron_bp, url_prefix='/hello-cron')


# ═══════════════════════════════════════════════════════════════
# ROUTES GLOBALES
# ═══════════════════════════════════════════════════════════════

@app.route('/')
def index():
    """Page d'accueil listant toutes les cells disponibles."""
    return '''<!DOCTYPE html>
<html>
<head>
    <title>Marki App - Cells MVC</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 p-8">
    <div class="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 class="text-3xl font-bold mb-6 text-blue-600">Marki App 🚀</h1>
        <p class="text-gray-600 mb-6">Architecture Cell-Based MVC</p>

        <h2 class="text-xl font-semibold mb-3 text-gray-800">📱 Écrans (Screens)</h2>
        <ul class="space-y-2 mb-6">
            <li><a href="/hello" class="text-blue-500 hover:underline">/hello</a> - Écran public (test)</li>
            <li><a href="/hello-protected" class="text-blue-500 hover:underline">/hello-protected</a> - Écran privé (JWT requis)</li>
            <li><a href="/login" class="text-blue-500 hover:underline">/login</a> - Authentification</li>
        </ul>

        <h2 class="text-xl font-semibold mb-3 text-gray-800">⚙️ Backend Workflows (API)</h2>
        <ul class="space-y-2 mb-6">
            <li><a href="/hello-bg/api/process" class="text-blue-500 hover:underline">/hello-bg/api/process</a> - Workflow backend</li>
        </ul>

        <h2 class="text-xl font-semibold mb-3 text-gray-800">⏰ Cron Jobs</h2>
        <ul class="space-y-2 mb-6">
            <li>heartbeat toutes les 60s (console)</li>
        </ul>

        <div class="mt-8 p-4 bg-gray-50 rounded text-sm text-gray-500">
            <p>Cells actives : hello, hello_protected, login, hello_bg, hello_cron</p>
        </div>
    </div>
</body>
</html>
    '''


if __name__ == '__main__':
    print("🚀 Démarrage de Marki App...")
    print("   URL: http://localhost:5000")
    print("   Cells: hello, login, hello_protected, hello_bg, hello_cron")
    app.run(host='0.0.0.0', port=5000, debug=True)
