"""Étape 5: Génération du DataModel CouchDB et création du fichier data-page.md."""

import json
import subprocess
from pathlib import Path

from rich.console import Console

console = Console()

# Configuration CouchDB
COUCHDB_URL = "http://dev.markidiags.com/couchdb"
COUCHDB_DB = "markidiags"  # Ajustez selon votre configuration


def fetch_couchdb_datamodel() -> dict:
    """Récupère le datamodel de CouchDB via curl.
    
    Returns:
        Dictionnaire contenant les types de documents trouvés
    """
    try:
        # Récupérer quelques documents pour analyser les types
        # On utilise _all_docs avec limit pour avoir un aperçu
        cmd = [
            "curl", "-s", "-X", "GET",
            f"{COUCHDB_URL}/{COUCHDB_DB}/_all_docs?include_docs=true&limit=100",
            "-H", "Content-Type: application/json"
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        if result.returncode != 0:
            console.print(f"  [yellow]⚠️ Erreur curl: {result.stderr}")
            return {}
        
        data = json.loads(result.stdout)
        
        # Analyser les documents pour extraire les types
        doc_types = {}
        for row in data.get("rows", []):
            doc = row.get("doc", {})
            doc_type = doc.get("type", "unknown")
            
            if doc_type not in doc_types:
                doc_types[doc_type] = {
                    "count": 0,
                    "fields": set(),
                    "example": doc
                }
            
            doc_types[doc_type]["count"] += 1
            # Collecter tous les champs
            for key in doc.keys():
                if not key.startswith("_"):  # Ignorer _id, _rev
                    doc_types[doc_type]["fields"].add(key)
        
        # Convertir les sets en listes pour JSON
        for doc_type in doc_types:
            doc_types[doc_type]["fields"] = list(doc_types[doc_type]["fields"])
        
        return doc_types
        
    except subprocess.TimeoutExpired:
        console.print("  [yellow]⚠️ Timeout lors de la récupération du datamodel")
        return {}
    except json.JSONDecodeError as e:
        console.print(f"  [yellow]⚠️ Erreur parsing JSON: {e}")
        return {}
    except Exception as e:
        console.print(f"  [yellow]⚠️ Erreur: {e}")
        return {}


def save_datamodel(project_dir: Path, datamodel: dict) -> Path:
    """Sauvegarde le datamodel dans un fichier JSON à la racine.
    
    Args:
        project_dir: Répertoire racine du projet
        datamodel: Dictionnaire du datamodel
        
    Returns:
        Chemin du fichier créé
    """
    datamodel_file = project_dir / "datamodel-couchdb.json"
    
    content = {
        "source": f"{COUCHDB_URL}/{COUCHDB_DB}",
        "generated_at": str(Path(__file__).stat().st_mtime),
        "document_types": datamodel
    }
    
    datamodel_file.write_text(
        json.dumps(content, indent=2, ensure_ascii=False),
        encoding="utf-8"
    )
    
    return datamodel_file


def generate_data_page_md(
    cell_path: Path, 
    cell_name: str, 
    templates_dir: Path,
    datamodel: dict
) -> bool:
    """Génère le fichier data-page.md à partir du template.
    
    Args:
        cell_path: Chemin de la cell
        cell_name: Nom de la cell
        templates_dir: Dossier des templates
        datamodel: Dictionnaire du datamodel
        
    Returns:
        True si le fichier a été créé
    """
    specs_dir = cell_path / ".specs"
    data_page_file = specs_dir / "data-page.md"
    
    # Si le fichier existe déjà, ne pas l'écraser
    if data_page_file.exists():
        console.print("  [dim]✓ data-page.md existe déjà")
        return True
    
    # Charger le template
    template_path = templates_dir / "static-stack" / "squelettes" / "specs" / "data-page.md"
    
    if not template_path.exists():
        console.print(f"  [yellow]⚠️ Template non trouvé: {template_path}")
        return False
    
    # Préparer le contenu du datamodel pour le template
    datamodel_json = json.dumps(datamodel, indent=2, ensure_ascii=False)
    
    # Déterminer le type de document principal pour cette cell
    # Par défaut, on utilise le nom de la cell ou 'unknown'
    doc_type = cell_name.lower()
    # Chercher un type qui correspond au nom de la cell
    for dt in datamodel.keys():
        if cell_name.lower() in dt.lower() or dt.lower() in cell_name.lower():
            doc_type = dt
            break
    
    # Lire et personnaliser le template
    content = template_path.read_text(encoding="utf-8")
    content = content.replace("{cell_name}", cell_name)
    content = content.replace("{datamodel_content}", datamodel_json)
    content = content.replace("{doc_type}", doc_type)
    
    # Écrire le fichier
    data_page_file.write_text(content, encoding="utf-8")
    
    console.print(f"  [green]✓ data-page.md créé")
    return True


def step_5_generate_datamodel(
    project_dir: Path,
    cell_path: Path, 
    cell_name: str, 
    templates_dir: Path
) -> tuple[bool, dict]:
    """Étape 5: Génération du datamodel CouchDB et création de data-page.md.
    
    Args:
        project_dir: Répertoire racine du projet
        cell_path: Chemin de la cell
        cell_name: Nom de la cell
        templates_dir: Dossier des templates
        
    Returns:
        Tuple (ok, datamodel dict)
    """
    console.print("[blue]📊 Étape 5/15: Génération du DataModel CouchDB...")
    
    # Vérifier si on est sur une cell frontend
    parent_name = cell_path.parent.name
    if parent_name == "services" or "/server/" in str(cell_path):
        console.print("  [dim]ℹ️ Cell backend - pas de datamodel nécessaire")
        return True, {}
    
    # 1. Récupérer le datamodel depuis CouchDB
    console.print("  [dim]→ Récupération des types de documents depuis CouchDB...")
    datamodel = fetch_couchdb_datamodel()
    
    if not datamodel:
        console.print("  [yellow]⚠️ Impossible de récupérer le datamodel, utilisation d'un modèle vide")
        datamodel = {
            "example": {
                "count": 0,
                "fields": ["type", "name", "createdAt", "updatedAt"],
                "example": {"type": "example", "name": "Exemple"}
            }
        }
    else:
        console.print(f"  [green]✓ {len(datamodel)} type(s) de document trouvé(s)")
        for doc_type, info in datamodel.items():
            console.print(f"    • {doc_type}: {info['count']} doc(s), {len(info['fields'])} champ(s)")
    
    # 2. Sauvegarder le datamodel à la racine
    console.print("  [dim]→ Sauvegarde du datamodel à la racine...")
    datamodel_path = save_datamodel(project_dir, datamodel)
    console.print(f"  [green]✓ Datamodel sauvegardé: {datamodel_path.name}")
    
    # 3. Créer le fichier data-page.md
    console.print("  [dim]→ Création du fichier data-page.md...")
    ok = generate_data_page_md(cell_path, cell_name, templates_dir, datamodel)
    
    if not ok:
        console.print("  [yellow]⚠️ Impossible de créer data-page.md")
        return True, datamodel  # Non bloquant
    
    console.print(f"[green]✅ Étape 5 terminée: DataModel généré")
    return True, datamodel
