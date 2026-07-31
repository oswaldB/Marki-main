#!/usr/bin/env python3
"""
Importe les personnes morales manquantes qui ont des relations avec des contacts existants.
"""

import sqlite3
import os
from datetime import datetime

MARKI_DB = '/home/ubuntu/marki/relance2/app/data/marki.db'
SYNC_DB = '/home/arthur/adti/sync.db'

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def main():
    log("=" * 60)
    log("IMPORT DES SOCIÉTÉS MANQUANTES AVEC RELATIONS")
    log("=" * 60)
    
    # Connexions
    marki_conn = sqlite3.connect(MARKI_DB)
    marki_conn.row_factory = sqlite3.Row
    marki_db = marki_conn.cursor()
    
    sync_conn = sqlite3.connect(SYNC_DB)
    sync_conn.row_factory = sqlite3.Row
    sync_db = sync_conn.cursor()
    
    # 1. Trouver tous les externe_id des contacts existants dans marki.db
    log("Récupération des contacts existants...")
    existing_externe_ids = set()
    for row in marki_db.execute("SELECT externe_id FROM contacts WHERE externe_id IS NOT NULL"):
        existing_externe_ids.add(str(row['externe_id']))
    log(f"{len(existing_externe_ids)} contacts existants dans marki.db")
    
    # 2. Trouver les relations dans sync.db où une personne physique existe dans marki.db
    # mais où la personne morale (ou l'autre contact) n'existe pas
    log("Recherche des relations avec sociétés manquantes...")
    relations = sync_db.execute("""
        SELECT r.idInterlocuteur as source_id, r.idContact as cible_id,
               r.fonction, r.typeContact, r.isDefaut,
               ils.typePersonne as source_type, ils.nom as source_nom, ils.prenom as source_prenom,
               ils.email as source_email, ils.telephoneMobile as source_tel,
               ilc.typePersonne as cible_type, ilc.nom as cible_nom, ilc.prenom as cible_prenom,
               ilc.email as cible_email, ilc.telephoneMobile as cible_tel
        FROM _ADN_RG_RelInterlocuteurContact r
        JOIN _ADN_RG_Interlocuteur ils ON ils.idInterlocuteur = r.idInterlocuteur
        JOIN _ADN_RG_Interlocuteur ilc ON ilc.idInterlocuteur = r.idContact
        WHERE (r.dateFin IS NULL OR r.dateFin = '')
    """).fetchall()
    
    log(f"{len(relations)} relations trouvées dans sync.db")
    
    # 3. Identifier les sociétés manquantes
    missing_companies = {}  # externe_id -> company_data
    relations_to_create = []
    
    for rel in relations:
        source_id = str(rel['source_id'])
        cible_id = str(rel['cible_id'])
        
        source_exists = source_id in existing_externe_ids
        cible_exists = cible_id in existing_externe_ids
        
        # Si source existe mais pas cible, et cible est une personne morale
        if source_exists and not cible_exists and rel['cible_type'] == 'M':
            if cible_id not in missing_companies:
                missing_companies[cible_id] = {
                    'nom': rel['cible_nom'],
                    'prenom': rel['cible_prenom'],
                    'email': rel['cible_email'],
                    'telephone': rel['cible_tel'],
                    'type_personne': 'M'
                }
            relations_to_create.append({
                'source_externe': source_id,
                'cible_externe': cible_id,
                'type_relation': rel['typeContact'] or rel['fonction'] or 'lien',
                'is_defaut': rel['isDefaut'] or 0
            })
        
        # Si cible existe mais pas source, et source est une personne morale
        if cible_exists and not source_exists and rel['source_type'] == 'M':
            if source_id not in missing_companies:
                missing_companies[source_id] = {
                    'nom': rel['source_nom'],
                    'prenom': rel['source_prenom'],
                    'email': rel['source_email'],
                    'telephone': rel['source_tel'],
                    'type_personne': 'M'
                }
            relations_to_create.append({
                'source_externe': cible_id,  # Inversé car on crée la relation dans l'autre sens
                'cible_externe': source_id,
                'type_relation': rel['typeContact'] or rel['fonction'] or 'lien',
                'is_defaut': rel['isDefaut'] or 0
            })
    
    log(f"{len(missing_companies)} sociétés manquantes à créer")
    log(f"{len(relations_to_create)} relations à créer")
    
    # 4. Créer les sociétés manquantes
    created_companies = 0
    now = datetime.utcnow().isoformat()
    
    for externe_id, company in missing_companies.items():
        contact_id = f"cont_{externe_id}"
        nom_complet = f"{company['prenom'] or ''} {company['nom'] or ''}".strip()
        
        try:
            marki_db.execute("""
                INSERT INTO contacts (id, nom, prenom, email, telephone, type_personne, statut, externe_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                contact_id, nom_complet, company['prenom'], company['email'], company['telephone'],
                'M', 'actif', externe_id, now, now
            ))
            created_companies += 1
            log(f"✓ Société créée: {nom_complet} (externe_id={externe_id})")
        except Exception as e:
            log(f"✗ Erreur création {nom_complet}: {e}")
    
    marki_conn.commit()
    
    # 5. Rafraîchir la mapping externe_id -> id interne
    externe_to_id = {}
    for row in marki_db.execute("SELECT id, externe_id FROM contacts WHERE externe_id IS NOT NULL"):
        externe_to_id[str(row['externe_id'])] = row['id']
    
    # 6. Créer les relations
    created_relations = 0
    for rel in relations_to_create:
        source_id = externe_to_id.get(rel['source_externe'])
        cible_id = externe_to_id.get(rel['cible_externe'])
        
        if not source_id or not cible_id:
            continue
        
        # Vérifier si la relation existe déjà
        existing = marki_db.execute("""
            SELECT id FROM contact_relations 
            WHERE contact_source_id = ? AND contact_cible_id = ? AND type_relation = ?
        """, (source_id, cible_id, rel['type_relation'])).fetchone()
        
        if existing:
            continue
        
        try:
            rel_id = f"rel_{datetime.utcnow().timestamp()}_{source_id[:8]}_{cible_id[:8]}"
            marki_db.execute("""
                INSERT INTO contact_relations (id, contact_source_id, contact_cible_id, type_relation, est_actif, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (rel_id, source_id, cible_id, rel['type_relation'], 1, now, now))
            created_relations += 1
        except Exception as e:
            log(f"✗ Erreur création relation: {e}")
    
    marki_conn.commit()
    
    # Résumé
    log("")
    log("=" * 60)
    log("RÉSULTAT")
    log("=" * 60)
    log(f"Sociétés créées: {created_companies}")
    log(f"Relations créées: {created_relations}")
    
    marki_conn.close()
    sync_conn.close()
    
    log("Terminé !")

if __name__ == "__main__":
    main()
