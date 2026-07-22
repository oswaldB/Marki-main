from flask import Blueprint

bp = Blueprint('hello_bg', __name__)

from .routes import api_process
