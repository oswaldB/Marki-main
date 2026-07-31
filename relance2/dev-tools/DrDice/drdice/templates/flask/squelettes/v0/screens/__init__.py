"""Blueprint {cell_name} - Screen."""
from flask import Blueprint

bp = Blueprint('{cell_name}', __name__, template_folder='templates')

from . import routes  # noqa: F401
