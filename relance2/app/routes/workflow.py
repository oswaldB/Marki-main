"""
Routes API pour les workflows backend.
Préfixe: /api/workflow

Les workflows sont appelés par le cron ou manuellement via /api/cron/trigger
"""
from flask import Blueprint, jsonify, request, current_app
import functools

bp = Blueprint('workflow', __name__, url_prefix='/api/workflow')


def require_cron_token(f):
    """Décorateur pour vérifier le token cron."""
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        print(f"[API WORKFLOW] Vérification token cron pour {request.path}")
        auth_header = request.headers.get('Authorization', '')
        expected_token = current_app.config.get('CRON_API_TOKEN', 'cron-secret-token')
        
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
        else:
            token = auth_header
        
        triggered_by = request.headers.get('X-Triggered-By', '')
        
        if token != expected_token and triggered_by != 'cron':
            print(f"[API WORKFLOW] ❌ Token invalide - Accès refusé")
            return jsonify({'success': False, 'error': 'Unauthorized'}), 401
        
        print(f"[API WORKFLOW] ✅ Token valide - Accès autorisé")
        return f(*args, **kwargs)
    return decorated


@bp.route('/<workflow_id>', methods=['POST', 'GET'])
@require_cron_token
def generic_workflow(workflow_id):
    """
    Endpoint générique pour workflows.
    Les workflows seront implémentés plus tard.
    """
    print(f"[API WORKFLOW] {request.method} /api/workflow/{workflow_id} - Appel reçu")
    print(f"[API WORKFLOW] Headers: {dict(request.headers)}")
    print(f"[API WORKFLOW] Body: {request.get_json()}")
    
    print(f"[API WORKFLOW] Workflow '{workflow_id}' non implémenté - Retour 501")
    return jsonify({
        'success': False,
        'error': f'Workflow "{workflow_id}" non implémenté'
    }), 501
