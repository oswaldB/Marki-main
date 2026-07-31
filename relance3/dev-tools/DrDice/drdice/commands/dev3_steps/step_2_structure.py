"""Étape 2: Vérification Structure - Crée la structure Bun.js + SQLite."""

import subprocess
import time
from pathlib import Path

from rich.console import Console

console = Console()


def step_2_verify_structure(project_dir: Path) -> tuple[bool, list[str]]:
    """Vérifie et crée la structure Bun.js + SQLite.

    Args:
        project_dir: Répertoire du projet

    Returns:
        Tuple (ok, liste des erreurs)
    """
    console.print("[blue]🔍 Vérification de la structure...")
    console.print("[cyan]🚀 Mode Bun.js (backend/bun-js)")
    
    errors = []
    created = []
    
    # Structure Bun.js requise
    bun_structure = {
        "dirs": [
            project_dir / "app" / "api" / "db",
            project_dir / "app" / "api" / "routes",
            project_dir / "app" / "api" / "middleware",
            project_dir / "app" / "site" / "healthy",
            project_dir / "app" / "site" / "healthy" / ".specs",
        ],
        "files": {
            project_dir / "app" / "api" / "package.json": '''{
  "name": "marki-api",
  "version": "1.0.0",
  "main": "index.ts",
  "scripts": {
    "dev": "bun --hot index.ts",
    "start": "bun index.ts"
  },
  "dependencies": {
    "hono": "^4.0.0"
  },
  "devDependencies": {
    "@types/bun": "latest"
  }
}''',
            project_dir / "app" / "api" / "index.ts": '''#!/usr/bin/env bun
import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

app.use('*', cors());

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', mode: 'bun.js' });
});

export default {
  port: process.env.PORT || 3001,
  fetch: app.fetch,
};
''',
            project_dir / "app" / "api" / "db" / "schema.sql": '''-- Schéma SQLite marki.db
CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    email TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS demandes (
    id TEXT PRIMARY KEY,
    contact_id TEXT NOT NULL,
    numero TEXT NOT NULL,
    statut TEXT DEFAULT 'active',
    montant_total REAL DEFAULT 0,
    reste_a_payer REAL DEFAULT 0
);
''',
            project_dir / "app" / "site" / "healthy" / "index.html": '''<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Healthy - Bun.js</title>
</head>
<body>
    <h1>Healthy (Bun.js Mode)</h1>
    <p>API: <a href="/api/health">/api/health</a></p>
</body>
</html>''',
            project_dir / "app" / "site" / "healthy" / ".specs" / "valide.md": "# Validé\n",
        }
    }
    
    # Créer les dossiers (sans schema.sql - il sera généré par étape 4)
    for d in bun_structure["dirs"]:
        if not d.exists():
            d.mkdir(parents=True, exist_ok=True)
            created.append(f"Dossier: {d.relative_to(project_dir)}")
    
    # Copier marki.db s'il existe à la racine du projet
    source_db = project_dir / "marki.db"
    target_db = project_dir / "app" / "api" / "db" / "marki.db"
    if source_db.exists() and not target_db.exists():
        import shutil
        shutil.copy2(source_db, target_db)
        created.append(f"Database: {target_db.relative_to(project_dir)} ({source_db.stat().st_size / 1024 / 1024:.1f} MB)")
    elif source_db.exists():
        created.append(f"Database: déjà présente")
    
    # Créer les fichiers
    for filepath, content in bun_structure["files"].items():
        if not filepath.exists():
            filepath.write_text(content, encoding="utf-8")
            created.append(f"Fichier: {filepath.relative_to(project_dir)}")
    
    # Créer le Caddyfile pour Bun.js (référence dans le projet)
    caddyfile = project_dir / "Caddyfile"
    caddy_content = f"""# Caddyfile pour Bun.js
:dev.markidiags.com {{
    handle /api/* {{
        reverse_proxy localhost:3001
    }}
    handle {{
        root * {project_dir}/app/site
        file_server
        try_files {{path}} {{path}}/ /index.html
    }}
}}
"""
    if not caddyfile.exists():
        caddyfile.write_text(caddy_content, encoding="utf-8")
        created.append("Fichier: Caddyfile")
    
    # Mettre à jour /etc/caddy/Caddyfile
    console.print("  [dim]→ Configuration Caddy système...")
    ok, msg = _update_system_caddyfile(project_dir)
    if ok:
        console.print(f"    [green]✅ {msg}")
    else:
        console.print(f"    [yellow]⚠️ {msg}")
    
    # Afficher ce qui a été créé
    if created:
        console.print(f"  [dim]Créé {len(created)} élément(s):")
        for item in created[:5]:
            console.print(f"    [dim]{item}")
    
    # Démarrer les services
    console.print("[blue]🚀 Démarrage des services Bun.js...")
    
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
            subprocess.run(
                ["sudo", "systemctl", "reload", "caddy"],
                capture_output=True,
                check=False
            )
        console.print("  [green]✅ Caddy actif")
    except FileNotFoundError:
        errors.append("Commande systemctl non disponible")
    
    # Démarrer l'API Bun.js
    try:
        result = subprocess.run(
            ["pgrep", "-f", "bun.*app/api/index.ts"],
            capture_output=True,
            check=False
        )
        if result.returncode != 0:
            console.print("  [dim]Installation des dépendances Bun...")
            subprocess.run(
                ["bun", "install"],
                cwd=str(project_dir / "app" / "api"),
                capture_output=True,
                check=False
            )
            
            console.print("  [dim]Démarrage de l'API Bun.js...")
            subprocess.Popen(
                ["bun", "run", "dev"],
                cwd=str(project_dir / "app" / "api"),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True
            )
            time.sleep(2)
            console.print("  [green]✅ API Bun.js démarrée")
        else:
            console.print("  [green]✅ API Bun.js déjà actif")
    except FileNotFoundError:
        errors.append("Bun non disponible - installer avec: curl -fsSL https://bun.sh/install | bash")
    
    if errors:
        console.print(f"[yellow]⚠️ {len(errors)} problème(s) à résoudre")
        return False, errors
    
    console.print("[green]✅ Structure Bun.js OK et services démarrés")
    return True, []


def _update_system_caddyfile(project_dir: Path) -> tuple[bool, str]:
    """Met à jour /etc/caddy/Caddyfile avec la config Bun.js."""
    
    system_caddyfile = Path("/etc/caddy/Caddyfile")
    
    if not system_caddyfile.exists():
        return False, "/etc/caddy/Caddyfile n'existe pas"
    
    # Lire le contenu actuel
    try:
        content = system_caddyfile.read_text()
    except Exception as e:
        return False, f"Impossible de lire Caddyfile: {e}"
    
    # Config Bun.js pour dev.markidiags.com
    bun_config = f"""dev.markidiags.com {{
	# Route /api/* vers Bun.js API
	handle /api/* {{
		reverse_proxy localhost:3001
	}}
	
	# Root : static hosting
	handle {{
		root * {project_dir}/app/site
		file_server
		try_files {{path}} {{path}}/ /index.html
	}}
}}
"""
    
    # Vérifier si la config existe déjà
    if "reverse_proxy localhost:3001" in content and "dev.markidiags.com" in content:
        # Vérifier si c'est déjà configuré pour Bun.js (port 3001)
        if "# Route /api/* vers Bun.js API" in content:
            return True, "Caddyfile déjà configuré pour Bun.js"
        else:
            # Remplacer l'ancienne config (port 5001)
            import re
            pattern = r'dev\.markidiags\.com\s*\{[^}]+\}'
            new_content = re.sub(pattern, bun_config.strip(), content, flags=re.DOTALL)
            
            # Écrire avec sudo
            result = subprocess.run(
                ["sudo", "tee", str(system_caddyfile)],
                input=new_content,
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                return True, "Caddyfile mis à jour (remplacé config legacy)"
            else:
                return False, f"sudo tee échoué: {result.stderr}"
    else:
        # Ajouter la config au début du fichier
        new_content = bun_config + "\n" + content
        
        result = subprocess.run(
            ["sudo", "tee", str(system_caddyfile)],
            input=new_content,
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            return True, "Config Bun.js ajoutée à Caddyfile"
        else:
            return False, f"sudo tee échoué: {result.stderr}"
