"""Étape 9.5: Vérification Mockup - Compare index.html avec les mockups et regénère si nécessaire."""

import json
import re
from pathlib import Path

from rich.console import Console
from rich.prompt import Confirm

console = Console()


def _extract_structure(html_content: str) -> dict:
    """Extrait la structure DOM significative pour comparaison."""
    structure = {
        "tags": [],
        "classes": set(),
        "ids": set(),
        "attributes": {}
    }
    
    # Extraire tous les tags avec leurs classes
    tag_pattern = r'<(\w+)[^>]*>'
    for match in re.finditer(tag_pattern, html_content, re.IGNORECASE):
        tag = match.group(1).lower()
        full_tag = match.group(0)
        
        structure["tags"].append(tag)
        
        # Extraire les classes
        class_match = re.search(r'class=["\']([^"\']+)["\']', full_tag, re.IGNORECASE)
        if class_match:
            classes = class_match.group(1).split()
            structure["classes"].update(classes)
        
        # Extraire les IDs
        id_match = re.search(r'id=["\']([^"\']+)["\']', full_tag, re.IGNORECASE)
        if id_match:
            structure["ids"].add(id_match.group(1))
    
    return structure


def _calculate_similarity(impl_html: str, mockup_html: str) -> dict:
    """Calcule un score de similarité entre l'implémentation et le mockup."""
    impl_struct = _extract_structure(impl_html)
    mockup_struct = _extract_structure(mockup_html)
    
    scores = {}
    
    # Score sur les tags (ordre et présence)
    impl_tags_set = set(impl_struct["tags"])
    mockup_tags_set = set(mockup_struct["tags"])
    
    if mockup_tags_set:
        tags_match = len(impl_tags_set & mockup_tags_set)
        tags_total = len(mockup_tags_set)
        scores["tags"] = tags_match / tags_total if tags_total > 0 else 1.0
    else:
        scores["tags"] = 1.0
    
    # Score sur les classes Tailwind
    impl_classes = impl_struct["classes"]
    mockup_classes = mockup_struct["classes"]
    
    # Filtrer les classes Tailwind significatives (pas les utilitaires basiques)
    significant_mockup = {c for c in mockup_classes if any(
        prefix in c for prefix in ['bg-', 'text-', 'p-', 'm-', 'rounded', 'shadow', 'border', 'flex', 'grid', 'w-', 'h-']
    )}
    significant_impl = {c for c in impl_classes if any(
        prefix in c for prefix in ['bg-', 'text-', 'p-', 'm-', 'rounded', 'shadow', 'border', 'flex', 'grid', 'w-', 'h-']
    )}
    
    if significant_mockup:
        classes_match = len(significant_impl & significant_mockup)
        scores["classes"] = classes_match / len(significant_mockup)
    else:
        scores["classes"] = 1.0
    
    # Score sur les IDs (boutons, inputs)
    impl_ids = {id for id in impl_struct["ids"] if id.startswith('btn-') or id in ['app', 'form']}
    mockup_ids = {id for id in mockup_struct["ids"] if id.startswith('btn-') or id in ['app', 'form']}
    
    if mockup_ids:
        ids_match = len(impl_ids & mockup_ids)
        scores["ids"] = ids_match / len(mockup_ids)
    else:
        scores["ids"] = 1.0
    
    # Score global pondéré
    weights = {"tags": 0.3, "classes": 0.5, "ids": 0.2}
    total_score = sum(scores[k] * weights[k] for k in weights)
    
    return {
        "total": round(total_score, 2),
        "details": scores,
        "missing_tags": list(mockup_tags_set - impl_tags_set),
        "missing_classes": list(significant_mockup - significant_impl),
        "missing_ids": list(mockup_ids - impl_ids)
    }


def _find_mockup_file(cell_path: Path, cell_name: str) -> Path | None:
    """Trouve le fichier mockup pour la cell."""
    mockups_dir = cell_path / ".specs" / "mockups"
    
    if not mockups_dir.exists():
        return None
    
    # Chercher dans l'ordre de priorité
    candidates = [
        mockups_dir / f"{cell_name}.html",
        mockups_dir / "index.html",
        mockups_dir / f"{cell_name}.svg",
    ]
    
    for candidate in candidates:
        if candidate.exists():
            return candidate
    
    # Prendre le premier HTML trouvé
    html_files = list(mockups_dir.glob("*.html"))
    if html_files:
        return html_files[0]
    
    return None


def _generate_fix_prompt_for_mockup(cell_path: Path, cell_name: str, 
                                     impl_html: str, mockup_html: str,
                                     similarity: dict) -> str:
    """Génère le prompt pour corriger index.html selon le mockup."""
    
    missing_elements = []
    if similarity.get("missing_tags"):
        missing_elements.append(f"Tags manquants: {', '.join(similarity['missing_tags'][:5])}")
    if similarity.get("missing_classes"):
        missing_elements.append(f"Classes Tailwind manquantes: {', '.join(similarity['missing_classes'][:10])}")
    if similarity.get("missing_ids"):
        missing_elements.append(f"IDs manquants: {', '.join(similarity['missing_ids'])}")
    
    prompt = f"""Tu es un expert en développement frontend HTML/TailwindCSS.

La page index.html générée pour la cell "{cell_name}" ne correspond pas assez au mockup.

## SCORE DE SIMILARITÉ
- Total: {similarity['total'] * 100:.1f}% (seuil minimum: 90%)
- Tags: {similarity['details']['tags'] * 100:.1f}%
- Classes CSS: {similarity['details']['classes'] * 100:.1f}%
- IDs éléments: {similarity['details']['ids'] * 100:.1f}%

## ÉLÉMENTS MANQUANTS
{chr(10).join(missing_elements) if missing_elements else "Structure générale différente"}

## MOCKUP DE RÉFÉRENCE (HTML):
```html
{mockup_html[:3000]}...
```

## INDEX.HTML ACTUEL (à corriger):
```html
{impl_html[:2000]}...
```

## TA MISSION:
Réécris ENTIÈREMENT le fichier index.html pour qu'il corresponde EXACTEMENT au mockup:
1. Même structure DOM (ordre des éléments)
2. Mêmes classes Tailwind (bg-, text-, p-, rounded, etc.)
3. Mêmes IDs sur les boutons (btn-)
4. Garde les attributs Alpine.js (x-data, x-model, @click)
5. Garde la logique de binding

Ne donne QUE le code HTML complet, sans explications.
"""
    
    return prompt


def step_12_check_mockup_similarity(cell_path: Path, cell_name: str, 
                                      auto: bool = False,
                                      min_similarity: float = 0.90) -> tuple[bool, str]:
    """Vérifie que index.html correspond au mockup, regénère si nécessaire.
    
    Args:
        cell_path: Chemin de la cell
        cell_name: Nom de la cell
        auto: Mode automatique sans confirmation
        min_similarity: Score minimum (0.0 à 1.0), défaut 90%
        
    Returns:
        Tuple (ok, message)
    """
    console.print("[blue]🔍 Étape 9.5: Vérification Mockup Similarity...")
    
    index_html = cell_path / "index.html"
    
    if not index_html.exists():
        console.print("  [red]✗ index.html non trouvé")
        return False, "index.html manquant"
    
    # Trouver le mockup
    mockup_file = _find_mockup_file(cell_path, cell_name)
    
    if not mockup_file:
        console.print("  [yellow]⚠ Pas de mockup trouvé, vérification ignorée")
        return True, "pas de mockup"
    
    if mockup_file.suffix != ".html":
        console.print(f"  [yellow]⚠ Mockup {mockup_file.suffix} non comparable (HTML attendu)")
        return True, "mockup non HTML"
    
    # Lire les fichiers
    impl_content = index_html.read_text(encoding="utf-8")
    mockup_content = mockup_file.read_text(encoding="utf-8")
    
    # Calculer la similarité
    similarity = _calculate_similarity(impl_content, mockup_content)
    
    console.print(f"  [dim]Score de similarité: {similarity['total'] * 100:.1f}%")
    console.print(f"    - Tags: {similarity['details']['tags'] * 100:.1f}%")
    console.print(f"    - Classes CSS: {similarity['details']['classes'] * 100:.1f}%")
    console.print(f"    - IDs: {similarity['details']['ids'] * 100:.1f}%")
    
    # Vérifier le seuil
    if similarity["total"] >= min_similarity:
        console.print(f"  [green]✓ Similarité OK (>{min_similarity * 100:.0f}%)")
        return True, f"similarity: {similarity['total']:.2f}"
    
    # Similarité trop faible - signaler pour retry depuis étape 1
    console.print(f"\n[yellow]⚠️  Similarité trop faible ({similarity['total'] * 100:.1f}% < {min_similarity * 100:.0f}%)")
    console.print("  [yellow]→ Restart depuis étape 1 nécessaire")
    
    return False, f"regeneration needed: similarity {similarity['total']:.2f}"
