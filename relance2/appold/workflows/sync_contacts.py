"""
Workflow Backend: Synchronisation des Contacts (sync.db → marki.db)
Met à jour les contacts existants depuis la base externe vers Marki.
"""

import os
import json
import sqlite3
from datetime import datetime
from flask import current_app

# Configuration - Chemin vers la base externe
SYNC_DB_PATH = '/home/arthur/adti/sync.db'


def log(level, message, data=None):
    """Logger structuré pour le workflow."""
    entry = {
        'timestamp': datetime.utcnow().isoformat(),
        'level': level,
        'message': message,
        'data': data or {},
        'workflow': 'sync-contacts'
    }
    print(f"[SYNC-CONTACTS] {level.upper()}: {message}", flush=True)
    return entry


def get_marki_db():
    """Get Marki database connection."""
    db = sqlite3.connect(
        current_app.config['DATABASE'],
        detect_types=sqlite3.PARSE_DECLTYPES
    )
    db.row_factory = sqlite3.Row
    return db


def get_sync_db():
    """Get external sync database connection."""
    if not os.path.exists(SYNC_DB_PATH):
        raise FileNotFoundError(f"Base sync introuvable: {SYNC_DB_PATH}")
    
    db = sqlite3.connect(SYNC_DB_PATH)
    db.row_factory = sqlite3.Row
    return db


def ensure_columns_exist(db):
    """S'assure que les colonnes externe_id et lastSyncAt existent."""
    try:
        cursor = db.execute("PRAGMA table_info(contacts)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if 'externe_id' not in columns:
            db.execute("ALTER TABLE contacts ADD COLUMN externe_id TEXT")
            log('info', 'Colonne externe_id ajoutée à la table contacts')
        
        if 'lastSyncAt' not in columns:
            db.execute("ALTER TABLE contacts ADD COLUMN lastSyncAt TEXT")
            log('info', 'Colonne lastSyncAt ajoutée à la table contacts')
            
        db.commit()
    except Exception as e:
        log('warn', f'Impossible d\'ajouter les colonnes: {str(e)}')


def creer_evenement(db, type_event, titre, description, data=None, icon='fa-sync'):
    """Crée un événement dans la base Marki."""
    try:
        event_id = f"evt_{datetime.utcnow().timestamp()}_{type_event}"
        db.execute("""
            INSERT INTO events (id, type, titre, description, by_marki, created_at, metadata, icon)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            event_id,
            type_event,
            titre,
            description,
            1,  # by_marki = true
            datetime.utcnow().isoformat(),
            json.dumps(data) if data else None,
            icon
        ))
    except Exception as e:
        log('warn', f'Erreur création événement: {str(e)}')


def etape_1_recuperer_interlocuteurs(sync_db, since=None, interlocuteur_id=None):
    """Étape 1: Récupération des Interlocuteurs depuis sync.db."""
    query = """
    SELECT 
        idInterlocuteur,
        typePersonne,
        nom,
        prenom,
        email,
        telephoneMobile,
        titre,
        adresse1,
        codePostal,
        ville,
        dateMaj
    FROM _ADN_RG_Interlocuteur
    WHERE 1=1
    """
    params = []
    
    if interlocuteur_id:
        query += " AND idInterlocuteur = ?"
        params.append(interlocuteur_id)
    
    if since:
        query += " AND (dateMaj >= ? OR dateMaj IS NULL)"
        params.append(since)
    
    query += " LIMIT 10000"
    
    cursor = sync_db.execute(query, params)
    return [dict(row) for row in cursor.fetchall()]


def etape_2_get_existing_contacts(marki_db):
    """Étape 2: Récupération des Contacts existants dans marki.db."""
    try:
        cursor = marki_db.execute("""
            SELECT id, externe_id, email, telephone 
            FROM contacts 
            WHERE externe_id IS NOT NULL
        """)
        
        existing = {}
        for row in cursor.fetchall():
            existing[str(row['externe_id'])] = {
                'id': row['id'],
                'email': row['email'],
                'telephone': row['telephone']
            }
        
        return existing
    except Exception as e:
        log('warn', f'Erreur récupération contacts existants: {str(e)}')
        return {}


def etape_3_sync_contacts(marki_db, interlocuteurs, existing_contacts):
    """Étape 3: Mise à jour des Contacts existants dans marki.db."""
    stats = {'updated': 0, 'failed': 0, 'skipped': 0}
    now = datetime.utcnow().isoformat()
    
    for interloc in interlocuteurs:
        externe_id = str(interloc['idInterlocuteur'])
        
        # Ne traiter que les contacts existants dans marki.db
        if externe_id not in existing_contacts:
            stats['skipped'] += 1
            continue
        
        # Construire le nom complet
        prenom = interloc.get('prenom', '') or ''
        nom = interloc.get('nom', '') or ''
        nom_complet = f"{prenom} {nom}".strip()
        nom_complet = nom_complet.replace('None', '').strip() if 'None' in nom_complet else nom_complet
        
        # Nettoyer les valeurs 'None'
        email = interloc.get('email')
        telephone = interloc.get('telephoneMobile')
        civilite = interloc.get('titre')
        adresse = interloc.get('adresse1')
        code_postal = interloc.get('codePostal')
        ville = interloc.get('ville')
        type_personne = interloc.get('typePersonne')
        
        if email == 'None':
            email = None
        if telephone == 'None':
            telephone = None
        
        try:
            # UPDATE uniquement - pas de création
            marki_db.execute("""
                UPDATE contacts SET
                    nom = COALESCE(?, nom),
                    prenom = COALESCE(?, prenom),
                    email = COALESCE(?, email),
                    telephone = COALESCE(?, telephone),
                    type_personne = COALESCE(?, type_personne),
                    civilite = COALESCE(?, civilite),
                    adresse_rue = COALESCE(?, adresse_rue),
                    adresse_code_postal = COALESCE(?, adresse_code_postal),
                    adresse_ville = COALESCE(?, adresse_ville),
                    lastSyncAt = ?,
                    updated_at = ?
                WHERE externe_id = ?
            """, (
                nom_complet if nom_complet else None,
                prenom if prenom else None,
                email,
                telephone,
                type_personne,
                civilite,
                adresse,
                code_postal,
                ville,
                now,
                now,
                externe_id
            ))
            stats['updated'] += 1
                
        except Exception as e:
            log('error', f"Erreur mise à jour interlocuteur {externe_id}: {str(e)}")
            stats['failed'] += 1
    
    return stats


def etape_5_sync_relations(marki_db, sync_db):
    """Étape 5: Synchronisation des relations interlocuteur-contact (personne-entreprise)."""
    stats = {'created': 0, 'updated': 0, 'skipped': 0, 'failed': 0, 'contacts_created': 0}
    now = datetime.utcnow().isoformat()
    
    log('info', 'Récupération des relations depuis sync.db')
    
    # Récupérer toutes les relations depuis sync.db
    cursor = sync_db.execute("""
        SELECT 
            idRelInterlocuteurContact,
            idInterlocuteur,
            idContact,
            fonction,
            typeContact,
            isDefaut,
            dateFin
        FROM _ADN_RG_RelInterlocuteurContact
        WHERE dateFin IS NULL OR dateFin = ''
        LIMIT 50000
    """)
    relations = cursor.fetchall()
    log('info', f'{len(relations)} relations trouvées dans sync.db')
    
    if len(relations) == 0:
        return stats
    
    # Récupérer le mapping externe_id -> contact_id
    cursor = marki_db.execute("SELECT id, externe_id FROM contacts WHERE externe_id IS NOT NULL")
    externe_to_id = {str(row['externe_id']): row['id'] for row in cursor.fetchall()}
    log('info', f'{len(externe_to_id)} contacts avec externe_id dans marki.db')
    
    # Identifier les contacts manquants nécessaires pour les relations
    all_needed_ids = set()
    for rel in relations:
        all_needed_ids.add(str(rel['idInterlocuteur']))
        all_needed_ids.add(str(rel['idContact']))
    
    missing_ids = all_needed_ids - set(externe_to_id.keys())
    log('info', f'{len(missing_ids)} contacts manquants à créer pour les relations')
    
    # Créer les contacts manquants
    if missing_ids:
        placeholders = ','.join(['?' for _ in missing_ids])
        cursor = sync_db.execute(f"""
            SELECT 
                idInterlocuteur,
                typePersonne,
                nom,
                prenom,
                email,
                telephoneMobile
            FROM _ADN_RG_Interlocuteur
            WHERE idInterlocuteur IN ({placeholders})
        """, list(missing_ids))
        
        for interloc in cursor.fetchall():
            externe_id = str(interloc['idInterlocuteur'])
            contact_id = f"cont_{externe_id}"
            
            prenom = interloc['prenom'] or ''
            nom = interloc['nom'] or ''
            nom_complet = f"{prenom} {nom}".strip()
            
            try:
                marki_db.execute("""
                    INSERT INTO contacts (id, nom, prenom, email, telephone, type_personne, statut, externe_id, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    contact_id,
                    nom_complet,
                    prenom if prenom else None,
                    interloc['email'],
                    interloc['telephoneMobile'],
                    interloc['typePersonne'] or 'P',
                    'actif',
                    externe_id,
                    now,
                    now
                ))
                externe_to_id[externe_id] = contact_id
                stats['contacts_created'] += 1
            except Exception as e:
                log('error', f"Erreur création contact manquant {externe_id}: {e}")
    
    log('info', f"Création de {stats['contacts_created']} contacts pour les relations")
    
    for rel in relations:
        id_interlocuteur = str(rel['idInterlocuteur'])
        id_contact = str(rel['idContact'])
        
        # Vérifier que les deux contacts existent maintenant
        if id_interlocuteur not in externe_to_id or id_contact not in externe_to_id:
            stats['skipped'] += 1
            continue
        
        contact_source_id = externe_to_id[id_interlocuteur]
        contact_cible_id = externe_to_id[id_contact]
        
        # Mapper la fonction vers un type de relation
        fonction = rel['fonction'] or rel['typeContact'] or 'contact'
        type_relation = mapper_fonction_to_type(fonction)
        
        try:
            # Vérifier si la relation existe déjà
            existing = marki_db.execute("""
                SELECT id FROM contact_relations 
                WHERE contact_source_id = ? AND contact_cible_id = ? AND type_relation = ?
            """, (contact_source_id, contact_cible_id, type_relation)).fetchone()
            
            if existing:
                # Mettre à jour la date
                marki_db.execute("""
                    UPDATE contact_relations 
                    SET updated_at = ?, est_actif = 1
                    WHERE id = ?
                """, (now, existing['id']))
                stats['updated'] += 1
            else:
                # Créer la relation
                relation_id = f"rel_{datetime.utcnow().timestamp()}_{contact_source_id[:8]}"
                marki_db.execute("""
                    INSERT INTO contact_relations (
                        id, contact_source_id, contact_cible_id, type_relation,
                        est_actif, notes, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, 1, ?, ?, ?)
                """, (
                    relation_id,
                    contact_source_id,
                    contact_cible_id,
                    type_relation,
                    f"Importé depuis sync.db - {fonction}",
                    now,
                    now
                ))
                stats['created'] += 1
                
        except Exception as e:
            log('error', f"Erreur création relation {id_interlocuteur}->{id_contact}: {str(e)}")
            stats['failed'] += 1
    
    log('info', f"Relations: {stats['created']} créées, {stats['updated']} mises à jour, {stats['skipped']} ignorées, {stats['failed']} échecs")
    return stats


def mapper_fonction_to_type(fonction):
    """Mappe une fonction/fonction sync.db vers un type de relation Marki."""
    if not fonction:
        return 'contact'
    
    fonction_lower = fonction.lower()
    
    mapping = {
        'dg': ['dg', 'directeur general', 'directrice generale', 'dg ', 'pdg'],
        'directeur_financier': ['directeur financier', 'directrice financiere', 'daf', 'dfc'],
        'responsable_comptable': ['comptable', 'compta', 'responsable comptable'],
        'responsable_paie': ['paie', 'paye', 'responsable paie'],
        'tresorier': ['tresorier', 'tresoriere', 'treso'],
        'employe': ['employe', 'employee', 'salarié', 'salariée', 'agent'],
        'gerant': ['gerant', 'gerante', 'gérant', 'gérante'],
        'president': ['president', 'presidente', 'président', 'présidente'],
        'contact_facturation': ['facturation', 'facture', 'comptable facturation'],
        'administrateur': ['administrateur', 'administratrice'],
        'associe': ['associe', 'associée', 'associé', 'partenaire'],
    }
    
    for type_relation, keywords in mapping.items():
        if any(keyword in fonction_lower for keyword in keywords):
            return type_relation
    
    return 'contact'


def etape_4_logger_resultat(marki_db, stats, duration_ms, relation_stats=None):
    """Étape 4: Logging du résultat dans events."""
    total = stats['updated']
    skipped = stats.get('skipped', 0)
    
    description = f"{total} contacts mis à jour, {skipped} ignorés (non existants)"
    if relation_stats:
        description += f". {relation_stats['created']} relations créées, {relation_stats['updated']} mises à jour."
    
    metadata = {
        'updated': stats['updated'],
        'failed': stats['failed'],
        'skipped': skipped,
        'duration_ms': duration_ms
    }
    
    if relation_stats:
        metadata['relations'] = relation_stats
    
    creer_evenement(
        marki_db,
        'sync',
        f"Synchronisation contacts terminée",
        description,
        metadata,
        'fa-sync'
    )


def sync_contacts_master(since=None, interlocuteur_id=None):
    """
    Méga-fonction de synchronisation des contacts.
    Met à jour uniquement les contacts existants (pas de création).
    
    @checkpoint sync-start
    @checkpoint step-1-complete
    @checkpoint step-2-complete
    @checkpoint step-3-complete
    @checkpoint step-4-complete
    @checkpoint sync-complete
    """
    stats = {
        'interlocuteurs_loaded': 0,
        'contacts_updated': 0,
        'contacts_failed': 0,
        'contacts_skipped': 0,
        'errors': []
    }
    
    start_time = datetime.utcnow()
    marki_db = None
    sync_db = None
    
    try:
        # @checkpoint sync-start
        log('info', 'Démarrage synchronisation contacts')
        
        marki_db = get_marki_db()
        sync_db = get_sync_db()
        
        # S'assurer que les colonnes existent
        ensure_columns_exist(marki_db)
        
        # Étape 1: Récupération des interlocuteurs
        log('info', 'Étape 1: Récupération des interlocuteurs')
        interlocuteurs = etape_1_recuperer_interlocuteurs(sync_db, since, interlocuteur_id)
        stats['interlocuteurs_loaded'] = len(interlocuteurs)
        log('info', f'{len(interlocuteurs)} interlocuteurs à synchroniser')
        
        if len(interlocuteurs) == 0:
            return {
                'success': True,
                'stats': stats,
                'message': 'Aucun interlocuteur à synchroniser'
            }
        
        # Étape 2: Récupération des contacts existants
        log('info', 'Étape 2: Récupération des contacts existants')
        existing = etape_2_get_existing_contacts(marki_db)
        log('info', f'{len(existing)} contacts existants dans marki.db')
        
        # @checkpoint step-1-complete
        # @checkpoint step-2-complete
        
        # Étape 3: Mise à jour des contacts existants uniquement
        log('info', 'Étape 3: Mise à jour des contacts existants')
        sync_stats = etape_3_sync_contacts(marki_db, interlocuteurs, existing)
        stats['contacts_updated'] = sync_stats['updated']
        stats['contacts_failed'] = sync_stats['failed']
        stats['contacts_skipped'] = sync_stats['skipped']
        log('info', f"{sync_stats['updated']} mis à jour, {sync_stats['skipped']} ignorés, {sync_stats['failed']} échecs")
        
        # Commit des transactions
        marki_db.commit()
        
        # @checkpoint step-3-complete
        
        # Étape 4: Synchronisation des relations (personne-entreprise)
        log('info', 'Étape 4: Synchronisation des relations')
        relation_stats = etape_5_sync_relations(marki_db, sync_db)
        marki_db.commit()
        
        # @checkpoint step-4-complete
        
        # Étape 5: Logging final
        duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        log('info', 'Étape 5: Logging du résultat')
        
        # Construire les stats pour le logging
        contact_stats = {
            'updated': stats['contacts_updated'],
            'failed': stats['contacts_failed'],
            'skipped': stats['contacts_skipped']
        }
        etape_4_logger_resultat(marki_db, contact_stats, duration_ms, relation_stats)
        marki_db.commit()
        
        # @checkpoint step-5-complete
        # @checkpoint sync-complete
        
        # Ajouter les stats de relations au résultat
        stats['relations_created'] = relation_stats['created']
        stats['relations_updated'] = relation_stats['updated']
        
        log('info', 'Synchronisation terminée avec succès', {'duration_ms': duration_ms})
        
        return {
            'success': True,
            'stats': stats,
            'duration_ms': duration_ms
        }
        
    except Exception as e:
        log('error', f'Erreur lors de la synchronisation: {str(e)}')
        stats['errors'].append(str(e))
        return {
            'success': False,
            'stats': stats,
            'error': str(e)
        }
    finally:
        if marki_db:
            marki_db.close()
        if sync_db:
            sync_db.close()
