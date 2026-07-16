"""
Routes API pour la gestion du cron.
Préfixe: /api/cron
"""
from flask import Blueprint, jsonify, request
from cron.scheduler import scheduler
from cron.config import CRON_JOBS, get_job_by_id

bp = Blueprint('cron', __name__, url_prefix='/api/cron')


@bp.route('/status', methods=['GET'])
def get_status():
    """Récupère le statut du scheduler et des jobs planifiés."""
    print(f"[API CRON] GET /api/cron/status - Statut du scheduler")
    status = scheduler.get_status()
    print(f"[API CRON] ✅ Statut retourné: {status}")
    return jsonify(status)


@bp.route('/jobs', methods=['GET'])
def list_jobs():
    """Liste tous les jobs configurés."""
    print(f"[API CRON] GET /api/cron/jobs - Liste des jobs")
    print(f"[API CRON] ✅ {len(CRON_JOBS)} jobs configurés")
    return jsonify({'jobs': CRON_JOBS})


@bp.route('/trigger/<job_id>', methods=['POST'])
def trigger_job(job_id):
    """
    Déclenche manuellement un job.
    
    Body optionnel:
        - run_now: true pour exécuter immédiatement
        - payload: surcharge des données à envoyer au workflow
    """
    print(f"[API CRON] POST /api/cron/trigger/{job_id} - Déclenchement manuel")
    data = request.get_json() or {}
    run_now = data.get('run_now', True)
    
    result = scheduler.trigger_job(job_id, run_now=run_now)
    
    if result['success']:
        print(f"[API CRON] ✅ Job '{job_id}' déclenché avec succès")
        return jsonify({
            'success': True,
            'message': f"Job '{job_id}' déclenché",
            'result': result.get('result')
        })
    else:
        print(f"[API CRON] ❌ Échec déclenchement job '{job_id}': {result.get('error')}")
        return jsonify({
            'success': False,
            'error': result.get('error')
        }), 400


@bp.route('/workflows', methods=['POST'])
def trigger_workflow_direct():
    """
    Déclenche un workflow directement sans passer par la config cron.
    
    Body:
        - workflow_id: ID du workflow à exécuter
        - payload: données à envoyer (optionnel)
    """
    from cron.jobs import execute_workflow_job
    
    print(f"[API CRON] POST /api/cron/workflows - Déclenchement direct workflow")
    data = request.get_json() or {}
    workflow_id = data.get('workflow_id')
    payload = data.get('payload', {})
    
    print(f"[API CRON] Workflow: {workflow_id}, Payload: {payload}")
    
    if not workflow_id:
        print(f"[API CRON] ❌ workflow_id manquant")
        return jsonify({'success': False, 'error': 'workflow_id requis'}), 400
    
    result = execute_workflow_job(
        job_id=f'manual-{workflow_id}',
        workflow_id=workflow_id,
        payload=payload
    )
    
    print(f"[API CRON] ✅ Workflow '{workflow_id}' exécuté: success={result['success']}")
    return jsonify({
        'success': result['success'],
        'workflow_id': workflow_id,
        'result': result
    })
