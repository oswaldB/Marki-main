import asyncio
import json
from playwright.async_api import async_playwright

async def run_scenario():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        
        # Collecte des logs
        console_logs = []
        page.on('console', lambda msg: console_logs.append((msg.type, msg.text)))
        page.on('pageerror', lambda err: console_logs.append(('error', str(err))))
        
        # Exécution des actions
        
        await page.wait_for_timeout(2000)
        
        # Vérifications
        results = {
            'console_logs': [log for _, log in console_logs],
            'verifications': []
        }
        
        
        await browser.close()
        return results

result = asyncio.run(run_scenario())
print(json.dumps(result, indent=2, ensure_ascii=False))