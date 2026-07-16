#!/usr/bin/env python3
"""
Test complet de toutes les pages avec rapport détaillé des logs console.
Capture tous les types de logs (log, info, warn, error) pour chaque page.
"""

import subprocess
import time
import json
import sys
from datetime import datetime
from collections import defaultdict

BASE_URL = 'http://localhost:5000'


class ConsoleLogTester:
    def __init__(self):
        self.server_process = None
        self.results = []
        self.all_logs = defaultdict(list)
        
    def start_server(self):
        """Démarre le serveur Flask."""
        print("=" * 80)
        print("DÉMARRAGE DU SERVEUR FLASK")
        print("=" * 80)
        self.server_process = subprocess.Popen(
            ['python3', '-m', 'app'],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            cwd='/home/ubuntu/marki/relance2'
        )
        # Attendre que le serveur soit prêt
        time.sleep(5)
        print("✅ Serveur démarré sur http://localhost:5000\n")
        
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
        except ImportError as e:
            print(f"❌ Erreur: {e}")
            print("Installation requise:")
            print("  pip install playwright")
            print("  playwright install chromium")
            return False
    
    def close_browser(self):
        """Ferme le navigateur."""
        if hasattr(self, 'browser'):
            self.browser.close()
        if hasattr(self, 'playwright'):
            self.playwright.stop()
    
    def capture_page_logs(self, path, name, need_auth=False):
        """Capture tous les logs console d'une page."""
        url = f'{BASE_URL}{path}'
        
        print(f"\n{'─' * 80}")
        print(f"📄 TEST: {name}")
        print(f"   URL: {url}")
        print(f"{'─' * 80}")
        
        context = self.browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()
        
        # Stockage des logs
        page_logs = {
            'log': [],
            'info': [],
            'warn': [],
            'error': [],
            'debug': [],
            'all': []
        }
        
        def handle_console(msg):
            """Gère chaque message console."""
            entry = {
                'type': msg.type,
                'text': msg.text,
                'location': str(msg.location) if msg.location else None,
                'time': datetime.now().isoformat()
            }
            page_logs['all'].append(entry)
            
            if msg.type in page_logs:
                page_logs[msg.type].append(entry)
            
            # Afficher en temps réel les logs importants
            if 'WORKFLOW' in msg.text:
                short_text = msg.text[:70] + '...' if len(msg.text) > 70 else msg.text
                print(f"    🔄 [{msg.type.upper()}] {short_text}")
            elif msg.type == 'error':
                short_text = msg.text[:70] + '...' if len(msg.text) > 70 else msg.text
                print(f"    ❌ [ERROR] {short_text}")
        
        def handle_page_error(error):
            """Gère les erreurs page."""
            entry = {
                'type': 'page_error',
                'text': str(error),
                'time': datetime.now().isoformat()
            }
            page_logs['error'].append(entry)
            print(f"    ❌ [PAGE ERROR] {error}")
        
        # Attacher les listeners
        page.on("console", handle_console)
        page.on("pageerror", handle_page_error)
        
        try:
            # Navigation
            response = page.goto(url, wait_until='networkidle', timeout=15000)
            
            # Attendre Alpine.js et les workflows
            time.sleep(3)
            
            # Vérifier le statut
            status = response.status if response else 0
            
            # Vérifier Alpine.js
            has_alpine = page.evaluate('() => typeof Alpine !== "undefined"')
            
            # Résultat
            result = {
                'page': name,
                'path': path,
                'url': url,
                'status': status,
                'has_alpine': has_alpine,
                'logs': page_logs,
                'summary': {
                    'total': len(page_logs['all']),
                    'log': len(page_logs['log']),
                    'info': len(page_logs['info']),
                    'warn': len(page_logs['warn']),
                    'error': len(page_logs['error']),
                    'debug': len(page_logs['debug']),
                    'workflow_logs': len([l for l in page_logs['all'] if 'WORKFLOW' in l['text']])
                },
                'ok': status == 200 and len(page_logs['error']) == 0
            }
            
            # Affichage résumé
            s = result['summary']
            print(f"\n   📊 RÉSUMÉ:")
            print(f"      Status HTTP: {status}")
            print(f"      Alpine.js: {'✅' if has_alpine else '❌'}")
            print(f"      Total logs: {s['total']}")
            print(f"      🔄 Workflow logs: {s['workflow_logs']}")
            print(f"      ℹ️  Info: {s['info']} | ⚠️ Warn: {s['warn']} | ❌ Error: {s['error']}")
            
            if result['ok']:
                print(f"   ✅ Page OK")
            else:
                print(f"   ⚠️  Problèmes détectés")
            
            self.results.append(result)
            return result
            
        except Exception as e:
            print(f"   ❌ Exception: {e}")
            self.results.append({
                'page': name,
                'path': path,
                'error': str(e),
                'ok': False
            })
            return None
            
        finally:
            context.close()
    
    def generate_detailed_report(self):
        """Génère un rapport détaillé par page."""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        report_file = f'REPORT_CONSOLE_LOGS_{timestamp}.txt'
        json_file = f'REPORT_CONSOLE_LOGS_{timestamp}.json'
        
        print("\n" + "=" * 80)
        print("GÉNÉRATION DU RAPPORT DÉTAILLÉ")
        print("=" * 80)
        
        # Sauvegarder JSON
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump({
                'timestamp': datetime.now().isoformat(),
                'base_url': BASE_URL,
                'total_pages': len(self.results),
                'pages': self.results
            }, f, indent=2, ensure_ascii=False, default=str)
        
        print(f"📄 JSON: {json_file}")
        
        # Générer rapport texte
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write("=" * 80 + "\n")
            f.write("RAPPORT DES LOGS CONSOLE - MARKI\n")
            f.write("=" * 80 + "\n")
            f.write(f"Généré le: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"URL de base: {BASE_URL}\n")
            f.write(f"Pages testées: {len(self.results)}\n")
            f.write("=" * 80 + "\n\n")
            
            for result in self.results:
                f.write("\n" + "─" * 80 + "\n")
                f.write(f"PAGE: {result['page']}\n")
                f.write(f"URL: {result['url']}\n")
                f.write(f"Status: {result.get('status', 'N/A')}\n")
                f.write("─" * 80 + "\n\n")
                
                if 'summary' in result:
                    s = result['summary']
                    f.write("STATISTIQUES:\n")
                    f.write(f"  - Total logs: {s['total']}\n")
                    f.write(f"  - Log: {s['log']}\n")
                    f.write(f"  - Info: {s['info']}\n")
                    f.write(f"  - Warn: {s['warn']}\n")
                    f.write(f"  - Error: {s['error']}\n")
                    f.write(f"  - Workflow logs: {s['workflow_logs']}\n")
                    f.write(f"  - Alpine.js: {'Oui' if result.get('has_alpine') else 'Non'}\n\n")
                
                if 'logs' in result:
                    logs = result['logs']
                    
                    # Logs WORKFLOW
                    workflow_logs = [l for l in logs['all'] if 'WORKFLOW' in l['text']]
                    if workflow_logs:
                        f.write("🔄 LOGS WORKFLOW:\n")
                        for log in workflow_logs:
                            f.write(f"  [{log['type'].upper()}] {log['text']}\n")
                        f.write("\n")
                    
                    # Logs ERROR
                    if logs['error']:
                        f.write("❌ ERREURS:\n")
                        for log in logs['error']:
                            f.write(f"  [{log['time']}] {log['text']}\n")
                        f.write("\n")
                    
                    # Logs WARN
                    if logs['warn']:
                        f.write("⚠️  WARNINGS:\n")
                        for log in logs['warn']:
                            f.write(f"  [{log['type'].upper()}] {log['text'][:100]}\n")
                        f.write("\n")
                    
                    # Logs INFO (limité)
                    info_logs = [l for l in logs['info'] if 'WORKFLOW' not in l['text']]
                    if info_logs:
                        f.write("ℹ️  INFO (sélection):\n")
                        for log in info_logs[:10]:
                            f.write(f"  {log['text'][:100]}\n")
                        if len(info_logs) > 10:
                            f.write(f"  ... et {len(info_logs) - 10} autres\n")
                        f.write("\n")
        
        print(f"📄 TXT: {report_file}")
        
        return report_file, json_file
    
    def run(self):
        """Exécute tous les tests."""
        print("\n" + "=" * 80)
        print("TEST COMPLET DES LOGS CONSOLE - MARKI")
        print("=" * 80)
        print(f"Démarré à: {datetime.now().strftime('%H:%M:%S')}\n")
        
        # Démarrer le serveur
        self.start_server()
        
        try:
            # Initialiser le navigateur
            if not self.init_browser():
                return 1
            
            # Liste des pages à tester
            pages = [
                ('/login', 'Login', False),
                ('/dashboard', 'Dashboard', True),
                ('/impayes', 'Impayés', True),
                ('/contacts', 'Contacts', True),
                ('/relances', 'Relances', True),
                ('/sequences', 'Séquences', True),
                ('/evenements', 'Événements', True),
                ('/settings', 'Paramètres', True),
                ('/settings-smtp', 'SMTP', True),
                ('/settings-utilisateurs', 'Utilisateurs', True),
                ('/relances-calendrier', 'Calendrier', True),
                ('/relances-validation', 'Validation', True),
                ('/smart-marki', 'Smart Marki', True),
            ]
            
            print(f"\n{'=' * 80}")
            print(f"TEST DE {len(pages)} PAGES")
            print(f"{'=' * 80}")
            
            for i, (path, name, need_auth) in enumerate(pages, 1):
                print(f"\n{'▶' * 40}")
                print(f"[{i}/{len(pages)}] Test de {name}")
                print(f"{'▶' * 40}")
                self.capture_page_logs(path, name, need_auth)
            
            # Générer le rapport
            txt_file, json_file = self.generate_detailed_report()
            
            # Résumé final
            print("\n" + "=" * 80)
            print("RÉSUMÉ FINAL")
            print("=" * 80)
            
            total_ok = sum(1 for r in self.results if r.get('ok'))
            total_errors = sum(len(r.get('logs', {}).get('error', [])) for r in self.results if 'logs' in r)
            total_workflow = sum(r.get('summary', {}).get('workflow_logs', 0) for r in self.results if 'summary' in r)
            
            print(f"\n📊 Statistiques globales:")
            print(f"   Pages testées: {len(self.results)}")
            print(f"   Pages OK: {total_ok}/{len(self.results)}")
            print(f"   Pages avec erreurs: {len(self.results) - total_ok}")
            print(f"   Total erreurs JS: {total_errors}")
            print(f"   Total logs workflow: {total_workflow}")
            
            print(f"\n📁 Fichiers générés:")
            print(f"   📄 {txt_file}")
            print(f"   📄 {json_file}")
            
            print("\n" + "=" * 80)
            
            return 0 if total_ok == len(self.results) else 1
            
        except KeyboardInterrupt:
            print("\n\n⚠️ Interrompu par l'utilisateur")
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
    tester = ConsoleLogTester()
    return tester.run()


if __name__ == '__main__':
    sys.exit(main())
