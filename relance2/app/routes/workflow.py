"""
Routes pour les Workflows Backend

Endpoints pour exécuter les workflows métier.
"""

from flask import Blueprint, request, jsonify
from ..workflows import (
    generate_relances,
    send_emails,
    cleanup_relances,
    import_invoices,
    verify_paid_invoices
)

bp = Blueprint('workflow', __name__, url_prefix='/api/workflow')


@bp.route('/generate-relances', methods=['POST'])
def generate_relances_endpoint():
    """Generate relances for unpaid invoices."""
    print("[API.WORKFLOW] START: generate-relances")
    
    try:
        result = generate_relances()
        print("[API.WORKFLOW] SUCCESS: generate-relances")
        return jsonify({
            'success': True,
            'data': result
        })
    except Exception as e:
        print(f"[API.WORKFLOW] ERROR: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/send-emails', methods=['POST'])
def send_emails_endpoint():
    """Send scheduled emails."""
    print("[API.WORKFLOW] START: send-emails")
    
    try:
        result = send_emails()
        print("[API.WORKFLOW] SUCCESS: send-emails")
        return jsonify({
            'success': True,
            'data': result
        })
    except Exception as e:
        print(f"[API.WORKFLOW] ERROR: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/cleanup-relances', methods=['POST'])
def cleanup_relances_endpoint():
    """Cleanup obsolete relances."""
    print("[API.WORKFLOW] START: cleanup-relances")
    
    try:
        result = cleanup_relances()
        print("[API.WORKFLOW] SUCCESS: cleanup-relances")
        return jsonify({
            'success': True,
            'data': result
        })
    except Exception as e:
        print(f"[API.WORKFLOW] ERROR: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/import-invoices', methods=['POST'])
def import_invoices_endpoint():
    """Import invoices from data."""
    print("[API.WORKFLOW] START: import-invoices")
    
    try:
        data = request.get_json()
        result = import_invoices(data.get('invoices', []), data.get('source', 'manual'))
        print("[API.WORKFLOW] SUCCESS: import-invoices")
        return jsonify({
            'success': True,
            'data': result
        })
    except Exception as e:
        print(f"[API.WORKFLOW] ERROR: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/verify-paid', methods=['POST'])
def verify_paid_endpoint():
    """Verify paid invoices."""
    print("[API.WORKFLOW] START: verify-paid")
    
    try:
        result = verify_paid_invoices()
        print("[API.WORKFLOW] SUCCESS: verify-paid")
        return jsonify({
            'success': True,
            'data': result
        })
    except Exception as e:
        print(f"[API.WORKFLOW] ERROR: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
