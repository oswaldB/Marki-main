"""Routes login"""
from flask import render_template, jsonify, request
from . import bp


@bp.route('/')
def index():
    """Page login."""
    return render_template('login/index.html')


@bp.route('/api/login', methods=['GET', 'POST'])
def api_login():
    """API login."""
    if request.method == 'POST':
        data = request.get_json() or {}
        return jsonify({"status": "ok", "received": data})
    return jsonify({"status": "ok", "data": []})
