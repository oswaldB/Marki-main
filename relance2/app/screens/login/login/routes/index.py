from flask import render_template
from .. import login_bp


@login_bp.route('/login')
def login():
    """Affiche la page de login"""
    return render_template('login.html')