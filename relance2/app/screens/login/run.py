#!/usr/bin/env python3
"""
Entry point for the login cell
"""

from app.login import app

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)