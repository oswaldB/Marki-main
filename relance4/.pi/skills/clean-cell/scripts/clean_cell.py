#!/usr/bin/env python3
"""Clean Cell - Supprime tout sauf .specs/."""

import shutil
import sys
from pathlib import Path


def clean_cell(cell_path: Path) -> bool:
    """Nettoie la cell en supprimant tout sauf .specs/."""
    cell_path = Path(cell_path)
    
    print("🧹 Nettoyage de la cell...")
    
    if not cell_path.exists():
        cell_path.mkdir(parents=True, exist_ok=True)
        print("  Cell créée")
        return True
    
    # Compter ce qui va être supprimé
    items_to_delete = [
        item for item in cell_path.iterdir() if item.name != ".specs"
    ]
    
    if not items_to_delete:
        print("  Rien à nettoyer")
        print("✅ Cell déjà propre")
        return True
    
    print(f"  Suppression de {len(items_to_delete)} élément(s)...")
    
    # Sauvegarder .specs/
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
    
    print(f"✅ Cell nettoyée ({len(items_to_delete)} élément(s) supprimé(s))")
    return True


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: clean_cell.py <cell-path>")
        sys.exit(1)
    
    cell_path = Path(sys.argv[1])
    
    success = clean_cell(cell_path)
    
    sys.exit(0 if success else 1)
