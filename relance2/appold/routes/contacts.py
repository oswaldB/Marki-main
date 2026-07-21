"""Routes contacts (API et views)."""

from flask import Blueprint, request, jsonify, render_template
import uuid
from datetime import datetime

contacts_bp = Blueprint('contacts', __name__, url_prefix='/contacts')
contacts_api_bp = Blueprint('contacts_api', __name__, url_prefix='/api/contacts')


def get_db():
    """Get database connection from app context."""
    from flask import current_app
    import sqlite3
    db = sqlite3.connect(
        current_app.config['DATABASE'],
        detect_types=sqlite3.PARSE_DECLTYPES
    )
    db.row_factory = sqlite3.Row
    return db


# ==================== VIEWS ====================

@contacts_bp.route('', methods=['GET'])
def index():
    """Page contacts principale."""
    return render_template('contacts/index.html')


# ==================== API ====================

@contacts_api_bp.route('/stats', methods=['GET'])
def get_stats():
    """Get contacts statistics."""
    db = get_db()
    
    # Total contacts
    total = db.execute("SELECT COUNT(*) FROM contacts").fetchone()[0]
    
    # Entreprises (type = 'M')
    entreprises = db.execute(
        "SELECT COUNT(*) FROM contacts WHERE type_personne = 'M'"
    ).fetchone()[0]
    
    # Personnes (type = 'P')
    personnes = db.execute(
        "SELECT COUNT(*) FROM contacts WHERE type_personne = 'P'"
    ).fetchone()[0]
    
    # Avec impayés (utiliser proprietaire_id comme référence au contact)
    avec_impayes = db.execute(
        "SELECT COUNT(DISTINCT proprietaire_id) FROM impayes WHERE statut = 'impaye' AND proprietaire_id IS NOT NULL"
    ).fetchone()[0]
    
    # Blacklist
    blacklist = db.execute(
        "SELECT COUNT(*) FROM contacts WHERE statut = 'blacklist' OR is_blacklisted = 1"
    ).fetchone()[0]
    
    # Sans email
    sans_email = db.execute(
        "SELECT COUNT(*) FROM contacts WHERE email IS NULL OR email = ''"
    ).fetchone()[0]
    
    return jsonify({
        'total': total,
        'entreprises': entreprises,
        'personnes': personnes,
        'avecImpayes': avec_impayes,
        'blacklist': blacklist,
        'sansEmail': sans_email
    }), 200


@contacts_api_bp.route('', methods=['GET'])
def list_contacts():
    """Liste tous les contacts avec recherche optionnelle et relations."""
    print(f"[API.CONTACTS.LIST] START: params={dict(request.args)}")
    
    db = get_db()
    
    # Paramètres
    limit = int(request.args.get('limit', 1000))
    search = request.args.get('search', '').strip()
    is_blacklisted = request.args.get('is_blacklisted')
    email = request.args.get('email')  # 'none' pour contacts sans email
    
    # Construction de la requête de base
    base_query = """
        SELECT 
            c.id,
            COALESCE(c.nom || ' ' || c.prenom, c.nom) as nomComplet,
            c.type_personne as typePersonne,
            c.email,
            c.telephone,
            c.email_force as emailForce,
            c.statut,
            c.is_blacklisted as isBlacklisted,
            c.type,
            (SELECT COUNT(*) FROM impayes i WHERE i.proprietaire_id = c.id AND i.statut = 'impaye') as impayesCount
        FROM contacts c
        WHERE 1=1
    """
    params = []
    
    # Filtre is_blacklisted
    if is_blacklisted is not None:
        base_query += " AND (c.is_blacklisted = ? OR c.statut = 'blacklist')"
        params.append(1 if is_blacklisted in ['1', 'true', 'True'] else 0)
    
    # Filtre email=none (contacts sans email)
    if email == 'none':
        base_query += " AND (c.email IS NULL OR c.email = '')"
    elif email:
        base_query += " AND c.email LIKE ?"
        params.append(f'%{email}%')
    
    # Ajouter la recherche si présente
    if search:
        base_query += """ AND (
            c.nom LIKE ? 
            OR c.prenom LIKE ? 
            OR c.email LIKE ?
            OR c.type LIKE ?
        )"""
        search_pattern = f'%{search}%'
        params.extend([search_pattern, search_pattern, search_pattern, search_pattern])
    
    base_query += " ORDER BY c.nom ASC, c.prenom ASC LIMIT ?"
    params.append(limit)
    
    rows = db.execute(base_query, params).fetchall()
    
    # Séparer les entreprises et les personnes
    entreprises = []
    personnes = []
    contacts_dict = {}
    
    for row in rows:
        contact = dict(row)
        # Calcul des initiales
        if contact['nomComplet']:
            parts = contact['nomComplet'].split()
            contact['initials'] = ''.join([p[0] for p in parts[:2] if p]).upper()
        else:
            contact['initials'] = ''
        
        contact['personnes'] = []
        contact['contactLie'] = None
        contact['entrepriseId'] = None
        contact['societesLiees'] = []
        contact['relationPersonne'] = None
        contact['typeRelation'] = None
        
        contacts_dict[contact['id']] = contact
        
        if contact['typePersonne'] == 'M':
            entreprises.append(contact)
        else:
            personnes.append(contact)
    
    # Récupérer les relations entre contacts
    if contacts_dict:
        contact_ids = list(contacts_dict.keys())
        placeholders = ','.join(['?' for _ in contact_ids])
        
        # Relations entre contacts (professionnelles, familiales, etc.)
        relations_contact = db.execute(f"""
            SELECT cr.contact_source_id, cr.contact_cible_id, cr.type_relation
            FROM contact_relations cr
            WHERE cr.contact_source_id IN ({placeholders}) OR cr.contact_cible_id IN ({placeholders})
        """, contact_ids + contact_ids).fetchall()
        
        for rel in relations_contact:
            source_id = rel['contact_source_id']
            cible_id = rel['contact_cible_id']
            type_relation = rel['type_relation']
            
            # Si la source est dans nos contacts, on lui ajoute le contact lié
            if source_id in contacts_dict and cible_id in contacts_dict:
                contacts_dict[source_id]['relationPersonne'] = contacts_dict[cible_id]['nomComplet']
                contacts_dict[source_id]['typeRelation'] = type_relation
                contacts_dict[source_id]['contactLie'] = contacts_dict[cible_id]
    
    # Relations professionnelles (lien personne-entreprise)
    PROFESSIONAL_RELATIONS = ['employe', 'dg', 'directeur_financier', 'responsable_comptable', 
                              'responsable_paie', 'tresorier', 'administrateur', 'gerant', 
                              'president', 'associe', 'representant_legal', 'contact_facturation', 'contact']
    
    if contacts_dict:
        contact_ids = list(contacts_dict.keys())
        placeholders = ','.join(['?' for _ in contact_ids])
        
        # Récupérer toutes les relations entre les contacts chargés
        relations = db.execute(f"""
            SELECT cr.contact_source_id, cr.contact_cible_id, cr.type_relation
            FROM contact_relations cr
            WHERE cr.contact_source_id IN ({placeholders}) OR cr.contact_cible_id IN ({placeholders})
        """, contact_ids + contact_ids).fetchall()
        
        for rel in relations:
            source_id = rel['contact_source_id']
            cible_id = rel['contact_cible_id']
            type_relation = rel['type_relation']
            
            if source_id not in contacts_dict or cible_id not in contacts_dict:
                continue
                
            source = contacts_dict[source_id]
            cible = contacts_dict[cible_id]
            
            # Si relation professionnelle: lier personne à entreprise
            if type_relation in PROFESSIONAL_RELATIONS:
                # source = entreprise, cible = personne
                if source['typePersonne'] == 'M' and cible['typePersonne'] == 'P':
                    cible['entrepriseId'] = source_id
                    source['personnes'].append(cible)
                # source = personne, cible = entreprise
                elif source['typePersonne'] == 'P' and cible['typePersonne'] == 'M':
                    source['entrepriseId'] = cible_id
                    cible['personnes'].append(source)
            # Si relation familiale: lier personne à personne (contactLie)
            else:
                if source['typePersonne'] == 'P' and cible['typePersonne'] == 'P':
                    source['relationPersonne'] = cible['nomComplet']
                    source['typeRelation'] = type_relation
                    source['contactLie'] = cible
    
    # Construire la liste finale: entreprises puis personnes sans entreprise ni relation
    contacts = []
    
    # 1. Entreprises (avec leurs collaborateurs déjà peuplés)
    for entreprise in entreprises:
        contacts.append(entreprise)
    
    # 2. Personnes sans entreprise ni relation
    for personne in personnes:
        if not personne['entrepriseId'] and not personne['relationPersonne']:
            contacts.append(personne)
    
    # 3. Personnes avec relation familiale (tutelle, époux, etc.)
    for personne in personnes:
        if personne['relationPersonne']:
            contacts.append(personne)
    
    print(f"[API.CONTACTS.LIST] SUCCESS: {len(contacts)} contacts retournés")
    return jsonify({'contacts': contacts}), 200


@contacts_api_bp.route('/<contact_id>', methods=['PUT'])
def update_contact(contact_id):
    """Update a contact."""
    data = request.get_json() or {}
    print(f"[API.CONTACTS.UPDATE] START: id={contact_id}, data={data}")
    
    db = get_db()
    
    # Champs autorisés
    allowed_fields = ['email_force', 'emailForce', 'statut', 'is_blacklisted', 'isBlacklisted']
    
    updates = []
    params = []
    
    # Mapping camelCase -> snake_case
    field_mapping = {
        'emailForce': 'email_force',
        'isBlacklisted': 'is_blacklisted'
    }
    
    for field in allowed_fields:
        if field in data:
            db_field = field_mapping.get(field, field)
            updates.append(f"{db_field} = ?")
            params.append(data[field])
    
    if not updates:
        return jsonify({'error': 'No fields to update'}), 400
    
    # Mise à jour
    query = f"UPDATE contacts SET {', '.join(updates)} WHERE id = ?"
    params.append(contact_id)
    
    db.execute(query, params)
    db.commit()
    
    print(f"[API.CONTACTS.UPDATE] SUCCESS: Contact {contact_id} mis à jour")
    return jsonify({'success': True}), 200


@contacts_api_bp.route('/<contact_id>/blacklist', methods=['PUT', 'POST'])
def blacklist_contact(contact_id):
    """Blacklist a contact."""
    print(f"[API.CONTACTS.BLACKLIST] START: id={contact_id}")
    
    db = get_db()
    
    db.execute("""
        UPDATE contacts 
        SET statut = 'blacklist', is_blacklisted = 1
        WHERE id = ?
    """, [contact_id])
    db.commit()
    
    print(f"[API.CONTACTS.BLACKLIST] SUCCESS: Contact {contact_id} blacklisté")
    return jsonify({'success': True}), 200


@contacts_api_bp.route('/export', methods=['POST'])
def export_contacts():
    """Export contacts to Excel/CSV."""
    data = request.get_json() or {}
    print(f"[API.CONTACTS.EXPORT] START: filters={data}")
    
    # TODO: Implémenter la logique d'export
    # Pour l'instant, retourner une URL fictive
    
    return jsonify({
        'success': True,
        'downloadUrl': '/api/contacts/export/download',
        'filename': f'contacts_{datetime.now().strftime("%Y%m%d")}.xlsx'
    }), 200


@contacts_api_bp.route('/<contact_id>/email-force', methods=['PATCH'])
def update_email_force(contact_id):
    """Update email_force for a contact."""
    data = request.get_json() or {}
    email_force = data.get('email_force')
    
    print(f"[API.CONTACTS.EMAIL_FORCE] START: id={contact_id}, email_force={email_force}")
    
    db = get_db()
    db.execute("UPDATE contacts SET email_force = ? WHERE id = ?", [email_force, contact_id])
    db.commit()
    
    print(f"[API.CONTACTS.EMAIL_FORCE] SUCCESS: Contact {contact_id} mis à jour")
    return jsonify({'success': True, 'email_force': email_force}), 200


@contacts_api_bp.route('/<contact_id>/relations', methods=['GET'])
def get_contact_relations(contact_id):
    """Get relations for a contact."""
    print(f"[API.CONTACTS.RELATIONS.GET] START: id={contact_id}")
    
    db = get_db()
    
    # Récupérer les relations où ce contact est la source
    relations = db.execute("""
        SELECT 
            cr.id as relation_id,
            cr.contact_cible_id,
            c.nom || ' ' || COALESCE(c.prenom, '') as nom_complet,
            cr.type_relation,
            cr.notes,
            cr.created_at
        FROM contact_relations cr
        JOIN contacts c ON cr.contact_cible_id = c.id
        WHERE cr.contact_source_id = ? AND cr.est_actif = 1
    """, [contact_id]).fetchall()
    
    result = [dict(r) for r in relations]
    
    print(f"[API.CONTACTS.RELATIONS.GET] SUCCESS: {len(result)} relations trouvées")
    return jsonify({'relations': result}), 200


@contacts_api_bp.route('/<contact_id>/relations', methods=['POST'])
def create_contact_relation(contact_id):
    """Create a new relation for a contact."""
    data = request.get_json() or {}
    contact_cible_id = data.get('contact_cible_id')
    type_relation = data.get('type_relation')
    
    print(f"[API.CONTACTS.RELATIONS.CREATE] START: source={contact_id}, cible={contact_cible_id}, type={type_relation}")
    
    if not contact_cible_id or not type_relation:
        return jsonify({'error': 'contact_cible_id and type_relation required'}), 400
    
    db = get_db()
    relation_id = str(uuid.uuid4())
    now = datetime.now().isoformat()
    
    db.execute("""
        INSERT INTO contact_relations (id, contact_source_id, contact_cible_id, type_relation, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, [relation_id, contact_id, contact_cible_id, type_relation, now, now])
    db.commit()
    
    print(f"[API.CONTACTS.RELATIONS.CREATE] SUCCESS: Relation {relation_id} créée")
    return jsonify({'success': True, 'relation_id': relation_id}), 201


@contacts_api_bp.route('/<contact_id>/relations/<relation_id>', methods=['DELETE'])
def delete_contact_relation(contact_id, relation_id):
    """Delete a relation."""
    print(f"[API.CONTACTS.RELATIONS.DELETE] START: relation_id={relation_id}")
    
    db = get_db()
    db.execute("DELETE FROM contact_relations WHERE id = ? AND contact_source_id = ?", [relation_id, contact_id])
    db.commit()
    
    print(f"[API.CONTACTS.RELATIONS.DELETE] SUCCESS: Relation {relation_id} supprimée")
    return jsonify({'success': True}), 200


@contacts_api_bp.route('/bulk-unblacklist', methods=['POST'])
def bulk_unblacklist_contacts():
    """Retire plusieurs contacts de la blacklist."""
    data = request.get_json() or {}
    contact_ids = data.get('contact_ids', [])
    
    print(f"[API.CONTACTS.BULK_UNBLACKLIST] START: {len(contact_ids)} contacts")
    
    if not contact_ids:
        return jsonify({'error': 'No contact_ids provided'}), 400
    
    db = get_db()
    updated_count = 0
    errors = []
    
    for contact_id in contact_ids:
        try:
            db.execute("""
                UPDATE contacts 
                SET statut = 'actif', is_blacklisted = 0 
                WHERE id = ?
            """, [contact_id])
            updated_count += 1
        except Exception as e:
            errors.append({'id': contact_id, 'error': str(e)})
    
    db.commit()
    
    print(f"[API.CONTACTS.BULK_UNBLACKLIST] SUCCESS: {updated_count} contacts mis à jour")
    return jsonify({
        'success': True, 
        'updated': updated_count,
        'errors': errors
    }), 200
