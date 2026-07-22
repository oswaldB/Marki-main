"""Main login page route."""
from flask import render_template
from .. import bp


@bp.route('/', methods=['GET'])
def index():
    """Display login page."""
    return render_template('login.html')
