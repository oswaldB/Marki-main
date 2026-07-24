#!/usr/bin/env python3
"""Setup script for DrDice."""

from setuptools import find_packages, setup

setup(
    name="drdice",
    version="1.0.0",
    packages=find_packages(),
    include_package_data=True,
    install_requires=[
        "pyyaml>=6.0",
        "jinja2>=3.1.0",
        "click>=8.0.0",
        "rich>=13.0.0",
    ],
    entry_points={
        "console_scripts": [
            "drdice=drdice.cli:main",
            "drdice-generate=drdice.commands.generate:main",
            "drdice-build=drdice.commands.build:main",
            "drdice-init=drdice.commands.init:main",
            "drdice-dev=drdice.commands.dev:main",
        ],
    },
    python_requires=">=3.9",
    author="DrDice",
    description="Outils de génération et développement de cells MVC",
)
