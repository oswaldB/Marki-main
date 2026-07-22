#!/usr/bin/env python3
"""CLI principal pour DrDice."""

import click
from rich.console import Console

from .commands.build import build
from .commands.dev import dev
from .commands.generate import generate
from .commands.init import init

console = Console()


@click.group()
@click.version_option(version="1.0.0", prog_name="drdice")
def cli():
    """DrDice - Outils de génération et développement de cells MVC.
    
    Commandes disponibles:
    - generate: Génère cells-listing.md depuis app-map.md
    - build: Construit la structure /app/ depuis cells-listing.md
    - init: Initialise le boilerplate Flask
    - dev: Développe les cells validées
    """
    pass


# Enregistrement des commandes
cli.add_command(generate, name="generate")
cli.add_command(build, name="build")
cli.add_command(init, name="init")
cli.add_command(dev, name="dev")


def main():
    """Point d'entrée principal."""
    cli()


if __name__ == "__main__":
    main()
