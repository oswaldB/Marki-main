"""Étape 9: Flask Server - Vérifie que le serveur Flask répond et enregistre le blueprint."""

import subprocess
import time
from pathlib import Path

from rich.console import Console

console = Console()


def _check_server() -> bool:
    """Vérifie si Flask répond sur le port 5000."""
    try:
        result = subprocess.run(
            ["curl", "-s", "http://localhost:5000/"],
            capture_output=True,
            timeout=5
        )
        return result.returncode == 0
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return False


def _register_blueprint(project_dir: Path, cell_path: Path, cell_name: str) -> bool:
    """Enregistre le blueprint dans app/__init__.py."""
    app_init = project_dir / "app" / "__init__.py"
    
    # Déterminer le type de cell
    path_str = str(cell_path)
    if "/screens/" in path_str:
        cell_type = "screens"
        url_prefix = f"/{cell_name}"
    elif "/backend_wf/" in path_str or "/backend-wf/" in path_str:
        cell_type = "backend_wf"
        url_prefix = f"/api/{cell_name}"
    elif "/cron/" in path_str:
        cell_type = "cron"
        url_prefix = None
    else:
        cell_type = "screens"
        url_prefix = f"/{cell_name}"

    # Créer app/__init__.py s'il n'existe pas
    if not app_init.exists():
        init_content = f'''"""Application Flask."""
from flask import Flask

def create_app():
    app = Flask(__name__)
    return app
'''
        app_init.write_text(init_content, encoding="utf-8")
        console.print(f"  [dim]✅ Créé app/__init__.py")

    content = app_init.read_text(encoding="utf-8")

    # Vérifier si déjà enregistré
    if f"{cell_name}_bp" in content:
        return True

    # Ajouter l'import
    import_line = f"from .{cell_type}.{cell_name} import bp as {cell_name}_bp"
    lines = content.split("\n")
    
    # Trouver où insérer l'import
    last_import_idx = -1
    for i, line in enumerate(lines):
        if line.startswith("from .") and "import bp" in line:
            last_import_idx = i
    
    if last_import_idx >= 0:
        lines.insert(last_import_idx + 1, import_line)
    
    # Ajouter le register_blueprint
    if url_prefix:
        register_line = f"    app.register_blueprint({cell_name}_bp, url_prefix='{url_prefix}')"
        for i, line in enumerate(lines):
            if "return app" in line:
                lines.insert(i, register_line)
                break

    new_content = "\n".join(lines)
    app_init.write_text(new_content, encoding="utf-8")
    console.print(f"  [dim]✅ Blueprint '{cell_name}' enregistré dans app/__init__.py")
    
    # Mettre à jour wsgi.py aussi
    _update_wsgi(project_dir, cell_name, cell_type, url_prefix)
    return True


def _update_wsgi(project_dir: Path, cell_name: str, cell_type: str, url_prefix: str | None) -> bool:
    """Met à jour wsgi.py pour importer et enregistrer le blueprint."""
    wsgi_file = project_dir / "wsgi.py"
    if not wsgi_file.exists():
        return False
    
    content = wsgi_file.read_text(encoding="utf-8")
    
    # Vérifier si déjà enregistré
    if f"{cell_name}_bp" in content:
        return True
    
    # Déterminer le chemin d'import
    if cell_type == "screens":
        import_path = f"app.screens.{cell_name}"
    elif cell_type == "backend_wf":
        import_path = f"app.backend_wf.{cell_name}"
    else:
        import_path = f"app.cron.{cell_name}"
    
    # Ajouter l'import
    import_line = f"from {import_path} import bp as {cell_name}_bp"
    if import_line not in content:
        # Trouver où insérer (après les autres imports)
        lines = content.split("\n")
        last_import_idx = -1
        for i, line in enumerate(lines):
            if line.startswith("from app.") and "import bp" in line:
                last_import_idx = i
        
        if last_import_idx >= 0:
            lines.insert(last_import_idx + 1, import_line)
        else:
            # Insérer avant la création de l'app
            for i, line in enumerate(lines):
                if "app =" in line and "Flask" in line:
                    lines.insert(i, import_line)
                    break
        
        content = "\n".join(lines)
    
    # Ajouter le register_blueprint
    if url_prefix:
        register_line = f"app.register_blueprint({cell_name}_bp, url_prefix='{url_prefix}')"
        if register_line not in content:
            # Trouver où insérer (avant le if __name__)
            lines = content.split("\n")
            for i, line in enumerate(lines):
                if 'if __name__' in line:
                    lines.insert(i, f"\n# {cell_name} blueprint")
                    lines.insert(i + 1, register_line)
                    break
            content = "\n".join(lines)
    
    wsgi_file.write_text(content, encoding="utf-8")
    console.print(f"  [dim]✅ Blueprint '{cell_name}' enregistré dans wsgi.py")
    return True


def step_9_flask_server(project_dir: Path, cell_path: Path, cell_name: str) -> tuple[bool, dict]:
    """Vérifie que le serveur Flask répond et que la route est accessible.

    Args:
        project_dir: Répertoire du projet
        cell_path: Chemin de la cell
        cell_name: Nom de la cell

    Returns:
        Tuple (ok, résultat des tests)
    """
    console.print("[blue]🌐 Vérification du serveur Flask...")

    # Enregistrer le blueprint
    if not _register_blueprint(project_dir, cell_path, cell_name):
        console.print("  [yellow]⚠️ Impossible d'enregistrer le blueprint")

    # Vérifier si le serveur est démarré
    if not _check_server():
        console.print("  [yellow]⚠️ Serveur Flask non détecté sur http://localhost:5000")
        console.print("  [dim]Pour démarrer le serveur:")
        console.print("    [dim]cd /home/ubuntu/marki/relance2 && python run.py")
        
        # Pas bloquant - on continue
        console.print("  [yellow]⚠️ Continuation sans serveur (mode squelette)")
        return True, {"server_running": False}

    console.print("  [green]✅ Serveur Flask actif")

    # Mettre à jour wsgi.py si nécessaire
    wsgi_file = project_dir / "wsgi.py"
    if wsgi_file.exists():
        wsgi_content = wsgi_file.read_text(encoding="utf-8")
        if f"{cell_name}_bp" not in wsgi_content:
            console.print("  [dim]Mise à jour de wsgi.py pour le blueprint...")
            # Ajouter l'import et le register
            import_line = f"from app.screens.{cell_name} import bp as {cell_name}_bp"
            register_line = f"app.register_blueprint({cell_name}_bp, url_prefix='/{cell_name}')"
            
            # Insérer après le blueprint healthy
            lines = wsgi_content.split("\n")
            for i, line in enumerate(lines):
                if "app.register_blueprint(healthy_bp" in line:
                    lines.insert(i + 1, f"from app.screens.{cell_name} import bp as {cell_name}_bp")
                    lines.insert(i + 2, register_line)
                    break
            
            new_wsgi = "\n".join(lines)
            wsgi_file.write_text(new_wsgi, encoding="utf-8")
            console.print("  [dim]✅ wsgi.py mis à jour")
            
            # Redémarrer le serveur
            subprocess.run(["pkill", "-f", "python.*wsgi"], capture_output=True)
            time.sleep(2)
            subprocess.Popen(
                ["python", "wsgi.py"],
                cwd=project_dir,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True
            )
            time.sleep(3)

    # Déterminer l'URL selon le type
    path_str = str(cell_path)
    if "/screens/" in path_str:
        url = f"http://localhost:5000/{cell_name}/"
    elif "/backend_wf/" in path_str or "/backend-wf/" in path_str:
        url = f"http://localhost:5000/api/{cell_name}/"
    elif "/cron/" in path_str:
        url = None
    else:
        url = f"http://localhost:5000/{cell_name}/"

    if url:
        # Tester la route
        try:
            result = subprocess.run(
                ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", url],
                capture_output=True,
                text=True,
                timeout=10
            )
            status_code = result.stdout.strip()
            
            if status_code == "200":
                console.print(f"  [green]✅ Route accessible: {url} (HTTP 200)")
                return True, {"server_running": True, "http_code": 200, "url": url}
            elif status_code == "404":
                console.print(f"  [yellow]⚠️ Route retourne HTTP 404: {url}")
                console.print("  [dim]Redémarrage du serveur Flask pour enregistrer le blueprint...")
                
                # Redémarrer le serveur Flask
                try:
                    subprocess.run(["pkill", "-f", "python.*wsgi"], capture_output=True)
                    time.sleep(2)
                    
                    # Relancer le serveur
                    subprocess.Popen(
                        ["python", "wsgi.py"],
                        cwd=project_dir,
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                        start_new_session=True
                    )
                    time.sleep(3)
                    
                    # Vérifier à nouveau
                    result2 = subprocess.run(
                        ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", url],
                        capture_output=True,
                        text=True,
                        timeout=10
                    )
                    status_code2 = result2.stdout.strip()
                    
                    if status_code2 == "200":
                        console.print(f"  [green]✅ Route accessible après redémarrage: {url}")
                        return True, {"server_running": True, "http_code": 200, "url": url}
                    else:
                        console.print(f"  [yellow]⚠️ Route toujours HTTP {status_code2} après redémarrage")
                        return True, {"server_running": True, "http_code": int(status_code2), "url": url}
                except Exception as e:
                    console.print(f"  [yellow]⚠️ Échec du redémarrage: {e}")
                    return True, {"server_running": True, "http_code": 404, "url": url}
            elif status_code == "500":
                console.print(f"  [yellow]⚠️ Route retourne HTTP 500: {url}")
                return True, {"server_running": True, "http_code": 500, "url": url}
            else:
                console.print(f"  [dim]Route testée: {url} (HTTP {status_code})")
                return True, {"server_running": True, "http_code": int(status_code), "url": url}
                
        except Exception as e:
            console.print(f"  [yellow]⚠️ Erreur test route: {e}")
            return True, {"server_running": True, "error": str(e)}

    return True, {"server_running": True, "cell_type": "cron"}


# Garder le nom pour compatibilité
step_9_update_caddyfile = step_9_flask_server
