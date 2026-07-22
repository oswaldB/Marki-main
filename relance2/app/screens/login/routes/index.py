"""Routes pour la page de login."""

from flask import Blueprint, render_template, redirect, url_for
from flask_jwt_extended import jwt_required, get_jwt_identity

bp = Blueprint('login', __name__, url_prefix='/')


@bp.route('/login', methods=['GET'])
def login_page():
    """Affiche la page de login."""
    return render_template('login.html')


@bp.route('/dashboard', methods=['GET'])
def dashboard():
    """Redirige vers le dashboard (géré par auth côté client)."""
    return render_template('login.html')