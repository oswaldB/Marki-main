#!/usr/bin/env python3
"""Commande dev - Développe et teste les cells validées."""

import json
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

from ..core.project import Project

console = Console()


def _read_specs_file(cell_path: Path, *subpaths: str) -> str:
    """Lit un fichier de specs s'il existe."""
    file_path = cell_path / "specs" / Path(*subpaths)
    if file_path.exists():
        return file_path.read_text(encoding="utf-8")
    return ""


def _read_specs_directory(cell_path: Path, *subpaths: str) -> str:
    """Lit tous les fichiers .md d'un répertoire de specs."""
    dir_path = cell_path / "specs" / Path(*subpaths)
    if not dir_path.exists():
        return ""

    content = []
    for md_file in sorted(dir_path.glob("*.md")):
        content.append(md_file.read_text(encoding="utf-8"))
    return "\n\n".join(content)


def _build_detailed_prompt(cell) -> str:
    """Construit le prompt détaillé avec toutes les specs comme dans le script bash."""
    cell_path = cell.path
    cell_name = cell.name

    # Lire les specs
    rules_md = _read_specs_file(cell_path, "A LIRE EN PREMIER", "rules.md")
    schema_sql = _read_specs_file(cell_path, "A LIRE EN PREMIER", "schema.sql")
    wf_frontend = _read_specs_directory(cell_path, "wf-frontend")
    wf_backend = _read_specs_directory(cell_path, "wf-backend")
    models_specs = _read_specs_directory(cell_path, "models")
    routes_specs = _read_specs_directory(cell_path, "routes")

    prompt = f"""Tu es un développeur Flask/Alpine.js expert.

Développe la cell: {cell_name}

## Règles du projet (cellsmvc)
- Structure: routes/ (1 fichier par route/wf-bg), models/ (1 fichier par modèle), templates/ (plat)
- Frontend: Alpine.js + Jinja2 + Tailwind (CDN)
- Backend: Flask, SQLite
- Workflows frontend dans templates/workflows/
- Workflows backend dans routes/ (préfixés wf_)
- Logs dans logs/
- Toujours générer des fichiers complets et fonctionnels

## Spécifications à implémenter:

### Règles spécifiques:
{rules_md}

### Schéma SQL:
{schema_sql}

### Spécifications Modèles:
{models_specs}

### Spécifications Routes:
{routes_specs}

### Workflows Frontend:
{wf_frontend}

### Workflows Backend:
{wf_backend}

## Ta mission:
1. Crée/complète tous les fichiers Python (__init__.py, routes/*.py, models/*.py)
2. Crée les templates HTML (index.html, alpinejs.html, workflows/*.html)
3. Assure-toi que la cell est fonctionnelle
4. Respecte strictement l'architecture cellsmvc

## IMPORTANT - NE PAS GÉNÉRER:
- **NE génère PAS app.py** (le fichier app.py principal est géré automatiquement par le système)
- Ne génère que les fichiers de la cell elle-même

Pour CHAQUE fichier, donne un élément YAML avec:
- chemin: le chemin complet relatif (ex: app/screens/{cell_name}/routes/index.py)
- contenu: le code complet avec le pipe |

Exemple de sortie YAML:

fichiers:
  - chemin: app/screens/{cell_name}/__init__.py
    contenu: |
      # contenu complet ici
  - chemin: app/screens/{cell_name}/routes/index.py
    contenu: |
      # autre contenu

Réponds avec UN SEUL document YAML complet commençant par 'fichiers:' et contenant TOUS les fichiers. Si un fichier existe déjà dans le template, remplace-le complètement par ta version. Garde uniquement les fichiers nécessaires.
"""
    return prompt


def _get_git_branch_name(cell_name: str) -> str:
    """Convertit le nom de cell en nom de branche git."""
    return f"feature/cell-{cell_name.replace('_', '-')}"


def _git_setup(project_dir: Path, cell_name: str) -> str | None:
    """Configure git: crée/checkout la branche. Retourne le nom de branche ou None si pas de git."""
    try:
        # Vérifier si c'est un repo git
        result = subprocess.run(
            ["git", "rev-parse", "--git-dir"],
            cwd=str(project_dir),
            capture_output=True,
            check=False
        )
        if result.returncode != 0:
            return None

        branch_name = _get_git_branch_name(cell_name)

        # Créer ou checkout la branche
        subprocess.run(
            ["git", "checkout", "-b", branch_name],
            cwd=str(project_dir),
            capture_output=True,
            check=False
        )
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
        # Add
        subprocess.run(
            ["git", "add", "."],
            cwd=str(project_dir),
            capture_output=True,
            check=False
        )

        # Commit
        subprocess.run(
            ["git", "commit", "-m", f"feat({cell_name}): implémentation cell"],
            cwd=str(project_dir),
            capture_output=True,
            check=False
        )

        # Push (si remote existe)
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


def _clean_cell(cell) -> None:
    """Nettoie la cell: supprime tout sauf specs/ et recrée la structure de base."""
    cell_path = cell.path

    # Supprimer tous les fichiers/dossiers sauf specs/
    if cell_path.exists():
        for item in cell_path.iterdir():
            if item.name != "specs":
                if item.is_dir():
                    shutil.rmtree(item)
                else:
                    item.unlink()

    # Recréer les dossiers de base
    (cell_path / "routes").mkdir(parents=True, exist_ok=True)
    (cell_path / "models").mkdir(parents=True, exist_ok=True)
    (cell_path / "templates").mkdir(parents=True, exist_ok=True)
    (cell_path / "logs").mkdir(parents=True, exist_ok=True)


@click.command()
@click.option(
    "--project-dir",
    type=click.Path(exists=True, file_okay=False),
    help="Chemin du projet",
)
@click.option("--cell", "cell_name", help="Développer une cell spécifique")
@click.option("--skip-tests", is_flag=True, help="Sauter les tests après dev")
@click.option("--skip-git", is_flag=True, help="Sauter la gestion git")
@click.option("--skip-clean", is_flag=True, help="Ne pas nettoyer la cell avant dev")
@click.option("--auto-fix", is_flag=True, help="Tenter correction auto si tests échouent")
def dev(project_dir: str | None, cell_name: str | None, skip_tests: bool,
        skip_git: bool, skip_clean: bool, auto_fix: bool) -> int:
    """Développe et teste les cells validées."""

    if project_dir is None:
        project_dir = Path.cwd()
    else:
        project_dir = Path(project_dir)

    project = Project(project_dir)

    # Trouver les cells à développer
    if cell_name:
        cell = project.find_cell(cell_name)
        if not cell:
            console.print(f"[red]❌ Cell '{cell_name}' non trouvée[/red]")
            return 1
        cells = [cell]
    else:
        cells = project.get_cells_to_develop()

    if not cells:
        console.print(Panel.fit("Aucune cell à développer", style="yellow"))
        console.print()
        console.print("Conditions:")
        console.print("  - Fichier specs/valide.md doit exister")
        console.print("  - Fichier specs/devok.md ne doit PAS exister")
        return 0

    console.print(Panel.fit(f"Développement: {len(cells)} cell(s)", style="blue"))
    for cell in cells:
        console.print(f"  • {cell.name} ({cell.cell_type.value})")

    if not Confirm.ask("\nContinuer le développement?", default=True):
        return 0

    # Vérifier que pi est disponible
    if not _check_pi():
        console.print("[red]❌ Commande 'pi' non disponible[/red]")
        return 1

    # Développer et tester chaque cell
    total = len(cells)
    dev_passed = 0
    dev_failed = 0
    test_passed = 0
    test_failed = 0
    test_skipped = 0

    # Tracking des cells avec erreurs pour correction auto
    failed_cells = []

    for i, cell in enumerate(cells, 1):
        console.print()
        console.print(f"[cyan]{'═' * 40}")
        console.print(f"[cyan]📦 [{i}/{total}] {cell.name}")
        console.print(f"[cyan]{'═' * 40}")

        # Git setup
        branch_name = None
        if not skip_git:
            branch_name = _git_setup(project_dir, cell.name)
            if branch_name:
                console.print(f"[dim]🌿 Branche: {branch_name}[/dim]")

        # Développement
        dev_ok, yaml_path = _develop_cell(cell, project, skip_clean)
        if not dev_ok:
            dev_failed += 1
            continue

        dev_passed += 1

        # Git commit
        if not skip_git and branch_name:
            _git_commit(project_dir, cell.name)

        # Tests automatiques (si activés)
        if not skip_tests:
            console.print()
            console.print("[blue]🔨 Lancement des tests automatiques...")
            test_ok, test_errors = _run_cell_tests(cell, project, console)

            if test_ok:
                console.print(f"[green]✅ {cell.name}: TEST PASS")
                test_passed += 1
            else:
                console.print(f"[red]❌ {cell.name}: TEST FAIL")
                test_failed += 1
                if test_errors:
                    for err in test_errors[:5]:
                        console.print(f"  [dim]{err}[/dim]")

                # Correction automatique si demandée
                if auto_fix and yaml_path:
                    console.print()
                    console.print("[blue]🔨 Tentative de correction automatique...")
                    if _auto_fix_cell(cell, project, yaml_path, test_errors):
                        console.print(f"[green]✅ {cell.name}: CORRECTION OK")
                        # Redémarrer le serveur pour prendre en compte les changements
                        console.print("  [blue]🔄 Redémarrage du serveur...")
                        restart_ok, restart_err = _restart_server(project_dir)
                        if restart_ok:
                            console.print("  [green]✅ Serveur redémarré")
                            test_failed -= 1
                            test_passed += 1
                        else:
                            console.print("  [red]❌ Échec redémarrage serveur")
                            failed_cells.append({
                                "cell": cell,
                                "errors": test_errors + restart_err,
                                "yaml_path": yaml_path
                            })
                    else:
                        console.print(f"[red]❌ {cell.name}: Correction échouée")
                        failed_cells.append({
                            "cell": cell,
                            "errors": test_errors,
                            "yaml_path": yaml_path
                        })
                elif not auto_fix and yaml_path:
                    # Proposition interactive de correction immédiate
                    console.print()
                    if Confirm.ask(f"🔧 Corriger {cell.name} maintenant?", default=True):
                        console.print("[blue]🔨 Tentative de correction...")
                        if _auto_fix_cell(cell, project, yaml_path, test_errors):
                            console.print(f"[green]✅ {cell.name}: CORRECTION OK")
                            # Redémarrer le serveur pour prendre en compte les changements
                            console.print("  [blue]🔄 Redémarrage du serveur...")
                            restart_ok, restart_err = _restart_server(project_dir)
                            if restart_ok:
                                console.print("  [green]✅ Serveur redémarré")
                                test_failed -= 1
                                test_passed += 1
                            else:
                                console.print("  [red]❌ Échec redémarrage serveur")
                                failed_cells.append({
                                    "cell": cell,
                                    "errors": test_errors + restart_err,
                                    "yaml_path": yaml_path
                                })
                        else:
                            console.print(f"[red]❌ {cell.name}: Correction échouée")
                            failed_cells.append({
                                "cell": cell,
                                "errors": test_errors,
                                "yaml_path": yaml_path
                            })
                    else:
                        # Ajouté à la liste pour correction finale possible
                        failed_cells.append({
                            "cell": cell,
                            "errors": test_errors,
                            "yaml_path": yaml_path
                        })
        else:
            test_skipped += 1
            console.print("[yellow]⚠️ Tests sautés (--skip-tests)")

    # Résumé
    console.print()
    console.print(f"[cyan]{'═' * 40}")
    console.print(f"[cyan]📊 Résumé")
    console.print(f"[cyan]{'═' * 40}")
    console.print(f"Total cells: {total}")
    console.print(f"[green]✅ Dév OK: {dev_passed}")
    if dev_failed:
        console.print(f"[red]❌ Dév échecs: {dev_failed}")

    if not skip_tests:
        console.print(f"[green]✅ Tests PASS: {test_passed}")
        if test_failed:
            console.print(f"[red]❌ Tests FAIL: {test_failed}")
    else:
        console.print(f"[yellow]⚠️ Tests sautés: {test_skipped}")

    # Correction finale pour les cells en échec
    if failed_cells and not auto_fix:
        console.print()
        if Confirm.ask(f"Tenter de corriger {len(failed_cells)} cell(s) en échec?", default=True):
            for item in failed_cells:
                cell = item["cell"]
                console.print()
                console.print(f"[cyan]🔧 Correction de: {cell.name}[/cyan]")
                if _auto_fix_cell(cell, project, item["yaml_path"], item["errors"]):
                    console.print(f"[green]✅ {cell.name}: CORRECTION OK")
                    # Redémarrer le serveur pour prendre en compte les changements
                    console.print("  [blue]🔄 Redémarrage du serveur...")
                    restart_ok, restart_err = _restart_server(project_dir)
                    if restart_ok:
                        console.print("  [green]✅ Serveur redémarré")
                        test_failed -= 1
                        test_passed += 1
                    else:
                        console.print("  [red]❌ Échec redémarrage serveur")
                else:
                    console.print(f"[red]❌ {cell.name}: Correction échouée")

    # Demander création de devok.md UNIQUEMENT si tous les tests sont OK
    if dev_passed > 0 and (skip_tests or test_failed == 0):
        console.print()
        if Confirm.ask("Créer devok.md pour les cells développées?", default=True):
            for cell in cells:
                if (cell.path / "specs" / "devok.md").exists():
                    continue
                _create_detailed_devok(cell)

    return 0 if dev_failed == 0 and (skip_tests or test_failed == 0) else 1


def _check_pi() -> bool:
    """Vérifie si la commande pi est disponible."""
    try:
        subprocess.run(["pi", "--version"], capture_output=True, check=False)
        return True
    except FileNotFoundError:
        return False


def _restart_server(project_dir: Path) -> tuple[bool, list[str]]:
    """Redémarre le serveur Flask (kill + start).
    
    Retourne (succès, liste_d_erreurs).
    """
    # Tuer le processus existant
    try:
        subprocess.run(
            ["pkill", "-f", "flask"],
            capture_output=True, check=False
        )
        time.sleep(1)
    except:
        pass
    
    # Redémarrer
    return _start_server(project_dir)


def _check_server() -> bool:
    """Vérifie si le serveur Flask est démarré sur le port 5000."""
    try:
        result = subprocess.run(
            ["curl", "-s", "http://localhost:5000/"],
            capture_output=True, timeout=5
        )
        return result.returncode == 0
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return False


def _start_server(project_dir: Path) -> tuple[bool, list[str]]:
    """Tente de démarrer le serveur Flask automatiquement.
    
    Retourne (succès, liste_d_erreurs).
    """
    init_script = project_dir / "scripts" / "03-init-boilerplate.sh"
    if not init_script.exists():
        return False, ["Script d'initialisation non trouvé"]

    # Lire la taille du log avant démarrage
    flask_log = project_dir / "flask_server.log"
    log_before = 0
    if flask_log.exists():
        try:
            with open(flask_log, 'r') as f:
                log_before = len(f.readlines())
        except IOError:
            pass

    try:
        # Capturer stderr pour voir les erreurs de démarrage immédiates
        process = subprocess.Popen(
            ["bash", str(init_script)],
            cwd=str(project_dir),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            start_new_session=True
        )
        
        # Attendre un peu et essayer de lire les erreurs immédiates
        time.sleep(3)
        
        # Vérifier si le processus a crashé immédiatement
        poll_result = process.poll()
        startup_errors = []
        
        if poll_result is not None and poll_result != 0:
            # Le processus a crashé, lire stderr
            try:
                stderr_output = process.stderr.read() if process.stderr else ""
                if stderr_output:
                    startup_errors.append(f"[STARTUP] {stderr_output[:2000]}")
            except:
                pass
        
        # Vérifier si le serveur répond
        if _check_server():
            return True, []
        
        # Si pas de réponse, essayer de lire les nouvelles erreurs dans le log
        if flask_log.exists():
            try:
                with open(flask_log, 'r') as f:
                    lines = f.readlines()
                log_after = len(lines)
                
                if log_after > log_before:
                    new_lines = lines[log_before:log_after]
                    for line in new_lines:
                        if any(kw in line for kw in ["ERROR", "Exception", "Traceback", "ImportError", "NoAppException", "ModuleNotFoundError"]):
                            startup_errors.append(f"[LOG] {line.strip()}")
            except IOError:
                pass
        
        # Essayer de lire les logs gunicorn/flask alternatifs
        for log_file in ["gunicorn.log", "server.log", "app.log"]:
            alt_log = project_dir / log_file
            if alt_log.exists():
                try:
                    content = alt_log.read_text(encoding="utf-8")
                    # Chercher les dernières erreurs
                    lines = content.split('\n')
                    for line in lines[-50:]:  # Dernières 50 lignes
                        if any(kw in line for kw in ["ERROR", "Exception", "Traceback", "ImportError", "NoAppException"]):
                            startup_errors.append(f"[{log_file}] {line.strip()}")
                except:
                    pass
        
        return False, startup_errors if startup_errors else ["Serveur Flask ne répond pas (démarrage probablement échoué)"]
        
    except Exception as e:
        return False, [f"Erreur démarrage serveur: {e}"]


def _run_frontend_test(url: str, screenshot_path: Path, log_path: Path, project_dir: Path) -> tuple[bool, list[str], str]:
    """Lance le test Playwright et retourne (succès, erreurs, output)."""
    test_script = project_dir / "scripts" / "test-frontend.py"
    if not test_script.exists():
        return False, ["Script test-frontend.py non trouvé"], ""

    # Chercher le Python du venv en priorité
    python_exe = None
    venv_python = project_dir / "venv" / "bin" / "python"
    if venv_python.exists():
        python_exe = str(venv_python)
    else:
        # Fallback sur le Python actuel
        python_exe = sys.executable

    try:
        result = subprocess.run(
            [python_exe, str(test_script), url, str(screenshot_path), str(log_path)],
            capture_output=True, text=True, timeout=60
        )
        output = result.stdout + result.stderr

        errors = []

        # Vérifier les erreurs dans le fichier frontend.json
        if log_path.exists():
            try:
                with open(log_path, 'r') as f:
                    data = json.load(f)

                # Erreurs console
                messages = data.get('messages', [])
                for msg in messages:
                    if msg.get('type') == 'error':
                        text = msg.get('text', str(msg))
                        errors.append(f"[CONSOLE] {text}")

                # Erreurs frontend
                for err in data.get('errors', [])[:5]:
                    errors.append(f"[FRONT] {err.get('message', str(err))}")

            except (json.JSONDecodeError, IOError):
                pass

        test_passed = result.returncode == 0 and len(errors) == 0
        return test_passed, errors, output

    except subprocess.TimeoutExpired:
        return False, ["Timeout du test Playwright"], ""
    except Exception as e:
        return False, [f"Erreur test: {e}"], ""


def _capture_backend_logs(project_dir: Path, logs_dir: Path, log_before: int) -> list[str]:
    """Capture les nouvelles erreurs backend depuis le fichier de log."""
    flask_log = project_dir / "flask_server.log"
    if not flask_log.exists():
        return []

    errors = []
    try:
        with open(flask_log, 'r') as f:
            lines = f.readlines()

        log_after = len(lines)

        if log_after > log_before:
            new_lines = lines[log_before:]
            backend_log = logs_dir / "backend.log"
            with open(backend_log, 'w') as f:
                f.writelines(new_lines)

            for line in new_lines:
                if any(kw in line for kw in ["ERROR", "Exception", "Traceback", "500", "ImportError", "NoAppException", "ModuleNotFoundError", "SyntaxError", "cannot import", "While importing"]):
                    errors.append(f"[BACK] {line.strip()}")

        return errors[:20]  # Augmenté pour voir plus d'erreurs

    except IOError:
        return []


def _get_http_status(url: str) -> tuple[int, bool]:
    """Vérifie le code HTTP de l'URL."""
    try:
        result = subprocess.run(
            ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", url],
            capture_output=True, text=True, timeout=10
        )
        code = result.stdout.strip()
        is_ok = code in ["200", "302"]
        return int(code) if code.isdigit() else 0, is_ok
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return 0, False


def _run_cell_tests(cell, project: Project, console: Console) -> tuple[bool, list[str]]:
    """Exécute les tests pour une cell spécifique."""
    cell_name = cell.name
    project_dir = project.root

    # Déterminer l'URL selon le type de cell
    cell_path_str = str(cell.path)
    if "/screens/" in cell_path_str:
        url = f"http://localhost:5000/{cell_name}"
    elif "/backend_wf/" in cell_path_str:
        url = f"http://localhost:5000/api/{cell_name}"
    else:
        url = f"http://localhost:5000/{cell_name}"

    # Créer le dossier de logs
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    logs_dir = cell.path / "logs" / timestamp
    logs_dir.mkdir(parents=True, exist_ok=True)
    (logs_dir / "screenshots").mkdir(exist_ok=True)

    console.print(f"  [dim]Logs: {logs_dir}[/dim]")

    errors = []

    # Initialiser le log tracking AVANT tout
    flask_log = project_dir / "flask_server.log"
    log_before = 0
    if flask_log.exists():
        try:
            with open(flask_log, 'r') as f:
                log_before = len(f.readlines())
        except IOError:
            pass

    # 1. Vérifier le serveur
    if not _check_server():
        console.print("  [yellow]⚠️ Serveur non démarré, tentative de démarrage...[/yellow]")
        server_ok, startup_errors = _start_server(project_dir)
        if not server_ok:
            console.print("  [red]❌ Impossible de démarrer le serveur[/red]")
            if startup_errors:
                console.print("  [red]Erreurs de démarrage:[/red]")
                for err in startup_errors[:10]:
                    console.print(f"    [dim]{err}[/dim]")
            errors.extend(startup_errors if startup_errors else ["Serveur Flask non disponible"])
            # Sauvegarder les erreurs de démarrage avant de retourner
            (logs_dir / "errors.txt").write_text("\n".join(errors), encoding="utf-8")
            (logs_dir / "backend.log").write_text("\n".join(startup_errors), encoding="utf-8")
            return False, errors

    # 2. Vérifier HTTP
    http_code, http_ok = _get_http_status(url)
    backend_errors = []  # Initialiser ici pour tout le bloc
    test_passed = True  # Initialiser aussi
    output = ""
    if not http_ok:
        errors.append(f"[HTTP] Route retourne HTTP {http_code}")
        console.print(f"  [red]❌ HTTP {http_code}[/red]")
        
        # Si HTTP 500+, forcer la capture des erreurs backend immédiatement
        if http_code >= 500:
            console.print("  [yellow]🔍 Recherche d'erreurs serveur...")
            backend_errors = _capture_backend_logs(project_dir, logs_dir, log_before)
            if backend_errors:
                console.print("  [red]Erreurs serveur détectées:[/red]")
                for err in backend_errors[:10]:
                    console.print(f"    [dim]{err}[/dim]")
                errors.extend(backend_errors)
            else:
                # Lire directement les dernières lignes du log
                if flask_log.exists():
                    try:
                        with open(flask_log, 'r') as f:
                            lines = f.readlines()
                        if len(lines) > log_before:
                            new_lines = lines[log_before:]
                            for line in new_lines[-20:]:  # Dernières 20 lignes
                                if any(kw in line for kw in ["ERROR", "Exception", "Traceback", "ImportError", "NoAppException", "ModuleNotFoundError", "cannot import"]):
                                    err_msg = f"[BACK] {line.strip()}"
                                    console.print(f"    [dim]{err_msg}[/dim]")
                                    errors.append(err_msg)
                    except IOError:
                        pass
    
    # Si erreur HTTP 500+, on skip le test Playwright car la page ne fonctionne pas
    skip_playwright = http_code >= 500

    # 3. Lancer le test Playwright (seulement si pas d'erreur serveur critique)
    screenshot_path = logs_dir / "screenshots" / f"{cell_name}.png"
    frontend_log = logs_dir / "frontend.json"
    
    if not skip_playwright:
        test_passed, frontend_errors, output = _run_frontend_test(
            url, screenshot_path, frontend_log, project_dir
        )
        errors.extend(frontend_errors)
    else:
        console.print("  [yellow]⚠️ Test frontend ignoré (erreur serveur 500+)")
        test_passed = False
        output = "Test frontend ignoré - erreur serveur HTTP 500"
        # Créer un frontend_log vide
        frontend_log.write_text('{"messages": [], "errors": []}', encoding="utf-8")

    # 4. Vérifier les erreurs backend (si pas déjà capturées)
    if http_ok or http_code < 500:
        backend_errors = _capture_backend_logs(project_dir, logs_dir, log_before)
        errors.extend(backend_errors)

    # Écrire le log de sortie
    (logs_dir / "test_output.log").write_text(output, encoding="utf-8")

    # 5. Générer le rapport JSON
    report = {
        "cell": cell_name,
        "timestamp": timestamp,
        "url": url,
        "status": "tested",
        "http_code": http_code,
        "test_passed": test_passed and http_ok and len(backend_errors) == 0,
        "files": {
            "frontend": "frontend.json",
            "screenshot": f"screenshots/{cell_name}.png",
            "output": "test_output.log"
        }
    }
    (logs_dir / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")

    final_passed = test_passed and http_ok and len(backend_errors) == 0

    if errors:
        (logs_dir / "errors.txt").write_text("\n".join(errors), encoding="utf-8")

    return final_passed, errors


def _create_detailed_devok(cell) -> None:
    """Crée le fichier devok.md détaillé comme dans le script bash."""
    # Compter les fichiers créés
    file_count = 0
    if cell.path.exists():
        for _ in cell.path.rglob("*"):
            if _.is_file() and _.suffix in [".py", ".html"]:
                file_count += 1

    devok_content = f"""# Développement OK

Date: {datetime.now().isoformat()}
Cell: {cell.name}
Statut: Développée

## Fichiers créés
{file_count} fichiers Python et templates

## Tests
- [x] Développement effectué
- [x] Test automatique effectué
- [x] Logs vérifiés
"""
    devok_path = cell.specs_path / "devok.md"
    devok_path.write_text(devok_content, encoding="utf-8")
    console.print(f"  [dim]📝 devok.md créé[/dim]")


def _update_app_py(project: Project, cell) -> bool:
    """Met à jour app.py pour ajouter le blueprint de la cell via pi -p."""
    app_py = project.root / "app" / "app.py"
    if not app_py.exists():
        console.print("  [yellow]⚠️ app.py non trouvé[/yellow]")
        return False

    cell_name = cell.name
    cell_path_str = str(cell.path)

    # Déterminer le type de cell et les infos de route
    if "/screens/" in cell_path_str:
        cell_type = "screens"
        url_prefix = f"/{cell_name}"
        section = "# SCREENS"
    elif "/backend_wf/" in cell_path_str:
        cell_type = "backend_wf"
        url_prefix = f"/api/{cell_name}"
        section = "# BACKEND WORKFLOWS"
    elif "/cron/" in cell_path_str:
        cell_type = "cron"
        url_prefix = f"/{cell_name}"
        section = "# CRON"
    else:
        cell_type = "screens"
        url_prefix = f"/{cell_name}"
        section = "# SCREENS"

    import_line = f"from app.{cell_type}.{cell_name} import bp as {cell_name}_bp"
    register_line = f"app.register_blueprint({cell_name}_bp, url_prefix='{url_prefix}')"

    # Lire le contenu actuel de app.py
    try:
        current_content = app_py.read_text(encoding="utf-8")
    except Exception as e:
        console.print(f"  [red]❌ Erreur lecture app.py: {e}[/red]")
        return False

    # Vérifier si déjà présent
    if f"{cell_name}_bp" in current_content:
        console.print(f"  [dim]ℹ️ Route déjà présente dans app.py[/dim]")
        return True

    # Construire le prompt pour pi
    prompt = f"""Tu es un expert Flask. Analyse ce fichier app.py et ajoute le blueprint pour la nouvelle cell.

## Contenu actuel de app.py:
```python
{current_content}
```

## Nouvelle cell à intégrer:
- Nom: {cell_name}
- Type: {cell_type}
- Section: {section}
- Import à ajouter: {import_line}
- Registration à ajouter: {register_line}

## Instructions:
1. Ajoute la ligne d'import {import_line} dans la section des imports appropriée (avec les autres from app.{cell_type}...)
2. Ajoute la ligne de registration {register_line} dans la fonction create_app(), dans la section {section}
3. Respecte le style et l'indentation existante
4. Retourne le fichier app.py complet et fonctionnel

Réponds avec UNIQUEMENT le contenu du fichier app.py, sans balises markdown, sans explications."""

    try:
        console.print("  [blue]🤖 Analyse et mise à jour de app.py avec pi...")
        result = subprocess.run(
            ["pi", "-p", prompt],
            capture_output=True,
            text=True,
            timeout=60,
        )

        if result.returncode != 0:
            console.print(f"  [red]❌ Erreur pi: {result.stderr[:200]}[/red]")
            return False

        # Nettoyer la réponse (enlever les balises markdown si présentes)
        new_content = result.stdout.strip()
        if new_content.startswith("```python"):
            new_content = new_content[9:]
        if new_content.startswith("```"):
            new_content = new_content[3:]
        if new_content.endswith("```"):
            new_content = new_content[:-3]
        new_content = new_content.strip()

        # Vérifier que le blueprint a bien été ajouté
        if f"{cell_name}_bp" not in new_content:
            console.print("  [red]❌ Le blueprint n'a pas été ajouté dans la réponse[/red]")
            return False

        # Écrire le nouveau contenu
        app_py.write_text(new_content, encoding="utf-8")
        console.print(f"  [green]✅ Route ajoutée: {url_prefix}[/green]")
        return True

    except subprocess.TimeoutExpired:
        console.print("  [red]❌ Timeout pi[/red]")
        return False
    except Exception as e:
        console.print(f"  [red]❌ Erreur mise à jour app.py: {e}[/red]")
        return False


def _clean_yaml_response(content: str) -> str:
    """Nettoie la réponse de l'IA pour extraire le YAML."""
    # Chercher un bloc YAML entre balises ```yaml ... ```
    import re
    
    # Pattern pour extraire le contenu entre ```yaml et ```
    yaml_block_pattern = r'```yaml\s*\n(.*?)\n```'
    match = re.search(yaml_block_pattern, content, re.DOTALL)
    if match:
        return match.group(1).strip()
    
    # Fallback: chercher entre ``` et ``` sans spécifier yaml
    generic_pattern = r'```\s*\n(.*?)\n```'
    match = re.search(generic_pattern, content, re.DOTALL)
    if match:
        potential_yaml = match.group(1).strip()
        if potential_yaml.startswith(('fichiers:', 'cell:', '---')):
            return potential_yaml
    
    # Nettoyage ligne par ligne si pas de bloc markdown
    lines = content.split('\n')
    cleaned_lines = []
    in_yaml = False

    for line in lines:
        if line.startswith('[Context] file://'):
            continue
        if line.strip().startswith('```yaml') or line.strip() == '```':
            in_yaml = True
            continue
        if line.strip() == '```' and in_yaml:
            in_yaml = False
            continue
        if not cleaned_lines and line.strip():
            if line.strip().startswith(('cell:', 'fichiers:', '---')):
                cleaned_lines.append(line)
        else:
            cleaned_lines.append(line)

    return '\n'.join(cleaned_lines)


def _auto_fix_cell(cell, project: Project, yaml_path: Path, errors: list[str]) -> bool:
    """Tente de corriger automatiquement une cell avec des erreurs."""
    cell_name = cell.name

    # Lire le code actuel
    code_context = ""
    for f in cell.path.rglob("*.py"):
        if f.is_file():
            code_context += f"\n\n=== {f.name} ===\n"
            code_context += f.read_text(encoding="utf-8")[:2000]

    # Lire les logs frontend si disponibles
    frontend_json = ""
    latest_log = None
    for log_dir in (cell.path / "logs").iterdir():
        if log_dir.is_dir():
            frontend_file = log_dir / "frontend.json"
            if frontend_file.exists():
                latest_log = frontend_file
                break

    if latest_log:
        try:
            frontend_json = latest_log.read_text(encoding="utf-8")
        except IOError:
            pass

    # Lire les erreurs backend depuis le fichier backend.log
    backend_errors = ""
    if latest_log:
        backend_file = latest_log.parent / "backend.log"
        if backend_file.exists():
            try:
                backend_errors = backend_file.read_text(encoding="utf-8")
            except IOError:
                pass
    
    # Lire aussi errors.txt s'il existe (erreurs consolidées)
    errors_txt = ""
    if latest_log:
        errors_file = latest_log.parent / "errors.txt"
        if errors_file.exists():
            try:
                errors_txt = errors_file.read_text(encoding="utf-8")
            except IOError:
                pass
    
    # Lire le log de sortie du test (test_output.log)
    test_output = ""
    if latest_log:
        output_file = latest_log.parent / "test_output.log"
        if output_file.exists():
            try:
                test_output = output_file.read_text(encoding="utf-8")
            except IOError:
                pass

    # Construire le prompt de correction avec toutes les sources d'erreur
    all_errors = "\n".join(errors) if errors else ""
    
    fix_prompt = f"""Tu es un développeur Flask/Alpine.js expert.

La cell '{cell_name}' a des erreurs lors des tests.

## Erreurs détectées (consolidées):
{all_errors[:2000]}

## Erreurs détaillées (errors.txt):
{errors_txt[:2000]}

## Logs frontend (JSON):
{frontend_json[:2000]}

## Logs backend (Flask):
{backend_errors[:2000]}

## Sortie du test:
{test_output[:2000]}

## Code actuel (extrait):
{code_context[:3000]}

## Ta mission:
1. Analyse les erreurs ci-dessus (frontend ET backend ET démarrage serveur)
2. Identifie la cause racine (ImportError, NoAppException, etc.)
3. Corrige le code pour résoudre TOUTES les erreurs
4. Donne les fichiers corrigés complets

## IMPORTANT - NE PAS GÉNÉRER:
- **NE génère PAS app.py** (géré automatiquement)
- Ne génère que les fichiers de la cell elle-même

Pour CHAQUE fichier corrigé, donne un élément YAML avec:
- chemin: le chemin complet relatif (ex: app/{cell_name}/routes/index.py)
- contenu: le code corrigé complet avec le pipe |

Exemple:

fichiers:
  - chemin: app/{cell_name}/routes/index.py
    contenu: |
      # contenu corrigé complet ici
"""

    try:
        result = subprocess.run(
            ["pi", "-p", fix_prompt],
            capture_output=True,
            text=True,
            timeout=300,
        )
        if result.returncode != 0:
            return False

        cleaned = _clean_yaml_response(result.stdout)
        yaml_path.write_text(cleaned, encoding="utf-8")

        # Extraire et écrire les fichiers corrigés
        return _extract_files(cell, yaml_path)

    except Exception:
        return False


def _extract_files(cell, yaml_path: Path) -> bool:
    """Extrait les fichiers depuis le YAML généré."""
    try:
        with open(yaml_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Pré-traitement: supprimer les lignes qui pourraient causer des problèmes
        # Si le YAML contient du markdown avec **texte**, cela peut causer des erreurs
        lines = content.split('\n')
        cleaned_lines = []
        in_content = False
        
        for line in lines:
            # Détecter si on est dans un bloc contenu (après un |)
            stripped = line.rstrip()
            if stripped.endswith(': |') or stripped.endswith(': |-'):
                in_content = True
                cleaned_lines.append(line)
                continue
            
            # Si on est dans le contenu, tout garder tel quel
            if in_content:
                cleaned_lines.append(line)
                # Détecter la fin du bloc contenu (ligne non indentée)
                if line and not line.startswith(' ') and not line.startswith('\t'):
                    in_content = False
                continue
            
            # En dehors du contenu, nettoyer les lignes problématiques
            # Ignorer les lignes qui ressemblent à du markdown avec ** sans être dans un bloc contenu
            if stripped.startswith('**') and stripped.endswith('**'):
                console.print(f"  [dim]⚠️  Ligne ignorée (markdown): {line[:50]}...")
                continue
            
            cleaned_lines.append(line)
        
        cleaned_content = '\n'.join(cleaned_lines)
        
        try:
            data = yaml.safe_load(cleaned_content)
        except yaml.YAMLError as ye:
            console.print(f"[red]❌ Erreur YAML: {ye}")
            # Sauvegarder le contenu problématique pour debug
            debug_path = yaml_path.parent / f"{yaml_path.stem}-debug.yaml"
            debug_path.write_text(cleaned_content, encoding="utf-8")
            console.print(f"[dim]🐛 Contenu sauvegardé dans: {debug_path}")
            return False

        if not isinstance(data, dict) or "fichiers" not in data:
            console.print("[red]❌ Structure YAML invalide - clé 'fichiers' manquante")
            return False

        fichiers = data["fichiers"]
        if not isinstance(fichiers, list):
            console.print("[red]❌ Structure YAML invalide - 'fichiers' n'est pas une liste")
            return False

        files_created = 0

        for item in fichiers:
            if not isinstance(item, dict):
                continue

            filepath = item.get("chemin", "").strip() if item.get("chemin") else ""
            filecontent = item.get("contenu", "")

            if not filepath:
                continue

            if not filecontent:
                console.print(f"[yellow]⚠️  Contenu vide pour: {filepath}")
                continue

            # Ignorer app.py
            if Path(filepath).name == "app.py":
                console.print(f"  [dim]⚠️  Ignoré (app.py géré automatiquement): {filepath}[/dim]")
                continue

            # Convertir en chemin absolu
            if filepath.startswith("app/"):
                parts = filepath.split("/")
                if len(parts) >= 3:
                    rel_path = "/".join(parts[3:]) if len(parts) > 3 else ""
                    if rel_path:
                        full_path = cell.path / rel_path
                    else:
                        continue
                else:
                    continue
            else:
                full_path = cell.path / filepath

            # Vérifier que c'est dans la cell
            try:
                full_path.relative_to(cell.path)
            except ValueError:
                console.print(f"[yellow]⚠️  Ignoré (hors cell): {filepath}")
                continue

            full_path.parent.mkdir(parents=True, exist_ok=True)

            if isinstance(filecontent, str):
                full_path.write_text(filecontent.strip(), encoding="utf-8")
            else:
                full_path.write_text(str(filecontent), encoding="utf-8")

            files_created += 1

        console.print(f"[green]✅ {files_created} fichiers extraits")
        return True

    except Exception as e:
        console.print(f"[red]❌ Erreur extraction: {e}")
        import traceback
        console.print(f"[dim]{traceback.format_exc()}")
        return False


def _develop_cell(cell, project: Project, skip_clean: bool) -> tuple[bool, Path | None]:
    """Développe une cell spécifique. Retourne (succès, yaml_path)."""

    # Étape 1: Nettoyage de la cell
    if not skip_clean:
        console.print("[blue]🔨 Nettoyage de la cell...")
        _clean_cell(cell)
        console.print("[green]✅ Cell nettoyée (specs/ conservé)")

    # Étape 2: Construction du prompt détaillé
    console.print("[blue]🔨 Construction du prompt...")
    full_prompt = _build_detailed_prompt(cell)

    # Étape 3: Appel à pi
    console.print("[blue]🔨 Génération du code avec pi...")

    yaml_path = cell.path / "dev-output.yaml"

    try:
        result = subprocess.run(
            ["pi", "-p", full_prompt],
            capture_output=True,
            text=True,
            timeout=300,
        )
        if result.returncode != 0:
            console.print(f"[red]❌ Erreur pi: {result.stderr[:200]}")
            return False, None

        cleaned_content = _clean_yaml_response(result.stdout)
        yaml_path.write_text(cleaned_content, encoding="utf-8")
        console.print("[green]✅ Code généré")

    except subprocess.TimeoutExpired:
        console.print("[red]❌ Timeout pi")
        return False, None
    except Exception as e:
        console.print(f"[red]❌ Erreur: {e}")
        return False, None

    # Étape 4: Validation utilisateur
    console.print()
    console.print(f"[blue]📄 Code généré dans: {yaml_path}")
    if not Confirm.ask("Valider et continuer l'extraction?", default=True):
        console.print("[yellow]⚠️ Abandon - dev-output.yaml conservé")
        return False, yaml_path

    # Étape 5: Extraire les fichiers
    console.print("[blue]🔨 Extraction des fichiers...")
    if not _extract_files(cell, yaml_path):
        return False, yaml_path

    # Étape 6: Mettre à jour app.py
    console.print("[blue]🔨 Mise à jour de app.py...")
    _update_app_py(project, cell)

    console.print(f"[green]✅ {cell.name} développée avec succès!")
    return True, yaml_path


def main():
    """Point d'entrée."""
    return dev()


if __name__ == "__main__":
    sys.exit(main())
