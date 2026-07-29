"""Étape 5: Nettoyage de la Cell - Supprime tout sauf .specs/."""

import shutil
from pathlib import Path

from rich.console import Console

console = Console()


def step_7_clean_cell(cell_path: Path) -> bool:
    """Nettoie la cell en supprimant tout sauf .specs/.

    Args:
        cell_path: Chemin de la cell

    Returns:
        True si nettoyage réussi
    """
    console.print("[blue]🧹 Nettoyage de la cell...")

    if not cell_path.exists():
        cell_path.mkdir(parents=True, exist_ok=True)
        console.print("  [dim]Cell créée")
        return True

    # Compter ce qui va être supprimé
    items_to_delete = [
        item for item in cell_path.iterdir() if item.name != ".specs"
    ]

    if not items_to_delete:
        console.print("  [dim]Rien à nettoyer")
        console.print("[green]✅ Cell déjà propre")
        return True

    # Afficher ce qui sera supprimé
    console.print(f"  [dim]Suppression de {len(items_to_delete)} élément(s):")
    for item in items_to_delete[:3]:
        console.print(f"    [dim]- {item.name}")
    if len(items_to_delete) > 3:
        console.print(f"    [dim]... et {len(items_to_delete) - 3} autres")

    # Préserver .specs/
    specs_backup = None
    specs_dir = cell_path / ".specs"

    if specs_dir.exists():
        specs_backup = cell_path.parent / f".{cell_path.name}_specs_backup"
        shutil.copytree(specs_dir, specs_backup, dirs_exist_ok=True)

    # Supprimer tout
    for item in items_to_delete:
        if item.is_dir():
            shutil.rmtree(item)
        else:
            item.unlink()

    # Restaurer .specs/
    if specs_backup:
        shutil.copytree(specs_backup, specs_dir, dirs_exist_ok=True)
        shutil.rmtree(specs_backup)

    console.print(f"[green]✅ Cell nettoyée ({len(items_to_delete)} élément(s) supprimé(s))")
    return True
