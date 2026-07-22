from flask import Blueprint

# Blueprint principal de la cell login
login_bp = Blueprint('login', __name__, template_folder='../templates')

# Import des routes
from . import index
from . import wf_auth