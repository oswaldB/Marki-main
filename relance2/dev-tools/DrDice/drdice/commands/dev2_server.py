#!/usr/bin/env python3
"""Gestion simplifiée du serveur Flask pour dev2."""

import subprocess
import time
from pathlib import Path
from typing import Tuple
from rich.console import Console
from rich.prompt import Confirm

console = Console()


def _wait_for_server(max_attempts: int = 30, delay: float = 1.0) -> bool:
    """Attend que le serveur Flask soit prêt."""
    for i in range(max_attempts):
        try:
            result = subprocess.run(
                ["curl", "-s", "http://localhost:5000/"],
                capture_output=True, timeout=2
            )
            if result.returncode == 0:
                return True
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass
        time.sleep(delay)
    return False


def _check_server() -> bool:
    """Vérifie si Flask répond sur le port 5000."""
    try:
        result = subprocess.run(
            ["curl", "-s", "http://localhost:5000/"],
            capture_output=True, timeout=5
        )
        return result.returncode == 0
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return False


def _get_venv_python(project_dir: Path) -> Path:
    """Trouve le Python du venv s'il existe."""
    for venv_path in ["venv/bin/python", ".venv/bin/python"]:
        p = project_dir / venv_path
        if p.exists():
            return p
    return Path("python3")


def start_server_simple(project_dir: Path) -> Tuple[bool, str]:
    """Démarre le serveur Flask via run.py.
    
    Returns:
        Tuple (success, error_log_content)
    """
    import os
    from datetime import datetime
    
    venv_python = _get_venv_python(project_dir)
    python_exe = str(venv_python) if venv_python.exists() else "python3"
    
    run_py = project_dir / "run.py"
    if not run_py.exists():
        return False, "run.py non trouvé"
    
    logs_dir = project_dir / "logs"
    logs_dir.mkdir(exist_ok=True)
    
    try:
        console.print("  [blue]🚀 Démarrage via run.py...")
        
        env = os.environ.copy()
        if venv_python.exists():
            venv_path = venv_python.parent.parent
            env['VIRTUAL_ENV'] = str(venv_path)
            env['PATH'] = str(venv_python.parent) + os.pathsep + env.get('PATH', '')
            env.pop('PYTHONHOME', None)
        
        process = subprocess.Popen(
            [python_exe, str(run_py), "--port=5000"],
            cwd=str(project_dir),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            start_new_session=True,
            env=env
        )
        
        console.print("  [dim]⏳ Attente du démarrage...")
        time.sleep(3)
        
        # Vérifier si le processus est toujours vivant
        if process.poll() is not None:
            stdout, stderr = process.communicate(timeout=5)
            error_content = stderr.decode('utf-8', errors='replace') if stderr else ""
            error_content += stdout.decode('utf-8', errors='replace') if stdout else ""
            return False, error_content
        
        # Vérifier si le serveur répond
        if _wait_for_server(max_attempts=30, delay=1.0):
            console.print("  [green]✅ Serveur démarré sur http://localhost:5000")
            return True, ""
        
        # Timeout
        stdout, stderr = process.communicate(timeout=5)
        error_content = stderr.decode('utf-8', errors='replace') if stderr else ""
        return False, error_content
        
    except Exception as e:
        return False, str(e)


def fix_server_with_ai(project_dir: Path, error_log: str) -> bool:
    """Demande à l'utilisateur et applique les corrections via IA."""
    import re
    
    console.print()
    console.print("[yellow]🔧 Problème détecté au démarrage du serveur")
    
    # Afficher un résumé de l'erreur
    console.print("[red]📄 Erreur:")
    error_lines = error_log.strip().split('\n')[:10]
    for line in error_lines:
        if line.strip():
            console.print(f"[dim]   {line}")
    
    if not Confirm.ask("\n[yellow]Lancer l'IA pour corriger automatiquement?", default=True):
        console.print("  [dim]  ℹ️ Corrections annulées")
        return False
    
    console.print("  [dim]  🤖 Analyse et correction en cours...")
    
    prompt = f"""Tu es un expert Flask/Python. Corrige l'erreur de démarrage.

## Logs d'erreur
```
{error_log[:4000]}
```

## Ta mission
1. Identifie la cause de l'erreur
2. Génère le code complet des fichiers à modifier

## Format de réponse
Pour chaque fichier:

## chemin/relatif/fichier.py
```python
# code Python complet
```

Important: Code COMPLET uniquement.
"""
    
    try:
        result = subprocess.run(
            ["pi", "-p", prompt],
            capture_output=True, text=True, timeout=120
        )
        
        if result.returncode != 0:
            console.print(f"  [red]  ❌ Erreur IA: {result.stderr[:200]}")
            return False
        
        response = result.stdout.strip()
        
        # Sauvegarder la réponse
        logs_dir = project_dir / "logs"
        logs_dir.mkdir(exist_ok=True)
        (logs_dir / "flask_fix_ai.response.txt").write_text(response, encoding='utf-8')
        
        # Extraire les fichiers
        applied = 0
        pattern = r'#{1,2}\s*([\w/\\._-]+\.py)\s*\n```python\s*\n(.*?)```'
        matches = re.findall(pattern, response, re.MULTILINE | re.DOTALL)
        
        if not matches:
            console.print("  [yellow]  ⚠️ Aucune correction détectée")
            return False
        
        for filepath, content in matches:
            filepath = filepath.strip()
            content = content.strip()
            
            if not filepath or not content:
                continue
            
            full_path = project_dir / filepath
            
            # Sécurité
            try:
                full_path.relative_to(project_dir)
            except ValueError:
                continue
            
            full_path.parent.mkdir(parents=True, exist_ok=True)
            full_path.write_text(content, encoding='utf-8')
            console.print(f"  [green]  ✅ {filepath}")
            applied += 1
        
        if applied > 0:
            console.print(f"  [green]  {applied} fichier(s) corrigé(s)")
            return True
        return False
            
    except Exception as e:
        console.print(f"  [red]  ❌ Erreur: {e}")
        return False


def ensure_server_running(project_dir: Path, console_instance=None) -> bool:
    """Vérifie/démarre le serveur avec gestion IA des erreurs."""
    global console
    if console_instance:
        console = console_instance
        
    if _check_server():
        console.print("  [dim]✅ Serveur Flask déjà démarré")
        return True
    
    console.print("  [yellow]⚠️ Serveur non démarré, tentative de démarrage...")
    success, error_log = start_server_simple(project_dir)
    
    if success:
        return True
    
    # Échec - proposer correction IA
    if fix_server_with_ai(project_dir, error_log):
        # Réessayer après correction
        console.print("  [blue]🔄 Tentative après corrections...")
        success, error_log = start_server_simple(project_dir)
        if success:
            console.print("  [green]✅ Serveur démarré avec succès!")
            return True
    
    return False
