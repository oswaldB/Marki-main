from flask import Blueprint, send_from_directory, redirect
import os

bp = Blueprint('pages', __name__)

STATIC_PAGES_DIR = os.path.join(os.path.dirname(__file__), '..', 'static', 'pages')


@bp.route('/')
def index():
    """Page d'accueil redirige vers /login"""
    print(f"[PAGES] GET / - Redirection vers /login")
    return redirect('/login')


@bp.route('/hello')
def hello_page():
    """Page Hello World (pour debug)"""
    print(f"[PAGES] GET /hello - Serving hello/index.html")
    return send_from_directory(os.path.join(STATIC_PAGES_DIR, 'hello'), 'index.html')


@bp.route('/login')
def login_page():
    """Page de connexion"""
    print(f"[PAGES] GET /login - Serving login/index.html")
    return send_from_directory(os.path.join(STATIC_PAGES_DIR, 'login'), 'index.html')


@bp.route('/dashboard')
def dashboard_page():
    """Page tableau de bord"""
    print(f"[PAGES] GET /dashboard - Serving dashboard/index.html")
    return send_from_directory(os.path.join(STATIC_PAGES_DIR, 'dashboard'), 'index.html')


@bp.route('/pages/<path:page_path>')
def serve_page(page_path):
    """Servir une page statique depuis le dossier pages"""
    print(f"[PAGES] GET /pages/{page_path} - Serving static page")
    return send_from_directory(STATIC_PAGES_DIR, page_path)


@bp.route('/static/<path:filename>')
def serve_static(filename):
    """Servir les fichiers statiques"""
    print(f"[PAGES] GET /static/{filename} - Serving static file")
    return send_from_directory(os.path.join(os.path.dirname(__file__), '..', 'static'), filename)
