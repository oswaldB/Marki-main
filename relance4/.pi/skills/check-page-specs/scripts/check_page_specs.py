#!/usr/bin/env python3
"""Check Page Specs - Vérifie/crée page-specs.md."""

import sys
from pathlib import Path


def check_page_specs(cell_path: Path, templates_dir: Path = None) -> tuple[bool, str]:
    """Vérifie si page-specs.md existe, sinon le crée."""
    cell_path = Path(cell_path)
    cell_name = cell_path.name
    
    print("📋 Vérification page-specs.md...")
    
    specs_dir = cell_path / ".specs"
    page_specs_file = specs_dir / "page-specs.md"
    
    if page_specs_file.exists():
        print("  ✓ page-specs.md existe déjà")
        return True, "exists"
    
    # Chercher le template
    if templates_dir is None:
        templates_dir = cell_path.parent.parent.parent / "dev-tools" / "DrDice" / "drdice" / "templates"
    
    template_path = templates_dir / "static-stack" / "squelettes" / "specs" / "page-specs.md"
    
    if template_path.exists():
        content = template_path.read_text(encoding="utf-8")
        content = content.replace("{cell_name}", cell_name)
        page_specs_file.write_text(content, encoding="utf-8")
        print("  ✓ page-specs.md créé depuis template")
    else:
        # Créer un fichier minimal
        content = f"""# Page Specs - {cell_name}

> **DOCUMENT DE RÉFÉRENCE**

## Partie 1 : Use Cases (Gherkin)

Feature: {cell_name} Page
  En tant qu'utilisateur
  Je veux pouvoir interagir avec la page {cell_name}

## Partie 2 : Stack Technique

- Alpine.js 3 + HTML statique
- PouchDB (client) avec sync CouchDB
- TailwindCSS via CDN

## Partie 3 : Règles Absolues

1. **Passage de paramètres URL** : Utiliser le hash (`#userId=123`)
2. **Appel des Workflows** : Via `runWorkflow('nom', params)` dans Alpine
3. **IDs des Boutons** : Format obligatoire `btn-{{action}}`
"""
        page_specs_file.write_text(content, encoding="utf-8")
        print("  ✓ page-specs.md créé (minimal)")
    
    return True, "created"


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: check_page_specs.py <cell-path> [templates-dir]")
        sys.exit(1)
    
    cell_path = Path(sys.argv[1])
    templates_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else None
    
    success, msg = check_page_specs(cell_path, templates_dir)
    
    if success:
        print(f"✅ page-specs.md {msg}")
        sys.exit(0)
    else:
        print(f"❌ {msg}")
        sys.exit(1)
