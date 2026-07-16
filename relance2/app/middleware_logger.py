"""
Middleware de logging pour Flask
Capture tous les appels API entrants et sortants.
"""

import time
import json
from flask import request, g
from datetime import datetime


class APILoggerMiddleware:
    """Middleware pour logger les requêtes API."""
    
    def __init__(self, app=None):
        self.app = app
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialise le middleware avec l'app Flask."""
        
        @app.before_request
        def before_request():
            """Avant chaque requête."""
            g.start_time = time.time()
            g.request_id = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
            
            # Log la requête entrante
            log_data = {
                'request_id': g.request_id,
                'timestamp': datetime.now().isoformat(),
                'method': request.method,
                'path': request.path,
                'endpoint': request.endpoint,
                'remote_addr': request.remote_addr,
                'headers': dict(request.headers) if request.headers else {}
            }
            
            # Masquer le token dans les logs
            if 'Authorization' in log_data.get('headers', {}):
                auth = log_data['headers']['Authorization']
                if auth.startswith('Bearer '):
                    log_data['headers']['Authorization'] = f"Bearer {auth[7:20]}..."
            
            # Log le body pour POST/PUT (limité)
            if request.method in ['POST', 'PUT'] and request.is_json:
                try:
                    body = request.get_json()
                    # Limiter la taille
                    body_str = json.dumps(body)
                    if len(body_str) > 500:
                        log_data['body'] = body_str[:500] + '...'
                    else:
                        log_data['body'] = body
                except:
                    pass
            
            print(f"\n[API.REQUEST] {request.method} {request.path}")
            print(f"  ID: {g.request_id}")
            print(f"  From: {request.remote_addr}")
            
            # Stocker pour after_request
            g.log_data = log_data
        
        @app.after_request
        def after_request(response):
            """Après chaque requête."""
            if hasattr(g, 'start_time'):
                duration = time.time() - g.start_time
                
                log_data = getattr(g, 'log_data', {})
                log_data['status_code'] = response.status_code
                log_data['duration_ms'] = round(duration * 1000, 2)
                
                status_icon = "✅" if response.status_code < 400 else "❌"
                print(f"[API.RESPONSE] {status_icon} {response.status_code} in {log_data['duration_ms']}ms")
                
                # Log les erreurs en détail
                if response.status_code >= 400:
                    try:
                        data = response.get_json()
                        if data and 'error' in data:
                            print(f"  Error: {data['error']}")
                    except:
                        pass
                
                # Sauvegarder dans un fichier de log
                self._save_log(log_data)
            
            return response
    
    def _save_log(self, log_data):
        """Sauvegarde le log dans un fichier."""
        try:
            with open('/tmp/marki_api.log', 'a') as f:
                f.write(json.dumps(log_data, default=str) + '\n')
        except:
            pass


def init_logging(app):
    """Initialise le logging pour l'application."""
    APILoggerMiddleware(app)
    print("[INFO] Middleware de logging activé")
