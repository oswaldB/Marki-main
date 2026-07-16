#!/usr/bin/env python3
"""Point d'entree WSGI pour l'application Flask."""

import sys
import os

# Ajouter le dossier app au path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

# Maintenant on peut importer
try:
    from app import create_app
    application = create_app()
except Exception as e:
    print(f"Erreur lors du chargement: {e}")
    raise

if __name__ == '__main__':
    application.run(debug=True, host='0.0.0.0', port=5000)
