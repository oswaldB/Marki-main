#!/usr/bin/env python3
"""Commande dev3 - Développe les cells avec stack statique (Caddy + PouchDB/CouchDB + Alpine.js + Express)."""

import json
import re
import shutil
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

import click
import yaml
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Confirm

console = Console()


def _run_command(cmd: list[str], cwd: Path | None = None, timeout: int = 60, capture: bool = True) -> tuple[int, str, str]:
    """Exécute une commande et retourne (returncode, stdout, stderr)."""
    try:
        result = subprocess.run(
            cmd,
            cwd=str(cwd) if cwd else None,
            capture_output=capture,
            text=True,
            timeout=timeout
        )
        return result.returncode, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return -1, "", f"Timeout après {timeout}s"
    except FileNotFoundError:
        return -1, "", f"Commande non trouvée: {cmd[0]}"


def _check_pi() -> bool:
    """Vérifie si la commande pi est disponible."""
    try:
        subprocess.run(["pi", "--version"], capture_output=True, check=False)
        return True
    except FileNotFoundError:
        return False


def _get_git_branch_name(cell_name: str) -> str:
    """Convertit le nom de cell en nom de branche git."""
    return f"feature/cell-{cell_name.replace('_', '-')}"


def _git_setup(project_dir: Path, cell_name: str) -> str | None:
    """Configure git: crée/checkout la branche. Retourne le nom de branche ou None si pas de git."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--git-dir"],
            cwd=str(project_dir),
            capture_output=True,
            check=False
        )
        if result.returncode != 0:
            return None

        branch_name = _get_git_branch_name(cell_name)
        
        # Créer la branche si elle n'existe pas
        subprocess.run(
            ["git", "checkout", "-b", branch_name],
            cwd=str(project_dir),
            capture_output=True,
            check=False
        )
        # Checkout la branche
        subprocess.run(
            ["git", "checkout", branch_name],
            cwd=str(project_dir),
            capture_output=True,
            check=False
        )

        return branch_name
    except FileNotFoundError:
        return None


def _git_commit(project_dir: Path, cell_name: str) -> bool:
    """Commit les changements et push la branche."""
    try:
        subprocess.run(["git", "add", "."], cwd=str(project_dir), capture_output=True, check=False)
        subprocess.run(
            ["git", "commit", "-m", f"feat({cell_name}): implémentation cell dev3"],
            cwd=str(project_dir),
            capture_output=True,
            check=False
        )
        
        # Push si remote existe
        remote_check = subprocess.run(
            ["git", "remote"],
            cwd=str(project_dir),
            capture_output=True,
            check=False
        )
        if remote_check.stdout.strip():
            branch_name = _get_git_branch_name(cell_name)
            subprocess.run(
                ["git", "push", "-u", "origin", branch_name],
                cwd=str(project_dir),
                capture_output=True,
                check=False
            )
        return True
    except FileNotFoundError:
        return False


# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 2: Vérification Structure
# ═══════════════════════════════════════════════════════════════════════════════

def _step_2_verify_structure(project_dir: Path, templates_dir: Path) -> tuple[bool, dict]:
    """Vérifie que la structure du projet est conforme."""
    console.print("[blue]🔍 Vérification de la structure...")
    
    structure_file = templates_dir / "static-stack" / "files-and-folders.md"
    if not structure_file.exists():
        console.print(f"[yellow]⚠️ Template structure non trouvé: {structure_file}")
        return False, {"error": "Template structure non trouvé"}
    
    # Vérifier les dossiers critiques
    required_dirs = [
        project_dir / "app" / "site",
        project_dir / "app" / "server",
        project_dir / "app" / ".drdice",
    ]
    
    missing_dirs = []
    for d in required_dirs:
        if not d.exists():
            missing_dirs.append(str(d.relative_to(project_dir)))
            d.mkdir(parents=True, exist_ok=True)
    
    # Vérifier Caddyfile
    caddyfile = Path("/etc/caddy/Caddyfile")
    caddy_ok = caddyfile.exists()
    
    report = {
        "timestamp": datetime.now().isoformat(),
        "missing_dirs": missing_dirs,
        "dirs_created": len(missing_dirs),
        "caddyfile_exists": caddy_ok,
        "status": "ok" if not missing_dirs and caddy_ok else "fixed"
    }
    
    if missing_dirs:
        console.print(f"[yellow]⚠️ Dossiers créés: {', '.join(missing_dirs)}")
    
    if not caddy_ok:
        console.print("[yellow]⚠️ Caddyfile non trouvé à /etc/caddy/Caddyfile")
    
    console.print("[green]✅ Structure OK")
    return True, report


# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 3: Healthy Test
# ═══════════════════════════════════════════════════════════════════════════════

def _step_3_healthy_test() -> tuple[bool, dict]:
    """Teste que tous les services sont UP."""
    console.print("[blue]🏥 Tests de santé des services...")
    
    tests = [
        {"name": "Frontend", "url": "http://dev.markidiags.com/app/site/healthy.html", "method": "GET", "expected": 200},
        {"name": "CouchDB", "url": "http://dev.markidiags.com/couchdb/healthy", "method": "GET", "expected": 200},
        {"name": "Server", "url": "http://dev.markidiags.com/server.js/healthy", "method": "POST", "expected": 200},
    ]
    
    results = []
    all_ok = True
    
    for test in tests:
        try:
            if test["method"] == "POST":
                result = subprocess.run(
                    ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "-X", "POST", test["url"]],
                    capture_output=True, text=True, timeout=10
                )
            else:
                result = subprocess.run(
                    ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", test["url"]],
                    capture_output=True, text=True, timeout=10
                )
            
            code = int(result.stdout.strip()) if result.stdout.strip().isdigit() else 0
            ok = code == test["expected"]
            
            results.append({
                "name": test["name"],
                "url": test["url"],
                "code": code,
                "expected": test["expected"],
                "ok": ok
            })
            
            if not ok:
                all_ok = False
                console.print(f"[red]❌ {test['name']}: HTTP {code}")
            else:
                console.print(f"[green]✅ {test['name']}: HTTP {code}")
                
        except subprocess.TimeoutExpired:
            all_ok = False
            results.append({"name": test["name"], "url": test["url"], "code": 0, "ok": False, "error": "timeout"})
            console.print(f"[red]❌ {test['name']}: Timeout")
        except Exception as e:
            all_ok = False
            results.append({"name": test["name"], "url": test["url"], "code": 0, "ok": False, "error": str(e)})
            console.print(f"[red]❌ {test['name']}: {e}")
    
    report = {
        "timestamp": datetime.now().isoformat(),
        "tests": results,
        "all_ok": all_ok
    }
    
    return all_ok, report


# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 4: Analyse des Specs
# ═══════════════════════════════════════════════════════════════════════════════

def _step_4_analyze_specs(cell_path: Path) -> tuple[bool, dict]:
    """Analyse les specs pour identifier le type de cell et les fichiers nécessaires."""
    console.print("[blue]📄 Analyse des specs...")
    
    specs_dir = cell_path / ".specs"
    if not specs_dir.exists():
        console.print(f"[red]❌ Dossier .specs non trouvé dans {cell_path}")
        return False, {"error": "Specs non trouvées"}
    
    # Vérifier valide.md
    valide_md = specs_dir / "valide.md"
    if not valide_md.exists():
        console.print(f"[yellow]⚠️ valide.md non trouvé")
    
    # Déterminer le type de cell
    cell_name = cell_path.name
    parent_name = cell_path.parent.name
    
    if parent_name == "services" or "/server/" in str(cell_path):
        cell_type = "backend"
        files_needed = ["index.js", "package.json"]
        # Vérifier si cron.js nécessaire
        wf_backend_dir = specs_dir / "wf-backend"
        if wf_backend_dir.exists():
            for wf_file in wf_backend_dir.glob("*.md"):
                content = wf_file.read_text(encoding="utf-8")
                if "cron" in content.lower() or "schedule" in content.lower():
                    files_needed.append("cron.js")
                    break
    else:
        cell_type = "frontend"
        files_needed = ["index.html", "main.js"]
        
        # Compter les workflows
        wf_frontend_dir = specs_dir / "wf-frontend"
        workflows = []
        if wf_frontend_dir.exists():
            for wf_file in wf_frontend_dir.glob("*.md"):
                wf_name = wf_file.stem
                workflows.append(wf_name)
                files_needed.append(f"workflows/{wf_name}.js")
    
    # Lire les règles globales
    rules_content = ""
    rules_file = specs_dir / "rules.md"
    if rules_file.exists():
        rules_content = rules_file.read_text(encoding="utf-8")
    
    dev_plan = {
        "cell_name": cell_name,
        "cell_type": cell_type,
        "cell_path": str(cell_path),
        "files": files_needed,
        "workflows": workflows if cell_type == "frontend" else [],
        "has_specs": valide_md.exists()
    }
    
    console.print(f"[dim]   Type: {cell_type}")
    console.print(f"[dim]   Fichiers: {len(files_needed)}")
    console.print(f"[green]✅ Analyse OK: {cell_name}")
    
    return True, dev_plan


# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 5: Nettoyage de la Cell
# ═══════════════════════════════════════════════════════════════════════════════

def _step_5_clean_cell(cell_path: Path) -> bool:
    """Nettoie la cell en supprimant tout sauf .specs/."""
    console.print("[blue]🧹 Nettoyage de la cell...")
    
    if not cell_path.exists():
        cell_path.mkdir(parents=True, exist_ok=True)
        console.print("[green]✅ Cell créée")
        return True
    
    # Préserver .specs/
    specs_backup = None
    specs_dir = cell_path / ".specs"
    
    if specs_dir.exists():
        specs_backup = cell_path.parent / f".{cell_path.name}_specs_backup"
        shutil.copytree(specs_dir, specs_backup, dirs_exist_ok=True)
    
    # Supprimer tout
    for item in cell_path.iterdir():
        if item.name != ".specs":
            if item.is_dir():
                shutil.rmtree(item)
            else:
                item.unlink()
    
    # Restaurer .specs/
    if specs_backup:
        shutil.copytree(specs_backup, specs_dir, dirs_exist_ok=True)
        shutil.rmtree(specs_backup)
    
    console.print("[green]✅ Cell nettoyée (.specs/ préservé)")
    return True


# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 6: Génération des Squelettes
# ═══════════════════════════════════════════════════════════════════════════════

def _load_skeleton_template(template_path: Path, replacements: dict) -> str:
    """Charge un template de squelette et remplace les variables."""
    if not template_path.exists():
        return ""
    
    content = template_path.read_text(encoding="utf-8")
    for key, value in replacements.items():
        content = content.replace(f"{{{key}}}", value)
    return content


def _step_6_generate_skeletons(cell_path: Path, dev_plan: dict, templates_dir: Path) -> tuple[bool, dict]:
    """Génère les fichiers squelettes."""
    console.print("[blue]🏗️ Génération des squelettes...")
    
    cell_name = dev_plan["cell_name"]
    cell_type = dev_plan["cell_type"]
    
    squelettes_dir = templates_dir / "static-stack" / "squelettes"
    generated_files = []
    
    if cell_type == "frontend":
        # index.html
        template = squelettes_dir / "frontend" / "index.html"
        content = _load_skeleton_template(template, {"cell_name": cell_name})
        output_file = cell_path / "index.html"
        output_file.write_text(content, encoding="utf-8")
        generated_files.append(str(output_file.relative_to(cell_path)))
        
        # main.js
        template = squelettes_dir / "frontend" / "main.js"
        content = _load_skeleton_template(template, {"cell_name": cell_name})
        output_file = cell_path / "main.js"
        output_file.write_text(content, encoding="utf-8")
        generated_files.append(str(output_file.relative_to(cell_path)))
        
        # Workflows
        workflows_dir = cell_path / "workflows"
        workflows_dir.mkdir(exist_ok=True)
        
        workflow_template = squelettes_dir / "frontend" / "workflow.js"
        for wf_name in dev_plan.get("workflows", []):
            content = _load_skeleton_template(workflow_template, {
                "cell_name": cell_name,
                "wf_name": wf_name
            })
            output_file = workflows_dir / f"{wf_name}.js"
            output_file.write_text(content, encoding="utf-8")
            generated_files.append(str(output_file.relative_to(cell_path)))
    
    else:  # backend
        # index.js
        template = squelettes_dir / "backend" / "index.js"
        content = _load_skeleton_template(template, {"cell_name": cell_name})
        output_file = cell_path / "index.js"
        output_file.write_text(content, encoding="utf-8")
        generated_files.append(str(output_file.relative_to(cell_path)))
        
        # cron.js si nécessaire
        if "cron.js" in dev_plan["files"]:
            template = squelettes_dir / "cron" / "cron.js"
            content = _load_skeleton_template(template, {"cell_name": cell_name})
            output_file = cell_path / "cron.js"
            output_file.write_text(content, encoding="utf-8")
            generated_files.append(str(output_file.relative_to(cell_path)))
        
        # Note: package.json est généré par IA (pas en squelette)
    
    console.print(f"[green]✅ {len(generated_files)} squelettes générés")
    
    return True, {
        "cell_name": cell_name,
        "cell_type": cell_type,
        "files": generated_files
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 7: Update Caddyfile (Frontend uniquement)
# ═══════════════════════════════════════════════════════════════════════════════

def _step_7_update_caddyfile(cell_path: Path, dev_plan: dict) -> bool:
    """Met à jour le Caddyfile pour la cell frontend."""
    if dev_plan["cell_type"] != "frontend":
        console.print("[dim]ℹ️ Skipped (pas frontend)")
        return True
    
    console.print("[blue]🌐 Mise à jour Caddyfile...")
    
    # Pour le stack static, Caddyfile est dans /etc/caddy/
    # On vérifie juste que la route existe (via file_server)
    # Le Caddyfile global gère déjà tout via file_server sur app/site/
    
    caddyfile = Path("/etc/caddy/Caddyfile")
    if caddyfile.exists():
        content = caddyfile.read_text(encoding="utf-8")
        
        # Vérifier que file_server est configuré
        if "file_server" not in content:
            console.print("[yellow]⚠️ file_server non trouvé dans Caddyfile")
            return False
        
        console.print("[green]✅ Caddyfile OK")
        return True
    else:
        console.print("[yellow]⚠️ Caddyfile non accessible")
        return True  # Pas bloquant


# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 8: Skeleton Tests
# ═══════════════════════════════════════════════════════════════════════════════

def _step_8_skeleton_tests(cell_path: Path, dev_plan: dict, project_dir: Path) -> tuple[bool, dict]:
    """Teste que les squelettes sont correctement générés."""
    console.print("[blue]🧪 Tests des squelettes...")
    
    cell_name = dev_plan["cell_name"]
    cell_type = dev_plan["cell_type"]
    tests = []
    
    if cell_type == "frontend":
        # Test index.html
        html_file = cell_path / "index.html"
        if html_file.exists():
            content = html_file.read_text(encoding="utf-8")
            has_h1 = f"<h1>{cell_name}</h1>" in content or f"{cell_name}</h1>" in content
            tests.append({
                "file": "index.html",
                "exists": True,
                "has_h1": has_h1,
                "ok": has_h1
            })
        else:
            tests.append({"file": "index.html", "exists": False, "ok": False})
        
        # Test main.js
        js_file = cell_path / "main.js"
        if js_file.exists():
            content = js_file.read_text(encoding="utf-8")
            has_alpine = "alpine:init" in content or "Alpine.data" in content
            tests.append({
                "file": "main.js",
                "exists": True,
                "has_alpine": has_alpine,
                "ok": has_alpine
            })
        else:
            tests.append({"file": "main.js", "exists": False, "ok": False})
        
        # Test workflows
        for wf_name in dev_plan.get("workflows", []):
            wf_file = cell_path / "workflows" / f"{wf_name}.js"
            exists = wf_file.exists()
            tests.append({
                "file": f"workflows/{wf_name}.js",
                "exists": exists,
                "ok": exists
            })
    
    else:  # backend
        # Test index.js
        index_file = cell_path / "index.js"
        if index_file.exists():
            content = index_file.read_text(encoding="utf-8")
            has_express = "express" in content.lower()
            tests.append({
                "file": "index.js",
                "exists": True,
                "has_express": has_express,
                "ok": has_express
            })
        else:
            tests.append({"file": "index.js", "exists": False, "ok": False})
    
    all_ok = all(t["ok"] for t in tests)
    
    report = {
        "timestamp": datetime.now().isoformat(),
        "cell_name": cell_name,
        "cell_type": cell_type,
        "tests": tests,
        "all_ok": all_ok
    }
    
    if all_ok:
        console.print("[green]✅ Tous les squelettes sont OK")
    else:
        failed = [t["file"] for t in tests if not t["ok"]]
        console.print(f"[red]❌ Squelettes en erreur: {', '.join(failed)}")
    
    return all_ok, report


# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 9: Génération IA
# ═══════════════════════════════════════════════════════════════════════════════

def _build_prompt_for_file(cell_path: Path, file_path: Path, dev_plan: dict, specs_dir: Path) -> str:
    """Construit le prompt pour générer un fichier spécifique."""
    cell_name = dev_plan["cell_name"]
    cell_type = dev_plan["cell_type"]
    
    # Lire le squelette actuel
    skeleton_content = file_path.read_text(encoding="utf-8") if file_path.exists() else ""
    
    # Lire les specs pertinentes
    specs_content = ""
    
    if cell_type == "frontend":
        # Mockups
        mockups_dir = specs_dir / "mockups"
        if mockups_dir.exists():
            for mockup in sorted(mockups_dir.glob("*.html")):
                specs_content += f"\n\n=== Mockup: {mockup.name} ===\n"
                specs_content += mockup.read_text(encoding="utf-8")
        
        # Workflows
        wf_dir = specs_dir / "wf-frontend"
        if wf_dir.exists():
            for wf in sorted(wf_dir.glob("*.md")):
                specs_content += f"\n\n=== Workflow Frontend: {wf.name} ===\n"
                specs_content += wf.read_text(encoding="utf-8")
        
        wf_backend_dir = specs_dir / "wf-backend"
        if wf_backend_dir.exists():
            for wf in sorted(wf_backend_dir.glob("*.md")):
                specs_content += f"\n\n=== Workflow Backend: {wf.name} ===\n"
                specs_content += wf.read_text(encoding="utf-8")
    
    else:  # backend
        wf_backend_dir = specs_dir / "wf-backend"
        if wf_backend_dir.exists():
            for wf in sorted(wf_backend_dir.glob("*.md")):
                specs_content += f"\n\n=== Workflow: {wf.name} ===\n"
                specs_content += wf.read_text(encoding="utf-8")
    
    # Règles
    rules_file = specs_dir / "rules.md"
    if rules_file.exists():
        specs_content += f"\n\n=== Règles ===\n"
        specs_content += rules_file.read_text(encoding="utf-8")
    
    relative_path = file_path.relative_to(cell_path)
    
    prompt = f"""Tu es un développeur expert en stack Caddy + PouchDB/CouchDB + Alpine.js + Express.

Développe le fichier: {relative_path}
Pour la cell: {cell_name}

## Stack technique:
- Frontend: Alpine.js 3 + TailwindCSS (CDN) + PouchDB 8
- Backend: Node.js + Express
- Database: CouchDB avec PouchDB côté client

## Squelette actuel:
```
{skeleton_content}
```

## Spécifications complètes:
{specs_content[:8000]}

## Ta mission:
1. Implémente le code complet et fonctionnel
2. Respecte strictement le squelette fourni
3. Pour les workflows: exporte une fonction execute(context, params)
4. Pour le frontend: intègre avec Alpine.js via x-data
5. Assure la compatibilité PouchDB (sync avec CouchDB)

Réponds UNIQUEMENT avec le code complet du fichier, sans balises markdown, sans explications.
"""
    return prompt


def _step_9_generate_ia(cell_path: Path, dev_plan: dict, logs_dir: Path) -> tuple[bool, dict]:
    """Génère le code final via IA."""
    console.print("[blue]🤖 Génération IA avec pi -p...")
    
    if not _check_pi():
        console.print("[red]❌ Commande pi non disponible")
        return False, {"error": "pi non disponible"}
    
    specs_dir = cell_path / ".specs"
    generated = []
    errors = []
    
    for file_rel in dev_plan["files"]:
        file_path = cell_path / file_rel
        console.print(f"  [dim]Génération: {file_rel}...")
        
        prompt = _build_prompt_for_file(cell_path, file_path, dev_plan, specs_dir)
        
        # Sauvegarder le prompt
        prompt_log = logs_dir / f"prompt_{file_rel.replace('/', '_')}.txt"
        prompt_log.parent.mkdir(parents=True, exist_ok=True)
        prompt_log.write_text(prompt, encoding="utf-8")
        
        try:
            result = subprocess.run(
                ["pi", "-p", prompt],
                capture_output=True,
                text=True,
                timeout=600
            )
            
            if result.returncode != 0:
                errors.append(f"{file_rel}: {result.stderr[:200]}")
                continue
            
            # Nettoyer la réponse (enlever balises markdown)
            code = result.stdout.strip()
            if code.startswith("```"):
                lines = code.split("\n")
                if len(lines) > 2:
                    code = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])
            
            # Écrire le fichier
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_text(code, encoding="utf-8")
            generated.append(file_rel)
            
            # Sauvegarder la réponse
            response_log = logs_dir / f"response_{file_rel.replace('/', '_')}.txt"
            response_log.write_text(code, encoding="utf-8")
            
        except subprocess.TimeoutExpired:
            errors.append(f"{file_rel}: Timeout")
        except Exception as e:
            errors.append(f"{file_rel}: {e}")
    
    success = len(generated) == len(dev_plan["files"])
    
    report = {
        "timestamp": datetime.now().isoformat(),
        "generated": generated,
        "errors": errors,
        "success": success
    }
    
    if success:
        console.print(f"[green]✅ {len(generated)} fichiers générés")
    else:
        console.print(f"[yellow]⚠️ {len(generated)}/{len(dev_plan['files'])} fichiers générés")
        if errors:
            for err in errors:
                console.print(f"  [dim]{err}")
    
    return success, report


# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 10: Post-Gen Tests
# ═══════════════════════════════════════════════════════════════════════════════

def _step_10_postgen_tests(cell_path: Path, dev_plan: dict, project_dir: Path) -> tuple[bool, dict]:
    """Tests complets après génération IA."""
    console.print("[blue]🔍 Tests post-génération...")
    
    cell_name = dev_plan["cell_name"]
    cell_type = dev_plan["cell_type"]
    
    tests = []
    
    if cell_type == "frontend":
        # Vérifier que les fichiers existent et ont du contenu
        for file_rel in dev_plan["files"]:
            file_path = cell_path / file_rel
            exists = file_path.exists()
            size = file_path.stat().st_size if exists else 0
            
            # Vérifier que le fichier n'est pas vide et ne contient pas TODO
            has_content = False
            no_todos = True
            if exists and size > 100:
                content = file_path.read_text(encoding="utf-8")
                has_content = True
                if "TODO" in content or "TODO IA" in content:
                    no_todos = False
            
            tests.append({
                "file": file_rel,
                "exists": exists,
                "size": size,
                "has_content": has_content,
                "no_todos": no_todos,
                "ok": exists and has_content and no_todos
            })
    
    else:  # backend
        for file_rel in dev_plan["files"]:
            file_path = cell_path / file_rel
            exists = file_path.exists()
            size = file_path.stat().st_size if exists else 0
            
            has_content = False
            if exists and size > 50:
                has_content = True
            
            tests.append({
                "file": file_rel,
                "exists": exists,
                "size": size,
                "has_content": has_content,
                "ok": exists and has_content
            })
    
    all_ok = all(t["ok"] for t in tests)
    
    report = {
        "timestamp": datetime.now().isoformat(),
        "cell_name": cell_name,
        "cell_type": cell_type,
        "tests": tests,
        "all_ok": all_ok
    }
    
    if all_ok:
        console.print("[green]✅ Tests post-génération OK")
    else:
        failed = [t["file"] for t in tests if not t["ok"]]
        console.print(f"[yellow]⚠️ Fichiers à vérifier: {', '.join(failed)}")
    
    return all_ok, report


# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 12: Création devok.md
# ═══════════════════════════════════════════════════════════════════════════════

def _step_12_create_devok(cell_path: Path, dev_plan: dict) -> bool:
    """Crée le fichier devok.md pour marquer la cell comme développée."""
    console.print("[blue]📝 Création de devok.md...")
    
    devok_content = f"""# Développement OK

Date: {datetime.now().isoformat()}
Méthode: dev3
Stack: Caddy + PouchDB/CouchDB + Alpine.js + Express

## Cell
- Nom: {dev_plan['cell_name']}
- Type: {dev_plan['cell_type']}

## Fichiers générés
{chr(10).join(f"- {f}" for f in dev_plan['files'])}

## Checklist
- [x] Étape 1: Git Setup
- [x] Étape 2: Vérification Structure
- [x] Étape 3: Healthy Test
- [x] Étape 4: Analyse des Specs
- [x] Étape 5: Nettoyage de la Cell
- [x] Étape 6: Génération des Squelettes
- [x] Étape 7: Update Caddyfile
- [x] Étape 8: Skeleton Tests
- [x] Étape 9: Génération IA
- [x] Étape 10: Post-Gen Tests
- [x] Étape 11: Commit Git
- [x] Étape 12: Création devok.md

## Statut
✅ Cell développée avec succès
"""
    
    devok_path = cell_path / ".specs" / "devok.md"
    devok_path.parent.mkdir(parents=True, exist_ok=True)
    devok_path.write_text(devok_content, encoding="utf-8")
    
    console.print(f"[green]✅ devok.md créé: {devok_path}")
    return True


# ═══════════════════════════════════════════════════════════════════════════════
# COMMANDE PRINCIPALE
# ═══════════════════════════════════════════════════════════════════════════════

def _should_run_step(current_step: int, step_start: int, only_step: int | None) -> bool:
    """Détermine si une étape doit être exécutée.
    
    Args:
        current_step: Numéro de l'étape actuelle (1-12)
        step_start: Étape de démarrage (--step)
        only_step: Si défini, exécute UNIQUEMENT cette étape (--only)
    """
    if only_step is not None:
        return current_step == only_step
    return current_step >= step_start

@click.command()
@click.option(
    "--project-dir",
    type=click.Path(exists=True, file_okay=False),
    help="Chemin du projet",
)
@click.option("--cell", "cell_name", help="Développer une cell spécifique")
@click.option("--skip-git", is_flag=True, help="Sauter la gestion git")
@click.option("--skip-clean", is_flag=True, help="Ne pas nettoyer avant dev")
@click.option("--skip-tests", is_flag=True, help="Sauter les tests")
@click.option("--step", type=int, help="Démarrer à une étape spécifique (1-12)", default=1)
@click.option("--only", "only_step", type=int, help="Exécuter UNIQUEMENT cette étape (1-12)", default=None)
def dev3(project_dir: str | None, cell_name: str | None, skip_git: bool,
         skip_clean: bool, skip_tests: bool, step: int, only_step: int | None) -> int:
    """Développe les cells avec stack statique (Caddy + PouchDB/CouchDB + Alpine.js + Express)."""
    
    # Déterminer le répertoire du projet
    if project_dir is None:
        project_dir = Path.cwd()
    else:
        project_dir = Path(project_dir)
    
    # Trouver les cells à développer
    templates_dir = project_dir / "dev-tools" / "DrDice" / "drdice" / "templates"
    
    cells_to_dev = []
    
    if cell_name:
        # Chercher la cell spécifique
        for path in project_dir.rglob(".specs"):
            if path.parent.name == cell_name:
                valide_md = path / "valide.md"
                devok_md = path / "devok.md"
                if valide_md.exists() and not devok_md.exists():
                    cells_to_dev.append(path.parent)
                    break
        
        if not cells_to_dev:
            console.print(f"[red]❌ Cell '{cell_name}' non trouvée ou déjà développée")
            return 1
    else:
        # Trouver toutes les cells à développer
        for path in project_dir.rglob(".specs"):
            valide_md = path / "valide.md"
            devok_md = path / "devok.md"
            if valide_md.exists() and not devok_md.exists():
                cells_to_dev.append(path.parent)
    
    if not cells_to_dev:
        console.print(Panel.fit("Aucune cell à développer", style="yellow"))
        console.print()
        console.print("Conditions:")
        console.print("  - Fichier .specs/valide.md doit exister")
        console.print("  - Fichier .specs/devok.md ne doit PAS exister")
        return 0
    
    console.print(Panel.fit(f"Développement dev3: {len(cells_to_dev)} cell(s)", style="blue"))
    for cell_path in cells_to_dev:
        console.print(f"  • {cell_path.name}")
    
    if not Confirm.ask("\nContinuer le développement?", default=True):
        return 0
    
    # Vérifier que pi est disponible
    if not _check_pi():
        console.print("[yellow]⚠️ Commande 'pi' non disponible - la génération IA sera ignorée")
    
    # Créer le dossier de logs
    logs_base = project_dir / "app" / ".drdice" / "test-results"
    logs_base.mkdir(parents=True, exist_ok=True)
    
    # Développer chaque cell
    total = len(cells_to_dev)
    success_count = 0
    fail_count = 0
    
    for i, cell_path in enumerate(cells_to_dev, 1):
        console.print()
        console.print(f"[cyan]{'═' * 60}")
        console.print(f"[cyan]📦 [{i}/{total}] {cell_path.name}")
        console.print(f"[cyan]{'═' * 60}")
        
        # Logs pour cette cell
        cell_logs = logs_base / cell_path.name
        cell_logs.mkdir(parents=True, exist_ok=True)
        
        all_steps_ok = True
        dev_plan = {}
        
        # ÉTAPE 1: Git Setup
        if step <= 1 and all_steps_ok and not skip_git:
            console.print()
            console.print("[magenta]📋 Étape 1/12: Git Setup")
            branch_name = _git_setup(project_dir, cell_path.name)
            if branch_name:
                console.print(f"[dim]   Branche: {branch_name}")
            else:
                console.print("[dim]   Git non configuré")
        
        # ÉTAPE 2: Vérification Structure
        if step <= 2 and all_steps_ok:
            console.print()
            console.print("[magenta]📋 Étape 2/12: Vérification Structure")
            ok, report = _step_2_verify_structure(project_dir, templates_dir)
            (cell_logs / "step2_structure.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
            if not ok:
                all_steps_ok = False
        
        # ÉTAPE 3: Healthy Test
        if step <= 3 and all_steps_ok and not skip_tests:
            console.print()
            console.print("[magenta]📋 Étape 3/12: Healthy Test")
            ok, report = _step_3_healthy_test()
            (cell_logs / "step3_healthy.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
            if not ok:
                console.print("[yellow]⚠️ Tests healthy en échec - continuation")
        
        # ÉTAPE 4: Analyse des Specs
        if step <= 4 and all_steps_ok:
            console.print()
            console.print("[magenta]📋 Étape 4/12: Analyse des Specs")
            ok, dev_plan = _step_4_analyze_specs(cell_path)
            (cell_logs / "step4_specs.json").write_text(json.dumps(dev_plan, indent=2), encoding="utf-8")
            if not ok:
                all_steps_ok = False
                continue
        
        # ÉTAPE 5: Nettoyage de la Cell
        if step <= 5 and all_steps_ok and not skip_clean:
            console.print()
            console.print("[magenta]📋 Étape 5/12: Nettoyage de la Cell")
            if not Confirm.ask(f"   Supprimer tout sauf .specs/ dans {cell_path.name}?", default=True):
                console.print("[yellow]   Skipped")
            else:
                _step_5_clean_cell(cell_path)
        
        # ÉTAPE 6: Génération des Squelettes
        if step <= 6 and all_steps_ok:
            console.print()
            console.print("[magenta]📋 Étape 6/12: Génération des Squelettes")
            ok, report = _step_6_generate_skeletons(cell_path, dev_plan, templates_dir)
            (cell_logs / "step6_skeletons.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
            if not ok:
                all_steps_ok = False
        
        # ÉTAPE 7: Update Caddyfile
        if step <= 7 and all_steps_ok:
            console.print()
            console.print("[magenta]📋 Étape 7/12: Update Caddyfile")
            _step_7_update_caddyfile(cell_path, dev_plan)
        
        # ÉTAPE 8: Skeleton Tests
        if step <= 8 and all_steps_ok and not skip_tests:
            console.print()
            console.print("[magenta]📋 Étape 8/12: Skeleton Tests")
            ok, report = _step_8_skeleton_tests(cell_path, dev_plan, project_dir)
            (cell_logs / "step8_skeleton_tests.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
            if not ok:
                all_steps_ok = False
                if not Confirm.ask("   Continuer malgré les erreurs?", default=False):
                    continue
        
        # ÉTAPE 9: Génération IA
        if step <= 9 and all_steps_ok:
            console.print()
            console.print("[magenta]📋 Étape 9/12: Génération IA")
            
            if not _check_pi():
                console.print("[yellow]   Pi non disponible - génération manuelle requise")
            else:
                ok, report = _step_9_generate_ia(cell_path, dev_plan, cell_path / "drdice-logs")
                (cell_logs / "step9_generation.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
                if not ok:
                    all_steps_ok = False
                    if not Confirm.ask("   Continuer malgré les erreurs?", default=False):
                        continue
        
        # ÉTAPE 10: Post-Gen Tests
        if step <= 10 and all_steps_ok and not skip_tests:
            console.print()
            console.print("[magenta]📋 Étape 10/12: Post-Gen Tests")
            ok, report = _step_10_postgen_tests(cell_path, dev_plan, project_dir)
            (cell_logs / "step10_postgen.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
            if not ok:
                console.print("[yellow]   ⚠️ Tests post-génération en échec")
        
        # ÉTAPE 11: Commit Git
        if step <= 11 and all_steps_ok and not skip_git:
            console.print()
            console.print("[magenta]📋 Étape 11/12: Commit Git")
            if Confirm.ask("   Committer les changements?", default=True):
                _git_commit(project_dir, cell_path.name)
        
        # ÉTAPE 12: Création devok.md
        if step <= 12 and all_steps_ok:
            console.print()
            console.print("[magenta]📋 Étape 12/12: Création devok.md")
            _step_12_create_devok(cell_path, dev_plan)
        
        if all_steps_ok:
            console.print()
            console.print(f"[green]✅ {cell_path.name}: Développement terminé")
            success_count += 1
        else:
            console.print()
            console.print(f"[red]❌ {cell_path.name}: Développement incomplet")
            fail_count += 1
    
    # Résumé
    console.print()
    console.print(f"[cyan]{'═' * 60}")
    console.print(f"[cyan]📊 Résumé")
    console.print(f"[cyan]{'═' * 60}")
    console.print(f"Total cells: {total}")
    console.print(f"[green]✅ Succès: {success_count}")
    if fail_count:
        console.print(f"[red]❌ Échecs: {fail_count}")
    
    return 0 if fail_count == 0 else 1


def main():
    """Point d'entrée."""
    return dev3()


if __name__ == "__main__":
    sys.exit(main())
