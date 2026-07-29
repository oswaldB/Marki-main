"""Étape 8: Génération des Squelettes - Crée les fichiers templates avec instructions."""

import json
import re
from pathlib import Path

from rich.console import Console

console = Console()


def _parse_workflow_specs(cell_path: Path, workflows: list[str]) -> list[dict]:
    """Lit les fichiers de test workflows depuis .specs/tests-workflows/."""
    workflow_tests = []
    tests_dir = cell_path / ".specs" / "tests-workflows"
    
    if not tests_dir.exists():
        return workflow_tests
    
    for test_file in sorted(tests_dir.glob("*.json")):
        try:
            test_data = json.loads(test_file.read_text(encoding="utf-8"))
            wf_name = test_data.get("workflow")
            if wf_name not in workflows:
                continue
            
            test_config = {
                "name": test_data.get("scenario", test_file.stem),
                "workflow": wf_name,
                "description": f"{test_data.get('feature', '')} - {test_data.get('given', '')}",
                "input": test_data.get("inputJson", {}),
                "expected": test_data.get("outputJson", {"success": True}),
                "mockData": test_data.get("mockData", {}),
                "consoleLogsExpected": test_data.get("consoleLogsExpected", [])
            }
            workflow_tests.append(test_config)
        except Exception as e:
            console.print(f"  [red]✗ Erreur {test_file.name}: {e}")
    
    return workflow_tests


def _load_template(template_path: Path, replacements: dict) -> str:
    """Charge un template et remplace les variables."""
    if not template_path.exists():
        return ""
    content = template_path.read_text(encoding="utf-8")
    for key, value in replacements.items():
        content = content.replace(f"{{{key}}}", value)
    return content


def _generate_workflow_registration(workflows: list[str]) -> str:
    """Génère le code d'enregistrement des workflows dans window.workflows."""
    if not workflows:
        return ""
    registrations = []
    for wf in workflows:
        wf_var = wf.replace('-', '_')
        registrations.append(f"    '{wf}': {{ execute: {wf_var}Execute }}")
    return ",\n".join(registrations)


def _get_first_workflow_for_button(workflows: list[str]) -> str:
    """Retourne le premier workflow non 'initial-load' pour le bouton d'exemple."""
    for wf in workflows:
        if wf != 'initial-load':
            return wf
    return 'submit'


def _generate_workflow_tests_js(workflow_tests: list[dict]) -> str:
    """Génère le code JS pour les tests des workflows."""
    if not workflow_tests:
        return "// Aucun workflow à tester"
    
    lines = []
    for test in workflow_tests:
        lines.append(f"""    {{
        name: '{test['name']}',
        workflow: '{test['workflow']}',
        description: '{test['description']}',
        input: {json.dumps(test['input'], ensure_ascii=False, indent=8)},
        expected: {json.dumps(test['expected'], ensure_ascii=False, indent=8)},
        mockData: {json.dumps(test.get('mockData', {}), ensure_ascii=False, indent=8)}
    }}""")
    return ",\n".join(lines)


def step_8_generate_skeletons(cell_path: Path, dev_plan: dict, templates_dir: Path) -> tuple[bool, list[str]]:
    """Génère les fichiers squelettes pour la cell."""
    console.print("[blue]🏗️ Génération des squelettes...")

    cell_name = dev_plan["cell_name"]
    cell_type = dev_plan["cell_type"]
    squelettes_dir = templates_dir / "static-stack" / "squelettes"
    created_files = []

    if cell_type == "frontend":
        alpine_component = f"{cell_name}Page"
        workflows = dev_plan.get("workflows", [])
        
        # index.html
        template = squelettes_dir / "frontend" / "index.html"
        content = _load_template(template, {"cell_name": cell_name, "name": cell_name})
        first_wf = _get_first_workflow_for_button(workflows)
        content = content.replace("runWorkflow('submit')", f"runWorkflow('{first_wf}')")
        (cell_path / "index.html").write_text(content, encoding="utf-8")
        created_files.append("index.html")

        # main.js
        template = squelettes_dir / "frontend" / "main.js"
        content = template.read_text(encoding="utf-8")
        content = content.replace("{cell_name}Page", alpine_component)
        content = content.replace("{cell_name}", cell_name)
        
        if workflows:
            imports = [f"import {{ execute as {wf.replace('-', '_')}Execute }} from './workflows/{wf}.js';" for wf in workflows]
            logs = [f"console.log('{wf}.js loaded');" for wf in workflows]
            content = content.replace("// WORKFLOW_IMPORTS_PLACEHOLDER", "\n".join(imports))
            content = content.replace("    // WORKFLOW_REGISTRATION_PLACEHOLDER", _generate_workflow_registration(workflows))
            content = content.replace("// WORKFLOW_LOGS_PLACEHOLDER", "\n".join(logs))
        
        (cell_path / "main.js").write_text(content, encoding="utf-8")
        created_files.append("main.js")

        # Workflows
        workflows_dir = cell_path / "workflows"
        workflows_dir.mkdir(exist_ok=True)
        workflow_template = squelettes_dir / "frontend" / "workflow.js"
        
        for wf_name in workflows:
            content = _load_template(workflow_template, {
                "cell_name": cell_name, "name": cell_name, "wf_name": wf_name
            })
            (workflows_dir / f"{wf_name}.js").write_text(content, encoding="utf-8")
            created_files.append(f"workflows/{wf_name}.js")
        
        # Page de test des workflows
        if workflows and len([w for w in workflows if w != "initial-load"]) > 0:
            workflow_tests = _parse_workflow_specs(cell_path, workflows)
            test_template = squelettes_dir / "test" / "test-workflows.html"
            test_content = _load_template(test_template, {"cell_name": cell_name, "name": cell_name})
            
            test_imports = [f"import {{ execute as {wf.replace('-', '_')}Execute }} from '../workflows/{wf}.js';" for wf in workflows]
            test_registrations = [f"    '{wf}': {{ execute: {wf.replace('-', '_')}Execute }}" for wf in workflows]
            test_logs = [f"console.log('{wf}.js loaded in test page');" for wf in workflows]
            tests_js = _generate_workflow_tests_js(workflow_tests)
            
            test_content = test_content.replace("// WORKFLOW_IMPORTS_PLACEHOLDER", "\n".join(test_imports))
            test_content = test_content.replace("    // WORKFLOW_REGISTRATION_PLACEHOLDER", ",\n".join(test_registrations))
            test_content = test_content.replace("// WORKFLOW_LOGS_PLACEHOLDER", "\n".join(test_logs))
            test_content = test_content.replace("// WORKFLOW_TESTS_PLACEHOLDER", tests_js)
            
            # Créer le dossier tests dans app/site/ (pas dans app/)
            tests_dir = cell_path.parent / "tests"
            tests_dir.mkdir(exist_ok=True)
            (tests_dir / f"test-{cell_name}-workflows.html").write_text(test_content, encoding="utf-8")
            created_files.append(f"../tests/test-{cell_name}-workflows.html")
            console.print(f"  [green]✓ Page de test générée: app/site/tests/test-{cell_name}-workflows.html")

    else:  # backend
        template = squelettes_dir / "backend" / "index.js"
        content = _load_template(template, {"cell_name": cell_name, "name": cell_name})
        (cell_path / "index.js").write_text(content, encoding="utf-8")
        created_files.append("index.js")

        template = squelettes_dir / "backend" / "package.json"
        content = _load_template(template, {"cell_name": cell_name, "name": cell_name})
        (cell_path / "package.json").write_text(content, encoding="utf-8")
        created_files.append("package.json")

    console.print(f"[green]✅ {len(created_files)} squelettes générés")
    return True, created_files
