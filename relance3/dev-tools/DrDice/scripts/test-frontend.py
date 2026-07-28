#!/usr/bin/env python3
"""
scripts/test-frontend.py
Capture les logs console d'une page avec Playwright (Python)
Usage: test-frontend.py <url> <screenshot_path> <log_file>
"""

import asyncio
import json
import sys
from datetime import datetime
from pathlib import Path

# Token JWT de test (hardcodé)
TEST_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test"


def log_info(msg: str):
    print(f"ℹ️  {msg}")


def log_error(msg: str):
    print(f"❌ {msg}")


def log_success(msg: str):
    print(f"✅ {msg}")


async def test_page(url: str, screenshot_path: str, log_file: str, wait_ms: int = 3000) -> bool:
    """Test une page et capture les logs console."""
    
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        log_error("Playwright non installé. Installe-le avec: pip install playwright")
        log_info("Puis: playwright install chromium")
        return False
    
    logs = {
        "url": url,
        "timestamp": datetime.now().isoformat(),
        "console": [],
        "errors": [],
        "screenshot": screenshot_path,
        "test_token": TEST_TOKEN
    }
    
    async with async_playwright() as p:
        try:
            browser = await p.chromium.launch(headless=True)
        except Exception as e:
            log_error(f"Impossible de lancer Chromium: {e}")
            log_info("Essayez: playwright install chromium")
            return False
        
        # Créer un contexte avec le token JWT dans les headers
        context = await browser.new_context(
            extra_http_headers={
                'Authorization': f'Bearer {TEST_TOKEN}'
            }
        )
        
        page = await context.new_page()
        
        # Capturer tous les messages console
        async def handle_console(msg):
            entry = {
                "type": msg.type,
                "text": msg.text,
                "timestamp": datetime.now().isoformat()
            }
            logs["console"].append(entry)
            print(f"[CONSOLE {msg.type}] {msg.text[:100]}{'...' if len(msg.text) > 100 else ''}")
            
            # Considérer warnings et errors comme des erreurs
            if msg.type in ["error", "warning"]:
                logs["errors"].append({
                    "source": "console",
                    "type": msg.type,
                    "message": msg.text,
                    "timestamp": datetime.now().isoformat()
                })
        
        page.on("console", handle_console)
        
        # Capturer les erreurs de page (JS non catchées)
        async def handle_page_error(error):
            entry = {
                "source": "pageerror",
                "message": str(error),
                "timestamp": datetime.now().isoformat()
            }
            logs["errors"].append(entry)
            print(f"[PAGE ERROR] {error}")
        
        page.on("pageerror", handle_page_error)
        
        # Capturer les erreurs réseau (404, 500, etc.)
        async def handle_response(response):
            if response.status >= 400:
                entry = {
                    "source": "network",
                    "type": "error",
                    "url": response.url,
                    "status": response.status,
                    "status_text": response.status_text,
                    "timestamp": datetime.now().isoformat()
                }
                logs["errors"].append(entry)
                print(f"[NETWORK ERROR] {response.status} {response.url}")
        
        page.on("response", handle_response)
        
        # Capturer les requêtes échouées
        async def handle_request_failed(request):
            entry = {
                "source": "network",
                "type": "request_failed",
                "url": request.url,
                "failure": str(request.failure),
                "timestamp": datetime.now().isoformat()
            }
            logs["errors"].append(entry)
            print(f"[REQUEST FAILED] {request.url} - {request.failure}")
        
        page.on("requestfailed", handle_request_failed)
        
        try:
            # Charger la page
            log_info(f"Chargement de {url}...")
            response = await page.goto(url, wait_until="networkidle", timeout=15000)
            
            if response:
                logs["http_status"] = response.status
                if response.status != 200:
                    log_error(f"HTTP {response.status}")
            
            # Attendre que les workflows Alpine.js s'initialisent
            log_info(f"Attente {wait_ms}ms pour logs...")
            await page.wait_for_timeout(wait_ms)
            
            # Attendre un peu plus pour les erreurs réseau tardives
            await asyncio.sleep(2)
            
            # Vérifier si Alpine.js est présent
            alpine_present = await page.evaluate("() => typeof Alpine !== 'undefined'")
            logs["alpine_detected"] = alpine_present
            if alpine_present:
                log_success("Alpine.js détecté")
            else:
                log_error("Alpine.js non détecté")
            
            # Prendre une capture d'écran
            screenshot_dir = Path(screenshot_path).parent
            screenshot_dir.mkdir(parents=True, exist_ok=True)
            
            await page.screenshot(path=screenshot_path, full_page=True)
            log_success(f"Screenshot: {screenshot_path}")
            
            logs["status"] = "success"
            
        except Exception as e:
            logs["status"] = "error"
            logs["errors"].append({
                "type": "navigation",
                "message": str(e),
                "timestamp": datetime.now().isoformat()
            })
            log_error(f"Erreur: {e}")
            
            # Capture d'écran même en cas d'erreur
            try:
                await page.screenshot(path=screenshot_path, full_page=True)
            except:
                pass
        
        await context.close()
        await browser.close()
    
    # Sauvegarder les logs
    log_dir = Path(log_file).parent
    log_dir.mkdir(parents=True, exist_ok=True)
    
    with open(log_file, 'w') as f:
        json.dump(logs, f, indent=2)
    
    print(f"\n{'='*50}")
    log_success(f"Test terminé: {url}")
    print(f"   📸 Screenshot: {screenshot_path}")
    print(f"   📝 Logs: {log_file}")
    print(f"   💬 Console: {len(logs['console'])} messages")
    print(f"   ❌ Erreurs: {len(logs['errors'])}")
    print(f"   🔐 Token test: {TEST_TOKEN[:20]}...")
    print(f"{'='*50}")
    
    return len(logs["errors"]) == 0


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: test-frontend.py <url> <screenshot_path> <log_file> [wait_ms]")
        print("")
        print("Exemple:")
        print('  test-frontend.py "http://localhost:5000/hello" "app/hello/logs/test.png" "app/hello/logs/test.json" 10000')
        sys.exit(1)
    
    url = sys.argv[1]
    screenshot_path = sys.argv[2]
    log_file = sys.argv[3]
    wait_ms = int(sys.argv[4]) if len(sys.argv) > 4 else 3000
    
    success = asyncio.run(test_page(url, screenshot_path, log_file, wait_ms))
    sys.exit(0 if success else 1)
