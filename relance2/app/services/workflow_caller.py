"""
Service d'appel aux workflows backend.
Appelle les endpoints API comme le ferait un utilisateur/admin.
"""
import requests
import os
from datetime import datetime


class WorkflowCaller:
    """Client HTTP pour déclencher les workflows backend."""
    
    def __init__(self, base_url=None):
        print(f"[WORKFLOW CALLER] Initialisation du service")
        self.base_url = base_url or os.environ.get('APP_URL', 'http://localhost:5000')
        self.token = os.environ.get('CRON_API_TOKEN', 'cron-secret-token')
        print(f"[WORKFLOW CALLER] Configuration: base_url={self.base_url}, token={'***' if self.token else 'NON DEFINI'}")
    
    def call_workflow(self, workflow_id, payload=None, method='POST'):
        """
        Appelle un workflow backend.
        
        Args:
            workflow_id: Identifiant du workflow (ex: 'generate-relances')
            payload: Données JSON à envoyer
            method: HTTP method (POST, GET, PUT)
        
        Returns:
            dict: {success: bool, response: any, error: str|None}
        """
        url = f"{self.base_url}/api/workflow/{workflow_id}"
        headers = {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json',
            'X-Triggered-By': 'cron'
        }
        
        print(f"[WORKFLOW CALLER] Appel workflow '{workflow_id}' -> {url}")
        print(f"[WORKFLOW CALLER] Method: {method}, Payload: {payload}")
        
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers, timeout=300)
            else:
                response = requests.post(
                    url, 
                    headers=headers, 
                    json=payload or {},
                    timeout=300
                )
            
            response.raise_for_status()
            
            print(f"[WORKFLOW CALLER] ✅ Workflow '{workflow_id}' exécuté avec succès (HTTP {response.status_code})")
            return {
                'success': True,
                'response': response.json() if response.content else None,
                'status_code': response.status_code,
                'error': None
            }
            
        except requests.exceptions.Timeout:
            print(f"[WORKFLOW CALLER] ❌ Timeout après 300s pour workflow '{workflow_id}'")
            return {
                'success': False,
                'response': None,
                'error': 'Timeout après 300s',
                'status_code': None
            }
        except requests.exceptions.RequestException as e:
            print(f"[WORKFLOW CALLER] ❌ Erreur pour workflow '{workflow_id}': {str(e)}")
            return {
                'success': False,
                'response': None,
                'error': str(e),
                'status_code': getattr(e.response, 'status_code', None)
            }
    
    def log_execution(self, job_id, workflow_id, result):
        """Log l'exécution d'un job (peut être persisté en DB)."""
        status = 'success' if result['success'] else 'failed'
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'job_id': job_id,
            'workflow_id': workflow_id,
            'status': status,
            'error': result.get('error'),
            'response': result.get('response')
        }
        
        # TODO: Persister en base via un service de log
        print(f"[WORKFLOW CALLER-LOG] {log_entry}")
        return log_entry
