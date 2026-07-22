from flask import render_template
from .. import bp


@bp.route('/')
def index():
    """Affiche la page de login."""
    return render_template('index.html')