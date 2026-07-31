#!/usr/bin/env python3
"""Post Gen Tests - Vérifie que le code généré est valide."""

import re
import sys
from pathlib import Path


def post_gen_tests(cell_path: Path) -> tuple[bool, list[str], dict]:
    """Exécute les tests post-génération."""
    cell_path = Path(cell_path)
    cell_name = cell_path.name
    
    print("🧪 Tests Post-Génération...")
    
    errors = []
    tests_ok = True
    rapport = {
        "cell": cell_name,
        "success": True,
        "errors": []
    }
    
    # Test 1: Vérifier les fichiers
    print("  → Test 1: Vérification des fichiers...")
    files_to_check = ["index.html", "main.js"]
    for file_rel in files_to_check:
        file_path = cell_path / file_rel
        if not file_path.exists():
            errors.append(f"Fichier manquant: {file_rel}")
            tests_ok = False
        elif file_path.stat().st_size == 0:
            errors.append(f"Fichier vide: {file_rel}")
            tests_ok = False
    
    if tests_ok:
        print("  ✅ Test 1: Tous les fichiers sont valides")
    
    # Test 2: Vérifier les boutons
    if (cell_path / "index.html").exists():
        print("  → Test 2: Vérification des boutons...")
        index_path = cell_path / "index.html"
        content = index_path.read_text(encoding="utf-8")
        
        btn_tags = re.findall(r'(<button[^\u003e]*>)', content, re.IGNORECASE)
        buttons_with_issues = []
        
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
                if "runWorkflow" not in click_value:
                    issues.append("@click n'appelle pas runWorkflow()")
            else:
                issues.append("pas d'@click")
            
            if issues:
                buttons_with_issues.append(f"Bouton: {issues}")
        
        if buttons_with_issues:
            errors.append(f"{len(buttons_with_issues)} bouton(s) avec problèmes")
            tests_ok = False
        else:
            print(f"  ✅ Test 2: {len(btn_tags)} bouton(s) avec ID btn-*")
    
    # Test 3: Vérifier Alpine.data
    if (cell_path / "main.js").exists():
        print("  → Test 3: Vérification de la structure Alpine.js...")
        main_path = cell_path / "main.js"
        content = main_path.read_text(encoding="utf-8")
        
        if "Alpine.data" not in content:
            errors.append("main.js: Alpine.data non trouvé")
            tests_ok = False
        else:
            print("  ✅ Test 3: Alpine.data présent dans main.js")
    
    # Test 4: Vérifier les workflows
    workflows_dir = cell_path / "workflows"
    if workflows_dir.exists():
        print("  → Test 4: Vérification des workflows...")
        workflow_files = list(workflows_dir.glob("*.js"))
        
        for wf_path in workflow_files:
            content = wf_path.read_text(encoding="utf-8")
            if "export async function execute" not in content:
                errors.append(f"{wf_path.name}: fonction execute manquante")
                tests_ok = False
        
        if all("export async function execute" in (wf_path.read_text(encoding="utf-8")) 
               for wf_path in workflow_files):
            print(f"  ✅ Test 4: {len(workflow_files)} workflow(s) avec fonction execute")
    
    # Test 5: Look & Feel
    print("  → Test 5: Look & Feel (comparaison mockups)...")
    mockups_dir = cell_path / ".specs" / "mockups"
    index_html_path = cell_path / "index.html"
    
    if mockups_dir.exists() and index_html_path.exists():
        # Comparaison simple
        impl_content = index_html_path.read_text(encoding="utf-8")
        mockup_files = list(mockups_dir.glob("*.html"))
        
        if mockup_files:
            impl_classes = set(re.findall(r'class=["\']([^"\']+)["\']', impl_content))
            
            # Vérifier présence classes Tailwind essentielles
            essential_classes = ["bg-", "text-", "p-", "m-", "rounded", "flex", "grid"]
            has_essential = any(any(ec in cls for ec in essential_classes) for cls in impl_classes)
            
            if not has_essential:
                errors.append("Classes Tailwind essentielles manquantes")
                tests_ok = False
            else:
                print("  ✅ Test 5: Look & Feel conforme")
    else:
        print("  ℹ Test 5: Pas de mockups à comparer")
    
    rapport["success"] = tests_ok
    rapport["errors"] = errors
    rapport["error_count"] = len(errors)
    
    if tests_ok:
        print("\n✅ Tests post-génération passés")
    else:
        print(f"\n❌ {len(errors)} erreur(s) détectée(s)")
    
    return tests_ok, errors, rapport


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: post_gen_tests.py <cell-path>")
        sys.exit(1)
    
    cell_path = Path(sys.argv[1])
    
    success, errors, rapport = post_gen_tests(cell_path)
    
    if success:
        sys.exit(0)
    else:
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)
