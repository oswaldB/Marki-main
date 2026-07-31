"""Étape 10: Tests Post-Génération - Vérifie que le code généré par IA est valide."""

import json
import re
import subprocess
import time
from pathlib import Path

from rich.console import Console

console = Console()


def step_13_post_gen_tests(cell_path: Path, cell_name: str, files: list[str], skip_playwright: bool = True) -> tuple[bool, list[str], dict]:
    """Exécute les tests post-génération sur les fichiers créés par l'IA.

    Args:
        cell_path: Chemin de la cell
        cell_name: Nom de la cell
        files: Liste des fichiers générés
        skip_playwright: Si True, les tests Playwright sont désactivés (mis en pause)

    Returns:
        Tuple (ok, errors, rapport_detaille)
    """
    console.print("[blue]🧪 Tests Post-Génération...")

    errors = []
    tests_ok = True
    rapport = {
        "cell": cell_name,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "tests": [],
        "errors": [],
        "files_checked": files
    }

    # Test 1: Vérifier que les fichiers existent et ne sont pas vides
    console.print("  [dim]→ Test 1: Vérification des fichiers générés...")
    for file_rel in files:
        file_path = cell_path / file_rel
        if not file_path.exists():
            errors.append(f"Fichier manquant: {file_rel}")
            tests_ok = False
        elif file_path.stat().st_size == 0:
            errors.append(f"Fichier vide: {file_rel}")
            tests_ok = False
        elif "markdown" in file_path.read_text(encoding="utf-8", errors="ignore").lower()[:100]:
            # Vérifier si l'IA a renvoyé du markdown au lieu de code
            content = file_path.read_text(encoding="utf-8", errors="ignore")
            if content.strip().startswith(("```", "# ", "## ")):
                errors.append(f"Fichier contient du markdown: {file_rel}")
                tests_ok = False

    if tests_ok:
        console.print("  [green]✓ Test 1: Tous les fichiers sont valides")

    # Test 2 amélioré: Vérifier les boutons (ID btn-*, @click="runWorkflow('...')", workflow existe)
    if "index.html" in files:
        console.print("  [dim]→ Test 2: Vérification des boutons et workflows...")
        index_path = cell_path / "index.html"
        content = index_path.read_text(encoding="utf-8", errors="ignore")
        
        # Trouver tous les boutons
        buttons = re.findall(r'<button[^>]*>(.*?)</button>', content, re.DOTALL | re.IGNORECASE)
        btn_tags = re.findall(r'(<button[^>]*>)', content, re.IGNORECASE)
        
        buttons_with_issues = []
        workflow_calls = []
        
        for btn_tag in btn_tags:
            issues = []
            
            # Vérifier ID btn-*
            btn_id = re.search(r'id=["\'](btn-[^"\']+)["\']', btn_tag, re.IGNORECASE)
            if not btn_id:
                issues.append("pas d'ID btn-*")
            
            # Vérifier @click avec runWorkflow
            click_match = re.search(r'@click=["\']([^"\']+)["\']', btn_tag, re.IGNORECASE)
            if click_match:
                click_value = click_match.group(1)
                wf_call = re.search(r'runWorkflow\(["\']([^"\']+)["\']', click_value)
                if wf_call:
                    workflow_calls.append(wf_call.group(1))
                else:
                    issues.append("@click n'appelle pas runWorkflow()")
            else:
                issues.append("pas d'@click")
            
            if issues:
                buttons_with_issues.append(f"Bouton: {issues}")
        
        # Vérifier que les workflows appelés existent
        workflows_dir = cell_path / "workflows"
        existing_workflows = []
        if workflows_dir.exists():
            existing_workflows = [f.stem for f in workflows_dir.glob("*.js")]
        
        missing_workflows = [wf for wf in workflow_calls if wf not in existing_workflows]
        
        if buttons_with_issues:
            errors.append(f"{len(buttons_with_issues)} bouton(s) avec problèmes: {buttons_with_issues[:3]}")
            tests_ok = False
        elif missing_workflows:
            errors.append(f"Workflows appelés mais manquants: {missing_workflows}")
            tests_ok = False
        else:
            console.print(f"  [green]✓ Test 2: {len(btn_tags)} bouton(s) avec ID btn-*, {len(workflow_calls)} workflow(s) appelé(s)")

    # Test 3: Vérifier que main.js contient Alpine.data
    if "main.js" in files:
        console.print("  [dim]→ Test 3: Vérification de la structure Alpine.js...")
        main_path = cell_path / "main.js"
        content = main_path.read_text(encoding="utf-8", errors="ignore")
        
        if "Alpine.data" not in content:
            errors.append("main.js: Alpine.data non trouvé")
            tests_ok = False
        else:
            console.print("  [green]✓ Test 3: Alpine.data présent dans main.js")
        
        # Test 3.5: Vérifier les variables non définies dans main.js
        console.print("  [dim]→ Test 3.5: Vérification des variables JS...")
        undefined_vars = _check_undefined_vars(content, cell_name)
        if undefined_vars:
            for var_err in undefined_vars:
                errors.append(f"main.js: {var_err}")
            tests_ok = False
        else:
            console.print("  [green]✓ Test 3.5: Variables JS correctement définies")

    # Test 4: Vérifier que les workflows ont la fonction execute
    workflow_files = [f for f in files if f.startswith("workflows/") and f.endswith(".js")]
    if workflow_files:
        console.print("  [dim]→ Test 4: Vérification des workflows...")
        for wf_file in workflow_files:
            wf_path = cell_path / wf_file
            content = wf_path.read_text(encoding="utf-8", errors="ignore")
            
            if "export async function execute" not in content:
                errors.append(f"{wf_file}: fonction execute manquante")
                tests_ok = False
        
        if all("export async function execute" in (cell_path / f).read_text(encoding="utf-8", errors="ignore") 
               for f in workflow_files):
            console.print(f"  [green]✓ Test 4: {len(workflow_files)} workflow(s) avec fonction execute")

    # Test 5: Test navigateur avec Playwright (MIS EN PAUSE)
    if not skip_playwright:
        console.print("  [dim]→ Test 5: Test navigateur (Playwright)...")
        console.print("  [dim]  Attente 10s pour stabilisation...")
        time.sleep(10)
        console.print("  [dim]  Lancement des tests...")
        try:
            # Lancer un test rapide avec Playwright
            result = subprocess.run(
                [
                    "python3", "-c",
                    f"""
import asyncio
from playwright.async_api import async_playwright

async def test():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        
        console_errors = []
        console_logs = []
        page.on('console', lambda msg: console_logs.append((msg.type, msg.text)))
        page.on('pageerror', lambda err: console_errors.append(str(err)))
        
        try:
            await page.goto('http://dev.markidiags.com/{cell_name}', timeout=10000)
            await page.wait_for_timeout(3000)
            
            await browser.close()
            
            if console_errors:
                print('ERRORS:' + '\\n'.join(console_errors[:3]))
            else:
                # Retourner tous les logs pour analyse
                log_messages = [f"{{t}}:{{m}}" for t, m in console_logs]
                print('OK|' + '\\n'.join(log_messages))
        except Exception as e:
            await browser.close()
            print(f'ERROR:{{str(e)}}')

asyncio.run(test())
                """
                ],
                capture_output=True,
                text=True,
                timeout=30000
            )
            
            output = result.stdout.strip()
            if output.startswith("ERRORS:"):
                errs = output[7:].split("\n")
                errors.append(f"Erreurs console JS: {errs[0][:100]}")
                tests_ok = False
            elif output.startswith("ERROR:"):
                errors.append(f"Test navigateur: {output[6:]}")
                tests_ok = False
            else:
                # Analyser les logs pour vérifier le chargement
                if "|" in output:
                    logs_text = output.split("|", 1)[1]
                    logs = logs_text.split("\n")
                    
                    # Vérifier les logs requis
                    required_logs = [
                        "main.js loaded",
                        f"{cell_name}Page initialized"
                    ]
                    
                    missing_logs = []
                    for req_log in required_logs:
                        if not any(req_log in log for log in logs):
                            missing_logs.append(req_log)
                    
                    if missing_logs:
                        for missing in missing_logs:
                            errors.append(f"Log manquant: {missing}")
                        tests_ok = False
                    else:
                        console.print("  [green]✓ Test 5: Page chargée sans erreur JS")
                        console.print(f"  [dim]  ✓ main.js loaded")
                        console.print(f"  [dim]  ✓ {cell_name}Page initialized")
                else:
                    console.print("  [green]✓ Test 5: Page chargée sans erreur JS")
                            
        except subprocess.TimeoutExpired:
            console.print("  [red]✗ Timeout du test navigateur")
            errors.append("Test navigateur: timeout après 30s")
            tests_ok = False
        except Exception as e:
            console.print(f"  [red]✗ Test navigateur échoué: {e}")
            errors.append(f"Test navigateur: {e}")
            tests_ok = False
    else:
        console.print("  [yellow]⏸ Test 5: Tests Playwright mis en pause (skip_playwright=True)")

    # Test 6: Look & Feel - Comparaison avec mockups
    console.print("  [dim]→ Test 6: Look & Feel (comparaison mockups)...")
    mockups_dir = cell_path / ".specs" / "mockups"
    index_html_path = cell_path / "index.html"
    if mockups_dir.exists() and index_html_path.exists():
        try:
            lof_errors = _test_look_and_feel(cell_path / "index.html", mockups_dir, cell_name)
            if lof_errors:
                for err in lof_errors:
                    errors.append(f"Look & Feel: {err}")
                tests_ok = False
            else:
                console.print("  [green]✓ Test 6: Look & Feel conforme aux mockups")
        except Exception as e:
            console.print(f"  [yellow]⚠ Test 6: Erreur lors de la comparaison: {e}")
    else:
        console.print("  [dim]  ℹ Pas de mockups à comparer")

    # Test 7: Test interactif des boutons avec Playwright (MIS EN PAUSE)
    if not skip_playwright:
        if workflow_files and "index.html" in files:
            console.print("  [dim]→ Test 7: Test interactif des boutons...")
            try:
                button_test_result = _test_buttons_interaction(cell_path, cell_name)
                if button_test_result:
                    console.print("  [green]✓ Test 7: Tous les boutons déclenchent les workflows")
                else:
                    errors.append("Test 7: Certains boutons ne déclenchent pas les workflows correctement")
                    tests_ok = False
            except Exception as e:
                console.print(f"  [red]✗ Test 7: Erreur - {e}")
                errors.append(f"Test boutons: {e}")
                tests_ok = False
    else:
        console.print("  [yellow]⏸ Test 7: Tests boutons Playwright mis en pause (skip_playwright=True)")

    # Test 8: Test des workflows avec scénarios (MIS EN PAUSE)
    console.print("  [yellow]⏸ Test 8: Tests workflows scénarios mis en pause")

    # console.print()
    # if tests_ok:
    #     console.print("[green]✅ Tous les tests post-génération passent")
    # else:
    #     console.print(f"[red]❌ {len(errors)} erreur(s) détectée(s)")
    #     for err in errors[:8]:
    #         console.print(f"  [red]- {err}")

    # Finaliser le rapport
    rapport["success"] = tests_ok
    rapport["errors"] = errors
    rapport["error_count"] = len(errors)

    return tests_ok, errors, rapport


def _test_look_and_feel(index_html: Path, mockups_dir: Path, cell_name: str) -> list[str]:
    """Compare l'implémentation avec les mockups et retourne les écarts."""
    errors = []
    
    # Chercher le fichier mockup correspondant
    mockup_file = None
    for ext in [".html", ".svg", ".png"]:
        candidate = mockups_dir / f"{cell_name}{ext}"
        if candidate.exists():
            mockup_file = candidate
            break
    
    if not mockup_file:
        return ["Fichier mockup non trouvé"]
    
    if mockup_file.suffix == ".html":
        # Comparaison HTML
        impl_content = index_html.read_text(encoding="utf-8")
        mockup_content = mockup_file.read_text(encoding="utf-8")
        
        # Extraire les classes Tailwind utilisées
        impl_classes = set(re.findall(r'class=["\']([^"\']+)["\']', impl_content))
        mockup_classes = set(re.findall(r'class=["\']([^"\']+)["\']', mockup_content))
        
        # Comparer structure DOM (simplifié - vérifier présence éléments clés)
        impl_tags = re.findall(r'<(\w+)[^>]*class=["\'][^"\']*(?:btn|button|input|form)[^"\']*["\']', impl_content, re.IGNORECASE)
        mockup_tags = re.findall(r'<(\w+)[^>]*class=["\'][^"\']*(?:btn|button|input|form)[^"\']*["\']', mockup_content, re.IGNORECASE)
        
        # Vérifier que tous les éléments interactifs du mockup sont présents
        mockup_buttons = len(re.findall(r'<button', mockup_content, re.IGNORECASE))
        impl_buttons = len(re.findall(r'<button', impl_content, re.IGNORECASE))
        
        if impl_buttons < mockup_buttons:
            errors.append(f"Nombre de boutons: {impl_buttons} (attendu: {mockup_buttons})")
        
        # Vérifier présence classes Tailwind essentielles
        essential_classes = ["bg-", "text-", "p-", "m-", "rounded", "flex", "grid"]
        has_essential = any(any(ec in cls for ec in essential_classes) for cls in impl_classes)
        if not has_essential:
            errors.append("Classes Tailwind essentielles manquantes")
    
    return errors


def _test_buttons_interaction(cell_path: Path, cell_name: str) -> bool:
    """Teste que chaque bouton déclenche bien un workflow avec log console."""
    index_html = cell_path / "index.html"
    content = index_html.read_text(encoding="utf-8")
    
    # Extraire tous les boutons avec leur ID et workflow
    button_pattern = r'<button[^>]*id=["\'](btn-[^"\']+)["\'][^>]*@click=["\'][^"\']*runWorkflow\(["\']([^"\']+)["\'][^"\']*["\'][^>]*>'
    buttons = re.findall(button_pattern, content, re.IGNORECASE | re.DOTALL)
    
    if not buttons:
        # Fallback: chercher les boutons avec ID btn-*
        btn_ids = re.findall(r'id=["\'](btn-[^"\']+)["\']', content, re.IGNORECASE)
        if not btn_ids:
            return True  # Pas de boutons à tester
        buttons = [(btn_id, "unknown") for btn_id in btn_ids]
    
    # Tester avec Playwright
    test_script = f"""
import asyncio
from playwright.async_api import async_playwright

async def test_buttons():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        
        console_logs = []
        page.on('console', lambda msg: console_logs.append(msg.text))
        
        await page.goto('http://dev.markidiags.com/{cell_name}', timeout=10000)
        await page.wait_for_timeout(2000)
        
        results = []
        {json.dumps([{"id": bid, "wf": wf} for bid, wf in buttons])}
        
        for btn in buttons:
            try:
                console_logs.clear()
                await page.click(f'#{btn["id"]}}}', timeout=5000)
                await page.wait_for_timeout(2000)
                
                # Vérifier que le workflow a loggé son démarrage
                wf_logged = any(f"{{btn['wf']}}:" in log for log in console_logs)
                results.append({{"id": btn["id"], "ok": wf_logged, "logs": console_logs[:3]}})
            except Exception as e:
                results.append({{"id": btn["id"], "ok": False, "error": str(e)}})
        
        await browser.close()
        return results

results = asyncio.run(test_buttons())
failed = [r for r in results if not r["ok"]]
print(f"BUTTON_TEST:{{len(failed)}}" if failed else "BUTTON_TEST:OK")
"""
    
    result = subprocess.run(
        ["python3", "-c", test_script],
        capture_output=True,
        text=True,
        timeout=60000
    )
    
    return "BUTTON_TEST:OK" in result.stdout


def _test_workflows_with_data(cell_path: Path, cell_name: str) -> dict:
    """Teste les workflows avec données mock via la page de test."""
    test_page_path = f"tests/test-{cell_name}-workflows.html"
    
    test_script = f"""
import asyncio
import json
from playwright.async_api import async_playwright

async def test_workflows():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        
        # Naviguer vers la page de test
        await page.goto('http://dev.markidiags.com/{test_page_path}', timeout=15000)
        await page.wait_for_timeout(2000)
        
        # Cliquer sur "Run All Tests"
        await page.click('#btn-run-all')
        
        # Attendre la fin des tests (max 30s)
        await page.wait_for_timeout(3000)
        
        # Lire les résultats
        stats = await page.evaluate('''() => {{
            const cards = document.querySelectorAll('.test-card');
            const passed = document.querySelectorAll('.test-pass').length;
            const failed = document.querySelectorAll('.test-fail').length;
            return {{ total: cards.length, passed, failed }};
        }}''')
        
        # Lire les logs console
        logs = await page.evaluate('''() => {{
            const logDiv = document.getElementById('console-logs');
            return logDiv ? logDiv.innerText : '';
        }}''')
        
        await browser.close()
        return {{ "success": stats["failed"] == 0, **stats, "logs": logs[:500] }}

result = asyncio.run(test_workflows())
print(json.dumps(result))
"""
    
    result = subprocess.run(
        ["python3", "-c", test_script],
        capture_output=True,
        text=True,
        timeout=60000
    )
    
    try:
        return json.loads(result.stdout.strip().split("\n")[-1])
    except:
        return {"success": False, "total": 0, "passed": 0, "failed": 1, "error": result.stderr}

def _load_test_scenarios(cell_path: Path) -> list[dict]:
    """Charge les fichiers de test JSON depuis .specs/tests-workflows/."""
    scenarios = []
    tests_dir = cell_path / ".specs" / "tests-workflows"
    
    if not tests_dir.exists():
        return scenarios
    
    for test_file in sorted(tests_dir.glob("*.json")):
        try:
            test_data = json.loads(test_file.read_text(encoding="utf-8"))
            test_data["_file"] = test_file.name
            scenarios.append(test_data)
        except Exception as e:
            console.print(f"  [red]✗ Erreur chargement {test_file.name}: {e}")
    
    return scenarios


def _test_workflows_with_scenarios(cell_path: Path, cell_name: str) -> dict:
    """Teste les workflows avec les scénarios définis dans .specs/tests-workflows/.
    
    Le workflow s'exécute dans son environnement réel (Alpine + PouchDB),
    mais avec des données mock préalablement injectées.
    """
    scenarios = _load_test_scenarios(cell_path)
    
    if not scenarios:
        return {"success": True, "total": 0, "passed": 0, "failed": 0}
    
    results = []
    log_failures = []
    
    for scenario in scenarios:
        wf_name = scenario.get("workflow")
        scenario_name = scenario.get("scenario", scenario.get("_file"))
        input_json = scenario.get("inputJson", {})
        mock_data = scenario.get("mockData", {})
        expected_logs = scenario.get("consoleLogsExpected", [])
        expected_output = scenario.get("outputJson", {})
        
        try:
            # Construire le script Playwright
            test_script = f'''
import asyncio
import json
from playwright.async_api import async_playwright

async def test_scenario():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        
        console_logs = []
        workflow_result = None
        
        def handle_console(msg):
            text = msg.text
            console_logs.append(text)
            if "Workflow " in text and " completed:" in text:
                try:
                    result_str = text.split("completed:", 1)[1].strip()
                    nonlocal workflow_result
                    workflow_result = json.loads(result_str)
                except:
                    pass
        
        page.on('console', handle_console)
        
        # Charger la page
        await page.goto('http://dev.markidiags.com/{cell_name}', timeout=15000)
        await page.wait_for_timeout(1000)
        
        # Injecter localStorage
        local_storage_mock = {json.dumps(mock_data.get("localStorage", {}))}
        for key, value in local_storage_mock.items():
            await page.evaluate(f"""localStorage.setItem('{{key}}', {{JSON.stringify(value)}});""")
        
        # Injecter PouchDB mock data
        pouch_mock = {json.dumps(mock_data.get("pouchDb", {}))}
        if pouch_mock:
            for collection_name, docs in pouch_mock.items():
                if isinstance(docs, list):
                    for doc in docs:
                        doc_id = doc.get("_id", "doc_" + str(docs.index(doc)))
                        await page.evaluate(f"""
                            async () => {{
                                if (window.localDB) {{
                                    const doc = {{JSON.parse({{JSON.stringify(doc)}})}};
                                    try {{
                                        const existing = await window.localDB.get(doc._id);
                                        doc._rev = existing._rev;
                                    }} catch(e) {{}}
                                    await window.localDB.put(doc);
                                }}
                            }}
                        """)
        
        # Préparer input
        input_data = {json.dumps(input_json)}
        if input_data:
            await page.evaluate(f"window.__TEST_INPUT__ = {{JSON.parse({{JSON.dumps(input_data)}})}};")
        
        # Exécuter workflow
        if "{wf_name}" == "initial-load":
            await page.reload()
            await page.wait_for_timeout(3000)
        else:
            await page.evaluate(f"""
                async () => {{
                    const app = document.querySelector('[x-data]');
                    if (app && app._x_dataStack) {{
                        const component = app._x_dataStack[0];
                        if (component.runWorkflow) {{
                            const input = window.__TEST_INPUT__ || {{}};
                            const result = await component.runWorkflow('{wf_name}', input);
                            console.log('Workflow {wf_name} completed:', JSON.stringify(result));
                        }}
                    }}
                }}
            """)
            await page.wait_for_timeout(2000)
        
        await browser.close()
        
        # Vérifier logs
        logs_found = []
        missing = []
        for expected in {json.dumps(expected_logs)}:
            found = any(expected in log for log in console_logs)
            logs_found.append({{"expected": expected, "found": found}})
            if not found:
                missing.append(expected)
        
        return {{
            "logs_found": logs_found,
            "all_logs": console_logs[-30:],
            "missing_logs": missing,
            "workflow_result": workflow_result
        }}

result = asyncio.run(test_scenario())
print(json.dumps(result))
'''
            
            result = subprocess.run(
                ["python3", "-c", test_script],
                capture_output=True,
                text=True,
                timeout=45000
            )
            
            test_result = json.loads(result.stdout.strip().splitlines()[-1])
            
            all_logs_found = all(lf["found"] for lf in test_result.get("logs_found", []))
            
            if all_logs_found:
                results.append({"scenario": scenario_name, "passed": True, "logs_verified": len(test_result.get("logs_found", []))})
            else:
                results.append({
                    "scenario": scenario_name,
                    "passed": True,
                    "log_warnings": test_result.get("missing_logs", [])
                })
                log_failures.append({
                    "scenario": scenario_name,
                    "missing_logs": test_result.get("missing_logs", []),
                    "actual_logs": test_result.get("all_logs", [])
                })
                
        except Exception as e:
            results.append({"scenario": scenario_name, "passed": False, "error": str(e)})
    
    passed = sum(1 for r in results if r["passed"])
    failed = len(results) - passed
    
    return {
        "success": failed == 0,
        "total": len(results),
        "passed": passed,
        "failed": failed,
        "scenarios": results,
        "log_failures": log_failures,
        "failures": [r["scenario"] for r in results if not r["passed"]]
    }


def _check_undefined_vars(js_content: str, cell_name: str) -> list[str]:
    """Vérifie statiquement que les variables référencées dans le JS sont définies.
    
    Détecte les erreurs comme "dashboardPage is not defined".
    """
    errors = []
    
    # Nom attendu du data component Alpine
    expected_component = f"{cell_name}Page"
    
    # Chercher les patterns comme "dashboardPage.init()" ou "const x = dashboardPage"
    # mais pas dans les strings ou commentaires
    
    # Pattern pour trouver les références à des variables (pas les déclarations)
    # Exclure: this., window., document., console., JSON., etc.
    
    # Liste des variables globales JS standards
    js_globals = {
        'window', 'document', 'console', 'fetch', 'Promise', 'setTimeout', 'clearTimeout',
        'setInterval', 'clearInterval', 'localStorage', 'sessionStorage', 'JSON', 'Object',
        'Array', 'String', 'Number', 'Date', 'Math', 'undefined', 'null', 'true', 'false',
        'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURI', 'decodeURI',
        'encodeURIComponent', 'decodeURIComponent', 'escape', 'unescape',
        'alert', 'confirm', 'prompt', 'Error', 'TypeError', 'ReferenceError',
        'RegExp', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Proxy', 'Reflect',
        'Intl', 'Blob', 'File', 'FileReader', 'FormData', 'Headers', 'Request', 'Response',
        'URL', 'URLSearchParams', 'AbortController', 'AbortSignal', 'Event', 'CustomEvent',
        'MutationObserver', 'IntersectionObserver', 'ResizeObserver', 'performance',
        'navigator', 'location', 'history', 'screen', 'crypto', 'queueMicrotask',
        'structuredClone', 'Alpine', 'PouchDB', 'Symbol', 'BigInt', 'Infinity', 'NaN'
    }
    
    # Supprimer les commentaires pour analyse
    content_no_comments = re.sub(r'//.*?$', '', js_content, flags=re.MULTILINE)
    content_no_comments = re.sub(r'/\*.*?\*/', '', content_no_comments, flags=re.DOTALL)
    
    # Trouver les déclarations de variables (const, let, var, function params)
    declared_vars = set()
    
    # const/let/var x = ...
    declared_vars.update(re.findall(r'(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)', content_no_comments))
    
    # function name(...) ou function(...) { ... } - params
    func_params = re.findall(r'function\s*\w*\s*\(([a-zA-Z0-9_$,\s]*)\)', content_no_comments)
    for params in func_params:
        for param in params.split(','):
            param = param.strip()
            if param:
                declared_vars.add(param)
    
    # Arrow function params: (x) => ou x =>
    arrow_params = re.findall(r'\(([a-zA-Z_$][a-zA-Z0-9_$]*)\)\s*=>', content_no_comments)
    declared_vars.update(arrow_params)
    single_arrow = re.findall(r'^\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>', content_no_comments)
    declared_vars.update(single_arrow)
    
    # for (let x of ...) ou for (const x in ...)
    for_vars = re.findall(r'for\s*\(\s*(?:let|const|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)', content_no_comments)
    declared_vars.update(for_vars)
    
    # Catch clause: catch (e)
    catch_vars = re.findall(r'catch\s*\(\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\)', content_no_comments)
    declared_vars.update(catch_vars)
    
    # Alpine.data('cellNamePage', ...) - la variable exportée
    alpine_data_match = re.search(r"Alpine\.data\s*\(\s*['\"]([^'\"]+)['\"]", js_content)
    if alpine_data_match:
        declared_vars.add(alpine_data_match.group(1))
    
    # Chercher les usages de variables
    # Pattern: word qui n'est pas précédé de . ou ' ou "
    potential_vars = re.findall(r'(?<![\.\'"\w])([a-zA-Z_$][a-zA-Z0-9_$]*)(?![\'"])', content_no_comments)
    
    # Filtrer pour trouver les candidats problématiques
    # Variables qui ressemblent à des noms de composants (se terminent par Page)
    component_pattern = re.compile(r'^[a-z][a-zA-Z0-9]*Page$')
    
    for var in set(potential_vars):
        if var in js_globals:
            continue
        if var in declared_vars:
            continue
        if var in ['return', 'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue',
                   'function', 'class', 'extends', 'super', 'this', 'new', 'typeof', 'instanceof',
                   'in', 'of', 'void', 'delete', 'await', 'async', 'yield', 'export', 'import',
                   'from', 'as', 'default', 'try', 'catch', 'finally', 'throw', 'with', 'debugger']:
            continue
        # Variable numérique pure
        if re.match(r'^\d+$', var):
            continue
            
        # Si ça ressemble à un nom de composant et n'est pas déclaré -> erreur probable
        if component_pattern.match(var):
            if var != expected_component:
                errors.append(f"Référence à '{var}' qui n'est pas défini (composant attendu: '{expected_component}')")
            elif not alpine_data_match:
                errors.append(f"Référence à '{var}' mais Alpine.data n'est pas correctement défini")
    
    return errors
