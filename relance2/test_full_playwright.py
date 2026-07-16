#!/usr/bin/env python3
"""
Test complet avec Playwright
- Se connecte automatiquement
- Capture les console logs de toutes les pages
- Test les workflows frontend
- Capture les appels API réseau
"""

import subprocess
import time
import json
import sys
from datetime import datetime
from pathlib import Path

BASE_URL = 'http://localhost:5000'
CREDENTIALS = {'username': 'admin', 'password': 'admin'}


class PlaywrightTester:
    def __init__(self):
        self.server_process = None
        self.browser = None
        self.context = None
        self.page = None
        self.results = []
        
    def start_server(self):
        """Démarre le serveur Flask."""
        print("[INFO] Démarrage du serveur Flask...")
        self.server_process = subprocess.Popen(
            ['python3', '-m', 'app'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd='/home/ubuntu/marki/relance2'
        )
        time.sleep(5)
        print("[INFO] Serveur démarré sur http://localhost:5000")
    
    def stop_server(self):
        """Arrête le serveur."""
        print("[INFO] Arrêt du serveur...")
        if self.server_process:
            self.server_process.terminate()
            self.server_process.wait()
    
    def init_browser(self):
        """Initialise Playwright."""
        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            print("[ERROR] Playwright non installé")
            print("  pip install playwright")
            print("  playwright install chromium")
            return False
        
        self.playwright = sync_playwright().start()
        self.browser = self.playwright.chromium.launch(
            headless=True,
            args=['--no-sandbox', '--disable-dev-shm-usage']
        )
        self.context = self.browser.new_context(
            viewport={'width': 1280, 'height': 720},
            record_har_path='/tmp/marki_test.har'  # Capture les requêtes réseau
        )
        self.page = self.context.new_page()
        
        # Configuration des listeners
        self.setup_listeners()
        
        return True
    
    def setup_listeners(self):
        """Configure les listeners pour capturer les logs."""
        self.console_logs = []
        self.network_requests = []
        self.page_errors = []
        
        # Capture console logs
        self.page.on("console", self._handle_console)
        
        # Capture erreurs page
        self.page.on("pageerror", self._handle_page_error)
        
        # Capture requêtes/réponses réseau
        self.page.on("request", self._handle_request)
        self.page.on("response", self._handle_response)
    
    def _handle_console(self, msg):
        """Gère les messages console."""
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'type': msg.type,
            'text': msg.text,
            'location': msg.location
        }
        self.console_logs.append(log_entry)
        
        # Afficher en temps réel les logs importants
        if 'WORKFLOW' in msg.text or 'ERROR' in msg.text:
            print(f"    📝 [{msg.type}] {msg.text[:100]}")
    
    def _handle_page_error(self, error):
        """Gère les erreurs page."""
        self.page_errors.append(str(error))
        print(f"    ❌ Page Error: {error}")
    
    def _handle_request(self, request):
        """Gère les requêtes réseau."""
        if request.url.startswith(BASE_URL + '/api/'):
            self.network_requests.append({
                'type': 'request',
                'method': request.method,
                'url': request.url.replace(BASE_URL, ''),
                'timestamp': datetime.now().isoformat()
            })
    
    def _handle_response(self, response):
        """Gère les réponses réseau."""
        if response.url.startswith(BASE_URL + '/api/'):
            self.network_requests.append({
                'type': 'response',
                'status': response.status,
                'url': response.url.replace(BASE_URL, ''),
                'timestamp': datetime.now().isoformat()
            })
    
    def login(self):
        """Effectue la connexion."""
        print("\n" + "=" * 70)
        print("CONNEXION")
        print("=" * 70)
        
        print(f"\n[LOGIN] Accès à {BASE_URL}/login")
        self.page.goto(f'{BASE_URL}/login', wait_until='networkidle')
        
        # Remplir le formulaire
        print("[LOGIN] Remplissage du formulaire...")
        self.page.fill('input[name="username"]', CREDENTIALS['username'])
        self.page.fill('input[name="password"]', CREDENTIALS['password'])
        
        # Soumettre
        print("[LOGIN] Soumission...")
        self.page.click('button[type="submit"]')
        
        # Attendre la redirection
        try:
            self.page.wait_for_url(f'{BASE_URL}/dashboard', timeout=10000)
            print("✅ Connecté et redirigé vers /dashboard")
            return True
        except:
            print("❌ Échec de la connexion")
            return False
    
    def test_page(self, path, name):
        """Test une page et capture les logs."""
        url = f'{BASE_URL}{path}'
        print(f"\n[PAGE] {name}")
        print(f"  URL: {url}")
        
        # Reset des logs pour cette page
        self.console_logs = []
        self.page_errors = []
        
        try:
            # Navigation
            response = self.page.goto(url, wait_until='networkidle', timeout=15000)
            
            # Attendre Alpine.js
            time.sleep(2)
            
            # Vérifier le statut
            status = response.status if response else 0
            print(f"  Status: {status}")
            
            # Compter les logs
            workflow_logs = [l for l in self.console_logs if 'WORKFLOW' in l['text']]
            errors = [l for l in self.console_logs if l['type'] == 'error']
            
            print(f"  📝 Logs total: {len(self.console_logs)}")
            print(f"  🔄 Logs workflow: {len(workflow_logs)}")
            print(f"  ❌ Erreurs console: {len(errors)}")
            
            # Vérifier Alpine.js
            has_alpine = self.page.evaluate('() => typeof Alpine !== "undefined"')
            print(f"  {'✅' if has_alpine else '❌'} Alpine.js chargé")
            
            result = {
                'page': name,
                'path': path,
                'url': url,
                'status': status,
                'logs_count': len(self.console_logs),
                'workflow_logs': len(workflow_logs),
                'errors_count': len(errors) + len(self.page_errors),
                'has_alpine': has_alpine,
                'ok': status == 200 and len(errors) == 0 and len(self.page_errors) == 0
            }
            
            # Sauvegarder les logs détaillés
            if workflow_logs:
                result['workflow_details'] = [l['text'] for l in workflow_logs[:10]]
            
            self.results.append(result)
            
            if result['ok']:
                print(f"  ✅ Page OK")
            else:
                print(f"  ⚠️  Problèmes détectés")
            
            return result
            
        except Exception as e:
            print(f"  ❌ Exception: {e}")
            self.results.append({
                'page': name,
                'path': path,
                'error': str(e),
                'ok': False
            })
            return None
    
    def test_workflows(self):
        """Test les interactions de workflow."""
        print("\n" + "=" * 70)
        print("TEST INTERACTIONS WORKFLOW")
        print("=" * 70)
        
        # Aller sur la page impayes
        print("\n[TEST] Clic sur impayés...")
        self.page.goto(f'{BASE_URL}/impayes', wait_until='networkidle')
        time.sleep(2)
        
        # Compter les logs workflow
        workflow_logs = [l for l in self.console_logs if 'WORKFLOW' in l['text']]
        print(f"  Logs workflow après chargement: {len(workflow_logs)}")
        
        # Vérifier les logs spécifiques
        init_logs = [l for l in workflow_logs if 'INIT' in l['text']]
        print(f"  Logs INIT: {len(init_logs)}")
        
        # Tester un tri
        print("\n[TEST] Tri par montant...")
        self.console_logs = []  # Reset
        
        # Cliquer sur le header de tri
        try:
            self.page.click('th:has-text("Montant")')
            time.sleep(1)
            
            sort_logs = [l for l in self.console_logs if 'sort' in l['text'].lower()]
            print(f"  Logs tri: {len(sort_logs)}")
            
            if sort_logs:
                print("  ✅ Tri fonctionnel")
        except Exception as e:
            print(f"  ⚠️  Impossible de tester le tri: {e}")
    
    def generate_report(self):
        """Génère le rapport final."""
        print("\n" + "=" * 70)
        print("RAPPORT FINAL")
        print("=" * 70)
        
        ok_pages = sum(1 for r in self.results if r.get('ok'))
        total_pages = len(self.results)
        
        print(f"\nPages testées: {total_pages}")
        print(f"Pages OK: {ok_pages}")
        print(f"Pages avec erreurs: {total_pages - ok_pages}")
        
        # Sauvegarder le rapport
        report = {
            'timestamp': datetime.now().isoformat(),
            'summary': {
                'total_pages': total_pages,
                'ok_pages': ok_pages,
                'error_pages': total_pages - ok_pages
            },
            'pages': self.results,
            'network_requests': self.network_requests
        }
        
        output_file = 'TEST_PLAYWRIGHT_REPORT.json'
        with open(output_file, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        print(f"\n📄 Rapport sauvegardé: {output_file}")
        
        # Afficher les pages avec erreurs
        errors = [r for r in self.results if not r.get('ok')]
        if errors:
            print("\n❌ Pages avec erreurs:")
            for e in errors:
                print(f"  - {e['page']}: {e.get('error', 'Erreur inconnue')}")
        
        return ok_pages == total_pages
    
    def run(self):
        """Exécute tous les tests."""
        print("=" * 70)
        print("TEST COMPLET AVEC PLAYWRIGHT")
        print("=" * 70)
        
        self.start_server()
        
        try:
            if not self.init_browser():
                return 1
            
            # Connexion
            if not self.login():
                print("❌ Impossible de se connecter")
                return 1
            
            # Test des pages
            print("\n" + "=" * 70)
            print("TEST DES PAGES")
            print("=" * 70)
            
            pages = [
                ('/dashboard', 'Dashboard'),
                ('/impayes', 'Impayes'),
                ('/contacts', 'Contacts'),
                ('/relances', 'Relances'),
                ('/sequences', 'Sequences'),
                ('/evenements', 'Evenements'),
                ('/settings', 'Settings'),
                ('/settings-smtp', 'Settings SMTP'),
                ('/relances-calendrier', 'Relances Calendrier'),
                ('/relances-validation', 'Relances Validation'),
            ]
            
            for path, name in pages:
                self.test_page(path, name)
            
            # Test des interactions
            self.test_workflows()
            
            # Générer le rapport
            success = self.generate_report()
            
            return 0 if success else 1
            
        except Exception as e:
            print(f"\n❌ Erreur: {e}")
            import traceback
            traceback.print_exc()
            return 1
            
        finally:
            if self.browser:
                self.browser.close()
            if self.playwright:
                self.playwright.stop()
            self.stop_server()


def main():
    tester = PlaywrightTester()
    return tester.run()


if __name__ == '__main__':
    sys.exit(main())
