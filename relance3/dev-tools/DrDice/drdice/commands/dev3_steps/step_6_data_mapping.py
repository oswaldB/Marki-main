"""Étape 6: Génération du Data Mapping Page (CouchDB → PouchDB → Alpine.js) via IA."""

import json
from pathlib import Path
from typing import Any

from rich.console import Console

console = Console()

# Template du guide datamapping pour le contexte
DATAMAPPING_GUIDE = """
# Guide : Data Mapping avec CouchDB, PouchDB et Alpine.js (Sync Live)

## Structure du Tableau de Data Mapping

Le tableau doit refléter le flux des données entre :
1. CouchDB (backend)
2. PouchDB (frontend, sync live)
3. Alpine.js (state et UI)

| **Couche** | **Champ/Propriété** | **Type** | **Source** | **Destination** | **Mapping/Transformation** | **Notes** |
|------------|---------------------|----------|------------|---------------|--------------------------|-----------|
| CouchDB | `_id` | string | Document CouchDB | PouchDB | `_id` (inchangé) | Identifiant unique |
| PouchDB | `name` | string | CouchDB (`name`) | Alpine.js (`user.name`) | `user.name` = `name` | Sync via `db.changes()` |
| Alpine.js | `user.name` | string | PouchDB (`name`) | Composant UI | `x-text="user.name"` | Réactif |

## Diagramme de Flux

```mermaid
flowchart TD
    A[CouchDB: Document] -->|Sync Live| B[PouchDB: Local DB]
    B -->|db.changes()| C[Alpine.js: State]
    C -->|Rendering| D[Composant UI]
    D -->|@click, x-model| C
    C -->|db.put/get/find| B
    B -->|Sync Live| A
```

## Opérations PouchDB Typiques
- `db.sync(couchDB)` - Synchronisation live
- `db.put(doc)` - Création/Mise à jour
- `db.get(id)` - Récupération
- `db.find(selector)` - Requête Mango
- `db.changes()` - Écoute temps réel

## State Alpine.js Typique
```javascript
{
    items: [],           // Liste des documents
    currentItem: {},   // Document sélectionné
    isLoading: false,
    error: null
}
```
"""


def read_data_dir(project_dir: Path) -> dict[str, Any]:
    """Lit le contenu du répertoire app/data/ (schémas CouchDB).
    
    Les schémas de données sont stockés globalement dans app/data/
    et non dans chaque cellule.
    """
    data_dir = project_dir / "app" / "data"
    if not data_dir.exists():
        return {}
    
    schemas = {}
    for md_file in data_dir.glob("*.md"):
        try:
            content = md_file.read_text(encoding="utf-8")
            # Extraire le nom du document du markdown
            # Format typique: # Document: Nom ou # Type: Nom
            schemas[md_file.stem] = content
        except Exception as e:
            console.print(f"  [yellow]⚠️ Erreur lecture {md_file}: {e}")
    return schemas


def read_workflows_dir(cell_path: Path) -> list[dict[str, Any]]:
    """Lit le contenu du répertoire workflows/ (backend) et .specs/wf-frontend/.
    
    Les workflows peuvent être:
    - cell/workflows/*.js (workflows backend/exécutables)
    - cell/.specs/wf-frontend/*.md (workflows frontend/documentés)
    """
    workflows = []
    
    # Workflows backend (fichiers .js)
    backend_dir = cell_path / "workflows"
    if backend_dir.exists():
        for wf_file in backend_dir.glob("*.js"):
            try:
                content = wf_file.read_text(encoding="utf-8")
                workflows.append({
                    "name": wf_file.stem,
                    "type": "backend",
                    "content": content[:500] + "..." if len(content) > 500 else content  # Limiter la taille
                })
            except Exception as e:
                console.print(f"  [yellow]⚠️ Erreur lecture {wf_file}: {e}")
    
    # Workflows frontend (fichiers .md dans .specs/wf-frontend/)
    frontend_dir = cell_path / ".specs" / "wf-frontend"
    if frontend_dir.exists():
        for wf_file in frontend_dir.glob("*.md"):
            try:
                content = wf_file.read_text(encoding="utf-8")
                workflows.append({
                    "name": wf_file.stem,
                    "type": "frontend",
                    "content": content[:1000] + "..." if len(content) > 1000 else content
                })
            except Exception as e:
                console.print(f"  [yellow]⚠️ Erreur lecture {wf_file}: {e}")
    
    return workflows


def read_mockups_dir(cell_path: Path) -> list[dict[str, Any]]:
    """Lit le contenu du répertoire .specs/mockups/ (fichiers .md et .html).
    
    Les mockups sont stockés dans .specs/mockups/
    """
    mockups_dir = cell_path / ".specs" / "mockups"
    if not mockups_dir.exists():
        return []
    
    mockups = []
    for ext in ["*.md", "*.html", "*.txt"]:
        for mockup_file in mockups_dir.glob(ext):
            try:
                content = mockup_file.read_text(encoding="utf-8")
                mockups.append({
                    "name": mockup_file.stem,
                    "type": mockup_file.suffix,
                    "content": content
                })
            except Exception as e:
                console.print(f"  [yellow]⚠️ Erreur lecture {mockup_file}: {e}")
    return mockups


def step_6_generate_data_mapping(
    project_dir: Path,
    cell_path: Path,
    cell_name: str
) -> tuple[bool, Path | None]:
    """Étape 6: Génération du data-mapping-page.md via IA (pi -p).
    
    Utilise picode_generate pour analyser les sources et générer
    un document de data mapping structuré selon le guide.
    
    Args:
        project_dir: Répertoire racine du projet (pour accéder à app/data/)
        cell_path: Chemin de la cellule
        cell_name: Nom de la cellule
        
    Returns:
        Tuple (success, path_to_file)
    """
    import json
    import subprocess
    
    console.print("[blue]🗺️ Étape 6/17: Génération du Data Mapping Page (via IA)...")
    
    specs_dir = cell_path / ".specs"
    specs_dir.mkdir(parents=True, exist_ok=True)
    
    data_mapping_file = specs_dir / "data-mapping-page.md"
    
    # Si le fichier existe déjà, demander à l'utilisateur
    if data_mapping_file.exists():
        from rich.prompt import Confirm
        
        console.print(f"  [yellow]⚠️ {data_mapping_file.name} existe déjà")
        if Confirm.ask("    Régénérer le fichier ?", default=False):
            console.print("  [dim]→ Régénération demandée...")
        else:
            console.print("  [dim]✓ Conservation du fichier existant")
            return True, data_mapping_file
    
    # Lire les sources avec la bonne structure
    # data/ est dans app/ (global au projet)
    # workflows/ et mockups/ sont dans la cell
    
    console.print(f"  [dim]→ Analyse de app/data/ (schémas globaux)...")
    data_schemas = read_data_dir(project_dir)
    
    console.print(f"  [dim]→ Analyse de {cell_path}/workflows/...")
    workflows = read_workflows_dir(cell_path)
    
    console.print(f"  [dim]→ Analyse de {cell_path}/.specs/mockups/...")
    mockups = read_mockups_dir(cell_path)
    
    console.print(f"  [green]✓ {len(data_schemas)} schéma(s) global(aux), {len(workflows)} workflow(s), {len(mockups)} mockup(s)")
    
    # Préparer le contexte pour l'IA
    console.print("  [dim]→ Préparation du prompt IA...")
    
    context_data = {
        "cell_name": cell_name,
        "cell_path": str(cell_path),
        "couchdb_schemas": data_schemas,
        "workflows": workflows,
        "mockups_summary": [
            {
                "name": m["name"],
                "type": m["type"],
                "has_alpine": "x-data" in m.get("content", "") or "x-model" in m.get("content", "")
            }
            for m in mockups[:5]  # Limiter à 5 pour ne pas surcharger
        ]
    }
    
    prompt = f"""Génère un document data-mapping-page.md pour la cellule "{cell_name}".

Ce document doit décrire le flux de données entre CouchDB (backend), PouchDB (sync local), et Alpine.js (UI).

## CONTEXTE EXTRAIT DE LA CELLULE :

### Schémas CouchDB (data/):
```json
{json.dumps(data_schemas, indent=2, ensure_ascii=False)}
```

### Workflows métiers (wf-workflows/):
```json
{json.dumps(workflows, indent=2, ensure_ascii=False)}
```

### Mockups UI (mockups/):
{len(mockups)} fichier(s) trouvé(s) avec composants Alpine.js

## STRUCTURE ATTENDUE DU DOCUMENT :

1. **Titre** : `# Data Mapping: {cell_name}`

2. **Diagramme de flux Mermaid** :
   - CouchDB → PouchDB (sync live)
   - PouchDB → Alpine.js (db.changes())
   - Alpine.js → Composant UI (rendering)
   - UI → Alpine.js (événements)
   - Alpine.js → PouchDB (db.put/get/find)

3. **Tableau de Data Mapping** avec colonnes :
   - Couche (CouchDB / PouchDB / Alpine.js / UI)
   - Champ/Propriété
   - Type
   - Source
   - Destination
   - Mapping/Transformation
   - Notes

4. **Section Workflows PouchDB** :
   - Lister les opérations identifiées (sync, put, get, find, changes)
   - Décrire les événements qui déclenchent les mises à jour

5. **Section Composants Alpine.js** :
   - Décrire le state attendu (items[], currentItem, isLoading, etc.)
   - Lister les méthodes pour interagir avec PouchDB

6. **Notes sur la synchronisation** :
   - Gestion des conflits (_rev)
   - Écoute temps réel (db.changes)
   - Bonnes pratiques

## RÈGLES IMPORTANTES :
- Si les schémas sont vides, créer un template générique avec les champs typiques (_id, _rev, createdAt, updatedAt)
- Le tableau doit être complet et réaliste, pas juste un exemple
- Inclure le diagramme Mermaid exactement comme dans le guide
- Le document doit être prêt à l'emploi pour un développeur

Génère le document markdown complet."""

    console.print("  [dim]→ Appel à l'IA (pi -p)...")
    
    try:
        # Appel via pi -p
        import subprocess
        
        # Construire la commande pi -p
        # Le prompt doit être passé comme argument
        cmd = ["pi", "-p", prompt]
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120  # 2 minutes timeout
        )
        
        if result.returncode != 0:
            console.print(f"[red]❌ Erreur commande pi: {result.stderr}")
            return False, None
        
        content = result.stdout.strip()
        
        # Nettoyer le contenu si nécessaire (enlève les balises markdown si présentes)
        if content.startswith('```markdown'):
            content = content[11:]
        if content.startswith('```'):
            content = content[3:]
        if content.endswith('```'):
            content = content[:-3]
        content = content.strip()
        
        if not content:
            console.print("[red]❌ Contenu généré vide")
            return False, None
        
        # Écrire le fichier
        data_mapping_file.write_text(content, encoding="utf-8")
        console.print(f"[green]✅ Data Mapping créé via IA: {data_mapping_file.name}")
        return True, data_mapping_file
        
    except subprocess.TimeoutExpired:
        console.print("[red]❌ Timeout: pi -p a mis plus de 2 minutes")
        return False, None
    except FileNotFoundError:
        console.print("[red]❌ Commande 'pi' non trouvée. Est-ce que pi est installé?")
        return False, None
    except Exception as e:
        console.print(f"[red]❌ Erreur génération IA: {e}")
        return False, None
