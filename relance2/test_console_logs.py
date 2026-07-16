#!/usr/bin/env python3
"""
Capture des console logs avec Playwright
Teste les pages et capture les logs JavaScript côté client.
"""

import subprocess
import time
import json
import sys
from datetime import datetime


def start_server():
    """Démarre le serveur Flask."""
    print("[INFO] Démarrage du serveur Flask...")
    process = subprocess.Popen(
        ['python3', '-m', 'app'],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd='/home/ubuntu/marki/relance2'
    )
    time.sleep(4)
    return process


def stop_server(process):
    """Arrête le serveur."""
    print("[INFO] Arrêt du serveur...")
    process.terminate()
    process.wait()


def test_with_playwright():
    """Test avec Playwright pour capturer les logs."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("[ERROR] Playwright non installé")
        print("Installation: pip install playwright && playwright install chromium")
        return None
    
    results = []
    
    pages = [
        ('http://localhost:5000/login', 'Login'),
        ('http://localhost:5000/dashboard', 'Dashboard'),
        ('http://localhost:5000/impayes', 'Impayes'),
        ('http://localhost:5000/contacts', 'Contacts'),
        ('http://localhost:5000/relances', 'Relances'),
        ('http://localhost:5000/sequences', 'Sequences'),
    ]
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        for url, name in pages:
            print(f"\n[TEST] {name} - {url}")
            
            page = browser.new_page()
            logs = []
            errors = []
            
            # Capture des logs console
            page.on("console", lambda msg: logs.append({
                'type': msg.type,
                'text': msg.text,
                'location': msg.location
            }))
            
            # Capture des erreurs page
            page.on("pageerror", lambda err: errors.append(str(err)))
            
            try:
                response = page.goto(url, timeout=10000)
                
                # Attendre le chargement Alpine.js
                time.sleep(2)
                
                print(f"  Status: {response.status if response else 'N/A'}")
                print(f"  Logs: {len(logs)}")
                print(f"  Erreurs: {len(errors)}")
                
                # Afficher les logs importants
                workflow_logs = [l for l in logs if 'WORKFLOW' in l['text']]
                if workflow_logs:
                    print(f"  📋 Logs workflow: {len(workflow_logs)}")
                    for log in workflow_logs[:3]:
                        print(f"    [{log['type']}] {log['text'][:100]}")
                
                if errors:
                    print(f"  ❌ Erreurs JS:")
                    for err in errors[:3]:
                        print(f"    - {err[:100]}")
                
                results.append({
                    'page': name,
                    'url': url,
                    'status': response.status if response else 0,
                    'logs_count': len(logs),
                    'workflow_logs': len(workflow_logs),
                    'errors': errors,
                    'ok': len(errors) == 0
                })
                
            except Exception as e:
                print(f"  ❌ Exception: {e}")
                results.append({
                    'page': name,
                    'url': url,
                    'error': str(e),
                    'ok': False
                })
            finally:
                page.close()
        
        browser.close()
    
    return results


def test_api_with_curl():
    """Test les API avec curl et capture les réponses."""
    print("\n" + "=" * 70)
    print("TEST API AVEC CURL")
    print("=" * 70)
    
    # D'abord login pour obtenir le token
    login_cmd = [
        'curl', '-s', '-X', 'POST',
        'http://localhost:5000/api/auth/login',
        '-H', 'Content-Type: application/json',
        '-d', '{"username":"admin","password":"admin"}'
    ]
    
    result = subprocess.run(login_cmd, capture_output=True, text=True)
    
    try:
        login_data = json.loads(result.stdout)
        if login_data.get('success'):
            token = login_data.get('token')
            print(f"✅ Connecté - Token: {token[:30]}...")
        else:
            print(f"❌ Échec connexion: {login_data}")
            return []
    except:
        print(f"❌ Réponse invalide: {result.stdout[:200]}")
        return []
    
    # Tester les API avec le token
    apis = [
        ('/api/auth/me', 'GET'),
        ('/api/contacts', 'GET'),
        ('/api/impayes', 'GET'),
        ('/api/relances', 'GET'),
        ('/api/sequences', 'GET'),
        ('/api/events', 'GET'),
    ]
    
    results = []
    
    for endpoint, method in apis:
        print(f"\n[API] {method} {endpoint}")
        
        cmd = [
            'curl', '-s', '-X', method,
            f'http://localhost:5000{endpoint}',
            '-H', f'Authorization: Bearer {token}',
            '-H', 'Content-Type: application/json'
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        try:
            data = json.loads(result.stdout)
            if 'data' in data:
                count = len(data['data']) if isinstance(data['data'], list) else 1
                print(f"  ✅ {count} éléments")
                results.append({'endpoint': endpoint, 'ok': True, 'count': count})
            else:
                print(f"  ⚠️  Réponse: {data}")
                results.append({'endpoint': endpoint, 'ok': True})
        except:
            print(f"  ⚠️  Réponse non-JSON: {result.stdout[:100]}")
            results.append({'endpoint': endpoint, 'ok': False})
    
    return results


def main():
    """Fonction principale."""
    print("=" * 70)
    print("TEST CONSOLE LOGS & API PROTÉGÉES")
    print("=" * 70)
    
    server = start_server()
    
    try:
        # Test API avec curl + auth
        api_results = test_api_with_curl()
        
        # Test pages avec Playwright (console logs)
        print("\n" + "=" * 70)
        print("TEST PAGES (PLAYWRIGHT)")
        print("=" * 70)
        
        page_results = test_with_playwright()
        
        # Résumé
        print("\n" + "=" * 70)
        print("RÉCAPITULATIF")
        print("=" * 70)
        
        if api_results:
            ok_apis = sum(1 for r in api_results if r.get('ok'))
            print(f"\nAPIs: {ok_apis}/{len(api_results)} OK")
        
        if page_results:
            ok_pages = sum(1 for r in page_results if r.get('ok'))
            print(f"Pages: {ok_pages}/{len(page_results)} OK")
            
            # Sauvegarder le rapport
            report = {
                'timestamp': datetime.now().isoformat(),
                'apis': api_results,
                'pages': page_results
            }
            
            with open('TEST_CONSOLE_REPORT.json', 'w') as f:
                json.dump(report, f, indent=2, default=str)
            
            print(f"\nRapport sauvegardé: TEST_CONSOLE_REPORT.json")
        
        return 0
        
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        return 1
    finally:
        stop_server(server)


if __name__ == '__main__':
    sys.exit(main())
