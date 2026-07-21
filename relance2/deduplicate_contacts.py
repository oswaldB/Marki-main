#!/usr/bin/env python3
"""
Script de déduplication des contacts
Garder le contact le plus complet et mettre à jour les références
"""

import sqlite3
import os
from datetime import datetime

MARKI_DB = '/home/ubuntu/marki/relance2/app/data/marki.db'

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def get_duplicates(db):
    """Trouve tous les externe_id en double."""
    cursor = db.execute("""
        SELECT externe_id, COUNT(*) as cnt, GROUP_CONCAT(id) as ids
        FROM contacts 
        WHERE externe_id IS NOT NULL 
        GROUP BY externe_id 
        HAVING cnt > 1
        ORDER BY cnt DESC
    """)
    return cursor.fetchall()

def get_contact_details(db, contact_id):
    """Récupère les détails d'un contact pour comparaison."""
    cursor = db.execute("""
        SELECT id, nom, email, telephone, is_blacklisted, 
               (SELECT COUNT(*) FROM impayes WHERE payer_id = contacts.id) as nb_impayes
        FROM contacts WHERE id = ?
    """, (contact_id,))
    return cursor.fetchone()

def choose_best_contact(contacts_list):
    """Choisit le meilleur contact à garder.
    
    Critères:
    1. Plus d'impayés liés
    2. Email renseigné
    3. Téléphone renseigné  
    4. Pas blacklisté
    5. Date de création la plus ancienne (premier importé)
    """
    best = None
    best_score = -1
    
    for contact in contacts_list:
        score = 0
        if contact['nb_impayes'] > 0:
            score += contact['nb_impayes'] * 10  # Priorité aux contacts avec impayés
        if contact['email']:
            score += 5
        if contact['telephone']:
            score += 3
        if not contact['is_blacklisted']:
            score += 2
            
        if score > best_score:
            best_score = score
            best = contact
            
    return best

def merge_and_deduplicate(db, externe_id, contact_ids):
    """Fusionne les contacts en gardant le meilleur."""
    contacts_data = []
    for cid in contact_ids:
        data = get_contact_details(db, cid)
        if data:
            contacts_data.append({
                'id': data[0],
                'nom': data[1],
                'email': data[2],
                'telephone': data[3],
                'is_blacklisted': data[4],
                'nb_impayes': data[5]
            })
    
    if len(contacts_data) < 2:
        return None
        
    # Choisir le meilleur
    best = choose_best_contact(contacts_data)
    to_delete = [c['id'] for c in contacts_data if c['id'] != best['id']]
    
    return {'keep': best['id'], 'delete': to_delete}

def update_references(db, old_id, new_id):
    """Met à jour toutes les références vers le contact supprimé."""
    updates = []
    
    # Mettre à jour impayes
    tables_fk = [
        ('impayes', 'payer_id'),
        ('impayes', 'proprietaire_id'),
        ('impayes', 'apporteur_id'),
        ('impayes', 'contact_relance_id'),
        ('relances', 'contact_id'),
        ('contact_relations', 'contact_source_id'),
        ('contact_relations', 'contact_cible_id'),
    ]
    
    for table, column in tables_fk:
        try:
            cursor = db.execute(f"""
                UPDATE {table} 
                SET {column} = ? 
                WHERE {column} = ?
            """, (new_id, old_id))
            if cursor.rowcount > 0:
                updates.append(f"{table}.{column}: {cursor.rowcount} lignes")
        except Exception as e:
            log(f"WARN: Impossible de mettre à jour {table}.{column}: {e}")
    
    return updates

def main():
    log("=" * 60)
    log("DÉDUPLICATION DES CONTACTS")
    log("=" * 60)
    
    conn = sqlite3.connect(MARKI_DB)
    conn.row_factory = sqlite3.Row
    db = conn.cursor()
    
    # Trouver les doublons
    log("Recherche des doublons...")
    duplicates = get_duplicates(db)
    
    if not duplicates:
        log("Aucun doublon trouvé !")
        conn.close()
        return
    
    log(f"{len(duplicates)} externe_id en double trouvés")
    log("")
    
    total_deleted = 0
    total_merged = 0
    
    for dup in duplicates:
        externe_id = dup['externe_id']
        count = dup['cnt']
        ids = dup['ids'].split(',')
        
        log(f"Traitement externe_id={externe_id} ({count} contacts)")
        
        # Choisir le meilleur et les à supprimer
        result = merge_and_deduplicate(db, externe_id, ids)
        if not result:
            continue
            
        keep_id = result['keep']
        delete_ids = result['delete']
        
        log(f"  → Garder: {keep_id}")
        log(f"  → Supprimer: {delete_ids}")
        
        # Mettre à jour les références pour chaque contact supprimé
        for old_id in delete_ids:
            updates = update_references(db, old_id, keep_id)
            if updates:
                for u in updates:
                    log(f"    Mise à jour: {u}")
            
            # Supprimer le contact
            try:
                db.execute("DELETE FROM contacts WHERE id = ?", (old_id,))
                total_deleted += 1
                log(f"    ✓ Contact {old_id} supprimé")
            except Exception as e:
                log(f"    ✗ Erreur suppression {old_id}: {e}")
        
        total_merged += 1
        conn.commit()
        log("")
    
    conn.close()
    
    log("=" * 60)
    log("RÉSULTAT")
    log("=" * 60)
    log(f"Groupes traités: {total_merged}")
    log(f"Contacts supprimés: {total_deleted}")
    log("Terminé !")

if __name__ == "__main__":
    main()
