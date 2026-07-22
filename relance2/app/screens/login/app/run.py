#!/usr/bin/env python3
"""
Entry point for login cell
Usage: python run.py
"""

from app.login import create_app

app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
