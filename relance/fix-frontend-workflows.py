#!/usr/bin/env python3
"""
Corrige les workflows frontend restants avec les bonnes routes SQLite
"""

import os
import re
import glob

def fix_file(filepath):
    """Corrige un fichier workflow"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    changes = []
    
    # Remplacements spécifiques
    replacements = [
        # API endpoints
        (r'PUT /api/impayes/:id\s*\n.*"is_suspended": true', 
         'POST /api/impayes/:id/suspend\n\n**Payload:**\n```json\n{\n  "motif": "Client en vacances"\n}```'),
        
        (r'PUT /api/impayes/:id\s*\n.*"is_suspended": false', 
         'POST /api/impayes/:id/unsuspend'),
        
        (r'PUT /api/relances/:id\s*\n.*"valide": true', 
         'POST /api/relances/:id/validate'),
        
        (r'PUT /api/contacts/:id\s*\n.*"is_blacklisted":', 
         'POST /api/contacts/:id/blacklist'),
        
        # Champs is_suspended -> is_blacklisted
        (r'`is_suspended`', '`is_blacklisted`'),
        (r'`suspension_date`', '`blacklist_date`'),
        (r'`suspension_motif`', '`blacklist_motif`'),
        (r'is_suspended\s*←\s*`?true`?', 'is_blacklisted ← `1`'),
        (r'is_suspended\s*←\s*`?false`?', 'is_blacklisted ← `0`'),
        
        # Collections YAML -> SQLite
        (r'collection [`\']?(\w+)[`\']?', r'table `\1` (SQLite)'),
        (r'Fichier YAML', 'Table SQLite'),
        (r'\.yml[`\']?', ' (SQLite)'),
        
        # flat-file-db -> SQLite
        (r'flat-file-db|FlatFileDB|LokiJS', 'SQLite'),
    ]
    
    for pattern, replacement in replacements:
        new_content = re.sub(pattern, replacement, content, flags=re.MULTILINE | re.IGNORECASE)
        if new_content != content:
            content = new_content
            changes.append(f"{pattern[:30]}... -> {replacement[:30]}")
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return changes
    return []

def main():
    base_dir = "/home/ubuntu/marki/relance/specs/workflows/frontend"
    
    files = []
    for root, dirs, filenames in os.walk(base_dir):
        for fname in filenames:
            if fname.endswith('.md'):
                files.append(os.path.join(root, fname))
    
    print(f"📁 {len(files)} fichiers à traiter\n")
    
    updated = 0
    for filepath in sorted(files):
        changes = fix_file(filepath)
        if changes:
            print(f"✅ {filepath.replace(base_dir, '')}")
            updated += 1
    
    print(f"\n✨ {updated} fichiers mis à jour")

if __name__ == "__main__":
    main()
