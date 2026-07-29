"""Test 8 alternatif: Génération dynamique de tests depuis scenario-*.md dans tests-workflows/"""

import re
import subprocess
import time
import json
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional

from rich.console import Console

console = Console()


@dataclass
class TestScenario:
    """Représente un scénario de test extrait du markdown."""
    name: str
    workflow: str
    preconditions: dict = field(default_factory=dict)
    actions: list = field(default_factory=list)
    verifications: list = field(default_factory=list)
    depends_on: Optional[str] = None
    source_file: str = ""


class ScenarioParser:
    """Parse un fichier scenario-*.md en scénarios exécutables."""
    
    def __init__(self, content: str):
        self.content = content
    
    def parse(self) -> list[TestScenario]:
        """Extrait tous les scénarios du markdown."""
        scenarios = []
        
        # Pattern pour chaque scénario (## Scénario X: ... ou # Scénario ...)
        # Un fichier scenario-*.md contient généralement un seul scénario principal
        scenario_blocks = re.split(r'#+\s*Scénario\s*\d*[:\s]*', self.content)
        
        if len(scenario_blocks) <= 1:
            # Essayer avec un titre simple
            scenario_blocks = [self.content]
        else:
            scenario_blocks = scenario_blocks[1:]  # Skip avant premier match
        
        for block in scenario_blocks:
            if not block.strip():
                continue
                
            lines = block.strip().split('\n')
            name = lines[0].strip() if lines else "Scénario"
            
            scenario = TestScenario(name=name, workflow="")
            
            # Parser le contenu
            current_section = None
            buffer = []
            
            for line in lines[1:]:
                line_stripped = line.strip()
                
                if line_stripped.startswith('**Workflow**:'):
                    scenario.workflow = line_stripped.split(':', 1)[1].strip()
                elif line_stripped.startswith('**Cell**:'):
                    # Ignorer, info déjà connue
                    pass
                elif line_stripped.startswith('**Description**:'):
                    scenario.description = line_stripped.split(':', 1)[1].strip()
                elif line_stripped.startswith('**Priorité**:'):
                    scenario.priority = line_stripped.split(':', 1)[1].strip()
                elif line_stripped.startswith('**Dépendance**:'):
                    scenario.depends_on = line_stripped.split(':', 1)[1].strip()
                elif line_stripped.startswith('### Préconditions'):
                    if buffer and current_section:
                        self._flush_section(scenario, current_section, buffer)
                    current_section = 'preconditions'
                    buffer = []
                elif line_stripped.startswith('### Actions'):
                    if buffer and current_section:
                        self._flush_section(scenario, current_section, buffer)
                    current_section = 'actions'
                    buffer = []
                elif line_stripped.startswith('### Vérifications'):
                    if buffer and current_section:
                        self._flush_section(scenario, current_section, buffer)
                    current_section = 'verifications'
                    buffer = []
                elif line_stripped and current_section:
                    buffer.append(line)
            
            if buffer and current_section:
                self._flush_section(scenario, current_section, buffer)
            
            # Si pas de workflow trouvé, essayer de le déduire du titre
            if not scenario.workflow and 'initial-load' in name.lower():
                scenario.workflow = 'initial-load'
            elif not scenario.workflow:
                # Essayer de trouver dans le contenu
                wf_match = re.search(r'`?(\w+-\w+)`?', self.content)
                if wf_match:
                    scenario.workflow = wf_match.group(1)
            
            scenarios.append(scenario)
        
        return scenarios
    
    def _flush_section(self, scenario: TestScenario, section: str, buffer: list[str]):
        """Traite le contenu d'une section."""
        content = '\n'.join(buffer).strip()
        
        if section == 'preconditions':
            scenario.preconditions = self._parse_preconditions(content)
        elif section == 'actions':
            scenario.actions = self._parse_actions(content)
        elif section == 'verifications':
            scenario.verifications = self._parse_verifications(content)
    
    def _parse_preconditions(self, content: str) -> dict:
        """Extrait les données mock (localStorage, PouchDB, etc.)."""
        preconds = {
            'localStorage': {},
            'pouchDb': {},
            'alpineState': {}
        }
        
        # localStorage
        ls_pattern = r'- localStorage:\s*\n((?:\s+- `[\w_]+`:.*\n)+)'
        ls_match = re.search(ls_pattern, content)
        if ls_match:
            ls_content = ls_match.group(1)
            for line in ls_content.strip().split('\n'):
                kv_match = re.search(r'`([\w_]+)`:\s*"?([^"`]+)"?', line)
                if kv_match:
                    preconds['localStorage'][kv_match.group(1)] = kv_match.group(2)
        
        # PouchDB
        pouch_pattern = r'- PouchDB \(collection "(\w+)"\):\s*\n((?:\s+- `[^`]+`.*\n)+)'
        for match in re.finditer(pouch_pattern, content):
            collection = match.group(1)
            docs_str = match.group(2)
            preconds['pouchDb'][collection] = []
            # Parser les documents JSON
            for doc_line in docs_str.strip().split('\n'):
                json_match = re.search(r'`({.+})`', doc_line)
                if json_match:
                    try:
                        preconds['pouchDb'][collection].append(json.loads(json_match.group(1)))
                    except:
                        pass
        
        return preconds
    
    def _parse_actions(self, content: str) -> list[dict]:
        """Extrait les actions (clic, remplissage, etc.)."""
        actions = []
        
        action_patterns = [
            (r'(\d+)\. Charger la page `?([^`\n]+)', 'navigate'),
            (r'(\d+)\. Attendre (\d+) secondes?', 'wait'),
            (r'(\d+)\. Remplir champ `?([^`]+)` avec "([^"]+)"', 'fill'),
            (r'(\d+)\. Cliquer sur `?([^`\n]+)', 'click'),
            (r'(\d+)\. Vérifier que le workflow s\'est exécuté', 'check_executed'),
        ]
        
        for pattern, action_type in action_patterns:
            for match in re.finditer(pattern, content, re.IGNORECASE):
                if action_type == 'navigate':
                    actions.append({'type': 'navigate', 'url': match.group(2)})
                elif action_type == 'wait':
                    actions.append({'type': 'wait', 'seconds': int(match.group(2))})
                elif action_type == 'fill':
                    actions.append({'type': 'fill', 'selector': match.group(2), 'value': match.group(3)})
                elif action_type == 'click':
                    actions.append({'type': 'click', 'selector': match.group(2)})
        
        return actions
    
    def _parse_verifications(self, content: str) -> list[dict]:
        """Extrait les assertions à vérifier."""
        verifs = []
        
        verif_patterns = [
            (r'- Console contient:\s*"([^"]+)"', 'console_contains'),
            (r'- Pas d\'erreur contenant "([^"]+)"', 'no_error'),
            (r'- Alpine\.data contient:\s*`([^`]+)`', 'alpine_has'),
            (r'- Le DOM contient .* avec texte "([^"]+)"', 'dom_contains_text'),
            (r'- Le DOM affiche .* \(classe \.([^)]+)\)', 'dom_has_class'),
        ]
        
        for pattern, verif_type in verif_patterns:
            for match in re.finditer(pattern, content, re.IGNORECASE):
                verifs.append({'type': verif_type, 'expected': match.group(1)})
        
        return verifs


class TestGenerator:
    """Génère le code Playwright à partir des scénarios."""
    
    def __init__(self, cell_name: str, cell_path: Path):
        self.cell_name = cell_name
        self.cell_path = cell_path
    
    def generate_test_code(self, scenario: TestScenario) -> str:
        """Génère le script Python/Playwright pour un scénario."""
        
        code_parts = []
        code_parts.append("import asyncio")
        code_parts.append("import json")
        code_parts.append("from playwright.async_api import async_playwright")
        code_parts.append("")
        code_parts.append("async def run_scenario():")
        code_parts.append("    async with async_playwright() as p:")
        code_parts.append("        browser = await p.chromium.launch()")
        code_parts.append("        page = await browser.new_page()")
        code_parts.append("")
        code_parts.append("        # Collecte des logs")
        code_parts.append("        console_logs = []")
        code_parts.append("        page.on('console', lambda msg: console_logs.append((msg.type, msg.text)))")
        code_parts.append("        page.on('pageerror', lambda err: console_logs.append(('error', str(err))))")
        code_parts.append("")
        
        # Injecter les préconditions
        if scenario.preconditions.get('localStorage'):
            code_parts.append("        # Injection localStorage")
            for key, value in scenario.preconditions['localStorage'].items():
                # Échapper les quotes dans la valeur
                safe_value = value.replace('\\', '\\\\').replace("'", "\\'").replace('"', '\\"')
                code_parts.append(f'        await page.evaluate("localStorage.setItem(\'{key}\', \'{safe_value}\');")')
            code_parts.append("")
        
        if scenario.preconditions.get('pouchDb'):
            code_parts.append("        # Injection PouchDB")
            code_parts.append(f"        await page.goto('http://dev.markidiags.com/{self.cell_name}', timeout=15000)")
            code_parts.append("        await page.wait_for_timeout(1000)")
            code_parts.append("")
            for collection, docs in scenario.preconditions['pouchDb'].items():
                for doc in docs:
                    doc_json = json.dumps(doc)
                    code_parts.append(f"        doc = json.loads('{doc_json}')")
                    code_parts.append('        await page.evaluate("""async () => {')
                    code_parts.append('            if (window.localDB) {')
                    code_parts.append('                try { const existing = await window.localDB.get(doc._id); doc._rev = existing._rev; } catch(e) {}')
                    code_parts.append('                await window.localDB.put(doc);')
                    code_parts.append('            }')
                    code_parts.append('        }""")')
            code_parts.append("")
        
        # Actions
        code_parts.append("        # Exécution des actions")
        for action in scenario.actions:
            if action['type'] == 'navigate':
                url = action['url'].replace('{cell_name}', self.cell_name)
                code_parts.append(f"        await page.goto('{url}', timeout=15000)")
            elif action['type'] == 'wait':
                code_parts.append(f"        await page.wait_for_timeout({action['seconds'] * 1000})")
            elif action['type'] == 'fill':
                safe_value = action['value'].replace('\\', '\\\\').replace("'", "\\'").replace('"', '\\"')
                code_parts.append(f"        await page.fill('{action['selector']}', '{safe_value}')")
            elif action['type'] == 'click':
                code_parts.append(f"        await page.click('{action['selector']}', timeout=5000)")
        
        code_parts.append("")
        code_parts.append("        await page.wait_for_timeout(2000)")
        code_parts.append("")
        code_parts.append("        # Vérifications")
        code_parts.append("        results = {")
        code_parts.append("            'console_logs': [log for _, log in console_logs],")
        code_parts.append("            'verifications': []")
        code_parts.append("        }")
        code_parts.append("")
        
        # Générer les assertions
        for i, verif in enumerate(scenario.verifications):
            if verif['type'] == 'console_contains':
                expected = verif['expected'].replace("'", "\\'")
                code_parts.append(f"        # Vérification {i+1}")
                code_parts.append(f"        found_{i} = any('{expected}' in log for log in results['console_logs'])")
                code_parts.append(f"        results['verifications'].append({{'check': 'console_contains', 'expected': '{expected}', 'passed': found_{i}}})")
            elif verif['type'] == 'no_error':
                expected = verif['expected'].replace("'", "\\'")
                code_parts.append(f"        # Vérification {i+1}")
                code_parts.append(f"        has_error_{i} = any('{expected}' in log and 'error' in str(log).lower() for log in results['console_logs'])")
                code_parts.append(f"        results['verifications'].append({{'check': 'no_error', 'forbidden': '{expected}', 'passed': not has_error_{i}}})")
        
        code_parts.append("")
        code_parts.append("        await browser.close()")
        code_parts.append("        return results")
        code_parts.append("")
        code_parts.append("result = asyncio.run(run_scenario())")
        code_parts.append("print(json.dumps(result, indent=2, ensure_ascii=False))")
        
        return '\n'.join(code_parts)


def run_scenario_test(cell_path: Path, cell_name: str, rapport: dict) -> tuple[bool, dict]:
    """
    Exécute les tests basés sur les fichiers scenario-*.md dans tests-workflows/.
    
    Returns:
        (success, rapport_detaille)
    """
    tests_workflows_dir = cell_path / ".specs" / "tests-workflows"
    
    if not tests_workflows_dir.exists():
        console.print("  [dim]ℹ Pas de dossier tests-workflows/")
        return True, rapport
    
    # Chercher tous les fichiers scenario-*.md
    scenario_files = sorted(tests_workflows_dir.glob("scenario-*.md"))
    
    if not scenario_files:
        console.print("  [dim]ℹ Pas de fichiers scenario-*.md trouvés dans tests-workflows/")
        return True, rapport
    
    console.print(f"  [blue]🧪 Test Scénarios depuis {len(scenario_files)} fichier(s) scenario-*.md...")
    
    # Parser chaque fichier
    all_scenarios = []
    for scenario_file in scenario_files:
        content = scenario_file.read_text(encoding="utf-8")
        parser = ScenarioParser(content)
        scenarios = parser.parse()
        if scenarios:
            # Ajouter le nom du fichier source pour le rapport
            for s in scenarios:
                s.source_file = scenario_file.name
            all_scenarios.extend(scenarios)
    
    if not all_scenarios:
        console.print("  [yellow]⚠ Aucun scénario valide trouvé dans les fichiers scenario-*.md")
        return True, rapport
    
    console.print(f"  [dim]→ {len(all_scenarios)} scénario(s) trouvé(s) dans {len(scenario_files)} fichier(s)")
    
    # Générer et exécuter chaque scénario
    generator = TestGenerator(cell_name, cell_path)
    results = []
    all_passed = True
    
    for i, scenario in enumerate(all_scenarios, 1):
        source = getattr(scenario, 'source_file', 'unknown')
        console.print(f"\n  [cyan]  Scénario {i}: {scenario.name}")
        console.print(f"  [dim]    Fichier: {source}")
        console.print(f"  [dim]    Workflow: {scenario.workflow}")
        
        # Générer le code de test
        test_code = generator.generate_test_code(scenario)
        
        # Sauvegarder le code généré (pour debug)
        generated_test_path = tests_workflows_dir / f"_generated_test_{i}.py"
        generated_test_path.write_text(test_code, encoding="utf-8")
        
        # Exécuter le test avec meilleure gestion d'erreurs
        try:
            # Sauvegarder dans un fichier .py pour meilleure gestion d'erreurs
            test_py_file = tests_workflows_dir / f"_test_{i}_{scenario.workflow}.py"
            test_py_file.write_text(test_code, encoding="utf-8")
            
            result = subprocess.run(
                ["python3", str(test_py_file)],
                capture_output=True,
                text=True,
                timeout=60000
            )
            
            if result.returncode == 0:
                try:
                    # Chercher la dernière ligne qui contient le JSON
                    output_lines = result.stdout.strip().split('\n')
                    json_line = None
                    for line in reversed(output_lines):
                        if line.strip().startswith('{'):
                            json_line = line
                            break
                    
                    if not json_line:
                        raise ValueError("Aucun JSON trouvé dans la sortie")
                    
                    test_result = json.loads(json_line)
                    
                    # Vérifier les assertions
                    passed_verifs = sum(1 for v in test_result.get('verifications', []) if v.get('passed'))
                    total_verifs = len(test_result.get('verifications', []))
                    
                    if passed_verifs == total_verifs:
                        console.print(f"  [green]    ✓ {passed_verifs}/{total_verifs} vérifications passées")
                    else:
                        console.print(f"  [red]    ✗ {passed_verifs}/{total_verifs} vérifications passées")
                        all_passed = False
                    
                    results.append({
                        'scenario': scenario.name,
                        'workflow': scenario.workflow,
                        'source_file': source,
                        'passed': passed_verifs == total_verifs,
                        'verifications': test_result.get('verifications', []),
                        'console_logs': test_result.get('console_logs', [])[:20]
                    })
                    
                except json.JSONDecodeError as e:
                    console.print(f"  [red]    ✗ Erreur parsing résultat: {e}")
                    console.print(f"  [dim]    Sortie brute: {result.stdout[:200]}")
                    all_passed = False
                    results.append({
                        'scenario': scenario.name,
                        'workflow': scenario.workflow,
                        'source_file': source,
                        'passed': False,
                        'error': f'JSON parse error: {e}'
                    })
            else:
                console.print(f"  [red]    ✗ Test échoué (code {result.returncode})")
                if result.stderr:
                    console.print(f"  [dim]    Erreur: {result.stderr[:300]}")
                all_passed = False
                results.append({
                    'scenario': scenario.name,
                    'workflow': scenario.workflow,
                    'source_file': source,
                    'passed': False,
                    'error': result.stderr[:200] if result.stderr else 'Unknown error'
                })
                
        except subprocess.TimeoutExpired:
            console.print(f"  [red]    ✗ Timeout")
            all_passed = False
            results.append({
                'scenario': scenario.name,
                'workflow': scenario.workflow,
                'source_file': source,
                'passed': False,
                'error': 'Timeout'
            })
        except Exception as e:
            console.print(f"  [red]    ✗ Erreur: {e}")
            all_passed = False
            results.append({
                'scenario': scenario.name,
                'workflow': scenario.workflow,
                'source_file': source,
                'passed': False,
                'error': str(e)
            })
    
    # Mettre à jour le rapport
    rapport['scenario_tests'] = {
        'total': len(all_scenarios),
        'passed': sum(1 for r in results if r['passed']),
        'file_count': len(scenario_files),
        'results': results
    }
    
    return all_passed, rapport


# Fonction à appeler depuis step_13_post_gen.py
def test_scenarios_from_markdown(cell_path: Path, cell_name: str, rapport: dict) -> tuple[bool, dict]:
    """Point d'entrée principal pour le test de scénarios."""
    return run_scenario_test(cell_path, cell_name, rapport)
