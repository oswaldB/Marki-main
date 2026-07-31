"""Routes backend pour {cell_name}."""
from flask import jsonify, request
from . import bp


@bp.route('/process', methods=['POST'])
def process():
    """Traite une requête workflow."""
    data = request.get_json() or {{}}
    
    # TODO: Implémenter la logique métier
    
    return jsonify({{
        "status": "ok",
        "workflow": "{cell_name}",
        "received": data
    }})


@bp.route('/status')
def status():
    """Retourne le statut du workflow."""
    return jsonify({{"status": "ok", "workflow": "{cell_name}"}})
