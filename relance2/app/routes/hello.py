from flask import Blueprint, render_template

hello_bp = Blueprint('hello', __name__)


@hello_bp.route('/hello')
def hello():
    return render_template('hello/index.html')
