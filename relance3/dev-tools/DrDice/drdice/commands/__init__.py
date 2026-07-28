"""Commandes CLI pour DrDice."""

from .generate import generate
from .build import build
from .init import init
from .dev import dev
from .dev3 import dev3

__all__ = ["generate", "build", "init", "dev", "dev3"]
