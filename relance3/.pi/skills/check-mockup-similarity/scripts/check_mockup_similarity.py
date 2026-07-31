#!/usr/bin/env python3
"""Check Mockup Similarity - Compare index.html avec le mockup."""

import re
import subprocess
import sys
from pathlib import Path


def _extract_structure(html_content: str) -> dict:
    """Extrait la structure DOM significative."""
    structure = {"tags": [], "classes": set(), "ids": set()}
    
    tag_pattern = r'<(\w+)[^\u003e]*>'
    for match in re.finditer(tag_pattern, html_content, re.IGNORECASE):
        tag = match.group(1).lower()
        full_tag = match.group(0)
        
        structure["tags"].append(tag)
        
        class_match = re.search(r'class=["\']([^"\']+)["\']', full_tag, re.IGNORECASE)
        if class_match:
            classes = class_match.group(1).split()
            structure["classes"].update(classes)
        
        id_match = re.search(r'id=["\']([^"\']+)["\']', full_tag, re.IGNORECASE)
        if id_match:
            structure["ids"].add(id_match.group(1))
    
    return structure


def _calculate_similarity(impl_html: str, mockup_html: str) -> dict:
    """Calcule un score de similarité."""
    impl_struct = _extract_structure(impl_html)
    mockup_struct = _extract_structure(mockup_html)
    
    scores = {}
    
    # Tags
    impl_tags_set = set(impl_struct["tags"])
    mockup_tags_set = set(mockup_struct["tags"])
    if mockup_tags_set:
        scores["tags"] = len(impl_tags_set & mockup_tags_set) / len(mockup_tags_set)
    else:
        scores["tags"] = 1.0
    
    # Classes Tailwind
    significant_mockup = {c for c in mockup_struct["classes"] if any(
        prefix in c for prefix in ['bg-', 'text-', 'p-', 'm-', 'rounded', 'shadow', 'border', 'flex', 'grid', 'w-', 'h-']
    )}
    significant_impl = {c for c in impl_struct["classes"] if any(
        prefix in c for prefix in ['bg-', 'text-', 'p-', 'm-', 'rounded', 'shadow', 'border', 'flex', 'grid', 'w-', 'h-']
    )}
    
    if significant_mockup:
        scores["classes"] = len(significant_impl & significant_mockup) / len(significant_mockup)
    else:
        scores["classes"] = 1.0
    
    # IDs
    impl_ids = {id for id in impl_struct["ids"] if id.startswith('btn-') or id in ['app', 'form']}
    mockup_ids = {id for id in mockup_struct["ids"] if id.startswith('btn-') or id in ['app', 'form']}
    
    if mockup_ids:
        scores["ids"] = len(impl_ids & mockup_ids) / len(mockup_ids)
    else:
        scores["ids"] = 1.0
    
    # Score global pondéré
    weights = {"tags": 0.3, "classes": 0.5, "ids": 0.2}
    total_score = sum(scores[k] * weights[k] for k in weights)
    
    return {
        "total": round(total_score, 2),
        "details": scores,
        "missing_classes": list(significant_mockup - significant_impl),
        "missing_ids": list(mockup_ids - impl_ids)
    }


def _find_mockup_file(cell_path: Path, cell_name: str) -> Path | None:
    """Trouve le fichier mockup pour la cell."""
    mockups_dir = cell_path / ".specs" / "mockups"
    
    if not mockups_dir.exists():
        return None
    
    candidates = [
        mockups_dir / f"{cell_name}.html",
        mockups_dir / "index.html",
        mockups_dir / f"{cell_name}.svg",
    ]
    
    for candidate in candidates:
        if candidate.exists():
            return candidate
    
    # Premier HTML trouvé
    html_files = list(mockups_dir.glob("*.html"))
    if html_files:
        return html_files[0]
    
    return None


def check_mockup_similarity(cell_path: Path, auto: bool = False, min_similarity: float = 0.90) -> tuple[bool, str]:
    """Vérifie que index.html correspond au mockup."""
    cell_path = Path(cell_path)
    cell_name = cell_path.name
    
    print("🔍 Vérification Mockup Similarity...")
    
    index_html = cell_path / "index.html"
    
    if not index_html.exists():
        print("  ❌ index.html non trouvé")
        return False, "index.html manquant"
    
    # Trouver le mockup
    mockup_file = _find_mockup_file(cell_path, cell_name)
    
    if not mockup_file:
        print("  ⚠ Pas de mockup trouvé, vérification ignorée")
        return True, "pas de mockup"
    
    if mockup_file.suffix != ".html":
        print(f"  ⚠ Mockup {mockup_file.suffix} non comparable (HTML attendu)")
        return True, "mockup non HTML"
    
    # Lire les fichiers
    impl_content = index_html.read_text(encoding="utf-8")
    mockup_content = mockup_file.read_text(encoding="utf-8")
    
    # Calculer la similarité
    similarity = _calculate_similarity(impl_content, mockup_content)
    
    print(f"  Score de similarité: {similarity['total'] * 100:.1f}%")
    print(f"    - Tags: {similarity['details']['tags'] * 100:.1f}%")
    print(f"    - Classes CSS: {similarity['details']['classes'] * 100:.1f}%")
    print(f"    - IDs: {similarity['details']['ids'] * 100:.1f}%")
    
    # Vérifier le seuil
    if similarity["total"] >= min_similarity:
        print(f"  ✅ Similarité OK (>{min_similarity * 100:.0f}%)")
        return True, f"similarity: {similarity['total']:.2f}"
    
    # Similarité trop faible
    print(f"\n  ⚠️  Similarité trop faible ({similarity['total'] * 100:.1f}% < {min_similarity * 100:.0f}%)")
    
    # Générer le prompt pour correction
    missing_elements = []
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
- IDs: {similarity['details']['ids'] * 100:.1f}%

## ÉLÉMENTS MANQUANTS
{chr(10).join(missing_elements) if missing_elements else "Structure générale différente"}

## MOCKUP DE RÉFÉRENCE (HTML):
```html
{mockup_content[:3000]}...
```

## INDEX.HTML ACTUEL (à corriger):
```html
{impl_content[:2000]}...
```

## TA MISSION:
Réécris ENTIÈREMENT le fichier index.html pour qu'il corresponde EXACTEMENT au mockup.

Ne donne QUE le code HTML complet, sans explications.
"""
    
    if not auto:
        print("\n  Exécution automatique désactivée (mode manuel)")
        return False, f"similarity too low: {similarity['total']:.2f}"
    
    # Exécution automatique
    print("  → Régénération automatique de index.html...")
    
    try:
        result = subprocess.run(
            ["pi", "-p"],
            input=prompt,
            capture_output=True,
            text=True,
            timeout=120
        )
        
        if result.returncode == 0 and len(result.stdout) > 100:
            corrected_html = result.stdout
            
            # Sauvegarder l'original
            backup_file = cell_path / "index.html.backup"
            index_html.rename(backup_file)
            
            # Écrire le nouveau fichier
            index_html.write_text(corrected_html, encoding="utf-8")
            
            print("  ✅ index.html régénéré")
            
            # Re-vérifier
            new_impl_content = index_html.read_text(encoding="utf-8")
            new_similarity = _calculate_similarity(new_impl_content, mockup_content)
            
            print(f"  Nouveau score: {new_similarity['total'] * 100:.1f}%")
            
            if new_similarity["total"] >= min_similarity:
                print(f"  ✅ Similarité corrigée!")
                backup_file.unlink()
                return True, f"similarity fixed: {new_similarity['total']:.2f}"
            else:
                print(f"  ⚠ Similarité toujours insuffisante, restauration...")
                backup_file.rename(index_html)
                return False, f"similarity still low: {new_similarity['total']:.2f}"
        else:
            print(f"  ❌ Échec de la génération")
            return False, "pi -p failed"
            
    except subprocess.TimeoutExpired:
        print("  ❌ Timeout lors de la génération")
        return False, "generation timeout"
    except Exception as e:
        print(f"  ❌ Erreur: {e}")
        return False, f"execution error: {e}"


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: check_mockup_similarity.py <cell-path> [--auto]")
        sys.exit(1)
    
    cell_path = Path(sys.argv[1])
    auto = "--auto" in sys.argv
    
    success, msg = check_mockup_similarity(cell_path, auto)
    
    sys.exit(0 if success else 1)
