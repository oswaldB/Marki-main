"""Main routes."""

from flask import Blueprint, render_template

index_bp = Blueprint('index', __name__)


@index_bp.route('/')
def index():
    """Redirection vers login."""
    from flask import redirect, url_for
    return redirect(url_for('index.login'))


@index_bp.route('/login')
def login():
    """Page de login."""
    return render_template('login.html')


@index_bp.route('/dashboard')
def dashboard():
    """Page dashboard (protégée, mais vérification faite côté client)."""
    return render_template('dashboard.html')