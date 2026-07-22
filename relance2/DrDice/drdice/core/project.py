"""Gestion du projet global."""

import re
from pathlib import Path
from typing import Iterator, List, Optional

from .cell import Cell, CellType


class Project:
    """Représente le projet avec toutes ses cells."""
    
    def __init__(self, root_path: str | Path):
        """Initialise le projet.
        
        Args:
            root_path: Chemin racine du projet
        """
        self.root = Path(root_path).resolve()
        self.app_dir = self.root / "app"
        self.specs_global = self.root / "specs-global"
        self.cells_listing = self.specs_global / "cells-listing.md"
        
    @property
    def screens_dir(self) -> Path:
        """Dossier des écrans."""
        return self.app_dir / "screens"
    
    @property
    def backend_wf_dir(self) -> Path:
        """Dossier des workflows backend."""
        return self.app_dir / "backend_wf"
    
    @property
    def cron_dir(self) -> Path:
        """Dossier des cron."""
        return self.app_dir / "cron"
    
    def ensure_base_structure(self) -> None:
        """Crée la structure de base du projet."""
        self.app_dir.mkdir(parents=True, exist_ok=True)
        self.screens_dir.mkdir(exist_ok=True)
        self.backend_wf_dir.mkdir(exist_ok=True)
        self.cron_dir.mkdir(exist_ok=True)
        (self.app_dir / "data").mkdir(exist_ok=True)
        self.specs_global.mkdir(exist_ok=True)
    
    def parse_cells_listing(self) -> List[Cell]:
        """Parse le cells-listing.md et retourne les cells.
        
        Returns:
            Liste des cells trouvées
        """
        cells = []
        
        if not self.cells_listing.exists():
            return cells
        
        content = self.cells_listing.read_text(encoding="utf-8")
        current_cell = None
        current_type = None
        
        for line in content.split("\n"):
            # Détecter ## Cell: nom
            if match := re.match(r"^##\s*Cell:\s*(.+)$", line.strip()):
                current_cell = match.group(1).strip()
                continue
            
            # Détecter - **Type**: type
            if match := re.match(r"^-\s*\*\*Type\*\*:\s*(\S+)", line.strip()):
                current_type = match.group(1).strip()
                
                if current_cell and current_type:
                    try:
                        cell_type = CellType(current_type)
                        cells.append(
                            Cell(
                                name=current_cell,
                                cell_type=cell_type,
                                project_root=self.root,
                            )
                        )
                    except ValueError:
                        pass  # Type inconnu, on ignore
                    
                    current_cell = None
                    current_type = None
        
        return cells
    
    def get_all_cells(self) -> Iterator[Cell]:
        """Itère sur toutes les cells existantes dans le projet.
        
        Yields:
            Les cells trouvées
        """
        for base_dir in [self.screens_dir, self.backend_wf_dir, self.cron_dir]:
            if not base_dir.exists():
                continue
            for cell_path in base_dir.iterdir():
                if cell_path.is_dir():
                    # Détecter le type depuis le chemin
                    if "screens" in str(cell_path):
                        cell_type = CellType.ECRAN
                    elif "backend_wf" in str(cell_path):
                        cell_type = CellType.WORKFLOW_BACKEND
                    elif "cron" in str(cell_path):
                        cell_type = CellType.CRON
                    else:
                        cell_type = CellType.ECRAN
                    
                    yield Cell(
                        name=cell_path.name,
                        cell_type=cell_type,
                        project_root=self.root,
                    )
    
    def get_cells_to_develop(self) -> List[Cell]:
        """Retourne les cells prêtes à être développées.
        
        Returns:
            Cells avec valide.md mais sans devok.md
        """
        cells = []
        for cell in self.get_all_cells():
            if cell.is_valid and not cell.is_developed:
                cells.append(cell)
        return cells
    
    def find_cell(self, name: str) -> Optional[Cell]:
        """Trouve une cell par son nom.
        
        Args:
            name: Nom de la cell
            
        Returns:
            La cell trouvée ou None
        """
        for cell in self.get_all_cells():
            if cell.name == name:
                return cell
        return None
