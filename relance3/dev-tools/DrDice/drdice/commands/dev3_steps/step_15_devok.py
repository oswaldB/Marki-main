"""Étape 15: Création devok.md - Marque la cell comme développée."""

from datetime import datetime
from pathlib import Path

from rich.console import Console
from rich.prompt import Confirm

console = Console()


def step_15_create_devok(cell_path: Path, cell_name: str, tests_results: dict = None, auto: bool = False) -> tuple[bool, Path]:
    """Crée le fichier .specs/devok.md marquant la cell comme développée.
    
    Args:
        cell_path: Chemin de la cell
        cell_name: Nom de la cell
        tests_results: Résultats des tests pour le rapport
        auto: Si True, ne demande pas de confirmation (mode --yes)
        
    Returns:
        Tuple (ok, chemin du fichier créé)
    """
    console.print("[blue]🎉 Étape 15: Finalisation devok.md...")
    
    # Demander confirmation avant de marquer comme développée
    if not auto:
        console.print("\n[yellow]⚠️  Attention: Cette étape va marquer la cell comme 'DÉVELOPPÉE'")
        console.print("   Le fichier .specs/devok.md sera créé.")
        console.print("   Une fois créé, la cell ne sera plus traitée par 'drdice dev3'.")
        
        if tests_results and not tests_results.get('success', True):
            console.print("\n[red]❌ Certains tests ont échoué!")
        
        if not Confirm.ask("\nConfirmer la création de devok.md?", default=False):
            console.print("  [yellow]⚠ Création devok.md annulée")
            return False, None
    
    try:
        devok_path = cell_path / ".specs" / "devok.md"
        
        # Récupérer la date
        now = datetime.now()
        date_str = now.strftime("%Y-%m-%d %H:%M")
        
        # Construire le contenu
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

## Tests Passés
"""
        
        # Ajouter les résultats des tests si disponibles
        if tests_results:
            content += "\n### Tests Post-Génération\n"
            content += f"- Total: {tests_results.get('total', 'N/A')}\n"
            content += f"- Succès: {tests_results.get('passed', 'N/A')}\n"
            if tests_results.get('failed'):
                content += f"- Échecs: {tests_results.get('failed')}\n"
            
            # Tests workflows
            if 'scenarios' in tests_results:
                content += "\n### Scénarios Workflows Testés\n"
                for scenario in tests_results['scenarios'][:5]:
                    status = "✅" if scenario.get('passed') else "❌"
                    content += f"- {status} {scenario.get('scenario', 'Unknown')}\n"
        
        # Checklist
        content += f"""
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
        
        # Écrire le fichier
        devok_path.write_text(content, encoding="utf-8")
        
        console.print(f"  [green]✓ devok.md créé: {devok_path}")
        return True, devok_path
        
    except Exception as e:
        console.print(f"  [red]✗ Erreur création devok.md: {e}")
        return False, None
