#!/usr/bin/env python3
"""Point d'entree pour executer l'application avec python -m app."""

from .app import create_app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
