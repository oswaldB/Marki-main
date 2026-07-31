#!/usr/bin/env python3
"""Create PR - Commit devok.md et crée une Pull Request."""

import subprocess
import sys
from pathlib import Path


def create_pr(cell_name: str, branch_name: str = None, project_dir: Path = None) -> tuple[bool, str]:
    """Commit devok.md et crée une Pull Request."""
    
    if project_dir is None:
        project_dir = Path.cwd()
    else:
        project_dir = Path(project_dir)
    
    if branch_name is None:
        branch_name = f"feature/cell-{cell_name.replace('_', '-')}"
    
    print("📋 Commit devok.md et Pull Request...")
    
    try:
        # Trouver le git root
        result = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            cwd=str(project_dir),
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            print("  ❌ Pas de repo git trouvé")
            return False, "no git"
        
        git_root = Path(result.stdout.strip())
        
        # Trouver le devok.md
        cell_path = None
        for path in git_root.rglob(".specs/devok.md"):
            if path.parent.parent.name == cell_name:
                cell_path = path.parent.parent
                devok_path = path
                break
        
        if not cell_path:
            print(f"  ❌ devok.md non trouvé pour {cell_name}")
            return False, "devok.md not found"
        
        # git add devok.md
        result = subprocess.run(
            ["git", "add", str(devok_path)],
            cwd=str(git_root),
            capture_output=True,
            text=True
        )
        
        # git commit
        commit_msg = f"docs({cell_name}): marque cell comme développée [skip ci]"
        result = subprocess.run(
            ["git", "commit", "-m", commit_msg],
            cwd=str(git_root),
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            print(f"  ✅ Commit devok.md créé")
        
        # git push
        result = subprocess.run(
            ["git", "push", "origin", branch_name],
            cwd=str(git_root),
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            print(f"  ✅ Branche {branch_name} poussée")
        
        # Vérifier si gh CLI est disponible
        result = subprocess.run(
            ["which", "gh"],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            # Créer la PR
            pr_title = f"feat({cell_name}): implémentation complète dev3"
            pr_body = f"""## 📦 Cell développée: {cell_name}

Cette PR contient l'implémentation complète de la cell `{cell_name}` via le workflow dev3.

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
            
            result = subprocess.run(
                ["gh", "pr", "create",
                 "--title", pr_title,
                 "--body", pr_body,
                 "--head", branch_name,
                 "--base", "main"],
                cwd=str(git_root),
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                pr_url = result.stdout.strip()
                print(f"  ✅ Pull Request créée: {pr_url}")
                return True, pr_url
            else:
                print(f"  ⚠ PR non créée: {result.stderr}")
                return True, "commit done, pr failed"
        else:
            print("  ⚠ GitHub CLI (gh) non installé")
            print(f"  → Créez la PR manuellement sur GitHub depuis la branche: {branch_name}")
            return True, "commit done, gh not installed"
        
    except Exception as e:
        print(f"  ❌ Erreur: {e}")
        return False, str(e)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: create_pr.py <cell-name> [branch-name] [project-dir]")
        sys.exit(1)
    
    cell_name = sys.argv[1]
    branch_name = sys.argv[2] if len(sys.argv) > 2 else None
    project_dir = Path(sys.argv[3]) if len(sys.argv) > 3 else Path.cwd()
    
    success, result = create_pr(cell_name, branch_name, project_dir)
    
    sys.exit(0 if success else 1)
