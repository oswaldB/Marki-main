#!/usr/bin/env python3
import sys
from pathlib import Path

# Ajouter le parent (app/) au path pour les imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from workflows.hello_cron import execute

if __name__ == "__main__":
    result = execute()
    print(result)
