#!/usr/bin/env python3
"""Check Workflow Tests - Vérifie/génère les tests workflows."""

import json
import re
import sys
from pathlib import Path


def _extract_json_from_markdown(content: str, section_pattern: str) -> dict:
    """Extrait un bloc JSON d'une section markdown."""
    pattern = r'(?:' + section_pattern + r')\s*```(?:\w+)?\s*\n?(.*?)```'
    match = re.search(pattern, content, re.DOTALL | re.IGNORECASE)
    
    if match:
        code = match.group(1).strip()
        try:
            return json.loads(code)
        except json.JSONDecodeError:
            return {}
    return {}


def _extract_console_logs(content: str) -> list[str]:
    """Extrait les console.log attendus des specs."""
    logs = []
    patterns = [
        r'##\s*Console Logs.*?```\s*(.*?)```',
        r'##\s*Logs.*?```\s*(.*?)```',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, content, re.DOTALL | re.IGNORECASE)
        if match:
            logs_text = match.group(1).strip()
            for line in logs_text.split('\n'):
                line = line.strip().strip('`')
                if line and not line.startswith('#'):
                    logs.append(line)
            return logs
    
    # Fallback
    js_logs = re.findall(r'console\.(log|warn|error)\([\'"]([^\'"]+)[\'"]', content)
    for _, msg in js_logs[:5]:
        logs.append(msg)
    
    return logs if logs else ["{workflow}: démarrage", "{workflow}: terminé"]


def _generate_test_from_spec(spec_path: Path, wf_name: str) -> dict:
    """Génère un fichier de test JSON à partir d'une spec wf-frontend."""
    content = spec_path.read_text(encoding="utf-8")
    
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
    
    # Extraire Sorties
    output_json = _extract_json_from_markdown(content, r'###\s*Succ[eè]s|##\s*Sorties?.*Succ[eè]s')
    if output_json:
        test["outputJson"] = output_json
    
    # Console logs
    test["consoleLogsExpected"] = _extract_console_logs(content)
    
    return test


def check_workflow_tests(cell_path: Path) -> tuple[bool, list[str]]:
    """Vérifie/génère les tests workflows."""
    cell_path = Path(cell_path)
    cell_name = cell_path.name
    
    print("🔍 Vérification des tests workflows...")
    
    # Trouver les workflows
    wf_frontend_dir = cell_path / ".specs" / "wf-frontend"
    if not wf_frontend_dir.exists():
        print("  ℹ Aucun workflow à tester")
        return True, []
    
    workflows = [f.stem for f in wf_frontend_dir.glob("*.md")]
    if not workflows:
        print("  ℹ Aucun workflow à tester")
        return True, []
    
    # Créer le dossier tests-workflows
    tests_dir = cell_path / ".specs" / "tests-workflows"
    tests_dir.mkdir(parents=True, exist_ok=True)
    
    created_files = []
    
    for wf_name in workflows:
        spec_file = wf_frontend_dir / f"{wf_name}.md"
        test_file = tests_dir / f"{wf_name}-nominal.json"
        
        if test_file.exists():
            continue
        
        if not spec_file.exists():
            print(f"  ⚠ Spec non trouvée: {spec_file}")
            continue
        
        # Générer le test
        test_data = _generate_test_from_spec(spec_file, wf_name)
        test_file.write_text(
            json.dumps(test_data, indent=2, ensure_ascii=False),
            encoding="utf-8"
        )
        created_files.append(f"tests-workflows/{test_file.name}")
        print(f"  ✓ Test généré: {test_file.name}")
    
    print(f"✅ {len(created_files)} fichier(s) de test généré(s)")
    return True, created_files


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: check_workflow_tests.py <cell-path>")
        sys.exit(1)
    
    cell_path = Path(sys.argv[1])
    
    success, files = check_workflow_tests(cell_path)
    
    if success:
        for f in files:
            print(f"  - {f}")
        sys.exit(0)
    else:
        sys.exit(1)
