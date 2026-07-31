"""Gestion des couleurs pour l'affichage console."""

from dataclasses import dataclass


@dataclass
class Colors:
    """Codes de couleur pour le terminal."""
    
    RED: str = '\033[0;31m'
    GREEN: str = '\033[0;32m'
    YELLOW: str = '\033[1;33m'
    BLUE: str = '\033[0;34m'
    CYAN: str = '\033[0;36m'
    NC: str = '\033[0m'
    
    @classmethod
    def info(cls, text: str) -> str:
        """Texte en vert avec icône."""
        return f"{cls.GREEN}ℹ️  {text}{cls.NC}"
    
    @classmethod
    def warn(cls, text: str) -> str:
        """Texte en jaune avec icône."""
        return f"{cls.YELLOW}⚠️  {text}{cls.NC}"
    
    @classmethod
    def error(cls, text: str) -> str:
        """Texte en rouge avec icône."""
        return f"{cls.RED}❌ {text}{cls.NC}"
    
    @classmethod
    def step(cls, text: str) -> str:
        """Texte en bleu avec icône."""
        return f"{cls.BLUE}🔨 {text}{cls.NC}"
    
    @classmethod
    def highlight(cls, text: str) -> str:
        """Texte en cyan."""
        return f"{cls.CYAN}{text}{cls.NC}"
