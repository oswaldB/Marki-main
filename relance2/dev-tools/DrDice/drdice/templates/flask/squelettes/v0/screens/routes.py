"""Routes pour {cell_name}."""
from flask import render_template, jsonify, request, send_from_directory
from . import bp
import os


@bp.route('/')
def index():
    """Page principale {cell_name}."""
    return render_template('{cell_name}/index.html')


@bp.route('/workflows/<path:filename>')
def serve_workflow(filename):
    """Sert les fichiers workflows frontend."""
    workflow_dir = os.path.join(os.path.dirname(__file__), 'workflows')
    return send_from_directory(workflow_dir, filename)


@bp.route('/api/{cell_name}', methods=['GET', 'POST'])
def api_{cell_name}():
    """API {cell_name}."""
    if request.method == 'POST':
        data = request.get_json() or {{}}
        return jsonify({{"status": "ok", "received": data}})
    return jsonify({{"status": "ok", "data": []}})
