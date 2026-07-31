"""Classe représentant une Cell dans l'architecture."""

from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Optional


class CellType(Enum):
    """Types de cells supportés."""
    ECRAN = "ecran"
    WORKFLOW_BACKEND = "wf-bg"
    CRON = "cron"


@dataclass
class Cell:
    """Représente une cell du projet."""
    
    name: str
    cell_type: CellType
    project_root: Path
    description: str = ""
    
    def __post_init__(self):
        """Normalise le nom de la cell."""
        self.name = self.name.strip()
        
    @property
    def parent_dir(self) -> Path:
        """Retourne le dossier parent selon le type."""
        mapping = {
            CellType.ECRAN: "screens",
            CellType.WORKFLOW_BACKEND: "backend-wf",
            CellType.CRON: "cron",
        }
        return self.project_root / "app" / mapping.get(self.cell_type, "screens")
    
    @property
    def path(self) -> Path:
        """Retourne le chemin complet de la cell."""
        return self.parent_dir / self.name
    
    @property
    def specs_path(self) -> Path:
        """Retourne le chemin du dossier specs."""
        return self.path / "specs"
    
    @property
    def is_valid(self) -> bool:
        """Vérifie si la cell a un valide.md."""
        return (self.specs_path / "valide.md").exists()
    
    @property
    def is_developed(self) -> bool:
        """Vérifie si la cell a un devok.md."""
        return (self.specs_path / "devok.md").exists()
    
    def ensure_structure(self) -> None:
        """Crée la structure de dossiers de la cell."""
        # Dossiers communs
        (self.path / "routes").mkdir(parents=True, exist_ok=True)
        (self.path / "models").mkdir(parents=True, exist_ok=True)
        (self.path / "logs").mkdir(parents=True, exist_ok=True)
        (self.specs_path / "A LIRE EN PREMIER").mkdir(parents=True, exist_ok=True)
        (self.specs_path / "models").mkdir(parents=True, exist_ok=True)
        (self.specs_path / "routes").mkdir(parents=True, exist_ok=True)
        (self.specs_path / "wf-backend").mkdir(parents=True, exist_ok=True)
        
        # Structure spécifique
        if self.cell_type == CellType.ECRAN:
            (self.path / "templates" / "workflows").mkdir(parents=True, exist_ok=True)
            (self.specs_path / "mockups").mkdir(parents=True, exist_ok=True)
            (self.specs_path / "wf-frontend").mkdir(parents=True, exist_ok=True)
    
    def get_yaml_output_path(self) -> Path:
        """Retourne le chemin du fichier dev-output.yaml."""
        return self.path / "dev-output.yaml"
    
    def __str__(self) -> str:
        return f"Cell({self.name}, {self.cell_type.value})"
    
    def __repr__(self) -> str:
        return self.__str__()
