from flask import Blueprint

bp = Blueprint('hello_protected', __name__, template_folder='templates')

from .routes import index
