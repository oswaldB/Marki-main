#!/usr/bin/env python3
"""
Rapport détaillé par URL avec logs console ET requêtes réseau.
Capture tout : console logs, network requests/responses, erreurs.
"""

import subprocess
import time
import json
import sys
from datetime import datetime
from collections import defaultdict

BASE_URL = 'http://localhost:5000'


class URLNetworkConsoleTester:
    def __init__(self):
        self.server_process = None
        self.results = []
        
    def start_server(self):
        """Démarre le serveur Flask."""
        print("=" * 100)
        print("DÉMARRAGE DU SERVEUR")
        print("=" * 100)
        self.server_process = subprocess.Popen(
            ['python3', '-m', 'app'],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            cwd='/home/ubuntu/marki/relance2'
        )
        time.sleep(5)
        print(f"✅ Serveur prêt sur {BASE_URL}\n")
        
    def stop_server(self):
        """Arrête le serveur."""
        print("\n[INFO] Arrêt du serveur...")
        if self.server_process:
            self.server_process.terminate()
            try:
                self.server_process.wait(timeout=5)
            except:
                self.server_process.kill()
    
    def init_browser(self):
        """Initialise Playwright."""
        try:
            from playwright.sync_api import sync_playwright
            self.playwright = sync_playwright().start()
            self.browser = self.playwright.chromium.launch(
                headless=True,
                args=['--no-sandbox', '--disable-dev-shm-usage']
            )
            return True
        except ImportError:
            print("❌ Playwright non installé")
            return False
    
    def close_browser(self):
        """Ferme le navigateur."""
        if hasattr(self, 'browser'):
            self.browser.close()
        if hasattr(self, 'playwright'):
            self.playwright.stop()
    
    def test_url(self, path, name):
        """Test une URL et capture console + network."""
        url = f'{BASE_URL}{path}'
        
        print(f"\n{'═' * 100}")
        print(f"🌐 TEST URL: {name}")
        print(f"   {url}")
        print(f"{'═' * 100}")
        
        context = self.browser.new_context(
            viewport={'width': 1280, 'height': 720},
            record_har_path=f'/tmp/har_{name.replace(" ", "_")}.har'
        )
        page = context.new_page()
        
        # Stockage des données
        console_logs = []
        network_requests = []
        network_responses = []
        page_errors = []
        
        # === CONSOLE LOGS ===
        def handle_console(msg):
            entry = {
                'type': msg.type,
                'text': msg.text,
                'time': datetime.now().isoformat()
            }
            console_logs.append(entry)
            
            # Affichage temps réel
            if 'WORKFLOW' in msg.text:
                short = msg.text[:80] + '...' if len(msg.text) > 80 else msg.text
                print(f"    🔄 [{msg.type}] {short}")
            elif msg.type == 'error':
                short = msg.text[:80] + '...' if len(msg.text) > 80 else msg.text
                print(f"    ❌ [ERROR] {short}")
            elif msg.type == 'warn':
                short = msg.text[:60] + '...' if len(msg.text) > 60 else msg.text
                print(f"    ⚠️  [WARN] {short}")
        
        # === NETWORK REQUESTS ===
        def handle_request(request):
            entry = {
                'method': request.method,
                'url': request.url,
                'resource_type': request.resource_type,
                'time': datetime.now().isoformat()
            }
            network_requests.append(entry)
            
            # Afficher les appels API
            if '/api/' in request.url:
                short_url = request.url.replace(BASE_URL, '')
                print(f"    📤 → {request.method} {short_url}")
        
        # === NETWORK RESPONSES ===
        def handle_response(response):
            entry = {
                'status': response.status,
                'url': response.url,
                'time': datetime.now().isoformat()
            }
            network_responses.append(entry)
            
            # Afficher les réponses API
            if '/api/' in response.url:
                short_url = response.url.replace(BASE_URL, '')
                status_icon = '✅' if response.status < 400 else '❌'
                print(f"    📥 ← {status_icon} {response.status} {short_url}")
        
        # === PAGE ERRORS ===
        def handle_page_error(error):
            page_errors.append(str(error))
            print(f"    ❌ [PAGE ERROR] {error}")
        
        # Attacher les listeners
        page.on("console", handle_console)
        page.on("request", handle_request)
        page.on("response", handle_response)
        page.on("pageerror", handle_page_error)
        
        try:
            # Navigation
            response = page.goto(url, wait_until='networkidle', timeout=15000)
            time.sleep(3)  # Attendre les requêtes async
            
            # Résultats
            status = response.status if response else 0
            
            # Compter par type
            workflow_logs = [l for l in console_logs if 'WORKFLOW' in l['text']]
            errors = [l for l in console_logs if l['type'] == 'error']
            warns = [l for l in console_logs if l['type'] == 'warn']
            
            # API calls
            api_requests = [r for r in network_requests if '/api/' in r['url']]
            api_errors = [r for r in network_responses 
                         if '/api/' in r['url'] and r['status'] >= 400]
            
            result = {
                'name': name,
                'path': path,
                'url': url,
                'status': status,
                'console': {
                    'total': len(console_logs),
                    'log': len([l for l in console_logs if l['type'] == 'log']),
                    'info': len([l for l in console_logs if l['type'] == 'info']),
                    'warn': len(warns),
                    'error': len(errors),
                    'workflow': len(workflow_logs),
                    'all_logs': console_logs
                },
                'network': {
                    'total_requests': len(network_requests),
                    'total_responses': len(network_responses),
                    'api_requests': len(api_requests),
                    'api_errors': len(api_errors),
                    'requests': network_requests,
                    'responses': network_responses
                },
                'page_errors': page_errors,
                'ok': status == 200 and len(errors) == 0 and len(api_errors) == 0
            }
            
            # Affichage résumé
            print(f"\n   📊 RÉSUMÉ CONSOLE:")
            print(f"      Total: {len(console_logs)} | Workflow: {len(workflow_logs)} | Error: {len(errors)} | Warn: {len(warns)}")
            
            print(f"\n   📡 RÉSUMÉ NETWORK:")
            print(f"      Requêtes: {len(network_requests)} | Réponses: {len(network_responses)}")
            print(f"      API calls: {len(api_requests)} | API errors: {len(api_errors)}")
            
            print(f"\n   🎯 STATUT:")
            print(f"      HTTP: {status}")
            print(f"      {'✅ OK' if result['ok'] else '❌ Erreurs détectées'}")
            
            self.results.append(result)
            return result
            
        except Exception as e:
            print(f"   ❌ Exception: {e}")
            self.results.append({
                'name': name,
                'path': path,
                'error': str(e),
                'ok': False
            })
            return None
            
        finally:
            context.close()
    
    def generate_report(self):
        """Génère le rapport complet."""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        print("\n" + "=" * 100)
        print("GÉNÉRATION DU RAPPORT")
        print("=" * 100)
        
        # Sauvegarder JSON
        json_file = f'REPORT_URL_NETWORK_CONSOLE_{timestamp}.json'
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump({
                'timestamp': datetime.now().isoformat(),
                'base_url': BASE_URL,
                'urls': self.results
            }, f, indent=2, default=str, ensure_ascii=False)
        
        print(f"📄 JSON: {json_file}")
        
        # Générer rapport Markdown
        md_file = f'REPORT_URL_NETWORK_CONSOLE_{timestamp}.md'
        with open(md_file, 'w', encoding='utf-8') as f:
            f.write("# Rapport Détaillé par URL - Console & Network\n\n")
            f.write(f"**Date**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write(f"**URL de base**: {BASE_URL}\n\n")
            f.write(f"**URLs testées**: {len(self.results)}\n\n")
            
            f.write("---\n\n")
            f.write("## 📊 Tableau Récapitulatif\n\n")
            f.write("| URL | HTTP | Console | Workflow | Network | API Calls | API Errors | Statut |\n")
            f.write("|-----|------|---------|----------|---------|-----------|------------|--------|\n")
            
            for r in self.results:
                if 'console' in r:
                    c = r['console']
                    n = r['network']
                    status = '✅' if r.get('ok') else '❌'
                    f.write(f"| {r['name']} | {r['status']} | {c['total']} | "
                           f"{c['workflow']} | {n['total_requests']} | "
                           f"{n['api_requests']} | {n['api_errors']} | {status} |\n")
            
            f.write("\n---\n\n")
            f.write("## 🔍 Détails par URL\n\n")
            
            for r in self.results:
                f.write(f"### {r['name']}\n\n")
                f.write(f"- **URL**: `{r['url']}`\n")
                f.write(f"- **Path**: `{r['path']}`\n")
                f.write(f"- **HTTP Status**: {r.get('status', 'N/A')}\n\n")
                
                if 'console' in r:
                    c = r['console']
                    f.write("#### Console Logs\n\n")
                    f.write(f"- Total: {c['total']}\n")
                    f.write(f"- Log: {c['log']}\n")
                    f.write(f"- Info: {c['info']}\n")
                    f.write(f"- Warn: {c['warn']}\n")
                    f.write(f"- Error: {c['error']}\n")
                    f.write(f"- **Workflow**: {c['workflow']}\n\n")
                    
                    # Logs WORKFLOW
                    wf_logs = [l for l in c['all_logs'] if 'WORKFLOW' in l['text']]
                    if wf_logs:
                        f.write("**Logs Workflow**:\n\n")
                        for log in wf_logs[:5]:
                            text = log['text'].replace('\n', ' ')[:80]
                            f.write(f"- `[{log['type']}]` {text}...\n")
                        f.write("\n")
                    
                    # Errors
                    if c['error'] > 0:
                        f.write("**Erreurs Console**:\n\n")
                        for log in c['all_logs']:
                            if log['type'] == 'error':
                                text = log['text'].replace('\n', ' ')[:100]
                                f.write(f"- `{log['time']}` {text}...\n")
                        f.write("\n")
                
                if 'network' in r:
                    n = r['network']
                    f.write("#### Network\n\n")
                    f.write(f"- Total requêtes: {n['total_requests']}\n")
                    f.write(f"- Total réponses: {n['total_responses']}\n")
                    f.write(f"- **API calls**: {n['api_requests']}\n")
                    f.write(f"- **API errors**: {n['api_errors']}\n\n")
                    
                    # API calls détaillés
                    if n['api_requests'] > 0:
                        f.write("**Appels API**:\n\n")
                        for req in n['requests']:
                            if '/api/' in req['url']:
                                short = req['url'].replace(BASE_URL, '')
                                f.write(f"- `{req['method']}` {short}\n")
                        f.write("\n")
                
                if r.get('page_errors'):
                    f.write("#### Erreurs Page\n\n")
                    for err in r['page_errors']:
                        f.write(f"- `{err}`\n")
                    f.write("\n")
                
                f.write("---\n\n")
            
            # Résumé global
            f.write("## 📈 Statistiques Globales\n\n")
            ok_count = sum(1 for r in self.results if r.get('ok'))
            total_console = sum(r['console']['total'] for r in self.results if 'console' in r)
            total_workflow = sum(r['console']['workflow'] for r in self.results if 'console' in r)
            total_api = sum(r['network']['api_requests'] for r in self.results if 'network' in r)
            total_api_errors = sum(r['network']['api_errors'] for r in self.results if 'network' in r)
            
            f.write(f"- **URLs testées**: {len(self.results)}\n")
            f.write(f"- **URLs OK**: {ok_count}/{len(self.results)}\n")
            f.write(f"- **Total console logs**: {total_console}\n")
            f.write(f"- **Total workflow logs**: {total_workflow}\n")
            f.write(f"- **Total API calls**: {total_api}\n")
            f.write(f"- **Total API errors**: {total_api_errors}\n")
        
        print(f"📄 Markdown: {md_file}")
        
        return md_file, json_file
    
    def run(self):
        """Exécute tous les tests."""
        print("\n" + "=" * 100)
        print("TEST URLS - CONSOLE & NETWORK")
        print("=" * 100)
        
        self.start_server()
        
        try:
            if not self.init_browser():
                return 1
            
            urls = [
                ('/login', 'Login'),
                ('/dashboard', 'Dashboard'),
                ('/impayes', 'Impayes'),
                ('/contacts', 'Contacts'),
                ('/relances', 'Relances'),
                ('/sequences', 'Sequences'),
                ('/evenements', 'Evenements'),
                ('/settings', 'Settings'),
                ('/settings-smtp', 'Settings SMTP'),
                ('/settings-utilisateurs', 'Settings Utilisateurs'),
                ('/relances-calendrier', 'Relances Calendrier'),
                ('/relances-validation', 'Relances Validation'),
                ('/smart-marki', 'Smart Marki'),
            ]
            
            print(f"\n{'=' * 100}")
            print(f"TEST DE {len(urls)} URLS")
            print(f"{'=' * 100}")
            
            for i, (path, name) in enumerate(urls, 1):
                print(f"\n{'▶' * 50}")
                print(f"[{i}/{len(urls)}] {name}")
                print(f"{'▶' * 50}")
                self.test_url(path, name)
            
            # Générer rapport
            md_file, json_file = self.generate_report()
            
            # Résumé console
            print("\n" + "=" * 100)
            print("RÉSUMÉ FINAL")
            print("=" * 100)
            
            ok_count = sum(1 for r in self.results if r.get('ok'))
            total_console = sum(r['console']['total'] for r in self.results if 'console' in r)
            total_workflow = sum(r['console']['workflow'] for r in self.results if 'console' in r)
            total_api = sum(r['network']['api_requests'] for r in self.results if 'network' in r)
            total_api_errors = sum(r['network']['api_errors'] for r in self.results if 'network' in r)
            
            print(f"\n📊 Statistiques:")
            print(f"   URLs testées: {len(self.results)}")
            print(f"   URLs OK: {ok_count}/{len(self.results)}")
            print(f"   Console logs: {total_console}")
            print(f"   Workflow logs: {total_workflow}")
            print(f"   API calls: {total_api}")
            print(f"   API errors: {total_api_errors}")
            
            print(f"\n📁 Fichiers générés:")
            print(f"   📄 {md_file}")
            print(f"   📄 {json_file}")
            
            print("\n" + "=" * 100)
            
            return 0 if ok_count == len(self.results) else 1
            
        except KeyboardInterrupt:
            print("\n\n⚠️ Interrompu")
            return 0
        except Exception as e:
            print(f"\n❌ Erreur: {e}")
            import traceback
            traceback.print_exc()
            return 1
        finally:
            self.close_browser()
            self.stop_server()


def main():
    tester = URLNetworkConsoleTester()
    return tester.run()


if __name__ == '__main__':
    sys.exit(main())
