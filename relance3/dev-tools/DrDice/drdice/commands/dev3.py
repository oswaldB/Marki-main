#!/usr/bin/env python3
"""Commande dev3 - Développe les cells avec stack statique."""

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
    step_4_5_check_specs,
    step_5_clean_cell,
    step_6_generate_skeletons,
    step_7_update_caddyfile,
    step_8_skeleton_tests,
    step_9_generate_ia,
)

console = Console()


@click.command()
@click.option("--project-dir", type=click.Path(exists=True, file_okay=False), help="Chemin du projet")
@click.option("--cell", "cell_name", help="Développer une cell spécifique")
@click.option("--yes", "-y", is_flag=True, help="Mode automatique sans confirmation")
def dev3(project_dir, cell_name, yes):
    """Étapes 1-9: Git + Structure + Healthy + Analyse + Nettoyage + Squelettes + Caddy + Skeleton + Génération IA."""

    if project_dir is None:
        project_dir = Path.cwd()
    else:
        project_dir = Path(project_dir)

    templates_dir = project_dir / "dev-tools" / "DrDice" / "drdice" / "templates"

    cells_to_dev = []

    if cell_name:
        for path in project_dir.rglob(".specs"):
            if path.parent.name == cell_name:
                # Ignorer la cell healthy (système)
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
            # Ignorer la cell healthy (système)
            if path.parent.name == "healthy":
                continue
            valide_md = path / "valide.md"
            devok_md = path / "devok.md"
            if valide_md.exists() and not devok_md.exists():
                cells_to_dev.append(path.parent)

    if not cells_to_dev:
        console.print(Panel.fit("Aucune cell à développer", style="yellow"))
        return 0

    console.print(Panel.fit(f"Étapes 1-9: {len(cells_to_dev)} cell(s)", style="blue"))
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

        all_steps_ok = True
        dev_plan = {}

        # ÉTAPE 1
        console.print("\n[magenta]📋 Étape 1/12: Git Setup")
        branch_name = step_1_git_setup(project_dir, cell_path.name)
        if branch_name:
            console.print(f"[green]✅ Branche: {branch_name}")

        # ÉTAPE 2
        console.print("\n[magenta]📋 Étape 2/12: Vérification Structure")
        ok, _ = step_2_verify_structure(project_dir)
        if not ok:
            all_steps_ok = False

        # ÉTAPE 3
        if all_steps_ok:
            console.print("\n[magenta]📋 Étape 3/12: Healthy Test")
            ok, _ = step_3_healthy_test()
            if not ok:
                all_steps_ok = False
                console.print(f"[red]❌ Services indisponibles")

        # ÉTAPE 4
        if all_steps_ok:
            console.print("\n[magenta]📋 Étape 4/12: Analyse des Specs")
            ok, dev_plan = step_4_analyze_specs(cell_path)
            if not ok:
                all_steps_ok = False

        # ÉTAPE 4.5: Vérification/Création page-specs.md
        if all_steps_ok:
            console.print("\n[magenta]📋 Étape 4.5/12: Vérification page-specs.md")
            step_4_5_check_specs(cell_path, cell_path.name, templates_dir)

        # ÉTAPE 5
        if all_steps_ok:
            console.print("\n[magenta]📋 Étape 5/12: Nettoyage de la Cell")
            ok = step_5_clean_cell(cell_path)
            if not ok:
                all_steps_ok = False

        # ÉTAPE 6
        if all_steps_ok:
            console.print("\n[magenta]📋 Étape 6/12: Génération des Squelettes")
            ok, files = step_6_generate_skeletons(cell_path, dev_plan, templates_dir)
            if not ok:
                all_steps_ok = False

        # ÉTAPE 7
        if all_steps_ok:
            console.print("\n[magenta]📋 Étape 7/12: Update Caddyfile")
            ok, _ = step_7_update_caddyfile(cell_path, cell_path.name)
            if not ok:
                all_steps_ok = False

        # ÉTAPE 8
        if all_steps_ok:
            console.print("\n[magenta]📋 Étape 8/12: Skeleton Tests")
            ok, _ = step_8_skeleton_tests(cell_path, cell_path.name, dev_plan.get("cell_type", "frontend"), dev_plan.get("workflows", []))
            if not ok:
                all_steps_ok = False

        # ÉTAPE 9: Génération IA (obligatoire)
        if all_steps_ok:
            console.print("\n[magenta]📋 Étape 9/12: Génération IA")
            ok, files = step_9_generate_ia(cell_path, dev_plan)
            if ok:
                success_count += 1
            else:
                all_steps_ok = False

    console.print()
    console.print(f"[cyan]{'═' * 60}")
    console.print(f"[cyan]📊 Résumé - Étapes 1-9")
    console.print(f"[cyan]{'═' * 60}")
    console.print(f"Total: {total} | Succès: {success_count}")

    return 0


def main():
    return dev3()


if __name__ == "__main__":
    sys.exit(main())
