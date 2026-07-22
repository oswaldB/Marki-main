"""Route pour la page de login."""
from flask import render_template
from .. import bp


@bp.route('/', methods=['GET'])
def index():
    """Affiche la page de login."""
    return render_template('login/index.html')