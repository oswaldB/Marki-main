from flask import Blueprint

bp = Blueprint('login', __name__, template_folder='templates')

from .routes import index, logout, api_data
