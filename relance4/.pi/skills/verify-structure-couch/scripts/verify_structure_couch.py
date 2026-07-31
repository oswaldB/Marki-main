#!/usr/bin/env python3
"""Verify Structure Couch - Crée la structure Bun.js + SQLite."""

import subprocess
import sys
import time
from pathlib import Path


def verify_structure_couch(project_dir: Path = None) -> tuple[bool, list[str]]:
    """Vérifie et crée la structure Bun.js + SQLite."""
    if project_dir is None:
        project_dir = Path.cwd()
    else:
        project_dir = Path(project_dir)
    
    print("🔍 Vérification de la structure...")
    print("🚀 Mode Bun.js (backend/bun-js)")
    
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
    
    # Créer les dossiers
    for d in bun_structure["dirs"]:
        if not d.exists():
            d.mkdir(parents=True, exist_ok=True)
            created.append(f"Dossier: {d.relative_to(project_dir)}")
    
    # Copier marki.db
    source_db = project_dir / "marki.db"
    target_db = project_dir / "app" / "api" / "db" / "marki.db"
    if source_db.exists() and not target_db.exists():
        import shutil
        shutil.copy2(source_db, target_db)
        created.append(f"Database: {target_db.relative_to(project_dir)}")
    
    # Créer les fichiers
    for filepath, content in bun_structure["files"].items():
        if not filepath.exists():
            filepath.write_text(content, encoding="utf-8")
            created.append(f"Fichier: {filepath.relative_to(project_dir)}")
    
    # Créer Caddyfile
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
    
    print(f"  Créé {len(created)} élément(s)")
    
    # Démarrer Caddy
    try:
        result = subprocess.run(
            ["pgrep", "-x", "caddy"],
            capture_output=True,
            check=False
        )
        if result.returncode != 0:
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
        print("  ✅ Caddy actif")
    except FileNotFoundError:
        errors.append("Commande systemctl non disponible")
    
    # Démarrer API Bun.js
    try:
        result = subprocess.run(
            ["pgrep", "-f", "bun.*app/api/index.ts"],
            capture_output=True,
            check=False
        )
        if result.returncode != 0:
            subprocess.run(
                ["bun", "install"],
                cwd=str(project_dir / "app" / "api"),
                capture_output=True,
                check=False
            )
            subprocess.Popen(
                ["bun", "run", "dev"],
                cwd=str(project_dir / "app" / "api"),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True
            )
            time.sleep(2)
            print("  ✅ API Bun.js démarrée")
        else:
            print("  ✅ API Bun.js déjà actif")
    except FileNotFoundError:
        errors.append("Bun non disponible")
    
    if errors:
        return False, errors
    
    return True, []


if __name__ == "__main__":
    project_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd()
    
    success, errors = verify_structure_couch(project_dir)
    
    if success:
        print("✅ Structure Bun.js OK et services démarrés")
        sys.exit(0)
    else:
        print(f"❌ {len(errors)} problème(s)")
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)
