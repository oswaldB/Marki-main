#!/usr/bin/env python3
"""
Test complet incluant les pages de détail séquences
Capture console logs + network pour toutes les pages
"""

import subprocess
import time
import json
import sys
from datetime import datetime
from collections import defaultdict

BASE_URL = 'http://localhost:5000'


class CompleteTester:
    def __init__(self):
        self.server_process = None
        self.results = []
        
    def start_server(self):
        print("=" * 100)
        print("DÉMARRAGE DU SERVEUR FLASK")
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
        print("\n[INFO] Arrêt du serveur...")
        if self.server_process:
            self.server_process.terminate()
            try:
                self.server_process.wait(timeout=5)
            except:
                self.server_process.kill()
    
    def init_browser(self):
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
        if hasattr(self, 'browser'):
            self.browser.close()
        if hasattr(self, 'playwright'):
            self.playwright.stop()
    
    def test_url(self, path, name):
        """Test une URL avec capture console + network."""
        url = f'{BASE_URL}{path}'
        
        print(f"\n{'─' * 100}")
        print(f"🌐 TEST: {name}")
        print(f"   {url}")
        print(f"{'─' * 100}")
        
        context = self.browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()
        
        # Stockage
        console_logs = []
        network_requests = []
        network_responses = []
        page_errors = []
        
        def handle_console(msg):
            entry = {
                'type': msg.type,
                'text': msg.text,
                'time': datetime.now().isoformat()
            }
            console_logs.append(entry)
            
            if 'WORKFLOW' in msg.text:
                short = msg.text[:80] + '...' if len(msg.text) > 80 else msg.text
                print(f"    🔄 [{msg.type}] {short}")
            elif msg.type == 'error':
                short = msg.text[:80] + '...' if len(msg.text) > 80 else msg.text
                print(f"    ❌ [ERROR] {short}")
        
        def handle_request(request):
            if '/api/' in request.url:
                network_requests.append({
                    'method': request.method,
                    'url': request.url.replace(BASE_URL, ''),
                    'time': datetime.now().isoformat()
                })
                short = request.url.replace(BASE_URL, '')
                print(f"    📤 → {request.method} {short}")
        
        def handle_response(response):
            if '/api/' in response.url:
                network_responses.append({
                    'status': response.status,
                    'url': response.url.replace(BASE_URL, ''),
                    'time': datetime.now().isoformat()
                })
                status_icon = '✅' if response.status < 400 else '❌'
                print(f"    📥 ← {status_icon} {response.status}")
        
        def handle_page_error(error):
            page_errors.append(str(error))
            print(f"    ❌ [PAGE ERROR] {error}")
        
        page.on("console", handle_console)
        page.on("request", handle_request)
        page.on("response", handle_response)
        page.on("pageerror", handle_page_error)
        
        try:
            response = page.goto(url, wait_until='networkidle', timeout=15000)
            time.sleep(3)
            
            status = response.status if response else 0
            
            # Compter
            workflow_logs = [l for l in console_logs if 'WORKFLOW' in l['text']]
            errors = [l for l in console_logs if l['type'] == 'error']
            api_requests = [r for r in network_requests]
            api_errors = [r for r in network_responses if r['status'] >= 400]
            
            result = {
                'name': name,
                'path': path,
                'url': url,
                'status': status,
                'console': {
                    'total': len(console_logs),
                    'workflow': len(workflow_logs),
                    'error': len(errors),
                    'logs': console_logs
                },
                'network': {
                    'api_requests': len(api_requests),
                    'api_errors': len(api_errors)
                },
                'page_errors': page_errors,
                'ok': status == 200 and len(errors) == 0 and len(api_errors) == 0 and len(page_errors) == 0
            }
            
            print(f"\n   📊 CONSOLE: {len(console_logs)} logs | {len(workflow_logs)} workflows | {len(errors)} errors")
            print(f"   📡 NETWORK: {len(api_requests)} API calls | {len(api_errors)} API errors")
            print(f"   🎯 STATUT: {'✅ OK' if result['ok'] else '❌ Erreurs'}")
            
            self.results.append(result)
            return result
            
        except Exception as e:
            print(f"   ❌ Exception: {e}")
            self.results.append({'name': name, 'path': path, 'error': str(e), 'ok': False})
            return None
        finally:
            context.close()
    
    def generate_report(self):
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        md_file = f'REPORT_COMPLETE_{timestamp}.md'
        json_file = f'REPORT_COMPLETE_{timestamp}.json'
        
        print("\n" + "=" * 100)
        print("GÉNÉRATION DU RAPPORT")
        print("=" * 100)
        
        # JSON
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump({
                'timestamp': datetime.now().isoformat(),
                'base_url': BASE_URL,
                'urls': self.results
            }, f, indent=2, default=str)
        
        print(f"📄 JSON: {json_file}")
        
        # Markdown
        with open(md_file, 'w', encoding='utf-8') as f:
            f.write("# Rapport Complet - Console & Network\n\n")
            f.write(f"**Date**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write(f"**URLs testées**: {len(self.results)}\n\n")
            
            # Tableau
            f.write("## 📊 Tableau Récapitulatif\n\n")
            f.write("| URL | Nom | HTTP | Console | Workflow | Error | API | Statut |\n")
            f.write("|-----|-----|------|---------|----------|-------|-----|--------|\n")
            
            for r in self.results:
                if 'console' in r:
                    c = r['console']
                    n = r['network']
                    status = '✅' if r.get('ok') else '❌'
                    f.write(f"| {r['path']} | {r['name']} | {r['status']} | {c['total']} | "
                           f"{c['workflow']} | {c['error']} | {n['api_requests']} | {status} |\n")
            
            f.write("\n---\n\n")
            
            # Détails
            f.write("## 🔍 Détails par URL\n\n")
            for r in self.results:
                f.write(f"### {r['name']}\n\n")
                f.write(f"- **Path**: `{r['path']}`\n")
                f.write(f"- **HTTP**: {r.get('status', 'N/A')}\n\n")
                
                if 'console' in r:
                    c = r['console']
                    f.write("**Console**:\n")
                    f.write(f"- Total: {c['total']}\n")
                    f.write(f"- Workflow: {c['workflow']}\n")
                    f.write(f"- Errors: {c['error']}\n\n")
                    
                    wf_logs = [l for l in c['logs'] if 'WORKFLOW' in l['text']]
                    if wf_logs:
                        f.write("Logs workflow:\n")
                        for log in wf_logs[:5]:
                            text = log['text'][:70]
                            f.write(f"- `{log['type']}` {text}...\n")
                        f.write("\n")
                
                f.write("---\n\n")
            
            # Résumé
            ok_count = sum(1 for r in self.results if r.get('ok'))
            total_wf = sum(r['console']['workflow'] for r in self.results if 'console' in r)
            total_err = sum(r['console']['error'] for r in self.results if 'console' in r)
            
            f.write("## 📈 Statistiques\n\n")
            f.write(f"- URLs: {len(self.results)}\n")
            f.write(f"- OK: {ok_count}/{len(self.results)}\n")
            f.write(f"- Workflow logs: {total_wf}\n")
            f.write(f"- Erreurs: {total_err}\n")
        
        print(f"📄 Markdown: {md_file}")
        return md_file, json_file
    
    def run(self):
        print("\n" + "=" * 100)
        print("TEST COMPLET AVEC PAGES DE DÉTAIL")
        print("=" * 100)
        
        self.start_server()
        
        try:
            if not self.init_browser():
                return 1
            
            # Toutes les URLs à tester
            urls = [
                ('/login', 'Login'),
                ('/dashboard', 'Dashboard'),
                ('/impayes', 'Impayés'),
                ('/contacts', 'Contacts'),
                ('/relances', 'Relances'),
                ('/sequences', 'Séquences'),
                ('/sequences/seq-test-123', 'Détail Séquence Relance'),
                ('/sequences/suivi/seq-test-456', 'Détail Séquence Suivi'),
                ('/evenements', 'Événements'),
                ('/settings', 'Paramètres'),
                ('/settings-smtp', 'SMTP'),
                ('/settings-utilisateurs', 'Utilisateurs'),
                ('/relances-calendrier', 'Calendrier'),
                ('/relances-validation', 'Validation'),
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
            
            # Résumé
            print("\n" + "=" * 100)
            print("RÉSUMÉ FINAL")
            print("=" * 100)
            
            ok_count = sum(1 for r in self.results if r.get('ok'))
            total_wf = sum(r['console']['workflow'] for r in self.results if 'console' in r)
            
            print(f"\n📊 Statistiques:")
            print(f"   URLs testées: {len(self.results)}")
            print(f"   ✅ URLs OK: {ok_count}/{len(self.results)}")
            print(f"   🔄 Workflow logs: {total_wf}")
            print(f"   ❌ Erreurs: {len(self.results) - ok_count}")
            
            print(f"\n📁 Fichiers:")
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
    tester = CompleteTester()
    return tester.run()


if __name__ == '__main__':
    sys.exit(main())
