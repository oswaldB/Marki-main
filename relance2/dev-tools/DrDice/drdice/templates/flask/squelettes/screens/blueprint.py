"""
TODO IA:
+ Crée un Blueprint Flask selon /specs-global/rules/cellsmvc.md
+ template_folder='templates' obligatoire pour les écrans
+ Importe les routes APRES la création du blueprint
+ Ne PAS importer de modèles ici (seulement dans routes)
"""

from flask import Blueprint

bp = Blueprint('{cell_name}', __name__, template_folder='templates')

from . import routes  # noqa: F401
