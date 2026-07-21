from flask import Blueprint, render_template

hello_bp = Blueprint('hello', __name__, template_folder='../../templates')

@hello_bp.route('/hello', methods=['GET'])
def hello():
    return render_template('hello/index.html')
