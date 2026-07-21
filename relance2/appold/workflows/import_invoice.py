"""
Workflow Backend: Import des Factures (Invoice)
Importe les factures depuis la base SQLite externe vers Marki.
"""

import os
import json
import sqlite3
from datetime import datetime
from flask import current_app

# Configuration - Chemin configurable via variable d'environnement
SYNC_DB_PATH = os.environ.get('SYNC_DB_PATH', '/home/arthur/adti/sync.db')

# Mois en français pour construction URL PDF
MOIS_FR = [
    "janvier", "fevrier", "mars", "avril", "mai", "juin",
    "juillet", "aout", "septembre", "octobre", "novembre", "decembre"
]


def build_url_pdf(ref_piece, date_cre):
    """Construit l'URL du PDF sur le SFTP à partir de la référence et de la date.
    
    Format: /ADN/Reporting/Gco/Piece/{annee}/{mois}/{ref_propre}/standard/{ref} (GCO PI FA).pdf
    """
    if not ref_piece or not date_cre:
        return None
    try:
        d = datetime.fromisoformat(str(date_cre).replace('Z', '+00:00'))
    except (ValueError, TypeError):
        try:
            d = datetime.strptime(str(date_cre), '%Y-%m-%d')
        except (ValueError, TypeError):
            return None
    
    if d.year < 2000 or d.year > 2100:
        return None
    
    year = d.year
    month = MOIS_FR[d.month - 1]
    ref_clean = str(ref_piece).replace(' ', '_').replace('\t', '_')
    
    return f"/ADN/Reporting/Gco/Piece/{year}/{month}/{ref_clean}/standard/{ref_piece} (GCO PI FA).pdf"


def log(level, message, data=None):
    """Logger structuré pour le workflow."""
    entry = {
        'timestamp': datetime.utcnow().isoformat(),
        'level': level,
        'message': message,
        'data': data or {},
        'workflow': 'import-invoice'
    }
    print(f"[IMPORT] {level.upper()}: {message}", flush=True)
    return entry


def creer_evenement(db, type_event, titre, description, data=None, icon='fa-bell', entity_type=None, entity_id=None):
    """Crée un événement dans la base Marki (par Marki, pas par un utilisateur)."""
    try:
        event_id = f"evt_{datetime.utcnow().timestamp()}_{type_event}"
        print(f"[IMPORT] Création événement: type={type_event}, titre={titre}, entity={entity_type}:{entity_id}")
        db.execute("""
            INSERT INTO events (id, type, titre, description, by_marki, created_at, metadata, icon, entity_type, entity_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            event_id,
            type_event,
            titre,
            description,
            1,  # by_marki = true (1 en SQLite)
            datetime.utcnow().isoformat(),
            json.dumps(data) if data else None,
            icon,
            entity_type,
            entity_id
        ))
        print(f"[IMPORT] Événement créé avec succès: {event_id}")
    except Exception as e:
        log('warn', f'Erreur création événement: {str(e)}')
        print(f"[IMPORT] ERREUR création événement: {str(e)}")


def get_db():
    """Get Marki database connection."""
    import sqlite3
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


def import_invoices_master():
    """
    Méga-fonction d'import des factures.
    Orchestrer 7 étapes séquentielles.
    
    @checkpoint import-start
    @checkpoint step-1-complete
    @checkpoint step-2-complete
    @checkpoint step-3-complete
    @checkpoint step-4-complete
    @checkpoint step-5-complete
    @checkpoint step-6-complete
    @checkpoint step-7-complete
    @checkpoint import-complete
    """
    stats = {
        'pieces_count': 0,
        'contacts_created': 0,
        'contacts_updated': 0,
        'relations_created': 0,
        'relations_updated': 0,
        'impayes_created': 0,
        'impayes_updated': 0,
        'sequences_attribuees': 0,
        'relances_generees': 0,
        'errors': []
    }
    
    start_time = datetime.utcnow()
    
    try:
        # @checkpoint import-start
        log('info', 'Démarrage import des factures')
        
        db = get_db()
        sync_db = get_sync_db()
        
        # Étape 1: Récupération des Pièces et Dossiers
        log('info', 'Étape 1: Récupération des pièces')
        pieces = etape_1_recuperer_pieces(sync_db)
        stats['pieces_count'] = len(pieces)
        log('info', f'{len(pieces)} pièces récupérées')
        
        # Étape 2: Récupération des Statuts
        log('info', 'Étape 2: Récupération des statuts')
        statuts = etape_2_recuperer_statuts(sync_db)
        log('info', f'{len(statuts)} statuts récupérés')
        
        # Étape 3: Récupération des Employés
        log('info', 'Étape 3: Récupération des employés')
        employes = etape_3_recuperer_employes(sync_db)
        log('info', f'{len(employes)} employés récupérés')
        
        # Étape 4: Récupération des Interlocuteurs et Création des Contacts
        log('info', 'Étape 4: Création/mise à jour des contacts et relations')
        contacts_result = etape_4_creer_contacts(sync_db, db, pieces)
        stats['contacts_created'] = contacts_result['created']
        stats['contacts_updated'] = contacts_result['updated']
        stats['relations_created'] = contacts_result.get('relations_created', 0)
        stats['relations_updated'] = contacts_result.get('relations_updated', 0)
        log('info', f"{contacts_result['created']} contacts créés, {contacts_result['updated']} mis à jour, "
             f"{contacts_result.get('relations_created', 0)} relations créées, {contacts_result.get('relations_updated', 0)} mises à jour")
        
        # Étape 5: Traitement et Sauvegarde des Impayés
        log('info', 'Étape 5: Création/mise à jour des impayés')
        impayes_result = etape_5_creer_impayes(db, pieces, statuts, contacts_result.get('dossier_contacts', {}))
        stats['impayes_created'] = impayes_result['created']
        stats['impayes_updated'] = impayes_result['updated']
        log('info', f'{impayes_result["created"]} impayés créés, {impayes_result["updated"]} mis à jour')
        
        # Étape 6: Attribution des Séquences
        log('info', 'Étape 6: Attribution des séquences')
        # TODO: Appeler le workflow backend de séquences quand il sera créé
        # sequences_result = etape_6_attribuer_sequences(db)
        # stats['sequences_attribuees'] = sequences_result['count']
        log('info', 'Étape 6: Attribution des séquences - TODO (workflow backend à créer)')
        
        # Étape 7: Génération des Relances
        log('info', 'Étape 7: Génération des relances')
        # TODO: Appeler le workflow backend de génération de relances quand il sera créé
        # relances_result = etape_7_generer_relances(db)
        # stats['relances_generees'] = relances_result['count']
        log('info', 'Étape 7: Génération des relances - TODO (workflow backend à créer)')
        
        db.commit()
        sync_db.close()
        
        # Événement final: synchronisation terminée
        relations_str = ""
        if stats.get('relations_created') or stats.get('relations_updated'):
            relations_str = f", {stats['relations_created']} relations créées, {stats['relations_updated']} mises à jour"
        
        creer_evenement(db, 'sync',
            "Synchronisation terminée",
            f"Import terminé: {stats['pieces_count']} factures, {stats['impayes_created']} créées, {stats['impayes_updated']} mises à jour, {stats.get('payees', 0)} réglées{relations_str}",
            stats,
            'fa-check-circle'
        )
        
        duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        
        # @checkpoint import-complete
        log('info', 'Import terminé avec succès', {'duration_ms': duration_ms})
        
        return {
            'success': True,
            'stats': stats,
            'duration_ms': duration_ms
        }
        
    except Exception as e:
        log('error', f'Erreur lors de l\'import: {str(e)}')
        stats['errors'].append(str(e))
        return {
            'success': False,
            'stats': stats,
            'error': str(e)
        }


def etape_1_recuperer_pieces(sync_db):
    """Étape 1: Récupération des Pièces et Dossiers."""
    query = """
    SELECT
      p.idpiece,
      p.nfacture,
      p.datecre,
      p.datepiece,
      p.dateecheance,
      p.totalhtnet,
      p.totalttcnet,
      p.resteapayer,
      p.facturesoldee,
      p.commentaire as commentaire_piece,
      p.refpiece,
      pm.idmetier as dossier_id,
      d.idDossier,
      d.idStatut,
      d.contactPlace,
      d.reference,
      d.referenceExterne,
      d.numero,
      d.idEmployeIntervention,
      d.commentaire as commentaire_dossier,
      d.adresse,
      d.cptAdresse,
      d.codePostal,
      d.ville,
      d.numeroLot,
      d.etage,
      d.entree,
      d.escalier,
      d.porte,
      d.numVoie,
      d.cptNumVoie,
      d.typeVoie,
      d.dateDebutMission,
      d.idCadreMission,
      (
        SELECT json_group_array(
          json_object(
            'idMission', m.idMission,
            'idCategorieMission', m.idCategorieMission,
            'intitule', m.intitule
          )
        )
        FROM _ADN_DIAG__Mission m
        WHERE m.idDossier = d.idDossier
      ) as missions_json
    FROM _GCO__GcoPiece p
    LEFT JOIN _GCO__GcoPieceMetier pm ON p.idpiece = pm.idpiece
    LEFT JOIN _ADN_DIAG__Dossier d ON pm.idmetier = d.idDossier
    WHERE p.nfacture IS NOT NULL
      AND p.datemaj >= datetime('now', '-10 days')
      AND p.resteapayer >= 0
      AND p.valide = 1
    ORDER BY p.datepiece DESC
    """
    
    cursor = sync_db.execute(query)
    return [dict(row) for row in cursor.fetchall()]


def etape_2_recuperer_statuts(sync_db):
    """Étape 2: Récupération des Statuts."""
    query = "SELECT idStatut, intitule FROM _ADN_DIAG__StatutDossier"
    cursor = sync_db.execute(query)
    return {row['idStatut']: row['intitule'] for row in cursor.fetchall()}


def etape_3_recuperer_employes(sync_db):
    """Étape 3: Récupération des Employés."""
    query = "SELECT idEmploye, prenom, nom FROM _ADN_RG_Employe"
    cursor = sync_db.execute(query)
    return {row['idEmploye']: f"{row['prenom']} {row['nom']}" for row in cursor.fetchall()}


def etape_4_creer_contacts(sync_db, db, pieces):
    """Étape 4: Récupération des Interlocuteurs et Création des Contacts avec Relations.
    
    Retourne:
        dict: {'created': int, 'updated': int, 'dossier_contacts': {dossier_id: {role: contact_id}}, 
               'relations_created': int, 'relations_updated': int}
    """
    result = {'created': 0, 'updated': 0, 'dossier_contacts': {}, 'relations_created': 0, 'relations_updated': 0}
    
    # Récupérer les IDs de dossier uniques
    dossier_ids = list(set([p['idDossier'] for p in pieces if p.get('idDossier')]))
    
    log('info', f"Étape 4: {len(dossier_ids)} dossiers à traiter pour les contacts")
    
    if not dossier_ids:
        return result
    
    # Récupérer les interlocuteurs
    placeholders = ','.join(['?' for _ in dossier_ids])
    query = f"""
    SELECT
      d.idDossier,
      di.idRole,
      di.idInterlocuteur as interlocuteur_id,
      iloc.typePersonne,
      iloc.nom,
      iloc.prenom,
      iloc.email,
      iloc.telephoneMobile as telephone,
      role.intitule as role
    FROM _ADN_DIAG__Dossier d
    LEFT JOIN _ADN_DIAG__DossierInterlocuteur di ON d.idDossier = di.idDossier
    LEFT JOIN _ADN_RG_Interlocuteur iloc ON di.idInterlocuteur = iloc.idInterlocuteur
    LEFT JOIN _ADN_DIAG__RoleInterlocuteurDossier role ON di.idRole = role.idRole
    WHERE d.idDossier IN ({placeholders})
    """
    
    cursor = sync_db.execute(query, dossier_ids)
    interlocuteurs = [dict(row) for row in cursor.fetchall()]
    
    # Collecter les IDs des interlocuteurs pour récupérer leurs relations
    interlocuteur_ids = list(set([i['interlocuteur_id'] for i in interlocuteurs if i.get('interlocuteur_id')]))
    
    # Récupérer les relations entre interlocuteurs (personne-entreprise)
    relations_map = {}
    if interlocuteur_ids:
        relations_placeholders = ','.join(['?' for _ in interlocuteur_ids])
        rel_query = f"""
        SELECT
            r.idInterlocuteur as source_id,
            r.idContact as cible_id,
            r.fonction,
            r.typeContact,
            r.isDefaut
        FROM _ADN_RG_RelInterlocuteurContact r
        WHERE r.idInterlocuteur IN ({relations_placeholders})
          AND (r.dateFin IS NULL OR r.dateFin = '')
        """
        rel_cursor = sync_db.execute(rel_query, interlocuteur_ids)
        for row in rel_cursor.fetchall():
            source_id = row['source_id']
            if source_id not in relations_map:
                relations_map[source_id] = []
            relations_map[source_id].append(dict(row))
    
    # Créer/mettre à jour les contacts
    created_contact_ids = set()  # Pour tracker les contacts créés (pour les relations)
    
    for interloc in interlocuteurs:
        if not interloc.get('interlocuteur_id'):
            continue
        
        contact_id = f"cont_{interloc['interlocuteur_id']}"
        externe_id = str(interloc['interlocuteur_id'])
        
        # Vérifier si existe par ID ou par externe_id (évite les doublons)
        existing = db.execute(
            'SELECT id FROM contacts WHERE id = ? OR externe_id = ?',
            (contact_id, externe_id)
        ).fetchone()
        
        # Si existe déjà avec un autre ID mais même externe_id, utiliser l'existant
        if existing and existing['id'] != contact_id:
            contact_id = existing['id']
            existing = db.execute('SELECT id FROM contacts WHERE id = ?', (contact_id,)).fetchone()
        
        # Construire le nom en nettoyant les "None"
        prenom = interloc.get('prenom', '') or ''
        nom = interloc.get('nom', '') or ''
        nom_complet = f"{prenom} {nom}".strip()
        nom_complet = nom_complet.replace('None', '').strip()
        
        contact_data = {
            'id': contact_id,
            'nom': nom_complet,
            'email': interloc.get('email'),
            'telephone': interloc.get('telephone'),
            'type_personne': interloc.get('typePersonne') or 'P',
            'statut': 'actif',
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }
        
        if existing:
            # Mettre à jour et aussi définir externe_id s'il est NULL
            db.execute("""
                UPDATE contacts SET
                    nom = ?, email = ?, telephone = ?,
                    type_personne = ?, updated_at = ?,
                    externe_id = COALESCE(externe_id, ?)
                WHERE id = ?
            """, (
                contact_data['nom'], contact_data['email'],
                contact_data['telephone'], contact_data['type_personne'],
                contact_data['updated_at'], externe_id, contact_id
            ))
            result['updated'] += 1
        else:
            db.execute("""
                INSERT INTO contacts (id, nom, email, telephone, type_personne, statut, externe_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                contact_data['id'], contact_data['nom'], contact_data['email'],
                contact_data['telephone'], contact_data['type_personne'],
                contact_data['statut'], externe_id,
                contact_data['created_at'], contact_data['updated_at']
            ))
            result['created'] += 1
            created_contact_ids.add(contact_id)
            
            # Créer un événement pour chaque contact créé
            log('info', f"Création événement pour contact: {contact_data['nom']}")
            creer_evenement(db, 'import', 
                f"Contact créé: {contact_data['nom']}",
                f"Nouveau contact importé depuis la base externe",
                {'contact_id': contact_id, 'nom': contact_data['nom'], 'email': contact_data['email']},
                'fa-user-plus'
            )
        
        # Stocker le mapping dossier -> role -> contact_id pour liaison avec impayés
        dossier_id = interloc.get('idDossier')
        role = interloc.get('role')
        if dossier_id and role:
            if dossier_id not in result['dossier_contacts']:
                result['dossier_contacts'][dossier_id] = {}
            role_normalized = role.lower().replace(' ', '_').replace('-', '_').replace("'", "_")
            for accented, plain in [('é', 'e'), ('è', 'e'), ('ê', 'e'), ('à', 'a'), ('ù', 'u'), ('ç', 'c'), ('ô', 'o'), ('î', 'i'), ('ï', 'i')]:
                role_normalized = role_normalized.replace(accented, plain)
            result['dossier_contacts'][dossier_id][role_normalized] = contact_id
    
    # Étape 4bis: Créer les relations entre contacts (personne-entreprise)
    log('info', f"Étape 4bis: Création des relations entre contacts ({len(relations_map)} interlocuteurs avec relations)")
    now = datetime.utcnow().isoformat()
    
    for source_interloc_id, relations in relations_map.items():
        contact_source_id = f"cont_{source_interloc_id}"
        
        # Vérifier que le contact source existe (vient d'être créé ou existait déjà)
        source_exists = db.execute('SELECT id FROM contacts WHERE id = ?', (contact_source_id,)).fetchone()
        if not source_exists:
            continue
        
        for rel in relations:
            cible_interloc_id = rel.get('cible_id')
            if not cible_interloc_id:
                continue
            
            contact_cible_id = f"cont_{cible_interloc_id}"
            
            # Vérifier que le contact cible existe
            cible_exists = db.execute('SELECT id FROM contacts WHERE id = ?', (contact_cible_id,)).fetchone()
            if not cible_exists:
                # Le contact cible n'existe pas encore, on le crée aussi
                # Récupérer ses infos depuis sync_db
                cible_info = sync_db.execute(
                    "SELECT nom, prenom, email, telephoneMobile, typePersonne FROM _ADN_RG_Interlocuteur WHERE idInterlocuteur = ?",
                    (cible_interloc_id,)
                ).fetchone()
                
                if cible_info:
                    cible_prenom = cible_info.get('prenom', '') or ''
                    cible_nom = cible_info.get('nom', '') or ''
                    cible_nom_complet = f"{cible_prenom} {cible_nom}".strip().replace('None', '').strip()
                    
                    db.execute("""
                        INSERT INTO contacts (id, nom, email, telephone, type_personne, statut, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        contact_cible_id, cible_nom_complet, cible_info.get('email'),
                        cible_info.get('telephoneMobile'), cible_info.get('typePersonne') or 'P',
                        'actif', now, now
                    ))
                    result['created'] += 1
                    log('info', f"Contact cible créé via relation: {cible_nom_complet}")
            
            # Mapper la fonction vers un type de relation
            fonction = rel.get('fonction') or rel.get('typeContact') or 'contact'
            type_relation = mapper_fonction_to_type_relation(fonction)
            
            # Vérifier si la relation existe déjà
            existing_rel = db.execute("""
                SELECT id FROM contact_relations 
                WHERE contact_source_id = ? AND contact_cible_id = ?
            """, (contact_source_id, contact_cible_id)).fetchone()
            
            try:
                if existing_rel:
                    # Mettre à jour si nécessaire
                    db.execute("""
                        UPDATE contact_relations SET
                            type_relation = COALESCE(?, type_relation),
                            est_actif = 1,
                            updated_at = ?,
                            notes = COALESCE(?, notes)
                        WHERE id = ?
                    """, (type_relation, now, f"Import facture - {fonction}", existing_rel['id']))
                    result['relations_updated'] += 1
                else:
                    # Créer la relation
                    relation_id = f"rel_{datetime.utcnow().timestamp()}_{source_interloc_id}"
                    db.execute("""
                        INSERT INTO contact_relations (id, contact_source_id, contact_cible_id, 
                            type_relation, est_actif, notes, created_at, updated_at)
                        VALUES (?, ?, ?, ?, 1, ?, ?, ?)
                    """, (relation_id, contact_source_id, contact_cible_id, 
                          type_relation, f"Import facture - {fonction}", now, now))
                    result['relations_created'] += 1
            except Exception as e:
                log('warn', f"Erreur création relation {contact_source_id}->{contact_cible_id}: {str(e)}")
    
    log('info', f"Étape 4 terminée: {result['created']} contacts créés, {result['updated']} mis à jour, "
         f"{result['relations_created']} relations créées, {result['relations_updated']} relations mises à jour")
    
    return result


def mapper_fonction_to_type_relation(fonction):
    """Mappe une fonction/fonction vers un type de relation Marki."""
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


def etape_5_creer_impayes(db, pieces, statuts, dossier_contacts=None):
    """Étape 5: Traitement et Sauvegarde des Impayés.
    
    Args:
        dossier_contacts: Mapping {dossier_id: {role: contact_id}} pour lier les contacts aux impayés
    """
    result = {'created': 0, 'updated': 0, 'payees': 0}
    
    if dossier_contacts is None:
        dossier_contacts = {}
    
    # Mapping des rôles externes vers les colonnes de la DB
    # Les rôles dans la base externe ont des accents et espaces
    role_to_column = {
        'payeur': 'payer_id',
        'proprietaire': 'proprietaire_id',
        'propriétaire': 'proprietaire_id',
        'apporteur': 'apporteur_id',
        'apporteur_d_affaire': 'apporteur_id',
        'donneur_d_ordre': 'donneur_ordre_id',
        'donneur_ordre': 'donneur_ordre_id',
        'donneur_dordre': 'donneur_ordre_id',
        'locataire_entrant': 'locataire_entrant_id',
        'locataire_sortant': 'locataire_sortant_id',
        'notaire': 'notaire_id',
        'syndic': 'syndic_id',
        'acquereur': 'acquereur_id',
    }
    
    for piece in pieces:
        # Générer un ID unique
        impaye_id = f"imp_{piece['idpiece']}"
        
        # Déterminer le statut
        is_soldee = piece.get('facturesoldee', 0) == 1 or piece.get('resteapayer', 0) == 0
        statut = 'paye' if is_soldee else 'impaye'
        
        # Récupérer les IDs des contacts liés au dossier
        dossier_id = piece.get('idDossier')
        contact_fks = {}
        if dossier_id and dossier_id in dossier_contacts:
            for role_ext, contact_id in dossier_contacts[dossier_id].items():
                column = role_to_column.get(role_ext)
                if column:
                    contact_fks[column] = contact_id
        
        # Préparer les données
        impaye_data = {
            'id': impaye_id,
            'nfacture': str(piece.get('nfacture', '')),
            'date_piece': piece.get('datepiece'),
            'date_facture': piece.get('datecre'),
            'date_echeance': piece.get('dateecheance'),
            'montant_ttc': piece.get('totalttcnet', 0),
            'reste_a_payer': piece.get('resteapayer', 0),
            'statut': statut,
            'facture_soldee': 1 if is_soldee else 0,
            'numero_dossier': str(piece.get('numero', '')),
            'adresse_bien': f"{piece.get('adresse', '')} {piece.get('codePostal', '')} {piece.get('ville', '')}".strip(),
            'url_pdf': build_url_pdf(piece.get('refpiece'), piece.get('datecre')),
            'commentaire_piece': piece.get('commentaire_piece'),
            'commentaire_dossier': piece.get('commentaire_dossier'),
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat(),
            **contact_fks  # Ajoute payer_id, proprietaire_id, etc.
        }
        
        # Vérifier si existe
        existing = db.execute(
            'SELECT id, statut FROM impayes WHERE id = ? OR (nfacture = ? AND numero_dossier = ?)',
            (impaye_id, impaye_data['nfacture'], impaye_data['numero_dossier'])
        ).fetchone()
        
        if existing:
            # Vérifier si passage à payé
            ancien_statut = existing['statut']
            if ancien_statut != 'paye' and statut == 'paye':
                result['payees'] += 1
                montant_fmt = f"{impaye_data['montant_ttc']:,.2f}€".replace(',', ' ')
                creer_evenement(db, 'payment',
                    f"Facture {impaye_data['nfacture']} réglée ({montant_fmt})",
                    f"La facture {impaye_data['nfacture']} du dossier {impaye_data['numero_dossier']} a été réglée pour un montant de {montant_fmt}",
                    {'nfacture': impaye_data['nfacture'], 'montant': impaye_data['montant_ttc'], 'dossier': impaye_data['numero_dossier']},
                    'fa-money-bill-wave',
                    'impaye',
                    existing['id']
                )
            
            # Mettre à jour (y compris les FK des contacts si elles sont NULL)
            fk_columns = []
            fk_values = []
            for col in ['payer_id', 'proprietaire_id', 'apporteur_id', 'donneur_ordre_id', 
                        'locataire_entrant_id', 'locataire_sortant_id', 'notaire_id', 'syndic_id', 'acquereur_id']:
                if col in impaye_data and impaye_data[col]:
                    fk_columns.append(f"{col} = ?")
                    fk_values.append(impaye_data[col])
            
            fk_sql = ", ".join(fk_columns) + ", " if fk_columns else ""
            fk_values.extend([
                impaye_data['reste_a_payer'], impaye_data['statut'],
                impaye_data['facture_soldee'], impaye_data['url_pdf'],
                impaye_data['updated_at'],
                impaye_data['commentaire_piece'], impaye_data['commentaire_dossier'],
                existing['id']
            ])
            
            db.execute(f"""
                UPDATE impayes SET
                    {fk_sql}reste_a_payer = ?, statut = ?, facture_soldee = ?,
                    url_pdf = ?, updated_at = ?, commentaire_piece = ?, commentaire_dossier = ?
                WHERE id = ?
            """, tuple(fk_values))
            result['updated'] += 1
        else:
            # Créer avec les FK des contacts
            fk_columns = []
            fk_values = []
            fk_placeholders = []
            for col in ['payer_id', 'proprietaire_id', 'apporteur_id', 'donneur_ordre_id', 
                        'locataire_entrant_id', 'locataire_sortant_id', 'notaire_id', 'syndic_id', 'acquereur_id']:
                if col in impaye_data and impaye_data[col]:
                    fk_columns.append(col)
                    fk_values.append(impaye_data[col])
                    fk_placeholders.append("?")
            
            columns = ['id', 'nfacture', 'date_piece', 'date_facture', 'date_echeance', 'montant_ttc', 'reste_a_payer',
                       'statut', 'facture_soldee', 'numero_dossier', 'adresse_bien', 'url_pdf',
                       'commentaire_piece', 'commentaire_dossier', 'created_at', 'updated_at'] + fk_columns
            placeholders = ['?', '?', '?', '?', '?', '?', '?', '?', '?', '?', '?', '?', '?', '?', '?', '?'] + fk_placeholders
            values = [impaye_data['id'], impaye_data['nfacture'], impaye_data['date_piece'], impaye_data['date_facture'], impaye_data['date_echeance'],
                     impaye_data['montant_ttc'], impaye_data['reste_a_payer'],
                     impaye_data['statut'], impaye_data['facture_soldee'],
                     impaye_data['numero_dossier'], impaye_data['adresse_bien'], impaye_data['url_pdf'],
                     impaye_data['commentaire_piece'], impaye_data['commentaire_dossier'],
                     impaye_data['created_at'], impaye_data['updated_at']] + fk_values
            
            db.execute(f"""
                INSERT INTO impayes (
                    {', '.join(columns)}
                ) VALUES ({', '.join(placeholders)})
            """, tuple(values))
            result['created'] += 1
            
            # Créer un événement pour chaque facture importée
            montant_fmt = f"{impaye_data['montant_ttc']:,.2f}€".replace(',', ' ')
            creer_evenement(db, 'import',
                f"Facture {impaye_data['nfacture']} importée ({montant_fmt})",
                f"Nouvelle facture importée - Dossier {impaye_data['numero_dossier']} - Montant: {montant_fmt}",
                {'nfacture': impaye_data['nfacture'], 'montant': impaye_data['montant_ttc'], 'statut': statut, 'dossier': impaye_data['numero_dossier']},
                'fa-file-import',
                'impaye',
                impaye_data['id']
            )
            
            # Si payée dès l'import, créer aussi un événement de paiement
            if is_soldee:
                creer_evenement(db, 'payment',
                    f"Facture {impaye_data['nfacture']} réglée ({montant_fmt})",
                    f"La facture {impaye_data['nfacture']} a été importée comme réglée pour un montant de {montant_fmt}",
                    {'nfacture': impaye_data['nfacture'], 'montant': impaye_data['montant_ttc'], 'dossier': impaye_data['numero_dossier']},
                    'fa-money-bill-wave',
                    'impaye',
                    impaye_data['id']
                )
    
    return result
