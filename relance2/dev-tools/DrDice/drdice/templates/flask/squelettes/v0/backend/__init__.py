"""Backend workflow {cell_name}."""
from flask import Blueprint

bp = Blueprint('{cell_name}', __name__)

from . import routes  # noqa: F401
