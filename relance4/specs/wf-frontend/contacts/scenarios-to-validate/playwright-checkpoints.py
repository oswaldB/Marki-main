#!/usr/bin/env python3
"""
Test Playwright pour valider les checkpoints console du workflow contacts-initial-load
"""

import asyncio
import sys
from playwright.async_api import async_playwright

BASE_URL = "http://localhost:5000"
EXPECTED_CHECKPOINTS = [
    "[CHECKPOINT] contacts-workflow-loaded",
    "[CHECKPOINT] state-initialized",
    "[CHECKPOINT] skeleton-shown",
    "[CHECKPOINT] contacts-fetched",
    "[CHECKPOINT] stats-fetched"
]

async def test_contacts_page():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()
        
        # Collecter les logs console
        console_logs = []
        page.on("console", lambda msg: console_logs.append(msg.text))
        
        # Naviguer vers la page contacts
        print(f"[TEST] Navigation vers {BASE_URL}/contacts")
        response = await page.goto(f"{BASE_URL}/contacts")
        
        if response.status >= 400:
            print(f"[FAIL] HTTP {response.status}")
            await browser.close()
            return False
        
        print(f"[PASS] Page chargée (HTTP {response.status})")
        
        # Attendre que Alpine.js s'initialise et les données chargent
        await page.wait_for_timeout(3000)
        
        # Vérifier que la page contient les éléments principaux
        print("\n[TEST] Vérification éléments DOM...")
        
        # Vérifier le titre
        title = await page.title()
        if "Contacts" in title:
            print(f"[PASS] Titre: {title}")
        else:
            print(f"[WARN] Titre inattendu: {title}")
        
        # Vérifier le contenu Alpine
        has_contacts_data = await page.evaluate("""
            () => {
                const el = document.querySelector('[x-data="contactsPage()"]');
                return el !== null;
            }
        """)
        
        if has_contacts_data:
            print("[PASS] Alpine.js data attribute présent")
        else:
            print("[FAIL] Alpine.js data attribute manquant")
            await browser.close()
            return False
        
        # Vérifier les checkpoints console
        print("\n[TEST] Vérification checkpoints console...")
        logs_text = "\n".join(console_logs)
        print(f"Logs capturés ({len(console_logs)} messages):")
        for log in console_logs:
            print(f"  - {log[:100]}")
        
        all_checkpoints_found = True
        for checkpoint in EXPECTED_CHECKPOINTS:
            if checkpoint in logs_text:
                print(f"[PASS] {checkpoint}")
            else:
                print(f"[MISSING] {checkpoint}")
                all_checkpoints_found = False
        
        await browser.close()
        
        if all_checkpoints_found:
            print("\n=== TOUS LES CHECKPOINTS TROUVÉS ===")
            return True
        else:
            print("\n=== CERTAINS CHECKPOINTS MANQUANTS ===")
            return False

if __name__ == "__main__":
    result = asyncio.run(test_contacts_page())
    sys.exit(0 if result else 1)
