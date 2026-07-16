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
    verify_paid_invoices,
    generate_suivi,
    appliquer_regles_attribution,
    send_suivi,
    sync_contacts,
    regenerate_relances_contact,
    regenerate_relances_with_status,
    test_smtp_profile,
    test_single_email,
    test_single_suivi
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


@bp.route('/generate-suivi', methods=['POST'])
def generate_suivi_endpoint():
    """Generate suivi sequences."""
    print("[API.WORKFLOW] START: generate-suivi")
    
    try:
        result = generate_suivi()
        print("[API.WORKFLOW] SUCCESS: generate-suivi")
        return jsonify({'success': True, 'data': result})
    except Exception as e:
        print(f"[API.WORKFLOW] ERROR: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/appliquer-regles-attribution', methods=['POST'])
def appliquer_regles_attribution_endpoint():
    """Apply attribution rules."""
    print("[API.WORKFLOW] START: appliquer-regles-attribution")
    
    try:
        result = appliquer_regles_attribution()
        print("[API.WORKFLOW] SUCCESS: appliquer-regles-attribution")
        return jsonify({'success': True, 'data': result})
    except Exception as e:
        print(f"[API.WORKFLOW] ERROR: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/send-suivi', methods=['POST'])
def send_suivi_endpoint():
    """Send scheduled suivi emails."""
    print("[API.WORKFLOW] START: send-suivi")
    
    try:
        result = send_suivi()
        print("[API.WORKFLOW] SUCCESS: send-suivi")
        return jsonify({'success': True, 'data': result})
    except Exception as e:
        print(f"[API.WORKFLOW] ERROR: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/sync-contacts', methods=['POST'])
def sync_contacts_endpoint():
    """Sync contacts from external source."""
    print("[API.WORKFLOW] START: sync-contacts")
    
    try:
        data = request.get_json()
        result = sync_contacts(data.get('source', 'external'))
        print("[API.WORKFLOW] SUCCESS: sync-contacts")
        return jsonify({'success': True, 'data': result})
    except Exception as e:
        print(f"[API.WORKFLOW] ERROR: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/regenerate-relances/<contact_id>', methods=['POST'])
def regenerate_relances_contact_endpoint(contact_id):
    """Regenerate relances for a contact."""
    print(f"[API.WORKFLOW] START: regenerate-relances/{contact_id}")
    
    try:
        result = regenerate_relances_contact(contact_id)
        print("[API.WORKFLOW] SUCCESS: regenerate-relances")
        return jsonify({'success': True, 'data': result})
    except Exception as e:
        print(f"[API.WORKFLOW] ERROR: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/test-smtp/<profile_id>', methods=['POST'])
def test_smtp_endpoint(profile_id):
    """Test SMTP profile."""
    print(f"[API.WORKFLOW] START: test-smtp/{profile_id}")
    
    try:
        result = test_smtp_profile(profile_id)
        print("[API.WORKFLOW] SUCCESS: test-smtp")
        return jsonify({'success': True, 'data': result})
    except Exception as e:
        print(f"[API.WORKFLOW] ERROR: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/test-email/<email_id>', methods=['POST'])
def test_email_endpoint(email_id):
    """Test single email."""
    print(f"[API.WORKFLOW] START: test-email/{email_id}")
    
    try:
        data = request.get_json()
        result = test_single_email(email_id, data.get('test_address'))
        print("[API.WORKFLOW] SUCCESS: test-email")
        return jsonify({'success': True, 'data': result})
    except Exception as e:
        print(f"[API.WORKFLOW] ERROR: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500
