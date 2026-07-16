#!/usr/bin/env python3
"""Debug pour identifier l'URL 404 exacte"""

import subprocess
import time
import sys

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
    from playwright.sync_api import sync_playwright
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
        context = browser.new_context()
        page = context.new_page()
        
        errors_404 = []
        
        def handle_console(msg):
            if msg.type == 'error' and '404' in msg.text:
                print(f"❌ CONSOLE ERROR: {msg.text}")
                print(f"   Location: {msg.location}")
        
        def handle_response(response):
            if response.status == 404:
                url = response.url
                errors_404.append(url)
                print(f"❌ HTTP 404: {url}")
        
        page.on("console", handle_console)
        page.on("response", handle_response)
        
        # Test quelques pages
        pages = ['/login', '/dashboard', '/impayes']
        
        for path in pages:
            print(f"\n{'='*60}")
            print(f"Testing: {path}")
            print(f"{'='*60}")
            errors_404.clear()
            
            page.goto(f'{BASE_URL}{path}', wait_until='networkidle', timeout=10000)
            time.sleep(2)
            
            if errors_404:
                print(f"\n404s found on {path}:")
                for url in errors_404:
                    print(f"  - {url}")
            else:
                print(f"\n✅ No 404s on {path}")
        
        browser.close()

if __name__ == '__main__':
    server = start_server()
    try:
        test()
    finally:
        stop_server(server)
