from flask import Blueprint, render_template

bp = Blueprint('login', __name__, url_prefix='/login')

@bp.route('/')
def index():
    """Affiche la page de login"""
    return render_template('login.html')