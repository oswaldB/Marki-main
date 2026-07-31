#!/usr/bin/env python3
"""Commande dev4 - Développe les cells avec stack Flask (20 étapes)."""

import subprocess
import sys
from pathlib import Path

import click
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Confirm

from .dev3_steps import (
    step_1_git_setup,
    step_2_verify_structure,
    step_3_healthy_test,
    step_4_analyze_specs,
    step_5_check_specs,
    step_6_generate_data_mapping,
    step_6_check_workflow_tests,
    step_7_clean_cell,
    step_8_generate_skeletons,
    step_9_flask_server,
    step_10_skeleton_tests,
    step_11_generate_ia,
    step_12_check_mockup_similarity,
    step_13_post_gen_tests,
    step_14_commit_git,
    step_15_create_devok,
)

from .test_generators import (
    extract_schema_from_datamapping,
    generate_api_contract_test,
    generate_workflow_tests,
    generate_all_tests,
)

console = Console()


def _detect_cell_type(specs_path):
    """Détecte le type de cell basé sur les specs présentes."""
    page_specs = specs_path / "page-specs.md"
    wf_specs = specs_path / "wf-specs.md"
    cron_specs = specs_path / "cron-specs.md"
    
    if cron_specs.exists():
        return "cron"
    elif wf_specs.exists():
        return "backend_wf"
    elif page_specs.exists():
        return "screen"
    return "screen"  # Défaut


@click.command()
@click.option("--project-dir", type=click.Path(exists=True, file_okay=False), help="Chemin du projet")
@click.option("--cell", "cell_name", help="Développer une cell spécifique")
@click.option("--yes", "-y", is_flag=True, help="Mode automatique sans confirmation")
@click.option("--skip-git", is_flag=True, help="Ne pas gérer git")
def dev4(project_dir, cell_name, yes, skip_git):
    """Étapes 1-20: Développement complet d'une cell (dev4) avec tests à chaque couche."""

    if project_dir is None:
        project_dir = Path.cwd()
    else:
        project_dir = Path(project_dir)

    templates_dir = project_dir / "dev-tools" / "DrDice" / "drdice" / "templates"

    cells_to_dev = []

    # Recherche dans .specs/ à la racine du projet
    specs_root = project_dir / ".specs"
    
    if cell_name:
        # Mode cell spécifique - chercher dans tous les sous-dossiers de .specs/
        specs_path = None
        for subdir in specs_root.rglob(cell_name):
            if subdir.is_dir():
                valide_md = subdir / "valide.md"
                devok_md = subdir / "devok.md"
                if valide_md.exists() and not devok_md.exists():
                    specs_path = subdir
                    break
        
        if specs_path:
            # Déterminer le type de cell basé sur le chemin parent
            parent_name = specs_path.parent.name
            if parent_name == "wf-backend":
                cell_type = "backend_wf"
                cell_path = project_dir / "app" / "backend_wf" / cell_name
            elif parent_name == "cron":
                cell_type = "cron"
                cell_path = project_dir / "app" / "cron" / cell_name
            else:  # page ou autre
                cell_type = "screen"
                cell_path = project_dir / "app" / "screens" / cell_name
            cells_to_dev.append((cell_path, specs_path))
        
        if not cells_to_dev:
            console.print(f"[red]❌ Cell '{cell_name}' non trouvée ou déjà développée")
            return 1
    else:
        # Mode batch - chercher toutes les specs valides récursivement
        if specs_root.exists():
            for valide_md in specs_root.rglob("valide.md"):
                specs_path = valide_md.parent
                devok_md = specs_path / "devok.md"
                if devok_md.exists():
                    continue
                
                cell_name_found = specs_path.name
                parent_name = specs_path.parent.name
                
                # Déterminer le type et créer le chemin
                if parent_name == "wf-backend":
                    cell_path = project_dir / "app" / "backend_wf" / cell_name_found
                elif parent_name == "cron":
                    cell_path = project_dir / "app" / "cron" / cell_name_found
                else:  # page ou autre
                    cell_path = project_dir / "app" / "screens" / cell_name_found
                cells_to_dev.append((cell_path, specs_path))

    if not cells_to_dev:
        console.print(Panel.fit("Aucune cell à développer", style="yellow"))
        return 0

    console.print(Panel.fit(f"Étapes 1-17: {len(cells_to_dev)} cell(s)", style="blue"))
    for cell_path, _ in cells_to_dev:
        console.print(f"  • {cell_path.name}")

    if not yes:
        if not Confirm.ask("\nContinuer?", default=True):
            return 0

    total = len(cells_to_dev)
    success_count = 0

    for i, (cell_path, specs_path) in enumerate(cells_to_dev, 1):
        console.print()
        console.print(f"[cyan]{'═' * 60}")
        console.print(f"[cyan]📦 [{i}/{total}] {cell_path.name}")
        console.print(f"[cyan]{'═' * 60}")

        max_retries = 100  # Retry illimité pour la similarité
        retry_count = 0
        cell_completed = False

        while retry_count <= max_retries and not cell_completed:
            if retry_count > 0:
                console.print(f"\n[yellow]🔄 Retry {retry_count}/{max_retries} - Redémarrage depuis l'étape 1")

            all_steps_ok = True
            dev_plan = {}
            generated_files = []
            test_results = {}
            commit_hash = None
            need_restart = False

            # ÉTAPE 1: Git Setup
            console.print("\n[magenta]📋 Étape 1/20: Git Setup")
            branch_name = step_1_git_setup(project_dir, cell_path.name)
            if not branch_name:
                console.print("[red]❌ Git Setup échoué - Arrêt du processus")
                all_steps_ok = False
            else:
                console.print(f"[green]✅ Branche: {branch_name}")

            # ÉTAPE 2: Vérification Structure
            if all_steps_ok:
                console.print("\n[magenta]📋 Étape 2/20: Vérification Structure")
                ok, _ = step_2_verify_structure(project_dir)
                if not ok:
                    console.print("[red]❌ Structure invalide - Arrêt du processus")
                    all_steps_ok = False

            # ÉTAPE 3: Healthy Test
            if all_steps_ok:
                console.print("\n[magenta]📋 Étape 3/20: Healthy Test")
                ok, _ = step_3_healthy_test()
                if not ok:
                    all_steps_ok = False
                    console.print("[red]❌ Services indisponibles - Arrêt du processus")

            # ÉTAPE 4: Analyse des Specs
            if all_steps_ok:
                console.print("\n[magenta]📋 Étape 4/20: Analyse des Specs")
                ok, dev_plan = step_4_analyze_specs(cell_path, specs_path)
                if not ok:
                    console.print("[red]❌ Analyse des specs échouée - Arrêt du processus")
                    all_steps_ok = False

            # ÉTAPE 5: Vérification page-specs.md
            if all_steps_ok:
                console.print("\n[magenta]📋 Étape 5/20: Vérification page-specs.md")
                ok = step_5_check_specs(cell_path, cell_path.name, templates_dir, dev_plan, specs_path)
                if not ok:
                    console.print("[red]❌ Vérification page-specs échouée - Arrêt du processus")
                    all_steps_ok = False

            # ÉTAPE 6: Génération Data Mapping Page (BLOQUANT)
            if all_steps_ok:
                console.print("\n[magenta]📋 Étape 6/20: Data Mapping Page")
                ok, _ = step_6_generate_data_mapping(project_dir, cell_path, cell_path.name, specs_path)
                if not ok:
                    console.print("[red]❌ Data Mapping non généré - Arrêt du processus")
                    all_steps_ok = False

            # ÉTAPE 6.5: Tests Modèles (validation Data Mapping)
            if all_steps_ok:
                console.print("\n[magenta]📋 Étape 6.5/20: Validation Data Mapping")
                ok, test_files = generate_all_tests(cell_path, specs_path)
                if not ok:
                    console.print("[red]❌ Génération des tests échouée - Arrêt du processus")
                    all_steps_ok = False
                else:
                    console.print(f"[green]✓ Tests générés: {len(test_files)} fichiers")

            # ÉTAPE 7: Génération/Vérification des tests workflows
            if all_steps_ok:
                console.print("\n[magenta]📋 Étape 7/20: Tests Workflows")
                ok, _ = step_6_check_workflow_tests(cell_path, cell_path.name, dev_plan, specs_path)
                if not ok:
                    console.print("[red]❌ Tests workflows manquants - Arrêt du processus")
                    all_steps_ok = False

            # ÉTAPE 8: Nettoyage de la Cell
            if all_steps_ok:
                console.print("\n[magenta]📋 Étape 8/20: Nettoyage de la Cell")
                ok = step_7_clean_cell(cell_path)
                if not ok:
                    console.print("[red]❌ Nettoyage échoué - Arrêt du processus")
                    all_steps_ok = False

            # ÉTAPE 9: Génération des Squelettes
            if all_steps_ok:
                console.print("\n[magenta]📋 Étape 9/20: Génération des Squelettes")
                ok, files = step_8_generate_skeletons(cell_path, dev_plan, templates_dir)
                if not ok:
                    console.print("[red]❌ Génération squelettes échouée - Arrêt du processus")
                    all_steps_ok = False

            # ÉTAPE 9.5: Tests API Contract
            if all_steps_ok:
                console.print("\n[magenta]📋 Étape 9.5/20: Tests API Contract")
                test_file = cell_path / 'test-api-contract.py'
                if test_file.exists():
                    result = subprocess.run(
                        [sys.executable, '-m', 'pytest', str(test_file), '-v', '--tb=short'],
                        cwd=project_dir,
                        capture_output=True,
                        text=True
                    )
                    if result.returncode != 0:
                        console.print("[red]❌ Tests API Contract échoués:")
                        console.print(result.stdout)
                        console.print(result.stderr)
                        all_steps_ok = False
                    else:
                        console.print("[green]✓ Tests API Contract passés")
                else:
                    console.print("[yellow]⚠ Fichier test-api-contract.py non trouvé")

            # ÉTAPE 10: Flask Server
            if all_steps_ok:
                console.print("\n[magenta]📋 Étape 10/20: Flask Server")
                ok, _ = step_9_flask_server(project_dir, cell_path, cell_path.name)
                if not ok:
                    console.print("[red]❌ Démarrage Flask Server échoué - Arrêt du processus")
                    all_steps_ok = False

            # ÉTAPE 11: Skeleton Tests
            if all_steps_ok:
                console.print("\n[magenta]📋 Étape 11/20: Skeleton Tests")
                ok, _ = step_10_skeleton_tests(
                    cell_path,
                    cell_path.name,
                    dev_plan.get("cell_type", "frontend"),
                    dev_plan.get("workflows", [])
                )
                if not ok:
                    console.print("[red]❌ Skeleton Tests échoués - Arrêt du processus")
                    all_steps_ok = False

            # ÉTAPE 12: Génération IA
            if all_steps_ok:
                console.print("\n[magenta]📋 Étape 12/20: Génération IA")
                ok, generated_files = step_11_generate_ia(cell_path, dev_plan)
                if not ok:
                    console.print("[red]❌ Génération IA échouée - Arrêt du processus")
                    all_steps_ok = False

            # ÉTAPE 12.5: Tests Workflows Frontend
            if all_steps_ok:
                console.print("\n[magenta]📋 Étape 12.5/20: Tests Workflows Frontend")
                test_file = cell_path / 'test-workflows.js'
                if test_file.exists():
                    # Vérifier syntaxe des workflows générés
                    workflows_dir = cell_path / 'workflows'
                    if workflows_dir.exists():
                        js_files = list(workflows_dir.glob('*.js'))
                        syntax_ok = True
                        for js_file in js_files:
                            result = subprocess.run(
                                ['node', '--check', str(js_file)],
                                capture_output=True,
                                text=True
                            )
                            if result.returncode != 0:
                                console.print(f"[red]❌ Syntaxe invalide dans {js_file.name}")
                                syntax_ok = False
                        
                        if syntax_ok:
                            console.print(f"[green]✓ {len(js_files)} workflows valides")
                        else:
                            console.print("[red]❌ Erreurs de syntaxe dans les workflows - Arrêt du processus")
                            all_steps_ok = False
                else:
                    console.print("[yellow]⚠ Fichier test-workflows.js non trouvé")

            # ÉTAPE 13: Vérification Mockup Similarity
            if all_steps_ok:
                console.print("\n[magenta]📋 Étape 13/20: Vérification Mockup")
                ok, msg = step_12_check_mockup_similarity(cell_path, cell_path.name, auto=yes)
                if not ok:
                    console.print(f"[red]✗ Vérification mockup échouée: {msg}")
                    console.print(f"[yellow]→ Redémarrage automatique depuis l'étape 1")
                    need_restart = True

            # ÉTAPE 14: Tests Post-Génération (Feedback Loop désactivé)
            if all_steps_ok:
                console.print("\n[magenta]📋 Étape 14/20: Tests Post-Génération")
                
                ok, errors, rapport = step_13_post_gen_tests(cell_path, cell_path.name, generated_files, skip_playwright=False)
                
                # Détection erreurs JS critiques (is not defined)
                errors_str = str(errors) if errors else ""
                has_js_undefined = "is not defined" in errors_str
                
                # NOTE: Feedback Loop (régénération auto) désactivé - Tests scénarios mis en pause
                # needs_regeneration = rapport.get('needs_regeneration', False) if isinstance(rapport, dict) else False
                
                if not ok:
                    if has_js_undefined:
                        console.print("[red]❌ Erreur JS critique détectée (variable non définie)")
                        console.print(f"[yellow]→ Redémarrage automatique depuis l'étape 1")
                        need_restart = True
                    else:
                        console.print("[red]❌ Tests Post-Gen en échec - Arrêt du processus")
                        all_steps_ok = False
                else:
                    console.print("[green]✅ Tests Post-Gen réussis")
                
                test_results = rapport

            # Si redémarrage nécessaire, on incrémente et on continue le while
            if need_restart:
                retry_count += 1
                continue

            # ÉTAPE 15: Commit Git
            if all_steps_ok:
                console.print("\n[magenta]📋 Étape 15/20: Commit Git")
                ok, commit_hash = step_14_commit_git(cell_path, cell_path.name, skip_git)
                if not ok:
                    console.print("[red]❌ Commit Git échoué - Arrêt du processus")
                    all_steps_ok = False
                else:
                    console.print(f"[green]✓ Commit: {commit_hash}")

            # ÉTAPE 16: Création devok.md
            if all_steps_ok:
                console.print("\n[magenta]📋 Étape 16/20: Finalisation devok.md")
                ok, devok_path = step_15_create_devok(cell_path, cell_path.name, test_results, auto=yes)
                if not ok:
                    console.print("[red]❌ Création devok.md échouée - Arrêt du processus")
                    all_steps_ok = False
                else:
                    console.print(f"[green]✓ devok.md créé")
            
            # ÉTAPE 17: Commit du devok.md et Pull Request
            if all_steps_ok and not skip_git:
                console.print("\n[magenta]📋 Étape 17/20: Commit devok.md et Pull Request")
                
                step_17_ok = True
                
                # Commit du devok.md
                import subprocess
                git_root = cell_path.parent.parent.parent
                
                # git add devok.md
                result = subprocess.run(
                    ["git", "add", str(devok_path)],
                    cwd=git_root,
                    capture_output=True,
                    text=True
                )
                
                # git commit devok.md
                commit_msg = f"docs({cell_path.name}): marque cell comme développée [skip ci]"
                result = subprocess.run(
                    ["git", "commit", "-m", commit_msg],
                    cwd=git_root,
                    capture_output=True,
                    text=True
                )
                if result.returncode == 0:
                    console.print(f"[green]✓ Commit devok.md créé")
                else:
                    console.print("[red]❌ Commit devok.md échoué")
                    step_17_ok = False
                
                # Push de la branche (avec auto-setup upstream si nécessaire)
                if step_17_ok:
                    result = subprocess.run(
                        ["git", "push", "--set-upstream", "origin", branch_name],
                        cwd=git_root,
                        capture_output=True,
                        text=True
                    )
                    if result.returncode == 0:
                        console.print(f"[green]✓ Branche {branch_name} poussée")
                    elif "could not resolve host" in result.stderr.lower() or "no such host" in result.stderr.lower():
                        console.print(f"[yellow]⚠ Push impossible: remote non accessible")
                        console.print(f"[dim]→ Pour push plus tard: git push --set-upstream origin {branch_name}")
                        # Non bloquant si réseau inaccessible
                    else:
                        console.print("[red]❌ Push échoué")
                        step_17_ok = False
                
                # Création de la Pull Request via gh CLI
                if step_17_ok:
                    pr_title = f"feat({cell_path.name}): implémentation complète dev4"
                    pr_body = f"""## 📦 Cell développée: {cell_path.name}

Cette PR contient l'implémentation complète de la cell `{cell_path.name}` via le workflow dev4.

### ✅ Checklist
- [x] Analyse des specs
- [x] Data Mapping page créé
- [x] Génération des squelettes
- [x] Génération IA (Alpine.js + HTML)
- [x] Tests post-génération
- [x] Vérification mockup
- [x] Commit git
- [x] devok.md créé

### 📁 Fichiers générés
- `index.html`
- `main.js`
- `workflows/*.js`
- `.specs/data-mapping-page.md`
- `.specs/devok.md`

### 🔗 Références
- Méthode: dev4 (stack Flask)
- Stack: Alpine.js 3 + PouchDB + Caddy
"""
                    
                    # Vérifier si gh CLI est disponible
                    result = subprocess.run(
                        ["which", "gh"],
                        capture_output=True,
                        text=True
                    )
                    
                    if result.returncode == 0:
                        # Créer la PR
                        result = subprocess.run(
                            ["gh", "pr", "create", 
                             "--title", pr_title,
                             "--body", pr_body,
                             "--head", branch_name,
                             "--base", "main"],
                            cwd=git_root,
                            capture_output=True,
                            text=True
                        )
                        if result.returncode == 0:
                            pr_url = result.stdout.strip()
                            console.print(f"[green]✅ Pull Request créée: {pr_url}")
                        else:
                            console.print(f"[red]❌ Création PR échouée: {result.stderr}")
                            step_17_ok = False
                    else:
                        console.print("[red]❌ GitHub CLI (gh) non installé")
                        step_17_ok = False
                
                if step_17_ok:
                    success_count += 1
                else:
                    console.print("[red]❌ Étape 17 échouée - Cell non marquée comme succès")
            
            cell_completed = True

    console.print()
    console.print(f"[cyan]{'═' * 60}")
    console.print(f"[cyan]📊 Résumé Final - Étapes 1-20")
    console.print(f"[cyan]{'═' * 60}")
    console.print(f"Total cells: {total}")
    console.print(f"Succès: {success_count}")
    console.print(f"Échecs: {total - success_count}")

    return 0


def main():
    return dev4()


if __name__ == "__main__":
    sys.exit(main())
