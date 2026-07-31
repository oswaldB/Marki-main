"""
TODO IA:
+ Blueprint SANS template_folder (pas d'interface)
+ Pour API endpoints ou workflows sans UI
"""

from flask import Blueprint

bp = Blueprint('{cell_name}', __name__)

from . import routes  # noqa: F401
