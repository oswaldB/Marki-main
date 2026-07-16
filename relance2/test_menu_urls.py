#!/usr/bin/env python3
"""
Test toutes les URLs du menu sidebar
Vérifie que chaque lien répond correctement
"""

import requests
import sys

BASE_URL = 'http://localhost:5000'

# URLs extraites du menu
MENU_URLS = [
    ('/login', 'Login'),
    ('/dashboard', 'Dashboard'),
    ('/smart-marki', 'Smart Marki'),
    ('/evenements', 'Événements'),
    ('/impayes', 'Impayés'),
    ('/impayes-payeur', 'Impayés par Payeur'),
    ('/impayes-suspendus', 'Impayés Suspendus'),
    ('/relances', 'Relances'),
    ('/relances-calendrier', 'Calendrier'),
    ('/relances-validation', 'Validation'),
    ('/contacts', 'Contacts'),
    ('/sequences', 'Séquences'),
    ('/settings-smtp', 'SMTP'),
    ('/settings-utilisateurs', 'Utilisateurs'),
]

def test_url(path, name):
    """Test une URL"""
    url = f'{BASE_URL}{path}'
    try:
        resp = requests.get(url, timeout=10, allow_redirects=True)
        
        if resp.status_code == 200:
            return {'status': 'OK', 'code': 200, 'url': url}
        elif resp.status_code == 302 or resp.status_code == 301:
            return {'status': 'REDIRECT', 'code': resp.status_code, 'url': url, 'redirect': resp.url}
        else:
            return {'status': 'ERROR', 'code': resp.status_code, 'url': url}
    except Exception as e:
        return {'status': 'EXCEPTION', 'error': str(e), 'url': url}

def main():
    print("=" * 80)
    print("TEST DES URLS DU MENU SIDEBAR")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Nombre d'URLs à tester: {len(MENU_URLS)}")
    print()
    
    results = []
    ok_count = 0
    error_count = 0
    
    for i, (path, name) in enumerate(MENU_URLS, 1):
        result = test_url(path, name)
        results.append((name, path, result))
        
        status_icon = '✅' if result['status'] == 'OK' else '❌'
        if result['status'] == 'OK':
            ok_count += 1
        else:
            error_count += 1
        
        print(f"{i:2d}. {status_icon} {name:25s} {path:30s} → {result['status']} ({result.get('code', 'N/A')})")
    
    print()
    print("=" * 80)
    print("RÉSUMÉ")
    print("=" * 80)
    print(f"✅ OK:      {ok_count}/{len(MENU_URLS)}")
    print(f"❌ Erreurs: {error_count}/{len(MENU_URLS)}")
    
    if error_count > 0:
        print()
        print("Détails des erreurs:")
        for name, path, result in results:
            if result['status'] != 'OK':
                print(f"  - {name} ({path}): {result}")
    
    print()
    return 0 if error_count == 0 else 1

if __name__ == '__main__':
    sys.exit(main())
