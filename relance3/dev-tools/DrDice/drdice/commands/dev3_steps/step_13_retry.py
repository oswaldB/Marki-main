"""Gestion du retry automatique avec pi -p pour les tests échoués."""

import json
import subprocess
from pathlib import Path

from rich.console import Console

console = Console()


def _write_error_report(cell_path: Path, cell_name: str, rapport: dict) -> Path:
    """Écrit le rapport d'erreur dans un fichier JSON."""
    report_dir = cell_path / ".drdice" / "error-reports"
    report_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = rapport.get("timestamp", "unknown")
    report_file = report_dir / f"test-errors-{cell_name}-{timestamp.replace(':', '-')}.json"
    
    report_file.write_text(json.dumps(rapport, indent=2, ensure_ascii=False), encoding="utf-8")
    console.print(f"  [dim]📄 Rapport d'erreur: {report_file}")
    
    return report_file


def _generate_fix_prompt(report_file: Path, cell_path: Path, cell_name: str) -> str:
    """Génère le prompt pour pi -p à partir du rapport d'erreur."""
    rapport = json.loads(report_file.read_text(encoding="utf-8"))
    
    # Lire les fichiers sources pour contexte
    context_files = []
    for file_path in [cell_path / "index.html", cell_path / "main.js"]:
        if file_path.exists():
            content = file_path.read_text(encoding="utf-8")[:2000]  # Limité pour éviter tokens excessifs
            context_files.append(f"### {file_path.name}\n```\n{content}\n```")
    
    workflows_context = []
    workflows_dir = cell_path / "workflows"
    if workflows_dir.exists():
        for wf_file in workflows_dir.glob("*.js"):
            content = wf_file.read_text(encoding="utf-8")[:1000]
            workflows_context.append(f"### {wf_file.name}\n```\n{content}\n```")
    
    prompt = f"""Tu es un expert en développement web frontend (Alpine.js, PouchDB, TailwindCSS).

J'ai des erreurs dans les tests post-génération de la cell "{cell_name}".

## RAPPORT D'ERREURS (JSON):
```json
{json.dumps(rapport, indent=2, ensure_ascii=False)}
```

## FICHIERS SOURCE ACTUELS:
{chr(10).join(context_files)}

## WORKFLOWS:
{chr(10).join(workflows_context[:3])}

## TA MISSION:
Corrige les erreurs identifiées dans le rapport. Pour chaque fichier à corriger, donne le code complet et corrigé.

Format de réponse OBLIGATOIRE:
```
### FICHIER: nom-du-fichier
```code ici```
```

Ne donne aucune explication, uniquement les blocs de code avec les noms de fichiers.
"""
    
    return prompt


def _apply_fixes_from_response(response_file: Path, cell_path: Path) -> bool:
    """Extrait et applique les corrections du fichier réponse de pi -p."""
    content = response_file.read_text(encoding="utf-8")
    
    # Parser la réponse pour extraire les fichiers
    import re
    pattern = r'### FICHIER:\s*(\S+)\s*```(?:\w+)?\s*(.*?)```'
    matches = re.findall(pattern, content, re.DOTALL)
    
    if not matches:
        console.print("  [yellow]⚠ Aucun fichier trouvé dans la réponse")
        return False
    
    for filename, code in matches:
        file_path = cell_path / filename.strip()
        if file_path.parent == cell_path or file_path.parent == cell_path / "workflows":
            file_path.write_text(code.strip(), encoding="utf-8")
            console.print(f"  [green]✓ {filename} corrigé")
        else:
            console.print(f"  [yellow]⚠ Fichier ignoré (hors scope): {filename}")
    
    return True


def step_13_retry_with_fix(cell_path: Path, cell_name: str, rapport: dict, 
                          generated_files: list[str], max_retries: int = 3) -> tuple[bool, dict]:
    """Tente de corriger les erreurs avec pi -p et relance les tests automatiquement.
    
    Args:
        cell_path: Chemin de la cell
        cell_name: Nom de la cell
        rapport: Rapport d'erreur détaillé
        generated_files: Liste des fichiers générés
        max_retries: Nombre maximum de tentatives (défaut: 3)
        
    Returns:
        Tuple (success, final_rapport)
    """
    from .step_13_post_gen import step_13_post_gen_tests
    
    for attempt in range(1, max_retries + 1):
        console.print(f"\n[yellow]🔄 Tentative de correction {attempt}/{max_retries}...")
        
        # Écrire le rapport d'erreur
        report_file = _write_error_report(cell_path, cell_name, rapport)
        
        # Générer le prompt pour pi -p
        prompt = _generate_fix_prompt(report_file, cell_path, cell_name)
        
        # Sauvegarder le prompt
        prompt_file = cell_path / ".drdice" / f"fix-prompt-{attempt}.txt"
        prompt_file.write_text(prompt, encoding="utf-8")
        
        console.print(f"  [dim]📄 Prompt sauvegardé: {prompt_file}")
        console.print(f"  [blue]→ Exécution de: pi -p < {prompt_file.name}")
        
        # Exécuter pi -p automatiquement
        try:
            result = subprocess.run(
                ["pi", "-p"],
                input=prompt,
                capture_output=True,
                text=True,
                timeout=120
            )
            
            if result.returncode != 0:
                console.print(f"  [red]✗ pi -p a échoué: {result.stderr[:200]}")
                continue
            
            # Sauvegarder la réponse
            response_file = cell_path / ".drdice" / f"fix-response-{attempt}.txt"
            response_file.write_text(result.stdout, encoding="utf-8")
            console.print(f"  [dim]📄 Réponse sauvegardée: {response_file}")
            
            # Appliquer les corrections
            console.print("  [blue]→ Application des corrections...")
            if _apply_fixes_from_response(response_file, cell_path):
                console.print("  [green]✓ Corrections appliquées")
            else:
                console.print("  [yellow]⚠ Impossible d'appliquer automatiquement")
                continue
                
        except FileNotFoundError:
            console.print("  [red]✗ Commande 'pi' non trouvée")
            console.print("  [dim]  Alternative: cat {prompt_file} | pi -p")
            continue
        except subprocess.TimeoutExpired:
            console.print("  [red]✗ Timeout pi -p (120s)")
            continue
        except Exception as e:
            console.print(f"  [red]✗ Erreur: {e}")
            continue
        
        # Relancer les tests
        console.print("  [blue]→ Relance des tests post-génération...")
        ok, _, new_rapport = step_13_post_gen_tests(cell_path, cell_name, generated_files)
        
        if ok:
            console.print(f"  [green]✅ Correction réussie au tentatif {attempt}!")
            return True, new_rapport
        else:
            console.print(f"  [yellow]⚠ Tests toujours en échec après tentative {attempt}")
            rapport = new_rapport
            
            if attempt < max_retries:
                console.print(f"  [dim]→ Nouvelle analyse des erreurs...")
    
    console.print(f"[red]❌ Échec après {max_retries} tentatives de correction")
    return False, rapport


def step_13_auto_fix(cell_path: Path, cell_name: str, rapport: dict, 
                     generated_files: list[str]) -> tuple[bool, dict]:
    """Version automatique sans interaction (utilise pi -p directement)."""
    return step_13_retry_with_fix(cell_path, cell_name, rapport, generated_files, max_retries=3)
