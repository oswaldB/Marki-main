"""Étape 4.6: Génération automatique des fichiers de test workflows."""

import json
import re
from pathlib import Path

from rich.console import Console

console = Console()


def _extract_json_from_markdown(content: str, section_pattern: str) -> dict:
    """Extrait un bloc JSON d'une section markdown."""
    # NOTE: on encapsule le pattern dans un groupe pour gérer les | (OU)
    pattern = r'(?:' + section_pattern + r')\s*```(?:\w+)?\s*\n?(.*?)```'
    match = re.search(pattern, content, re.DOTALL | re.IGNORECASE)
    
    if match:
        code = match.group(1).strip()
        try:
            return json.loads(code)
        except json.JSONDecodeError:
            # Essayer de parser comme JS object
            return _parse_js_object(code)
    return {}


def _parse_js_object(code: str) -> dict:
    """Parse un objet JavaScript basique en dict Python."""
    result = {}
    # Pattern pour key: value ou key: { ... }
    lines = code.split('\n')
    current_key = None
    current_value = []
    
    for line in lines:
        line = line.strip()
        if not line or line.startswith('//') or line.startswith('*'):
            continue
        
        # Détection key: value
        match = re.match(r'(\w+)\s*:\s*(.+)', line)
        if match and current_key is None:
            key, value = match.groups()
            value = value.strip().rstrip(',').rstrip(';')
            
            # Nettoyer les commentaires
            value = re.sub(r'//.*$', '', value).strip()
            
            # Conversion des types
            if value.lower() == 'true':
                result[key] = True
            elif value.lower() == 'false':
                result[key] = False
            elif value.lower() == 'null':
                result[key] = None
            elif value.startswith('"') or value.startswith("'"):
                result[key] = value.strip('"\'')
            elif value.isdigit() or (value.startswith('-') and value[1:].isdigit()):
                result[key] = int(value)
            elif re.match(r'^\d+\.\d+$', value):
                result[key] = float(value)
            elif value.startswith('[') and value.endswith(']'):
                # Array simple
                result[key] = []
            elif value.startswith('{') and value.endswith('}'):
                # Nested object
                result[key] = {}
            else:
                result[key] = value
    
    return result


def _extract_console_logs(content: str) -> list[str]:
    """Extrait les console.log attendus des specs."""
    logs = []
    
    # Chercher section Console Logs ou Logs
    patterns = [
        r'##\s*Console Logs.*?```\s*(.*?)```',
        r'##\s*Logs.*?```\s*(.*?)```',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, content, re.DOTALL | re.IGNORECASE)
        if match:
            logs_text = match.group(1).strip()
            # Extraire chaque ligne qui ressemble à un log
            for line in logs_text.split('\n'):
                line = line.strip().strip('`')
                if line and not line.startswith('#'):
                    logs.append(line)
            return logs
    
    # Fallback: chercher dans le code JS les console.log
    js_logs = re.findall(r'console\.(log|warn|error)\([\'"]([^\'"]+)[\'"]', content)
    for _, msg in js_logs[:5]:  # Limiter à 5
        logs.append(msg)
    
    return logs if logs else ["{workflow}: démarrage", "{workflow}: terminé"]


def _extract_mock_data(content: str, wf_name: str) -> dict:
    """Extrait ou génère les données mock nécessaires."""
    mock_data = {}
    
    # Chercher section Dependencies ou Dépendances
    if re.search(r'localStorage', content, re.IGNORECASE):
        mock_data["localStorage"] = {}
        # Essayer de trouver les clés utilisées
        ls_keys = re.findall(r'localStorage\.getItem\([\'"]([\w_]+)[\'"]', content)
        for key in set(ls_keys):
            mock_data["localStorage"][key] = "mock_value"
    
    # Pour auth-submit, générer structure standard
    if wf_name == "auth-submit":
        mock_data["localStorage"] = mock_data.get("localStorage", {})
        mock_data["pouchDb"] = {
            "users": [
                {
                    "_id": "user_test@example.com",
                    "email": "test@example.com",
                    "name": "Test User",
                    "password_hash": "hashed_password"
                }
            ]
        }
    elif wf_name == "initial-load":
        mock_data["localStorage"] = {
            "auth_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock",
            "auth_user": '{"id":"user_123","email":"test@example.com"}'
        }
    
    return mock_data


def _generate_test_from_spec(spec_path: Path, wf_name: str) -> dict:
    """Génère un fichier de test JSON à partir d'une spec wf-frontend."""
    content = spec_path.read_text(encoding="utf-8")
    
    # Extraire les sections
    test = {
        "scenario": f"{wf_name} - cas nominal",
        "feature": wf_name.replace('-', ' ').title(),
        "given": "Conditions initiales standards",
        "workflow": wf_name,
        "inputJson": {},
        "mockData": {},
        "consoleLogsExpected": [],
        "outputJson": {"success": True, "data": {}, "error": None}
    }
    
    # Extraire Entrées
    input_json = _extract_json_from_markdown(content, r'##\s*Entr[eé]es?')
    if input_json:
        test["inputJson"] = input_json
    
    # Extraire Sorties (succès)
    output_json = _extract_json_from_markdown(content, r'###\s*Succ[eè]s|##\s*Sorties?.*Succ[eè]s')
    if output_json:
        test["outputJson"] = output_json
    
    # Extraire ou générer console logs
    test["consoleLogsExpected"] = _extract_console_logs(content)
    
    # Générer mock data
    test["mockData"] = _extract_mock_data(content, wf_name)
    
    # Extraire description du scénario si présent
    scenario_match = re.search(r'##\s*Sc[eé]nario\s*([\w\s-]+)', content, re.IGNORECASE)
    if scenario_match:
        test["scenario"] = scenario_match.group(1).strip()
    
    return test


def step_6_generate_workflow_tests(cell_path: Path, cell_name: str, dev_plan: dict) -> tuple[bool, list[str]]:
    """Génère automatiquement les fichiers de test workflows depuis les specs.
    
    Args:
        cell_path: Chemin de la cell
        cell_name: Nom de la cell
        dev_plan: Plan de développement avec la liste des workflows
        
    Returns:
        Tuple (ok, liste des fichiers créés)
    """
    console.print("[blue]🧪 Étape 4.6: Génération des tests workflows...")
    
    workflows = dev_plan.get("workflows", [])
    if not workflows:
        console.print("  [dim]ℹ Aucun workflow à tester")
        return True, []
    
    # Créer le dossier tests-workflows
    tests_dir = cell_path / ".specs" / "tests-workflows"
    tests_dir.mkdir(parents=True, exist_ok=True)
    
    created_files = []
    
    for wf_name in workflows:
        # Chercher le fichier de spec
        spec_dir = cell_path / ".specs" / "wf-frontend"
        spec_file = spec_dir / f"{wf_name}.md"
        
        if not spec_file.exists():
            console.print(f"  [yellow]⚠ Spec non trouvée: {spec_file}")
            continue
        
        # Générer le test
        test_data = _generate_test_from_spec(spec_file, wf_name)
        
        # Déterminer le nom du fichier
        # Si plusieurs cas possibles, on génère le cas nominal
        test_file = tests_dir / f"{wf_name}-nominal.json"
        
        # Écrire le fichier
        test_file.write_text(
            json.dumps(test_data, indent=2, ensure_ascii=False),
            encoding="utf-8"
        )
        created_files.append(f".specs/tests-workflows/{test_file.name}")
        console.print(f"  [green]✓ Test généré: {test_file.name}")
    
    console.print(f"[green]✅ {len(created_files)} fichier(s) de test généré(s)")
    return True, created_files


def step_6_check_workflow_tests(cell_path: Path, cell_name: str, dev_plan: dict) -> tuple[bool, list[str]]:
    """Vérifie que les tests workflows existent, génère si manquants.
    
    Mode interactif: propose de générer les tests manquants.
    """
    console.print("[blue]🔍 Étape 4.6: Vérification des tests workflows...")
    
    workflows = dev_plan.get("workflows", [])
    if not workflows:
        console.print("  [dim]ℹ Aucun workflow")
        return True, []
    
    tests_dir = cell_path / ".specs" / "tests-workflows"
    
    missing_tests = []
    existing_tests = []
    
    for wf_name in workflows:
        # Chercher un fichier de test existant pour ce workflow
        if tests_dir.exists():
            test_files = list(tests_dir.glob(f"{wf_name}*.json"))
            if test_files:
                existing_tests.extend(test_files)
            else:
                missing_tests.append(wf_name)
        else:
            missing_tests.append(wf_name)
    
    if not missing_tests:
        console.print(f"  [green]✓ Tous les workflows ont des tests ({len(existing_tests)} fichier(s))")
    else:
        console.print(f"  [yellow]⚠ {len(missing_tests)} workflow(s) sans test:")
        for wf in missing_tests:
            console.print(f"    - {wf}")
        
        # Générer automatiquement
        console.print("  [blue]→ Génération automatique des tests manquants...")
        ok, created = step_6_generate_workflow_tests(cell_path, cell_name, dev_plan)
        existing_tests.extend(created)
    
    return True, existing_tests
