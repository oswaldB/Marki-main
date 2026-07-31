#!/usr/bin/env python3
"""Create Devok - Marque la cell comme développée."""

import sys
from datetime import datetime
from pathlib import Path


def create_devok(cell_path: Path, auto: bool = False) -> tuple[bool, Path]:
    """Crée le fichier devok.md."""
    cell_path = Path(cell_path)
    cell_name = cell_path.name
    
    print("🎉 Finalisation devok.md...")
    
    devok_path = cell_path / ".specs" / "devok.md"
    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d %H:%M")
    
    content = f"""# ✅ Cell Développée - {cell_name}

## Statut
- **Statut**: ✅ Développée
- **Date**: {date_str}
- **Méthode**: dev3 (stack statique)

## Stack Utilisée
| Couche | Technologie |
|--------|-------------|
| Serveur | Caddy |
| Frontend | Alpine.js 3 + HTML statique |
| Database | PouchDB (client) + CouchDB |
| Style | TailwindCSS |

## Checklist Dev3
- [x] Étape 1: Git Setup
- [x] Étape 2: Vérification Structure
- [x] Étape 3: Healthy Test
- [x] Étape 4: Analyse Specs
- [x] Étape 5: Page-specs.md
- [x] Étape 6: Tests Workflows
- [x] Étape 7: Nettoyage Cell
- [x] Étape 8: Génération Squelettes
- [x] Étape 9: Update Caddyfile
- [x] Étape 10: Skeleton Tests
- [x] Étape 11: Génération IA
- [x] Étape 12: Vérification Mockup
- [x] Étape 13: Tests Post-Génération
- [x] Étape 14: Commit Git
- [x] Étape 15: Création devok.md

## Fichiers Générés
- `index.html`
- `main.js`
- `workflows/*.js`
- `../../tests/test-{cell_name}-workflows.html`

---
*Document généré automatiquement par drdice dev3*
"""
    
    try:
        devok_path.write_text(content, encoding="utf-8")
        print(f"  ✅ devok.md créé: {devok_path}")
        return True, devok_path
    except Exception as e:
        print(f"  ❌ Erreur création devok.md: {e}")
        return False, None


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: create_devok.py <cell-path> [--auto]")
        sys.exit(1)
    
    cell_path = Path(sys.argv[1])
    auto = "--auto" in sys.argv
    
    success, devok_path = create_devok(cell_path, auto)
    
    sys.exit(0 if success else 1)
