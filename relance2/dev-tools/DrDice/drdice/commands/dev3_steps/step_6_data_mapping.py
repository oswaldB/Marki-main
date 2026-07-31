"""Étape 6: Génération du Data Mapping Page (SQLite → Flask → Alpine.js)."""

from pathlib import Path
from typing import Any

from rich.console import Console

console = Console()

# Template du guide datamapping pour Flask/SQLite
DATAMAPPING_GUIDE = """
# Guide : Data Mapping avec SQLite et Flask

## Structure du Tableau de Data Mapping

Le tableau doit refléter le flux des données entre :
1. SQLite (base de données)
2. Flask (backend API)
3. Alpine.js (frontend state)

| **Couche** | **Champ/Propriété** | **Type** | **Source** | **Destination** | **Mapping/Transformation** | **Notes** |
|------------|---------------------|----------|------------|---------------|--------------------------|-----------|
| SQLite | `id` | INTEGER | Table SQLite | Modèle Python | `id: int` | Clé primaire auto-incrémentée |
| Modèle | `name` | str | Colonne DB | Dataclass | `name: str` | Type Python natif |
| Flask API | `name` | JSON | Modèle | Response JSON | `jsonify({"name": obj.name})` | Sérialisation |
| Alpine.js | `item.name` | string | API JSON | State réactif | `x-text="item.name"` | Binding UI |

## Diagramme de Flux

```mermaid
flowchart TD
    A[SQLite: Table] <-->|SQLAlchemy/Dataclass| B[Flask: Modèle]
    B -->|jsonify| C[API: JSON Response]
    C -->|fetch| D[Alpine.js: State]
    D -->|Rendering| E[Composant UI]
    E -->|@click, x-model| D
    D -->|POST/PUT/DELETE| C
    C -->|CRUD| B
    B -->|SQL| A
```

## Routes Flask Typiques
- `GET /{cell_name}` - Liste des items
- `GET /{cell_name}/<id>` - Détail d'un item
- `POST /{cell_name}` - Création
- `PUT /{cell_name}/<id>` - Mise à jour
- `DELETE /{cell_name}/<id>` - Suppression

## Modèle Python Typique
```python
from dataclasses import dataclass
from typing import Optional

@dataclass
class Item:
    id: Optional[int] = None
    name: str = ""
    created_at: str = ""
    
    @classmethod
    def from_row(cls, row: sqlite3.Row) -> "Item":
        return cls(
            id=row["id"],
            name=row["name"],
            created_at=row["created_at"]
        )
```

## State Alpine.js Typique
```javascript
{
    items: [],           // Liste des documents
    currentItem: {},    // Document sélectionné
    isLoading: false,
    error: null
}
```
"""


def read_models_specs(cell_path: Path, specs_path: Path = None) -> dict[str, Any]:
    """Lit le contenu du répertoire specs/models/ (schémas de données)."""
    if specs_path is None:
        specs_path = cell_path.parent.parent.parent / ".specs" / cell_path.name
    
    models_dir = specs_path / "models"
    if not models_dir.exists():
        return {}
    
    models = {}
    for md_file in models_dir.glob("*.md"):
        try:
            content = md_file.read_text(encoding="utf-8")
            models[md_file.stem] = content
        except Exception as e:
            console.print(f"  [yellow]⚠️ Erreur lecture {md_file}: {e}")
    return models


def read_workflows_specs(cell_path: Path, specs_path: Path = None) -> list[dict[str, Any]]:
    """Lit le contenu du répertoire specs/wf-backend/ et specs/wf-frontend/."""
    if specs_path is None:
        specs_path = cell_path.parent.parent.parent / ".specs" / cell_path.name
    
    workflows = []
    
    # Workflows backend
    backend_dir = specs_path / "wf-backend"
    if backend_dir.exists():
        for wf_file in backend_dir.glob("*.md"):
            try:
                content = wf_file.read_text(encoding="utf-8")
                workflows.append({
                    "name": wf_file.stem,
                    "type": "backend",
                    "content": content[:500] + "..." if len(content) > 500 else content
                })
            except Exception as e:
                console.print(f"  [yellow]⚠️ Erreur lecture {wf_file}: {e}")
    
    # Workflows frontend
    frontend_dir = specs_path / "wf-frontend"
    if frontend_dir.exists():
        for wf_file in frontend_dir.glob("*.md"):
            try:
                content = wf_file.read_text(encoding="utf-8")
                workflows.append({
                    "name": wf_file.stem,
                    "type": "frontend",
                    "content": content[:500] + "..." if len(content) > 500 else content
                })
            except Exception as e:
                console.print(f"  [yellow]⚠️ Erreur lecture {wf_file}: {e}")
    
    return workflows


def read_routes_specs(cell_path: Path, specs_path: Path = None) -> list[dict[str, Any]]:
    """Lit le contenu du répertoire specs/routes/."""
    if specs_path is None:
        specs_path = cell_path.parent.parent.parent / ".specs" / cell_path.name
    
    routes = []
    routes_dir = specs_path / "routes"
    if routes_dir.exists():
        for route_file in routes_dir.glob("*.md"):
            try:
                content = route_file.read_text(encoding="utf-8")
                routes.append({
                    "name": route_file.stem,
                    "content": content[:500] + "..." if len(content) > 500 else content
                })
            except Exception as e:
                console.print(f"  [yellow]⚠️ Erreur lecture {route_file}: {e}")
    return routes


def step_6_generate_data_mapping(project_dir: Path, cell_path: Path, cell_name: str, specs_path: Path = None) -> tuple[bool, Path]:
    """Génère le data-mapping-page.md via IA.
    
    Ce document référence:
    - Les workflows frontend pour chaque bouton du mockup
    - Les routes utilisées par les workflows
    - Les modèles de données SQLite
    
    Args:
        project_dir: Racine du projet
        cell_path: Chemin de la cell dans app/
        cell_name: Nom de la cell
        specs_path: Chemin vers les specs (dans .specs/<cell>/) - optionnel
    """
    console.print("[blue]📋 Étape 6: Génération Data Mapping...")
    
    # Nouvelle structure: specs dans .specs/<cell-name>/
    if specs_path is None:
        specs_path = project_dir / ".specs" / cell_name
    
    # Vérifier si déjà existant
    data_mapping_file = specs_path / "data-mapping-page.md"
    
    # Lire les specs disponibles
    models = read_models_specs(cell_path, specs_path)
    workflows = read_workflows_specs(cell_path, specs_path)
    routes = read_routes_specs(cell_path, specs_path)
    
    # Lire le mockup s'il existe
    mockup_content = ""
    mockups_dir = specs_path / "mockups"
    if mockups_dir.exists():
        for html_file in mockups_dir.glob("*.html"):
            try:
                mockup_content = html_file.read_text(encoding="utf-8")
                break  # Prendre le premier mockup trouvé
            except Exception:
                pass
    
    # Lire les règles du projet
    rules_content = ""
    rules_file = specs_path / "A LIRE EN PREMIER" / "rules.md"
    if rules_file.exists():
        rules_content = rules_file.read_text(encoding="utf-8")
    
    console.print(f"  [dim]Modèles trouvés: {len(models)}")
    console.print(f"  [dim]Workflows trouvés: {len(workflows)}")
    console.print(f"  [dim]Routes trouvées: {len(routes)}")
    
    # Utiliser un template simple pour Flask au lieu d'appeler l'IA
    content = f"""# Data Mapping - {cell_name}

## Description
Ce document référence les workflows et routes pour la cell `{cell_name}`.

## Modèles de Données (SQLite)
"""
    
    if models:
        for model_name, model_content in models.items():
            content += f"""
### {model_name}
```
{model_content[:500]}
```
"""
    else:
        content += "_Aucun modèle défini_\n"
    
    content += f"""

## Workflows Frontend
"""
    
    wf_frontend = [w for w in workflows if w["type"] == "frontend"]
    if wf_frontend:
        for wf in wf_frontend:
            content += f"""
### {wf['name']}
- Type: Frontend
- Description: {wf['content'][:200]}...
"""
    else:
        content += "_Aucun workflow frontend défini_\n"
    
    content += f"""

## Workflows Backend (API)
"""
    
    wf_backend = [w for w in workflows if w["type"] == "backend"]
    if wf_backend:
        for wf in wf_backend:
            content += f"""
### {wf['name']}
- Type: Backend
- Route: POST /api/{cell_name}/{wf['name']}
"""
    else:
        content += "_Aucun workflow backend défini_\n"
    
    content += f"""

## Routes
"""
    
    if routes:
        for route in routes:
            content += f"""
### {route['name']}
```
{route['content'][:300]}...
```
"""
    else:
        content += "_Aucune route définie_\n"
    
    if mockup_content:
        content += f"""

## Référence Mockup
Le mockup contient les éléments UI à mapper avec les workflows.
"""
    
    # Écrire le fichier
    data_mapping_file.write_text(content, encoding="utf-8")
    console.print(f"  [green]✓ Data Mapping généré: {data_mapping_file.relative_to(project_dir)}")
    
    return True, data_mapping_file
