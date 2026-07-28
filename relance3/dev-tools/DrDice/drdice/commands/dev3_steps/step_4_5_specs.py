"""Étape 4.5: Vérification/Création du fichier page-specs.md."""

from pathlib import Path

from rich.console import Console

console = Console()


def step_4_5_check_specs(cell_path: Path, cell_name: str, templates_dir: Path) -> tuple[bool, str]:
    """Vérifie si page-specs.md existe, sinon le crée à partir du template.

    Args:
        cell_path: Chemin de la cell
        cell_name: Nom de la cell
        templates_dir: Dossier des templates

    Returns:
        Tuple (ok, message)
    """
    console.print("[blue]📋 Étape 4.5: Vérification page-specs.md...")

    specs_dir = cell_path / ".specs"
    page_specs_file = specs_dir / "page-specs.md"

    # Vérifier si le fichier existe déjà
    if page_specs_file.exists():
        console.print("  [dim]✓ page-specs.md existe déjà")
        return True, "existe"

    # Charger le template
    template_path = templates_dir / "static-stack" / "squelettes" / "specs" / "page-specs.md"

    if not template_path.exists():
        console.print(f"  [yellow]⚠️ Template non trouvé: {template_path}")
        return True, "template manquant"

    # Lire et personnaliser le template
    content = template_path.read_text(encoding="utf-8")
    content = content.replace("{cell_name}", cell_name)

    # Écrire le fichier
    page_specs_file.write_text(content, encoding="utf-8")

    console.print(f"  [green]✓ page-specs.md créé")
    return True, "créé"
