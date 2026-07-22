"""Main routes for login page."""
from flask import Blueprint, render_template

bp = Blueprint('login', __name__, template_folder='../templates')


@bp.route('/login', methods=['GET'])
def login_page():
    """Render the login page."""
    return render_template('login.html')