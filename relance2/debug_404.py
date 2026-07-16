import subprocess
import time
from playwright.sync_api import sync_playwright

BASE_URL = 'http://localhost:5000'

def start_server():
    proc = subprocess.Popen(
        ['python3', '-m', 'app'],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        cwd='/home/ubuntu/marki/relance2'
    )
    time.sleep(5)
    return proc

def stop_server(proc):
    proc.terminate()
    proc.wait()

def test():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
        context = browser.new_context()
        page = context.new_page()
        
        all_404s = []
        
        def handle_response(response):
            if response.status == 404:
                url = response.url
                all_404s.append(url)
                print(f"❌ 404: {url}")
        
        page.on("response", handle_response)
        
        # Test toutes les pages
        pages = ['/login', '/dashboard', '/impayes', '/contacts', '/settings']
        
        for path in pages:
            print(f"\n{'='*60}")
            print(f"Testing: {path}")
            print(f"{'='*60}")
            page.goto(f'{BASE_URL}{path}', wait_until='networkidle', timeout=10000)
            time.sleep(2)
        
        browser.close()
        
        print(f"\n\n{'='*60}")
        print("TOUTES LES ERREURS 404:")
        print(f"{'='*60}")
        for url in set(all_404s):
            print(f"  - {url}")

server = start_server()
try:
    test()
finally:
    stop_server(server)
