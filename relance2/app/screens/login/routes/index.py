"""Route principale pour la page de login."""

from flask import Blueprint, render_template
from models.auth import AuthModel

bp = Blueprint('index', __name__)


@bp.route('/')
def index():
    """Page d'accueil redirige vers login."""
    return render_template('index.html')


@bp.route('/login')
def login():
    """Page de login."""
    return render_template('index.html')


@bp.route('/dashboard')
def dashboard():
    """Page dashboard (protégée, vérification côté frontend)."""
    return render_template('dashboard.html')