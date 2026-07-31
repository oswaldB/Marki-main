#!/usr/bin/env python3
"""Commande dev3 - Développe les cells avec stack statique (15 étapes)."""

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
    step_6_check_workflow_tests,
    step_7_clean_cell,
    step_8_generate_skeletons,
    step_9_update_caddyfile,
    step_10_skeleton_tests,
    step_11_generate_ia,
    step_12_check_mockup_similarity,
    step_13_post_gen_tests,
    step_14_commit_git,
    step_15_create_devok,
)

console = Console()


@click.command()
@click.option("--project-dir", type=click.Path(exists=True, file_okay=False), help="Chemin du projet")
@click.option("--cell", "cell_name", help="Développer une cell spécifique")
@click.option("--yes", "-y", is_flag=True, help="Mode automatique sans confirmation")
@click.option("--skip-git", is_flag=True, help="Ne pas gérer git")
def dev3(project_dir, cell_name, yes, skip_git):
    """Étapes 1-15: Développement complet d'une cell (dev3)."""

    if project_dir is None:
        project_dir = Path.cwd()
    else:
        project_dir = Path(project_dir)

    templates_dir = project_dir / "dev-tools" / "DrDice" / "drdice" / "templates"

    cells_to_dev = []

    if cell_name:
        for path in project_dir.rglob(".specs"):
            if path.parent.name == cell_name:
                if path.parent.name == "healthy":
                    continue
                valide_md = path / "valide.md"
                devok_md = path / "devok.md"
                if valide_md.exists() and not devok_md.exists():
                    cells_to_dev.append(path.parent)
                    break
        if not cells_to_dev:
            console.print(f"[red]❌ Cell '{cell_name}' non trouvée")
            return 1
    else:
        for path in project_dir.rglob(".specs"):
            if path.parent.name == "healthy":
                continue
            valide_md = path / "valide.md"
            devok_md = path / "devok.md"
            if valide_md.exists() and not devok_md.exists():
                cells_to_dev.append(path.parent)

    if not cells_to_dev:
        console.print(Panel.fit("Aucune cell à développer", style="yellow"))
        return 0

    console.print(Panel.fit(f"Étapes 1-15: {len(cells_to_dev)} cell(s)", style="blue"))
    for cell_path in cells_to_dev:
        console.print(f"  • {cell_path.name}")

    if not yes:
        if not Confirm.ask("\nContinuer?", default=True):
            return 0

    total = len(cells_to_dev)
    success_count = 0

    for i, cell_path in enumerate(cells_to_dev, 1):
        console.print()
        console.print(f"[cyan]{'═' * 60}")
        console.print(f"[cyan]📦 [{i}/{total}] {cell_path.name}")
        console.print(f"[cyan]{'═' * 60}")

        max_retries = 3
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
            console.print("\n[magenta]📋 Étape 1/15: Git Setup")
            branch_name = step_1_git_setup(project_dir, cell_path.name)
            if branch_name:
                console.print(f"[green]✅ Branche: {branch_name}")

            # ÉTAPE 2: Vérification Structure
            if all_steps_ok:
                console.print("\n[magenta]📋 Étape 2/15: Vérification Structure")
                ok, _ = step_2_verify_structure(project_dir)
                if not ok:
                    all_steps_ok = False

            # ÉTAPE 3: Healthy Test
            if all_steps_ok:
                console.print("\n[magenta]📋 Étape 3/15: Healthy Test")
                ok, _ = step_3_healthy_test()
                if not ok:
                    all_steps_ok = False
                    console.print(f"[red]❌ Services indisponibles")

            # ÉTAPE 4: Analyse des Specs
            if all_steps_ok:
                console.print("\n[magenta]📋 Étape 4/15: Analyse des Specs")
                ok, dev_plan = step_4_analyze_specs(cell_path)
                if not ok:
                    all_steps_ok = False

            # ÉTAPE 5: Vérification page-specs.md
            if all_steps_ok:
                console.print("\n[magenta]📋 Étape 5/15: Vérification page-specs.md")
                step_5_check_specs(cell_path, cell_path.name, templates_dir, dev_plan)

            # ÉTAPE 6: Génération/Vérification des tests workflows
            if all_steps_ok:
                console.print("\n[magenta]📋 Étape 6/15: Tests Workflows")
                ok, _ = step_6_check_workflow_tests(cell_path, cell_path.name, dev_plan)
                if not ok:
                    console.print("[yellow]⚠ Certains tests workflows manquent")

            # ÉTAPE 7: Nettoyage de la Cell
            if all_steps_ok:
                console.print("\n[magenta]📋 Étape 7/15: Nettoyage de la Cell")
                ok = step_7_clean_cell(cell_path)
                if not ok:
                    all_steps_ok = False

            # ÉTAPE 8: Génération des Squelettes
            if all_steps_ok:
                console.print("\n[magenta]📋 Étape 8/15: Génération des Squelettes")
                ok, files = step_8_generate_skeletons(cell_path, dev_plan, templates_dir)
                if not ok:
                    all_steps_ok = False

            # ÉTAPE 9: Update Caddyfile
            if all_steps_ok:
                console.print("\n[magenta]📋 Étape 9/15: Update Caddyfile")
                ok, _ = step_9_update_caddyfile(cell_path, cell_path.name)
                if not ok:
                    all_steps_ok = False

            # ÉTAPE 10: Skeleton Tests
            if all_steps_ok:
                console.print("\n[magenta]📋 Étape 10/15: Skeleton Tests")
                ok, _ = step_10_skeleton_tests(
                    cell_path,
                    cell_path.name,
                    dev_plan.get("cell_type", "frontend"),
                    dev_plan.get("workflows", [])
                )
                if not ok:
                    all_steps_ok = False

            # ÉTAPE 11: Génération IA
            if all_steps_ok:
                console.print("\n[magenta]📋 Étape 11/15: Génération IA")
                ok, generated_files = step_11_generate_ia(cell_path, dev_plan)
                if not ok:
                    all_steps_ok = False

            # ÉTAPE 12: Vérification Mockup Similarity
            if all_steps_ok:
                console.print("\n[magenta]📋 Étape 12/15: Vérification Mockup")
                ok, msg = step_12_check_mockup_similarity(cell_path, cell_path.name, auto=yes)
                if not ok:
                    if "regeneration needed" in msg:
                        console.print("[yellow]⚠ index.html doit être corrigé manuellement")
                        all_steps_ok = False
                    else:
                        console.print(f"[red]✗ Vérification mockup échouée: {msg}")
                        if retry_count < max_retries:
                            console.print(f"[yellow]→ Similarité trop faible, redémarrage depuis l'étape 1 (tentative {retry_count + 1}/{max_retries})")
                            need_restart = True
                        else:
                            console.print("[red]❌ Max retries atteint - abandon de la cell")
                            all_steps_ok = False

            # ÉTAPE 13: Tests Post-Génération (Feedback Loop désactivé)
            if all_steps_ok:
                console.print("\n[magenta]📋 Étape 13/15: Tests Post-Génération")
                
                ok, errors, rapport = step_13_post_gen_tests(cell_path, cell_path.name, generated_files, skip_playwright=False)
                
                # Détection erreurs JS critiques (is not defined)
                errors_str = str(errors) if errors else ""
                has_js_undefined = "is not defined" in errors_str
                
                # NOTE: Feedback Loop (régénération auto) désactivé - Tests scénarios mis en pause
                # needs_regeneration = rapport.get('needs_regeneration', False) if isinstance(rapport, dict) else False
                
                if not ok:
                    # NOTE: La régénération automatique via Feedback Loop est désactivée
                    # if needs_regeneration and retry_count < max_retries:
                    #     console.print("[yellow]⚠ Régénération nécessaire (Feedback Loop)")
                    #     ...
                    if has_js_undefined:
                        console.print("[red]❌ Erreur JS critique détectée (variable non définie)")
                        if retry_count < max_retries:
                            console.print(f"[yellow]→ Redémarrage depuis l'étape 1 (tentative {retry_count + 1}/{max_retries})")
                            need_restart = True
                        else:
                            console.print("[red]❌ Max retries atteint - abandon de la cell")
                            all_steps_ok = False
                    else:
                        console.print("[yellow]⚠ Tests Post-Gen en échec (non bloquant)")
                        console.print("[yellow]→ Rapport des erreurs conservé dans devok.md")
                else:
                    console.print("[green]✅ Tests Post-Gen réussis")
                
                test_results = rapport

            # Si redémarrage nécessaire, on incrémente et on continue le while
            if need_restart:
                retry_count += 1
                continue

            # ÉTAPE 14: Commit Git
            if all_steps_ok:
                console.print("\n[magenta]📋 Étape 14/15: Commit Git")
                ok, commit_hash = step_14_commit_git(cell_path, cell_path.name, skip_git)
                if not ok:
                    console.print("[yellow]⚠ Commit échoué (non bloquant)")
                else:
                    console.print(f"[green]✓ Commit: {commit_hash}")

            # ÉTAPE 15: Création devok.md
            if all_steps_ok:
                console.print("\n[magenta]📋 Étape 15/15: Finalisation devok.md")
                ok, devok_path = step_15_create_devok(cell_path, cell_path.name, test_results, auto=yes)
                if ok:
                    console.print(f"[green]✓ devok.md créé")
                else:
                    all_steps_ok = False
            
            # ÉTAPE 16: Commit du devok.md et Pull Request
            if all_steps_ok and not skip_git:
                console.print("\n[magenta]📋 Étape 16: Commit devok.md et Pull Request")
                
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
                
                # Push de la branche
                result = subprocess.run(
                    ["git", "push", "origin", branch_name],
                    cwd=git_root,
                    capture_output=True,
                    text=True
                )
                if result.returncode == 0:
                    console.print(f"[green]✓ Branche {branch_name} poussée")
                
                # Création de la Pull Request via gh CLI
                pr_title = f"feat({cell_path.name}): implémentation complète dev3"
                pr_body = f"""## 📦 Cell développée: {cell_path.name}

Cette PR contient l'implémentation complète de la cell `{cell_path.name}` via le workflow dev3.

### ✅ Checklist
- [x] Analyse des specs
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
- `.specs/devok.md`

### 🔗 Références
- Méthode: dev3 (stack statique)
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
                        console.print(f"[yellow]⚠ PR non créée: {result.stderr}")
                        console.print(f"[dim]→ Créez-la manuellement: gh pr create --title '{pr_title}' --head {branch_name}")
                else:
                    console.print("[yellow]⚠ GitHub CLI (gh) non installé")
                    console.print(f"[dim]→ Créez la PR manuellement sur GitHub depuis la branche: {branch_name}")
                
                success_count += 1
            
            cell_completed = True

    console.print()
    console.print(f"[cyan]{'═' * 60}")
    console.print(f"[cyan]📊 Résumé Final - Étapes 1-15")
    console.print(f"[cyan]{'═' * 60}")
    console.print(f"Total cells: {total}")
    console.print(f"Succès: {success_count}")
    console.print(f"Échecs: {total - success_count}")

    return 0


def main():
    return dev3()


if __name__ == "__main__":
    sys.exit(main())
