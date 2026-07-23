"""
Package d'initialisation des routes Flask.
Importe et expose les blueprints des différents modules de routes.
"""

from flask import Blueprint

# Import des modules de routes
from . import index
from . import logout

# Exposition des blueprints pour l'enregistrement dans l'application principale
# Ces blueprints sont définis dans les modules respectifs
try:
    index_bp = getattr(index, 'bp', None) or getattr(index, 'blueprint', None)
except AttributeError:
    index_bp = None

try:
    logout_bp = getattr(logout, 'bp', None) or getattr(logout, 'blueprint', None)
except AttributeError:
    logout_bp = None

# Liste des blueprints disponibles pour l'enregistrement automatique
__all__ = ['index', 'logout', 'index_bp', 'logout_bp']

# Définition des métadonnées du package routes
__version__ = '1.0.0'