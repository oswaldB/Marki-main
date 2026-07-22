"""Main routes for login page."""
from flask import render_template
from .. import bp


@bp.route('/login', methods=['GET'])
def login_page():
    """Render the login page."""
    return render_template('login.html')
