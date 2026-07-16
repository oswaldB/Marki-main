#!/usr/bin/env python3
"""Script pour lancer l'application Flask."""

import sys
import os

# Se déplacer dans le dossier app
os.chdir(os.path.join(os.path.dirname(__file__), 'app'))
sys.path.insert(0, os.getcwd())

from app import create_app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
