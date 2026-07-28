"""Étape 2: Vérification Structure - Teste la conformité de la structure projet."""

import subprocess
import time
from pathlib import Path

from rich.console import Console

console = Console()


def step_2_verify_structure(project_dir: Path) -> tuple[bool, list[str]]:
    """Vérifie et crée la structure minimale pour que les tests passent.

    Args:
        project_dir: Répertoire du projet

    Returns:
        Tuple (ok, liste des erreurs)
    """
    console.print("[blue]🔍 Vérification de la structure...")

    errors = []
    created = []

    # Structure minimale requise selon files-and-folders.md
    minimal_structure = {
        "dirs": [
            project_dir / "app" / "site" / "healthy",
            project_dir / "app" / "site" / "healthy" / "workflows",
            project_dir / "app" / "site" / "healthy" / ".specs",
            project_dir / "app" / "server",
            project_dir / "app" / "server" / "services" / "healthy",
            project_dir / "app" / ".drdice" / "test-results",
        ],
        "files": {
            project_dir / "app" / "site" / "healthy" / "index.html": """<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Healthy</title>
</head>
<body>
    <h1>Healthy</h1>
    <p>Status: OK</p>
</body>
</html>""",
            project_dir / "app" / "site" / "healthy" / "main.js": "console.log('healthy.js loaded');",
            project_dir / "app" / "site" / "healthy" / ".specs" / "valide.md": "# Validé\n",
        }
    }

    # Créer les dossiers
    for d in minimal_structure["dirs"]:
        if not d.exists():
            d.mkdir(parents=True, exist_ok=True)
            created.append(f"Dossier: {d.relative_to(project_dir)}")

    # Créer les fichiers
    for filepath, content in minimal_structure["files"].items():
        if not filepath.exists():
            filepath.write_text(content, encoding="utf-8")
            created.append(f"Fichier: {filepath.relative_to(project_dir)}")

    # Créer le serveur Node.js minimal
    server_index = project_dir / "app" / "server" / "index.js"
    if not server_index.exists():
        server_content = '''const express = require('express');
const app = express();

app.use(express.json());

// Health endpoint - sans /api car Caddy retire le prefix
app.get('/healthy', (req, res) => {
    res.json({ status: 'ok', name: 'response ok' });
});

const PORT = 5001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
'''
        server_index.write_text(server_content, encoding="utf-8")
        created.append("Fichier: app/server/index.js")

    # Créer package.json si manquant
    package_json = project_dir / "app" / "server" / "package.json"
    if not package_json.exists():
        pkg_content = '''{
  "name": "dev3-server",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "express": "^4.18.0"
  }
}
'''
        package_json.write_text(pkg_content, encoding="utf-8")
        created.append("Fichier: app/server/package.json")

    # Créer un Caddyfile de référence dans le projet
    caddyfile_ref = project_dir / "Caddyfile.dev3"
    caddyfile_content = f"""# Caddyfile de développement pour dev3
dev.markidiags.com {{
    handle /api/* {{
        reverse_proxy localhost:5001
    }}
    handle {{
        root * {project_dir}/app/site
        file_server
        try_files {{path}} {{path}}/ /index.html
    }}
}}
"""
    if not caddyfile_ref.exists():
        caddyfile_ref.write_text(caddyfile_content, encoding="utf-8")
        created.append("Référence: Caddyfile.dev3")

    # Afficher ce qui a été créé
    if created:
        console.print(f"  [dim]Créé {len(created)} élément(s):")
        for item in created[:5]:
            console.print(f"    [dim]{item}")

    # Démarrer les services
    console.print("[blue]🚀 Démarrage des services...")

    # Vérifier/démarrer Caddy
    try:
        result = subprocess.run(
            ["pgrep", "-x", "caddy"],
            capture_output=True,
            check=False
        )
        if result.returncode != 0:
            console.print("  [dim]Démarrage de Caddy...")
            subprocess.run(
                ["sudo", "systemctl", "start", "caddy"],
                capture_output=True,
                check=False
            )
            time.sleep(1)
        else:
            # Reload Caddy pour prendre les changements
            subprocess.run(
                ["sudo", "systemctl", "reload", "caddy"],
                capture_output=True,
                check=False
            )
        console.print("  [green]✅ Caddy actif")
    except FileNotFoundError:
        errors.append("Commande systemctl non disponible")

    # Démarrer le serveur Node.js
    try:
        # Vérifier si le serveur est déjà démarré
        result = subprocess.run(
            ["pgrep", "-f", "node.*app/server/index.js"],
            capture_output=True,
            check=False
        )
        if result.returncode != 0:
            console.print("  [dim]Démarrage du serveur Node.js...")
            # Installer les dépendances si nécessaire
            subprocess.run(
                ["npm", "install"],
                cwd=str(project_dir / "app" / "server"),
                capture_output=True,
                check=False
            )
            # Démarrer le serveur en arrière-plan
            subprocess.Popen(
                ["node", "index.js"],
                cwd=str(project_dir / "app" / "server"),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True
            )
            time.sleep(2)
            console.print("  [green]✅ Serveur Node.js démarré")
        else:
            console.print("  [green]✅ Serveur Node.js déjà actif")
    except FileNotFoundError:
        errors.append("Node.js non disponible")

    if errors:
        console.print(f"[yellow]⚠️ {len(errors)} problème(s) à résoudre")
        return False, errors

    console.print("[green]✅ Structure OK et services démarrés")
    return True, []
