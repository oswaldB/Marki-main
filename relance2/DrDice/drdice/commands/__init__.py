"""Commandes CLI pour DrDice."""

from .generate import generate
from .build import build
from .init import init
from .dev import dev

__all__ = ["generate", "build", "init", "dev"]
