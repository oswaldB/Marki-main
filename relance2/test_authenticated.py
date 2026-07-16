#!/usr/bin/env python3
"""
Script de test avec authentification JWT
Teste les pages et API protégées avec un token valide.
"""

import subprocess
import time
import json
import sys
import os
from datetime import datetime
import requests

BASE_URL = 'http://localhost:5000'

class AuthenticatedTester:
    def __init__(self):
        self.token = None
        self.headers = {}
        self.server_process = None
        self.session = requests.Session()
    
    def start_server(self):
        """Démarre le serveur Flask."""
        print("[INFO] Démarrage du serveur Flask...")
        self.server_process = subprocess.Popen(
            ['python3', '-m', 'app'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd='/home/ubuntu/marki/relance2'
        )
        time.sleep(4)
        print("[INFO] Serveur démarré")
    
    def stop_server(self):
        """Arrête le serveur."""
        print("[INFO] Arrêt du serveur...")
        if self.server_process:
            self.server_process.terminate()
            self.server_process.wait()
    
    def login(self, username='admin', password='admin'):
        """Authentification et récupération du token."""
        print(f"\n[AUTH] Connexion avec {username}...")
        
        try:
            response = self.session.post(
                f"{BASE_URL}/api/auth/login",
                json={'username': username, 'password': password},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.token = data.get('token')
                    self.headers = {'Authorization': f'Bearer {self.token}'}
                    print(f"  ✅ Connecté - Token: {self.token[:30]}...")
                    return True
                else:
                    print(f"  ❌ Échec: {data.get('error')}")
                    return False
            else:
                print(f"  ❌ HTTP {response.status_code}")
                return False
                
        except Exception as e:
            print(f"  ❌ Exception: {e}")
            return False
    
    def test_api_protected(self, endpoint, method='GET', data=None):
        """Test une API protégée."""
        url = f"{BASE_URL}{endpoint}"
        print(f"\n[API] {method} {endpoint}")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=self.headers, timeout=10)
            elif method == 'POST':
                response = self.session.post(url, headers=self.headers, json=data, timeout=10)
            elif method == 'PUT':
                response = self.session.put(url, headers=self.headers, json=data, timeout=10)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=self.headers, timeout=10)
            
            print(f"  Status: {response.status_code}")
            
            try:
                resp_data = response.json()
                if response.status_code == 200:
                    print(f"  ✅ Succès")
                    if 'data' in resp_data:
                        if isinstance(resp_data['data'], list):
                            print(f"  📊 {len(resp_data['data'])} éléments")
                        elif isinstance(resp_data['data'], dict):
                            print(f"  📊 Objet reçu")
                else:
                    print(f"  ❌ Erreur: {resp_data.get('error', 'Unknown')}")
                return resp_data
            except:
                print(f"  ⚠️  Réponse non-JSON")
                return {'raw': response.text}
                
        except Exception as e:
            print(f"  ❌ Exception: {e}")
            return {'error': str(e)}
    
    def test_page_with_auth(self, path):
        """Test une page avec authentification."""
        url = f"{BASE_URL}{path}"
        print(f"\n[PAGE] {path}")
        
        try:
            response = self.session.get(url, headers=self.headers, timeout=10)
            print(f"  Status: {response.status_code}")
            
            if response.status_code == 200:
                content = response.text
                checks = []
                
                if 'x-data' in content:
                    checks.append("✅ Alpine.js x-data")
                else:
                    checks.append("❌ Pas de x-data")
                
                if '{% include' in content:
                    checks.append("✅ Templates Jinja2")
                
                if 'crypto.randomUUID' in content:
                    checks.append("✅ Logging UUID")
                
                print(f"  {' | '.join(checks)}")
                print(f"  📏 {len(content)} caractères")
                return True
            else:
                print(f"  ❌ HTTP {response.status_code}")
                return False
                
        except Exception as e:
            print(f"  ❌ Exception: {e}")
            return False
    
    def run_all_tests(self):
        """Exécute tous les tests."""
        print("=" * 70)
        print("TEST AVEC AUTHENTIFICATION")
        print("=" * 70)
        
        # Connexion
        if not self.login():
            print("\n❌ Impossible de se connecter. Arrêt.")
            return 1
        
        # Test /api/me
        print("\n" + "-" * 70)
        print("Test profil utilisateur")
        print("-" * 70)
        self.test_api_protected('/api/auth/me')
        
        # Tests API CRUD
        print("\n" + "-" * 70)
        print("Test APIs CRUD")
        print("-" * 70)
        
        apis = [
            ('/api/contacts', 'GET'),
            ('/api/impayes', 'GET'),
            ('/api/relances', 'GET'),
            ('/api/sequences', 'GET'),
            ('/api/events', 'GET'),
            ('/api/dashboard/stats', 'GET'),
        ]
        
        for endpoint, method in apis:
            self.test_api_protected(endpoint, method)
        
        # Test création
        print("\n" + "-" * 70)
        print("Test création (POST)")
        print("-" * 70)
        
        new_contact = {
            'nom': 'Test',
            'prenom': 'Utilisateur',
            'email': f'test_{int(time.time())}@example.com'
        }
        self.test_api_protected('/api/contacts', 'POST', new_contact)
        
        # Tests pages HTML
        print("\n" + "-" * 70)
        print("Test Pages HTML")
        print("-" * 70)
        
        pages = [
            '/dashboard',
            '/impayes',
            '/contacts',
            '/relances',
            '/sequences',
            '/evenements',
            '/settings',
        ]
        
        for page in pages:
            self.test_page_with_auth(page)
        
        print("\n" + "=" * 70)
        print("TESTS TERMINÉS")
        print("=" * 70)
        
        return 0


def main():
    tester = AuthenticatedTester()
    
    try:
        tester.start_server()
        return tester.run_all_tests()
    except KeyboardInterrupt:
        print("\n\n[INFO] Interrompu par l'utilisateur")
        return 0
    finally:
        tester.stop_server()


if __name__ == '__main__':
    sys.exit(main())
