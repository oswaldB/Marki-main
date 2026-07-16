import subprocess
import time
import requests
import sys

def test():
    # Démarrer serveur
    proc = subprocess.Popen(
        ['python3', '-m', 'app'],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd='/home/ubuntu/marki/relance2'
    )
    time.sleep(4)
    
    try:
        base = 'http://localhost:5000'
        
        # Test routes
        routes = [
            '/sequences/seq-123',
            '/sequences/suivi/seq-456',
        ]
        
        print("Test des routes de détail:\n")
        for route in routes:
            url = f"{base}{route}"
            try:
                resp = requests.get(url, timeout=10)
                status = "✅ OK" if resp.status_code == 200 else f"❌ {resp.status_code}"
                print(f"  {route}: {status}")
            except Exception as e:
                print(f"  {route}: ❌ {e}")
        
        print("\nTest terminé!")
        
    finally:
        proc.terminate()
        proc.wait()

if __name__ == '__main__':
    test()
