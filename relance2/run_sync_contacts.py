#!/usr/bin/env python3
"""
Script pour exécuter le workflow sync-contacts
"""

import sys
import os

# Ajouter le répertoire app au path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from flask import Flask
from workflows.sync_contacts import sync_contacts_master

# Créer une app Flask minimale pour avoir accès à la config
app = Flask(__name__)
app.config['DATABASE'] = os.path.join(os.path.dirname(__file__), 'app', 'data', 'marki.db')

with app.app_context():
    print("=" * 60)
    print("LANCEMENT DU WORKFLOW SYNC-CONTACTS")
    print("=" * 60)
    print(f"Base de données: {app.config['DATABASE']}")
    print()
    
    try:
        result = sync_contacts_master()
        
        print()
        print("=" * 60)
        print("RÉSULTAT")
        print("=" * 60)
        print(f"Succès: {result.get('success')}")
        print(f"Stats: {result.get('stats')}")
        print(f"Durée: {result.get('duration_ms')} ms")
        
        if result.get('error'):
            print(f"Erreur: {result.get('error')}")
            
    except Exception as e:
        print(f"ERREUR FATALE: {str(e)}")
        import traceback
        traceback.print_exc()
