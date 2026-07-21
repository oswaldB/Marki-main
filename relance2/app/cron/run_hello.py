#!/usr/bin/env python3
"""
Script cron pour exécuter le workflow hello_cron
Appelé par le cron toutes les minutes
"""

import sys
from pathlib import Path

# Ajouter le parent au path pour importer les modules de l'app
sys.path.insert(0, str(Path(__file__).parent.parent))

from workflows.hello_cron import execute


if __name__ == "__main__":
    result = execute()
    print(result)
