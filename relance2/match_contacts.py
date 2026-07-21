#!/usr/bin/env python3
"""
Script de rapprochement entre sync.db et marki.db
Tente de retrouver les externe_id des contacts existants dans marki.db
"""

import sqlite3
import os
from datetime import datetime

SYNC_DB_PATH = '/home/arthur/adti/sync.db'
MARKI_DB_PATH = '/home/ubuntu/marki/relance2/app/data/marki.db'

def normalize_text(text):
    """Normalise un texte pour la comparaison."""
    if not text:
        return ""
    text = text.lower().strip()
    # Supprimer les accents
    import unicodedata
    text = ''.join(c for c in unicodedata.normalize('NFD', text)
                   if unicodedata.category(c) != 'Mn')
    # Supprimer les espaces multiples
    text = ' '.join(text.split())
    return text

def log(level, message):
    timestamp = datetime.now().strftime('%H:%M:%S')
    print(f"[{timestamp}] [{level}] {message}")

def get_sync_contacts():
    """Récupère tous les interlocuteurs de sync.db."""
    conn = sqlite3.connect(SYNC_DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT 
            idInterlocuteur,
            nom,
            prenom,
            email,
            telephoneMobile,
            typePersonne
        FROM _ADN_RG_Interlocuteur
        WHERE dateSup IS NULL
    """)
    
    contacts = []
    for row in cursor.fetchall():
        contacts.append({
            'id': str(row['idInterlocuteur']),
            'nom': row['nom'] or '',
            'prenom': row['prenom'] or '',
            'email': row['email'] or '',
            'telephone': row['telephoneMobile'] or '',
            'type': row['typePersonne'] or 'P'
        })
    
    conn.close()
    return contacts

def get_marki_contacts():
    """Récupère tous les contacts de marki.db sans externe_id."""
    conn = sqlite3.connect(MARKI_DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT 
            id,
            nom,
            prenom,
            email,
            telephone,
            type_personne,
            externe_id
        FROM contacts
    """)
    
    contacts = []
    for row in cursor.fetchall():
        contacts.append({
            'id': row['id'],
            'nom': row['nom'] or '',
            'prenom': row['prenom'] or '',
            'email': row['email'] or '',
            'telephone': row['telephone'] or '',
            'type': row['type_personne'] or 'P',
            'externe_id': row['externe_id']
        })
    
    conn.close()
    return contacts

def find_matches(sync_contacts, marki_contacts):
    """Trouve les correspondances entre les deux listes."""
    matches = []
    unmatched_sync = []
    unmatched_marki = []
    
    # Index pour recherche rapide
    sync_by_email = {}
    sync_by_phone = {}
    sync_by_name = {}
    
    for sc in sync_contacts:
        if sc['email']:
            sync_by_email[sc['email'].lower()] = sc
        if sc['telephone']:
            phone_normalized = sc['telephone'].replace(' ', '').replace('-', '').replace('.', '')
            sync_by_phone[phone_normalized] = sc
        
        nom_key = normalize_text(f"{sc['prenom']} {sc['nom']}")
        if nom_key:
            sync_by_name[nom_key] = sc
    
    marki_matched = set()
    
    for mc in marki_contacts:
        if mc['externe_id']:
            continue  # Déjà lié
        
        best_match = None
        match_score = 0
        match_method = ""
        
        # Méthode 1: Email exact
        if mc['email']:
            email_lower = mc['email'].lower()
            if email_lower in sync_by_email:
                best_match = sync_by_email[email_lower]
                match_score = 100
                match_method = "email_exact"
        
        # Méthode 2: Téléphone exact
        if not best_match and mc['telephone']:
            phone_normalized = mc['telephone'].replace(' ', '').replace('-', '').replace('.', '')
            if phone_normalized in sync_by_phone:
                best_match = sync_by_phone[phone_normalized]
                match_score = 90
                match_method = "telephone_exact"
        
        # Méthode 3: Nom complet exact
        if not best_match:
            nom_key = normalize_text(f"{mc['prenom']} {mc['nom']}")
            if nom_key and nom_key in sync_by_name:
                best_match = sync_by_name[nom_key]
                match_score = 80
                match_method = "nom_complet_exact"
        
        # Méthode 4: Nom + prénom inversés
        if not best_match:
            nom_key_inv = normalize_text(f"{mc['nom']} {mc['prenom']}")
            if nom_key_inv and nom_key_inv in sync_by_name:
                best_match = sync_by_name[nom_key_inv]
                match_score = 75
                match_method = "nom_prenom_inverse"
        
        # Méthode 5: Nom seul (si pas de prénom ou vide)
        if not best_match:
            nom_only = normalize_text(mc['nom'])
            if nom_only:
                for sc in sync_contacts:
                    sc_nom = normalize_text(sc['nom'])
                    if sc_nom == nom_only:
                        # Vérifier si le type correspond
                        if mc['type'] == sc['type']:
                            best_match = sc
                            match_score = 60
                            match_method = "nom_seul_type_match"
                            break
        
        if best_match:
            matches.append({
                'marki_id': mc['id'],
                'marki_nom': f"{mc['prenom']} {mc['nom']}".strip(),
                'sync_id': best_match['id'],
                'sync_nom': f"{best_match['prenom']} {best_match['nom']}".strip(),
                'score': match_score,
                'method': match_method
            })
            marki_matched.add(mc['id'])
        else:
            unmatched_marki.append(mc)
    
    # Trouver les interlocuteurs sync non matchés
    for sc in sync_contacts:
        if not any(m['sync_id'] == sc['id'] for m in matches):
            unmatched_sync.append(sc)
    
    return matches, unmatched_sync, unmatched_marki

def update_externe_ids(matches):
    """Met à jour les externe_id dans marki.db."""
    conn = sqlite3.connect(MARKI_DB_PATH)
    cursor = conn.cursor()
    
    updated = 0
    now = datetime.utcnow().isoformat()
    
    for match in matches:
        try:
            cursor.execute("""
                UPDATE contacts 
                SET externe_id = ?, updated_at = ?
                WHERE id = ?
            """, (match['sync_id'], now, match['marki_id']))
            updated += 1
        except Exception as e:
            log("ERROR", f"Erreur mise à jour {match['marki_id']}: {e}")
    
    conn.commit()
    conn.close()
    return updated

def main():
    import sys
    force_update = '--yes' in sys.argv or '--force' in sys.argv
    
    log("INFO", "=" * 60)
    log("INFO", "RAPPROCHEMENT CONTACTS: sync.db ↔ marki.db")
    log("INFO", "=" * 60)
    
    # Vérifier que les bases existent
    if not os.path.exists(SYNC_DB_PATH):
        log("ERROR", f"Base sync.db introuvable: {SYNC_DB_PATH}")
        return
    
    if not os.path.exists(MARKI_DB_PATH):
        log("ERROR", f"Base marki.db introuvable: {MARKI_DB_PATH}")
        return
    
    log("INFO", f"Sync DB: {SYNC_DB_PATH}")
    log("INFO", f"Marki DB: {MARKI_DB_PATH}")
    log("INFO", "")
    
    # Récupérer les contacts
    log("INFO", "Récupération des interlocuteurs depuis sync.db...")
    sync_contacts = get_sync_contacts()
    log("INFO", f"→ {len(sync_contacts)} interlocuteurs trouvés")
    
    log("INFO", "Récupération des contacts depuis marki.db...")
    marki_contacts = get_marki_contacts()
    marki_without_externe = [c for c in marki_contacts if not c['externe_id']]
    log("INFO", f"→ {len(marki_contacts)} contacts trouvés")
    log("INFO", f"→ {len(marki_without_externe)} sans externe_id")
    log("INFO", "")
    
    # Faire le rapprochement
    log("INFO", "Recherche des correspondances...")
    matches, unmatched_sync, unmatched_marki = find_matches(sync_contacts, marki_contacts)
    
    log("INFO", f"→ {len(matches)} correspondances trouvées")
    log("INFO", f"→ {len(unmatched_sync)} interlocuteurs sync sans correspondance")
    log("INFO", f"→ {len(unmatched_marki)} contacts marki sans correspondance")
    log("INFO", "")
    
    # Afficher les correspondances par méthode
    methods = {}
    for m in matches:
        methods[m['method']] = methods.get(m['method'], 0) + 1
    
    log("INFO", "Répartition des correspondances:")
    for method, count in sorted(methods.items(), key=lambda x: x[1], reverse=True):
        log("INFO", f"  - {method}: {count}")
    log("INFO", "")
    
    # Afficher quelques exemples
    log("INFO", "Exemples de correspondances (top 10):")
    for m in matches[:10]:
        log("INFO", f"  [{m['score']}%] {m['method']}")
        log("INFO", f"       Marki: {m['marki_nom'][:40]:<40} → Sync: {m['sync_nom'][:40]}")
    log("INFO", "")
    
    # Demander confirmation avant mise à jour
    if matches:
        if force_update:
            log("INFO", f"Mode force: mise à jour de {len(matches)} contacts...")
            response = 'o'
        else:
            response = input(f"Voulez-vous mettre à jour {len(matches)} contacts avec leur externe_id? [O/n]: ")
        
        if response.lower() in ['', 'o', 'oui', 'y', 'yes']:
            updated = update_externe_ids(matches)
            log("INFO", f"✓ {updated} contacts mis à jour avec succès!")
        else:
            log("INFO", "Mise à jour annulée.")
    else:
        log("INFO", "Aucune correspondance trouvée.")
    
    log("INFO", "")
    log("INFO", "=" * 60)
    log("INFO", "Terminé!")
    log("INFO", "=" * 60)

if __name__ == "__main__":
    main()
