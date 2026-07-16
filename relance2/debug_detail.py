import subprocess
import time
from playwright.sync_api import sync_playwright

BASE_URL = 'http://localhost:5000'

def test():
    proc = subprocess.Popen(
        ['python3', '-m', 'app'],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        cwd='/home/ubuntu/marki/relance2'
    )
    time.sleep(4)
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
        page = browser.new_page()
        
        page.on("console", lambda msg: print(f"  [{msg.type}] {msg.text}"))
        page.on("pageerror", lambda err: print(f"  [PAGE ERROR] {err}"))
        
        print("=== /sequences/seq-test-123 ===")
        page.goto(f'{BASE_URL}/sequences/seq-test-123', wait_until='networkidle', timeout=15000)
        time.sleep(2)
        
        browser.close()
    
    proc.terminate()
    proc.wait()

test()
