#!/usr/bin/env python3
"""
Script d'audit - Verification des erreurs console et reseau
pour chaque page de l'application Marki.
"""

import subprocess
import time
import json
import sys
from datetime import datetime


def start_server():
    """Demarre le serveur Flask en arriere-plan."""
    print("[INFO] Demarrage du serveur Flask...")
    process = subprocess.Popen(
        ['bash', '-c', 'source venv/bin/activate && python3 -m app'],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd='/home/ubuntu/marki/relance2'
    )
    time.sleep(3)
    return process


def stop_server(process):
    """Arrete le serveur Flask."""
    print("[INFO] Arret du serveur...")
    process.terminate()
    process.wait()


def test_page_with_curl(url, page_name):
    """Teste une page avec curl et verifie les erreurs."""
    print(f"\n[TEST] {page_name} - {url}")
    
    try:
        result = subprocess.run(
            ['curl', '-s', '-o', '/tmp/page.html', '-w', '%{http_code}', 
             '-H', 'Accept: text/html', url],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        http_code = result.stdout.strip()
        print(f"  HTTP Status: {http_code}")
        
        if http_code != '200':
            return {
                'page': page_name,
                'url': url,
                'status': 'ERROR',
                'http_code': http_code,
                'errors': [f'HTTP {http_code}']
            }
        
        with open('/tmp/page.html', 'r') as f:
            content = f.read()
        
        errors = []
        warnings = []
        
        if 'x-data' not in content:
            warnings.append("Pas d'attribut x-data Alpine.js")
        
        if 'x-init' not in content:
            warnings.append("Pas d'attribut x-init Alpine.js")
        
        if '<script' not in content:
            warnings.append("Pas de balises script")
        
        if 'console.error' in content.lower():
            warnings.append("Presence de console.error dans le HTML")
        
        if '{%' not in content:
            warnings.append("Pas de directives Jinja2 detectees")
        
        if errors:
            status = 'ERROR'
        elif warnings:
            status = 'WARNING'
        else:
            status = 'OK'
        
        return {
            'page': page_name,
            'url': url,
            'status': status,
            'http_code': http_code,
            'errors': errors,
            'warnings': warnings,
            'content_length': len(content)
        }
        
    except subprocess.TimeoutExpired:
        return {
            'page': page_name,
            'url': url,
            'status': 'TIMEOUT',
            'http_code': 'N/A',
            'errors': ['Timeout apres 10s']
        }
    except Exception as e:
        return {
            'page': page_name,
            'url': url,
            'status': 'EXCEPTION',
            'http_code': 'N/A',
            'errors': [str(e)]
        }


def test_api_endpoint(url, endpoint_name):
    """Teste un endpoint API."""
    print(f"\n[TEST API] {endpoint_name} - {url}")
    
    try:
        result = subprocess.run(
            ['curl', '-s', '-o', '/tmp/response.json', '-w', '%{http_code}',
             '-H', 'Content-Type: application/json', url],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        http_code = result.stdout.strip()
        print(f"  HTTP Status: {http_code}")
        
        try:
            with open('/tmp/response.json', 'r') as f:
                content = f.read()
            json.loads(content)
            is_json = True
        except:
            is_json = False
        
        return {
            'endpoint': endpoint_name,
            'url': url,
            'http_code': http_code,
            'is_json': is_json,
            'status': 'OK' if http_code in ['200', '401'] else 'ERROR'
        }
        
    except Exception as e:
        return {
            'endpoint': endpoint_name,
            'url': url,
            'http_code': 'N/A',
            'status': 'ERROR',
            'errors': [str(e)]
        }


def main():
    """Fonction principale."""
    print("=" * 70)
    print("AUDIT SERVEUR - Verification des pages et erreurs")
    print("=" * 70)
    print(f"Date: {datetime.now().isoformat()}")
    print()
    
    server_process = start_server()
    
    try:
        base_url = 'http://localhost:5000'
        
        pages = [
            ('/', 'Home'),
            ('/login', 'Login'),
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
        
        apis = [
            ('/api/hello', 'API Hello'),
            ('/api/auth/me', 'API Auth Me'),
            ('/api/contacts', 'API Contacts'),
            ('/api/impayes', 'API Impayes'),
            ('/api/relances', 'API Relances'),
            ('/api/sequences', 'API Sequences'),
            ('/api/events', 'API Events'),
            ('/api/dashboard/stats', 'API Dashboard Stats'),
        ]
        
        results = {
            'timestamp': datetime.now().isoformat(),
            'pages': [],
            'apis': []
        }
        
        print("\n" + "=" * 70)
        print("TEST DES PAGES")
        print("=" * 70)
        
        for path, name in pages:
            url = base_url + path
            result = test_page_with_curl(url, name)
            results['pages'].append(result)
        
        print("\n" + "=" * 70)
        print("TEST DES APIs")
        print("=" * 70)
        
        for path, name in apis:
            url = base_url + path
            result = test_api_endpoint(url, name)
            results['apis'].append(result)
        
        print("\n" + "=" * 70)
        print("RAPPORT RECAPITULATIF")
        print("=" * 70)
        
        ok_pages = sum(1 for r in results['pages'] if r['status'] == 'OK')
        warning_pages = sum(1 for r in results['pages'] if r['status'] == 'WARNING')
        error_pages = sum(1 for r in results['pages'] if r['status'] in ['ERROR', 'TIMEOUT', 'EXCEPTION'])
        
        ok_apis = sum(1 for r in results['apis'] if r['status'] == 'OK')
        error_apis = sum(1 for r in results['apis'] if r['status'] == 'ERROR')
        
        print(f"\nPages: {ok_pages} OK, {warning_pages} WARNING, {error_pages} ERROR")
        print(f"APIs: {ok_apis} OK, {error_apis} ERROR")
        
        report_file = '/home/ubuntu/marki/relance2/AUDIT_SERVEUR.json'
        with open(report_file, 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"\nRapport detaille sauvegarde dans: {report_file}")
        
        if error_pages > 0 or error_apis > 0:
            print("\n" + "=" * 70)
            print("ERREURS DETECTEES")
            print("=" * 70)
            
            for r in results['pages']:
                if r['status'] in ['ERROR', 'TIMEOUT', 'EXCEPTION']:
                    print(f"\n❌ {r['page']} ({r['url']})")
                    for err in r.get('errors', []):
                        print(f"   - {err}")
            
            for r in results['apis']:
                if r['status'] == 'ERROR':
                    print(f"\n❌ {r['endpoint']} ({r['url']})")
                    print(f"   HTTP {r.get('http_code', 'N/A')}")
        
        if warning_pages > 0:
            print("\n" + "=" * 70)
            print("WARNINGS")
            print("=" * 70)
            
            for r in results['pages']:
                if r['status'] == 'WARNING' and r.get('warnings'):
                    print(f"\n⚠️  {r['page']}")
                    for warn in r['warnings'][:5]:
                        print(f"   - {warn}")
        
        print("\n" + "=" * 70)
        print("AUDIT TERMINE")
        print("=" * 70)
        
        return 0 if (error_pages == 0 and error_apis == 0) else 1
        
    finally:
        stop_server(server_process)


if __name__ == '__main__':
    sys.exit(main())
