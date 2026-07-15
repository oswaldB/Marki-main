#!/usr/bin/env python3
"""
Met à jour tous les workflows frontend avec les routes API SQLite
"""

import os
import re
import glob

# Dictionnaire des remplacements API
API_ENDPOINTS = {
    # Impayés
    "GET /api/impayes": {
        "pattern": r"GET /api/impayes.*",
        "replacement": "GET /api/impayes?facture_soldee=0&statut=impaye"
    },
    "POST /api/impayes/:id/suspend": {
        "pattern": r"POST /api/(factures|impayes)/:id/suspend",
        "replacement": "POST /api/impayes/:id/suspend"
    },
    "POST /api/impayes/:id/unsuspend": {
        "pattern": r"POST /api/(factures|impayes)/:id/unsuspend",
        "replacement": "POST /api/impayes/:id/unsuspend"
    },
    
    # Contacts
    "GET /api/contacts": {
        "pattern": r"GET /api/contacts.*",
        "replacement": "GET /api/contacts?statut=actif&limit=50"
    },
    "POST /api/contacts/:id/blacklist": {
        "pattern": r"(POST|PUT) /api/contacts/:id/blacklist",
        "replacement": "POST /api/contacts/:id/blacklist"
    },
    "POST /api/contacts/:id/notes": {
        "pattern": r"POST /api/impayes/:id/notes",
        "replacement": "POST /api/contacts/:id/notes"
    },
    
    # Relances
    "GET /api/relances": {
        "pattern": r"GET /api/relances[^/]?",
        "replacement": "GET /api/relances"
    },
    "GET /api/relances/a-valider": {
        "pattern": r"GET /api/relances\?valide=false",
        "replacement": "GET /api/relances/a-valider"
    },
    "POST /api/relances/:id/validate": {
        "pattern": r"(PUT|POST) /api/relances/:id/validate",
        "replacement": "POST /api/relances/:id/validate"
    },
    "POST /api/relances/generate": {
        "pattern": r"POST /api/workflows/generate-relances",
        "replacement": "POST /api/relances/generate"
    },
    "POST /api/emails/send": {
        "pattern": r"POST /api/(workflows/)?send-emails",
        "replacement": "POST /api/emails/send"
    },
    
    # Séquences
    "GET /api/sequences": {
        "pattern": r"GET /api/sequences",
        "replacement": "GET /api/sequences"
    },
    
    # Dashboard
    "GET /api/dashboard/stats": {
        "pattern": r"GET /api/(impayes/stats|dashboard/stats|contacts/stats)",
        "replacement": "GET /api/dashboard/stats"
    },
    
    # Import
    "POST /api/import/invoices": {
        "pattern": r"POST /api/(workflows/)?import-invoices",
        "replacement": "POST /api/import/invoices"
    },
    
    # Auth
    "POST /api/auth/login": {
        "pattern": r"POST /api/auth/login",
        "replacement": "POST /api/auth/login"
    },
}

def update_file(filepath):
    """Met à jour un fichier workflow frontend"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    changes = []
    
    # Ajouter section API Calls si manquante
    if "## API Calls" not in content and "@action" in content:
        # Ajouter section API Calls avant Implementation ou à la fin
        api_section = """
## API Calls

| Méthode | Endpoint | Description |
|---------|----------|-------------|
"""
        if "## Implementation" in content:
            content = content.replace("## Implementation", api_section + "\n## Implementation")
        else:
            content += api_section
        changes.append("Ajout section API Calls")
    
    # Remplacements spécifiques
    for name, config in API_ENDPOINTS.items():
        new_content = re.sub(config["pattern"], config["replacement"], content)
        if new_content != content:
            content = new_content
            changes.append(f"{name}")
    
    # Corriger table collection -> table SQLite
    content = re.sub(r"\| Table \| `\w+` \|", "| Table | SQLite |", content)
    content = re.sub(r"collection ['\"]\w+['\"]", "table SQLite", content)
    
    # Supprimer références à flat-file-db
    content = re.sub(r"flat-file-db|FlatFileDB|LokiJS", "SQLite", content)
    content = re.sub(r"\.yml['\"]|\.yaml['\"]", " (SQLite)", content)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return changes
    return []

def main():
    base_dir = "/home/ubuntu/marki/relance/specs/workflows/frontend"
    
    # Trouver tous les fichiers .md
    files = []
    for root, dirs, filenames in os.walk(base_dir):
        for fname in filenames:
            if fname.endswith('.md'):
                files.append(os.path.join(root, fname))
    
    print(f"📁 {len(files)} fichiers à traiter\n")
    
    updated = 0
    for filepath in sorted(files):
        changes = update_file(filepath)
        if changes:
            print(f"✅ {filepath.replace(base_dir, '')}")
            for c in changes[:3]:  # Limiter l'affichage
                print(f"   → {c}")
            updated += 1
    
    print(f"\n✨ {updated} fichiers mis à jour")

if __name__ == "__main__":
    main()
