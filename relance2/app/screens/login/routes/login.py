from flask import Blueprint, render_template

login_bp = Blueprint('login', __name__, url_prefix='/login')


@login_bp.route('/')
def login_page():
    """Render login page"""
    return render_template('login.html')


@login_bp.route('/<path:path>')
def login_catchall(path):
    """Catchall for login sub-routes"""
    return render_template('login.html')