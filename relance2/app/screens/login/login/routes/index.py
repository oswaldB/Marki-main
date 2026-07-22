"""
Route: /login
Display login page
"""
from flask import render_template
from .. import login_bp

@login_bp.route('/login', methods=['GET'])
def login_page():
    """Render login page with Alpine.js frontend"""
    return render_template('login.html')