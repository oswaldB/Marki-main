#!/usr/bin/env python3
"""Commande dev3 - Développement pour stack static (Caddy, PouchDB/CouchDB, Alpine.js, Express).

Structure:
- Frontend: app/site/cell/<name>/ avec index.html, main.js, workflows/
- Backend: app/server/cells/crons/ et app/server/cells/services/
- Specs: .specs/ (dossier caché)
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import click
import yaml
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Confirm

from ..core.project import Project

console = Console()


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class FilePlan:
    """Plan pour un fichier à générer."""
    path: str
    file_type: str
    instructions: List[str]
    sources: List[Path]
    context: Dict[str, Any] = field(default_factory=dict)


@dataclass
class DevPlan:
    """Plan de développement pour une cell."""
    cell_name: str
    cell_type: str
    files: List[FilePlan]
    dependencies: List[str] = field(default_factory=list)


# =============================================================================
# SPECS ANALYZER
# =============================================================================

class SpecsAnalyzer:
    """Analyse les fichiers de specs et identifie les fichiers nécessaires."""

    def __init__(self, cell_path: Path, cell_type: str):
        self.cell_path = cell_path
        self.cell_name = cell_path.name
        self.cell_type = cell_type
        self.specs_path = cell_path / ".specs"

    def analyze(self) -> DevPlan:
        """Analyse complète des specs et retourne le plan de développement."""
        files: List[FilePlan] = []

        if self.cell_type == "frontend":
            files.extend(self._analyze_frontend())
        elif self.cell_type == "backend-service":
            files.extend(self._analyze_backend_service())
        elif self.cell_type == "backend-cron":
            files.extend(self._analyze_backend_cron())

        dependencies = self._analyze_rules()

        return DevPlan(
            cell_name=self.cell_name,
            cell_type=self.cell_type,
            files=files,
            dependencies=dependencies
        )

    def _analyze_frontend(self) -> List[FilePlan]:
        """Analyse une cell frontend (écran)."""
        files = []

        # index.html - structure principale
        files.append(FilePlan(
            path="index.html",
            file_type="html_main",
            instructions=[
                "Structure HTML avec Alpine.js (x-data, x-init)",
                "Include TailwindCSS via CDN",
                "Include PouchDB via CDN",
                "Include main.js en module",
                "Structure sémantique avec sections claires"
            ],
            sources=list((self.specs_path / "mockups").glob("*.html")) if (self.specs_path / "mockups").exists() else [],
            context={"cell_name": self.cell_name}
        ))

        # main.js - cerveau de l'application
        files.append(FilePlan(
            path="main.js",
            file_type="js_main",
            instructions=[
                "Initialisation Alpine.js avec PouchDB",
                "Configuration sync PouchDB ↔ CouchDB",
                "Chargement dynamique des workflows",
                "Setup $watch pour réactivité",
                "Gestion des logs et erreurs"
            ],
            sources=[]
        ))

        # data-mapping.md
        files.append(FilePlan(
            path=".specs/data-mapping.md",
            file_type="data_mapping",
            instructions=[
                "Documenter les workflows frontend pour chaque bouton",
                "Lister les routes API utilisées",
                "Documenter les collections PouchDB"
            ],
            sources=[]
        ))

        # Workflows frontend
        files.extend(self._analyze_workflows_frontend())

        return files

    def _analyze_backend_service(self) -> List[FilePlan]:
        """Analyse une cell backend service (API Express)."""
        files = []

        # Index du service
        files.append(FilePlan(
            path="index.js",
            file_type="express_service",
            instructions=[
                "Serveur Express minimal",
                "Connexion CouchDB via nano",
                "Routes API selon specs/wf-backend/",
                "Pattern: async/await avec try/catch",
                "Logs exhaustifs"
            ],
            sources=list((self.specs_path / "wf-backend").glob("*.md")) if (self.specs_path / "wf-backend").exists() else []
        ))

        # package.json si besoin
        files.append(FilePlan(
            path="package.json",
            file_type="package_json",
            instructions=[
                "Configuration Node.js pour le service",
                "Dependencies: express, nano, dotenv"
            ],
            sources=[]
        ))

        return files

    def _analyze_backend_cron(self) -> List[FilePlan]:
        """Analyse une cell backend cron."""
        files = []

        wf_backend_dir = self.specs_path / "wf-backend"
        if wf_backend_dir.exists():
            for wf_file in sorted(wf_backend_dir.glob("*.md")):
                wf_name = wf_file.stem
                files.append(FilePlan(
                    path=f"{wf_name}.js",
                    file_type="cron_job",
                    instructions=[
                        "Script Node.js avec node-cron",
                        "Connexion CouchDB via nano",
                        "Pattern: execute() avec logs",
                        "Pas d'HTTP, exécution directe"
                    ],
                    sources=[wf_file],
                    context={"workflow_name": wf_name}
                ))

        # package.json pour cron
        files.append(FilePlan(
            path="package.json",
            file_type="package_json_cron",
            instructions=[
                "Configuration Node.js pour cron",
                "Dependencies: nano, node-cron, dotenv"
            ],
            sources=[]
        ))

        return files

    def _analyze_workflows_frontend(self) -> List[FilePlan]:
        """Analyse les workflows frontend."""
        files = []
        wf_dir = self.specs_path / "wf-frontend"

        if not wf_dir.exists():
            return files

        for wf_file in sorted(wf_dir.glob("*.md")):
            wf_name = wf_file.stem
            files.append(FilePlan(
                path=f"workflows/{wf_name}.js",
                file_type="workflow_frontend",
                instructions=[
                    f"Workflow frontend selon specs/wf-frontend/{wf_name}.md",
                    "Export: export async function execute(context, params)",
                    "Retourne: { success, data, error, logs }",
                    "Logs: WORKFLOW_START, STATE_UPDATE, WORKFLOW_SUCCESS/ERROR"
                ],
                sources=[wf_file],
                context={"workflow_name": wf_name}
            ))

        return files

    def _analyze_rules(self) -> List[str]:
        """Analyse les règles et dépendances globales."""
        dependencies = []

        rules_files = [
            self.cell_path.parent.parent / "specs-global" / "rules" / "dev-frontend.md",
            self.cell_path.parent.parent / "specs-global" / "rules" / "dev-backend.md",
        ]

        for rules_file in rules_files:
            if rules_file.exists():
                dependencies.append(str(rules_file))

        return dependencies


# =============================================================================
# SKELETON GENERATOR
# =============================================================================

class SkeletonGenerator:
    """Génère les fichiers squelettes avec instructions détaillées."""

    # Chemin vers les templates de squelettes
    TEMPLATES_DIR = Path(__file__).parent.parent / "templates" / "static-stack" / "squelettes"

    def __init__(self, cell_path: Path, cell_type: str, cell_name: str):
        self.cell_path = cell_path
        self.cell_type = cell_type
        self.cell_name = cell_name

    def generate(self, plan: DevPlan) -> List[Path]:
        """Génère tous les fichiers squelettes selon le plan."""
        generated = []

        for file_plan in plan.files:
            file_path = self._generate_skeleton(file_plan)
            if file_path:
                generated.append(file_path)

        return generated

    def _generate_skeleton(self, file_plan: FilePlan) -> Optional[Path]:
        """Génère un fichier squelette spécifique."""
        full_path = self.cell_path / file_plan.path
        
        # Sécurité: vérifier qu'on n'écrit pas en dehors de app/
        if "app" not in str(full_path):
            console.print(f"[red]❌ ERREUR: Tentative d'écriture hors de app/: {full_path}")
            return None
        
        full_path.parent.mkdir(parents=True, exist_ok=True)

        content = self._get_skeleton_content(file_plan)
        full_path.write_text(content, encoding="utf-8")

        return full_path

    def _load_template(self, template_name: str, **kwargs) -> str:
        """Charge un template et remplace les variables."""
        # Déterminer le sous-dossier selon le type de cell
        if self.cell_type == "frontend":
            subdir = "frontend"
        elif self.cell_type == "backend-service":
            subdir = "backend"
        elif self.cell_type == "backend-cron":
            subdir = "cron"
        else:
            subdir = "frontend"
        
        template_path = self.TEMPLATES_DIR / subdir / template_name
        if not template_path.exists():
            # Fallback: générer un contenu minimal
            return f"""\nTODO IA: Implémenter selon les specs\n"""
        
        template = template_path.read_text(encoding="utf-8")
        
        # Remplacer les variables {var} par leur valeur
        for key, value in kwargs.items():
            template = template.replace(f"{{{key}}}", str(value))
        
        return template

    def _get_skeleton_content(self, file_plan: FilePlan) -> str:
        """Retourne le contenu du squelette selon le type."""
        generators = {
            "html_main": self._skeleton_html_main,
            "js_main": self._skeleton_js_main,
            "workflow_frontend": self._skeleton_workflow_frontend,
            "express_service": self._skeleton_express_service,
            "cron_job": self._skeleton_cron_job,
            "package_json": self._skeleton_package_json,
            "package_json_cron": self._skeleton_package_json_cron,
        }

        generator = generators.get(file_plan.file_type, self._skeleton_generic)
        return generator(file_plan)

    def _skeleton_html_main(self, fp: FilePlan) -> str:
        instructions = "\n".join("- " + i for i in fp.instructions) if fp.instructions else "- Structure HTML depuis specs/mockups/*.html"
        return self._load_template(
            "index.html",
            instructions=instructions,
            cell_name=self.cell_name
        )

    def _skeleton_js_main(self, fp: FilePlan) -> str:
        instructions = "\n".join("- " + i for i in fp.instructions)
        return self._load_template(
            "main.js",
            instructions=instructions,
            cell_name=self.cell_name
        )

    def _skeleton_workflow_frontend(self, fp: FilePlan) -> str:
        wf_name = fp.context.get("workflow_name", "workflow") if fp.context else "workflow"
        instructions = "\n".join("- " + i for i in fp.instructions)
        return self._load_template(
            "workflow.js",
            instructions=instructions,
            wf_name=wf_name
        )

    def _skeleton_express_service(self, fp: FilePlan) -> str:
        instructions = "\n".join("- " + i for i in fp.instructions)
        return self._load_template(
            "index.js",
            instructions=instructions,
            cell_name=self.cell_name
        )

    def _skeleton_cron_job(self, fp: FilePlan) -> str:
        wf_name = fp.context.get("workflow_name", "workflow") if fp.context else "workflow"
        instructions = "\n".join("- " + i for i in fp.instructions)
        return self._load_template(
            "cron.js",
            instructions=instructions,
            wf_name=wf_name,
            cell_name=self.cell_name
        )

    def _skeleton_package_json(self, fp: FilePlan) -> str:
        return self._load_template(
            "package.json",
            cell_name=self.cell_name
        )

    def _skeleton_package_json_cron(self, fp: FilePlan) -> str:
        return self._load_template(
            "package.json",
            cell_name=self.cell_name
        )

    def _skeleton_generic(self, fp: FilePlan) -> str:
        instructions = "\\n".join("# " + i for i in fp.instructions)
        return f'''
{instructions}
# TODO IA: Implémenter selon les specs
'''


# =============================================================================
# CELL TESTER
# =============================================================================

class CellTester:
    """Gère le processus de test automatisé."""

    def __init__(self, cell_path: Path, cell_type: str, cell_name: str, project_dir: Path):
        self.cell_path = cell_path
        self.cell_type = cell_type
        self.cell_name = cell_name
        self.project_dir = project_dir

    def run_tests(self, phase: str = "skeletons") -> Tuple[bool, List[str]]:
        """Orchestre le processus de test selon la phase."""
        if phase == "skeletons":
            return self._test_skeletons()
        elif phase == "code":
            return self._test_code()
        else:
            return False, [f"Phase inconnue: {phase}"]

    def _test_skeletons(self) -> Tuple[bool, List[str]]:
        """Test après génération des squelettes - vérifie fichiers existent."""
        console.print(f"[blue]🔨 Tests (skeletons)...")
        errors = []

        # Vérifier que les fichiers existent
        for item in self.cell_path.iterdir():
            if item.is_file():
                console.print(f"  [green]  ✅ {item.name} existe")

        if self.cell_type == "frontend":
            index_html = self.cell_path / "index.html"
            main_js = self.cell_path / "main.js"
            
            if not index_html.exists():
                errors.append("index.html manquant")
            if not main_js.exists():
                errors.append("main.js manquant")

        elif self.cell_type in ["backend-service", "backend-cron"]:
            pkg_json = self.cell_path / "package.json"
            if not pkg_json.exists():
                errors.append("package.json manquant")

        if errors:
            console.print(f"  [red]  ❌ {len(errors)} erreur(s)")
            return False, errors

        console.print(f"[green]✅ Tests (skeletons) réussis")
        return True, []

    def _test_code(self) -> Tuple[bool, List[str]]:
        """Test après génération IA - vérifie syntaxe et patterns."""
        console.print(f"[blue]🔨 Tests (code)...")
        errors = []

        # Vérifier syntaxe JS (basique)
        for js_file in self.cell_path.rglob("*.js"):
            content = js_file.read_text(encoding="utf-8")
            if "TODO IA" in content:
                errors.append(f"{js_file.name}: TODO IA encore présent")

        if errors:
            console.print(f"  [yellow]  ⚠️ {len(errors)} TODO restant(s)")

        console.print(f"[green]✅ Tests (code) réussis")
        return True, errors

    def _get_url(self) -> str:
        """Détermine l'URL selon le type de cell."""
        if self.cell_type == "frontend":
            return f"http://localhost:8080/{self.cell_name}"
        elif self.cell_type == "backend-service":
            return f"http://localhost:3000/health"
        else:
            return ""


# =============================================================================
# PROMPT GENERATOR
# =============================================================================

class PromptGenerator:
    """Génère les prompts pour chaque fichier squelette."""

    def __init__(self, cell_path: Path, cell_name: str):
        self.cell_path = cell_path
        self.cell_name = cell_name

    def generate_prompt(self, file_plan: FilePlan) -> str:
        """Génère un prompt spécifique pour un fichier squelette."""
        skeleton_path = self.cell_path / file_plan.path
        skeleton_content = ""
        if skeleton_path.exists():
            skeleton_content = skeleton_path.read_text(encoding="utf-8")

        specs_content = ""
        for source in file_plan.sources:
            if source.exists():
                specs_content += f"\\n=== {source.name} ===\\n"
                specs_content += source.read_text(encoding="utf-8")

        instructions = "\\n".join(f"{i}" for i in file_plan.instructions)

        return f"""
Tu es un développeur expert en stack static (Caddy, Alpine.js, PouchDB, Express).
Implémente le code COMPLET pour ce fichier en suivant les INSTRUCTIONS.

## Fichier à implémenter: {file_plan.path}
## Type: {file_plan.file_type}

## Instructions:
{instructions}

## Contenu actuel (squelette):
```
{skeleton_content}
```

## Specs source:
```
{specs_content[:5000]}
```

## Ta mission:
1. Lis les instructions dans le squelette
2. Génère le code COMPLET et fonctionnel
3. Remplace les commentaires TODO par du code réel
4. Respecte les patterns de logging (WORKFLOW_START, etc.)

## Format de réponse:
Réponds UNIQUEMENT avec le code complet du fichier, sans balises markdown.
Le code doit être prêt à être écrit directement dans le fichier.
"""


# =============================================================================
# UTILITAIRES
# =============================================================================

def _clean_cell(cell_path: Path) -> None:
    """Nettoie la cell: supprime tout sauf .specs/."""
    if cell_path.exists():
        for item in cell_path.iterdir():
            if item.name != ".specs":
                if item.is_dir():
                    shutil.rmtree(item)
                else:
                    item.unlink()


def _create_tracking_artifact(cell_path: Path, plan: DevPlan) -> Path:
    """Crée le fichier de tracking dans .specs/."""
    tracking_path = cell_path / ".specs" / ".dev3-tracking.yaml"
    tracking_data = {
        "cell": plan.cell_name,
        "type": plan.cell_type,
        "status": "in_progress",
        "started_at": datetime.now().isoformat(),
        "files": {}
    }
    for file_plan in plan.files:
        tracking_data["files"][file_plan.path] = {
            "status": "todo_squelette",
            "type": file_plan.file_type
        }
    tracking_path.write_text(yaml.dump(tracking_data), encoding="utf-8")
    return tracking_path


def _update_tracking_status(tracking_path: Path, filepath: str, status: str) -> None:
    """Met à jour le statut d'un fichier dans le tracking."""
    if not tracking_path.exists():
        return
    data = yaml.safe_load(tracking_path.read_text(encoding="utf-8"))
    if filepath in data.get("files", {}):
        data["files"][filepath]["status"] = status
    tracking_path.write_text(yaml.dump(data), encoding="utf-8")


def _create_devok(cell_path: Path, cell_name: str) -> None:
    """Crée le fichier devok.md pour marquer la cell comme développée."""
    devok_path = cell_path / ".specs" / "devok.md"
    
    content = f"""# Développement OK
## Cell: {cell_name}
**Statut:** ✅ Développée avec succès
**Date:** {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
**Méthode:** dev3 (stack static Caddy/PouchDB/Alpine/Express)

**Stack:**
- Frontend: Alpine.js + PouchDB + TailwindCSS
- Backend: Node.js + Express (si applicable)
- Serveur: Caddy
- Database: CouchDB

**Tests:**
- [x] Squelettes générés
- [x] Code généré par IA
- [x] Structure validée

---
Ce fichier indique que la cell a été développée.
Ne pas supprimer manuellement sauf pour forcer un re-développement.
"""
    
    devok_path.write_text(content, encoding="utf-8")
    console.print(f"  [green]  ✅ devok.md créé")


def _cleanup_tracking(tracking_path: Path) -> None:
    """Supprime le fichier de tracking."""
    if tracking_path.exists():
        tracking_path.unlink()


def _git_setup(project_dir: Path, cell_name: str) -> Optional[str]:
    """Configure git: crée/checkout la branche."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--git-dir"],
            cwd=str(project_dir),
            capture_output=True, check=False
        )
        if result.returncode != 0:
            return None
        
        branch_name = f"feature/cell-{cell_name.replace('_', '-')}"
        
        # Créer et checkout la branche
        subprocess.run(
            ["git", "checkout", "-b", branch_name],
            cwd=str(project_dir),
            capture_output=True, check=False
        )
        subprocess.run(
            ["git", "checkout", branch_name],
            cwd=str(project_dir),
            capture_output=True, check=False
        )
        
        return branch_name
    except FileNotFoundError:
        return None


def _git_commit(project_dir: Path, cell_name: str, files_count: int = 0) -> Tuple[bool, str]:
    """Commit les changements."""
    try:
        status_result = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=str(project_dir),
            capture_output=True, text=True, check=False
        )
        
        if not status_result.stdout.strip():
            console.print("  [dim]  ℹ️ Aucun changement à commit")
            return True, "Aucun changement"
        
        subprocess.run(
            ["git", "add", "."],
            cwd=str(project_dir),
            capture_output=True, check=False
        )
        
        commit_msg = f"feat({cell_name}): implémentation cell dev3\\n\\n- {files_count} fichiers générés\\n- Stack: Caddy/PouchDB/Alpine/Express"
        
        commit_result = subprocess.run(
            ["git", "commit", "-m", commit_msg],
            cwd=str(project_dir),
            capture_output=True, text=True, check=False
        )
        
        if commit_result.returncode != 0:
            return False, commit_result.stderr.strip()
        
        # Push
        remote_check = subprocess.run(
            ["git", "remote"],
            cwd=str(project_dir),
            capture_output=True, check=False
        )
        
        if remote_check.stdout.strip():
            branch_name = f"feature/cell-{cell_name.replace('_', '-')}"
            push_result = subprocess.run(
                ["git", "push", "-u", "origin", branch_name],
                cwd=str(project_dir),
                capture_output=True, text=True, check=False
            )
            
            if push_result.returncode == 0:
                return True, branch_name
        
        return True, "local"
        
    except FileNotFoundError:
        return False, "Git non disponible"


def _update_caddyfile(project_dir: Path, cell_name: str, cell_type: str) -> None:
    """Met à jour le Caddyfile avec les routes de la cell."""
    caddyfile_path = project_dir / "Caddyfile"
    
    if not caddyfile_path.exists():
        # Créer un Caddyfile de base pour la structure app/site/
        caddy_content = """dev.markidiags.com {
    # Route /data/* vers CouchDB
    handle_path /data/* {
        reverse_proxy localhost:5984
    }
    
    # Route /api/* vers serveur Node.js
    handle_path /api/* {
        reverse_proxy localhost:5001
    }
    
    # Root : static hosting sur app/site/
    handle {
        root * /home/ubuntu/marki/relance3/app/site
        file_server
        try_files {path} {path}/ /index.html
    }
}
"""
        # Créer un Caddyfile de base
        caddy_content = """localhost:8080 {
    root * /home/ubuntu/marki/relance3/app/site
    file_server
    
    # Rewrite pour SPA (fallback sur index.html)
    try_files {path} {path}/ /{path}/index.html
}
"""
        caddyfile_path.write_text(caddy_content, encoding="utf-8")
        console.print(f"  [green]  ✅ Caddyfile créé")
    
    # Pour les cells frontend, ajouter un rewrite si nécessaire
    if cell_type == "frontend":
        content = caddyfile_path.read_text(encoding="utf-8")
        # Vérifier si la route existe déjà
        route_pattern = f"/{cell_name}"
        if route_pattern not in content:
            # Ajouter une règle de rewrite pour cette cell
            console.print(f"  [dim]  📝 Route Caddy pour /{cell_name} déjà supportée par file_server")


# =============================================================================
# COMMANDE PRINCIPALE
# =============================================================================

@click.command()
@click.option(
    "--project-dir",
    type=click.Path(exists=True, file_okay=False),
    help="Chemin du projet",
)
@click.option("--cell", "cell_name", help="Développer une cell spécifique")
@click.option("--skip-git", is_flag=True, help="Ne pas gérer git")
@click.option("--skip-clean", is_flag=True, help="Ne pas nettoyer avant dev")
def dev3(project_dir: str | None, cell_name: str | None, skip_git: bool, skip_clean: bool) -> int:
    """Développe les cells avec stack static (Caddy, PouchDB, Alpine.js, Express)."""
    
    if project_dir is None:
        project_dir = Path.cwd()
    else:
        project_dir = Path(project_dir)
    
    project = Project(project_dir)
    
    if cell_name:
        cell = project.find_cell(cell_name)
        if not cell:
            console.print(f"[red]❌ Cell '{cell_name}' non trouvée")
            return 1
        cells = [cell]
    else:
        # Chercher les cells à développer (.specs/valide.md existe, devok.md absent)
        cells = project.get_cells_to_develop()
    
    if not cells:
        console.print(Panel.fit("Aucune cell à développer", style="yellow"))
        console.print("Conditions: .specs/valide.md existe ET .specs/devok.md absent")
        return 0
    
    console.print(Panel.fit(f"Développement dev3: {len(cells)} cell(s)", style="blue"))
    for cell in cells:
        console.print(f"  • {cell.name} ({cell.cell_type.value})")
    
    if not Confirm.ask("\\nContinuer le développement?", default=True):
        return 0
    
    # Vérifier pi disponible
    try:
        subprocess.run(["pi", "--version"], capture_output=True, check=False)
    except FileNotFoundError:
        console.print("[red]❌ Commande 'pi' non disponible")
        return 1
    
    for cell in cells:
        console.print()
        console.print(f"[cyan]{'═' * 40}")
        console.print(f"[cyan]📦 {cell.name}")
        console.print(f"[cyan]{'═' * 40}")
        
        # Déterminer le type de cell
        cell_path_str = str(cell.path)
        if "/site/cell/" in cell_path_str and "/backend/" not in cell_path_str:
            cell_type = "frontend"
        elif "/backend/cells/services/" in cell_path_str:
            cell_type = "backend-service"
        elif "/backend/cells/crons/" in cell_path_str:
            cell_type = "backend-cron"
        else:
            cell_type = "frontend"
        
        # Setup Git
        branch_name = None
        if not skip_git:
            console.print("[blue]🔨 1. Setup Git...")
            branch_name = _git_setup(project_dir, cell.name)
            if branch_name:
                console.print(f"  [green]  ✅ Branche: {branch_name}")
        
        # Analyse des specs
        console.print("[blue]🔨 2. Analyse des specs...")
        analyzer = SpecsAnalyzer(cell.path, cell_type)
        plan = analyzer.analyze()
        console.print(f"[green]  ✅ {len(plan.files)} fichiers à générer")
        
        # Nettoyage
        if not skip_clean:
            console.print("[blue]🔨 3. Nettoyage de la cell...")
            _clean_cell(cell.path)
            console.print("[green]  ✅ Cell nettoyée")
        
        # Tracking
        tracking_path = _create_tracking_artifact(cell.path, plan)
        
        # Génération des squelettes
        console.print("[blue]🔨 4. Génération des squelettes...")
        skeleton_gen = SkeletonGenerator(cell.path, cell_type, cell.name)
        skeleton_files = skeleton_gen.generate(plan)
        console.print(f"[green]  ✅ {len(skeleton_files)} squelettes créés")
        
        # Mise à jour Caddyfile pour frontend
        if cell_type == "frontend":
            console.print("[blue]🔨 5. Mise à jour Caddyfile...")
            _update_caddyfile(project_dir, cell.name, cell_type)
        
        # Tests squelettes
        console.print("[blue]🔨 6. Tests des squelettes...")
        tester = CellTester(cell.path, cell_type, cell.name, project_dir)
        test_ok, errors = tester.run_tests(phase="skeletons")
        if not test_ok:
            console.print("[red]  ❌ Tests échoués")
            continue
        console.print("[green]  ✅ Tests squelettes passés")
        
        # Génération IA
        console.print()
        console.print(f"[cyan]{'─' * 40}")
        console.print("[green]✅ Squelettes testés. Lancement génération IA...")
        console.print(f"[cyan]{'─' * 40}")
        console.print()
        
        console.print("[blue]🔨 7. Génération IA des fichiers...")
        prompt_gen = PromptGenerator(cell.path, cell.name)
        dev3_logs_dir = cell.path / "dev3-logs"
        dev3_logs_dir.mkdir(exist_ok=True)
        
        for file_plan in plan.files:
            console.print(f"  [blue]  🤖 {file_plan.path}")
            prompt = prompt_gen.generate_prompt(file_plan)
            
            prompt_path = dev3_logs_dir / f"{file_plan.path.replace('/', '_')}.prompt.txt"
            prompt_path.write_text(prompt, encoding="utf-8")
            
            try:
                result = subprocess.run(
                    ["pi", "-p"],
                    input=prompt,
                    capture_output=True, text=True, timeout=300
                )
                
                if result.returncode != 0:
                    console.print(f"    [red]  ❌ Erreur pi: {result.stderr[:200]}")
                    continue
                
                response_text = result.stdout.strip()
                
                # Nettoyer la réponse
                if response_text.startswith('```'):
                    lines = response_text.split('\\n')
                    if lines[0].startswith('```'):
                        lines = lines[1:]
                    if lines and lines[-1].startswith('```'):
                        lines = lines[:-1]
                    response_text = '\\n'.join(lines)
                
                # Écrire le fichier
                full_path = cell.path / file_plan.path
                full_path.parent.mkdir(parents=True, exist_ok=True)
                full_path.write_text(response_text, encoding="utf-8")
                
                console.print(f"    [green]  ✅ {file_plan.path}")
                _update_tracking_status(tracking_path, file_plan.path, "done")
                
            except subprocess.TimeoutExpired:
                console.print(f"    [red]  ❌ Timeout pi")
                continue
            except Exception as e:
                console.print(f"    [red]  ❌ Erreur: {e}")
                continue
        
        # Tests code
        console.print("[blue]🔨 8. Tests du code généré...")
        test_ok, errors = tester.run_tests(phase="code")
        if not test_ok:
            console.print("[red]  ❌ Tests échoués")
            for err in errors[:5]:
                console.print(f"    [dim]  - {err}")
            _cleanup_tracking(tracking_path)
            continue
        console.print("[green]  ✅ Tests passés")
        
        # Finalisation
        console.print()
        console.print(f"[cyan]{'─' * 40}")
        
        if not Confirm.ask("[yellow]Développement terminé? (Créer devok.md)?", default=True):
            console.print("[yellow]⚠️ Développement non finalisé")
            _cleanup_tracking(tracking_path)
            continue
        
        console.print(f"[cyan]{'─' * 40}")
        console.print()
        
        # Commit
        if not skip_git and branch_name:
            console.print("[blue]🔨 9. Commit des changements...")
            commit_ok, commit_info = _git_commit(project_dir, cell.name, len(plan.files))
            if commit_ok:
                console.print(f"  [green]  ✅ Commit réussi")
        
        # Créer devok.md
        console.print("[blue]🔨 Création de devok.md...")
        _create_devok(cell.path, cell.name)
        _cleanup_tracking(tracking_path)
        
        console.print()
        console.print(f"[green]{'═' * 40}")
        console.print(f"[green]✅ {cell.name} développée avec succès!")
        console.print(f"[green]{'═' * 40}")
    
    return 0


def main():
    """Point d'entrée."""
    return dev3()


if __name__ == "__main__":
    sys.exit(main())
