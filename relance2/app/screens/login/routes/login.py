from flask import Blueprint, render_template

bp = Blueprint('login', __name__, url_prefix='')

@bp.route('/login', methods=['GET'])
def login_page():
    return render_template('login.html')