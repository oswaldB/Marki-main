#!/usr/bin/env python3
"""
Script de mise à jour des specs workflows backend pour SQLite
Remplace les références FlatFileDB par SQLiteDB
"""

import os
import re
import glob

# Mappings des remplacements
REPLACEMENTS = {
    # Imports et initialisation
    r"const FlatFileDB = require\(['\"]\.\./lib/flat-file-db['\"]\);": "const SQLiteDB = require('../lib/sqlite-db');",
    r"new FlatFileDB\(__dirname, ['\"]\.\./data['\"]\)": "new SQLiteDB()",
    r"new FlatFileDB\(path\.join\(__dirname, ['\"]\.\./data['\"]\)\)": "new SQLiteDB()",
    
    # Méthodes de recherche
    r"await db\.search\(['\"](\w+)['\"]\)": r"db.search('\1')['data']",
    r"await db\.search\(['\"](\w+)['\"],\s*\{(.*)\}\s*\)": r"db.search('\1', { where: {\2} })['data']",
    
    # Query LokiJS -> SQL
    r"db\.query\(['\"](\w+)['\"]\)\.where\(['\"](\w+)['\"]\)": r"db.query('SELECT * FROM \1 WHERE \2 = ?')",
    r"\.eq\(([^)]+)\)": r"",
    r"\.findOne\(['\"]([^'\"]+)['\"]\)": r"db.read('\1', '$1')",
    
    # Collections YAML -> Tables SQL
    r"collection ['\"](\w+)['\"]\s+\((YAML)\)": r"Table `\1`",
    r"['\"]/(backend/data/|data/)(\w+)/([^'\"]+)\.yml['\"]": r"/sqlite/marki.db`",
    
    # Modèles de données
    r"type: ['\"]contact['\"]": "",
    r"type: ['\"]impaye['\"]": "",
    r"type: ['\"]relance['\"]": "",
    r"type: ['\"]sequence['\"]": "",
    
    # Méthodes CRUD
    r"await db\.create\(['\"](\w+)['\"],": r"db.create('\1',",
    r"await db\.read\(['\"](\w+)['\"],": r"db.read('\1',",
    r"await db\.update\(['\"](\w+)['\"],": r"db.update('\1',",
    r"await db\.delete\(['\"](\w+)['\"],": r"db.delete('\1',",
    
    # Champs spécifiques FlatFile -> SQLite
    r"is_suspended": "is_blacklisted",
    r"impaye_ids": "",
    r"relance_ids": "",
    r"emails\s*:\s*EmailConfig\[\]": "Table `sequences_emails`",
    
    # Documentation
    r"Stockage:\s*`/backend/data/(\w+)/`: "Table SQLite",
    r"Fichier YAML": "Enregistrement SQLite",
    r"Collections? (Parse|flat-file|LokiJS|YAML)": "Tables SQLite",
}

def update_file(filepath):
    """Met à jour un fichier avec les remplacements"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    for pattern, replacement in REPLACEMENTS.items():
        content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ Mis à jour: {filepath}")
        return True
    return False

def main():
    base_dir = "/home/ubuntu/marki/relance/specs/workflows/backend"
    
    # Lister tous les fichiers .md sauf les -test.md et ROUTES.md
    files = [
        f for f in glob.glob(f"{base_dir}/*.md")
        if not f.endswith('-test.md') and 'ROUTES' not in f
    ]
    
    print(f"📁 {len(files)} fichiers à traiter\n")
    
    updated = 0
    for filepath in sorted(files):
        if update_file(filepath):
            updated += 1
    
    print(f"\n✨ {updated} fichiers mis à jour sur {len(files)}")

if __name__ == "__main__":
    main()
