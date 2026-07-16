from flask import Blueprint, request, jsonify
import uuid
import datetime
from ..db import get_db

bp = Blueprint('contacts', __name__)


@bp.route('/', methods=['GET'])
def get_contacts():
    """Get contacts list with filters and pagination."""
    print(f"[API.CONTACTS.LIST] START: params={dict(request.args)}")
    
    # Query params
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search', '')
    is_blacklisted = request.args.get('is_blacklisted', type=int)
    
    print(f"[API.CONTACTS.LIST] STEP: page={page}, per_page={per_page}, search={search}")
    
    db = get_db()
    cursor = db.cursor()
    
    # Build query
    query = "SELECT * FROM contacts WHERE 1=1"
    params = []
    
    if search:
        query += " AND (nom LIKE ? OR prenom LIKE ? OR email LIKE ?)"
        search_pattern = f"%{search}%"
        params.extend([search_pattern, search_pattern, search_pattern])
    
    if is_blacklisted is not None:
        query += " AND is_blacklisted = ?"
        params.append(is_blacklisted)
    
    # Count total
    count_query = query.replace("SELECT *", "SELECT COUNT(*)")
    cursor.execute(count_query, params)
    total = cursor.fetchone()[0]
    
    print(f"[API.CONTACTS.LIST] STEP: total={total}")
    
    # Add pagination
    query += " ORDER BY nom, prenom LIMIT ? OFFSET ?"
    params.extend([per_page, (page - 1) * per_page])
    
    cursor.execute(query, params)
    contacts = [dict(row) for row in cursor.fetchall()]
    
    total_pages = (total + per_page - 1) // per_page
    
    print(f"[API.CONTACTS.LIST] SUCCESS: {len(contacts)} contacts returned (page {page}/{total_pages})")
    
    return jsonify({
        'contacts': contacts,
        'total': total,
        'page': page,
        'per_page': per_page,
        'total_pages': total_pages
    })


@bp.route('/<id>', methods=['GET'])
def get_contact(id):
    """Get single contact by ID."""
    print(f"[API.CONTACTS.GET] START: id={id}")
    
    db = get_db()
    cursor = db.cursor()
    
    cursor.execute("SELECT * FROM contacts WHERE id = ?", (id,))
    contact = cursor.fetchone()
    
    if not contact:
        print(f"[API.CONTACTS.GET] ERROR: Contact not found: {id}")
        return jsonify({'error': 'Contact non trouvé'}), 404
    
    print("[API.CONTACTS.GET] SUCCESS: Contact found")
    return jsonify(dict(contact))


@bp.route('/', methods=['POST'])
def create_contact():
    """Create new contact."""
    print("[API.CONTACTS.CREATE] START: received request")
    
    data = request.get_json()
    if not data:
        print("[API.CONTACTS.CREATE] ERROR: No JSON data")
        return jsonify({'error': 'Données manquantes'}), 400
    
    # Required fields
    if not data.get('nom'):
        print("[API.CONTACTS.CREATE] ERROR: Missing nom")
        return jsonify({'error': 'Le nom est requis'}), 400
    
    print("[API.CONTACTS.CREATE] STEP: Generating UUID")
    new_id = str(uuid.uuid4())
    now = datetime.datetime.now().isoformat()
    
    print("[API.CONTACTS.CREATE] STEP: Inserting into database")
    
    db = get_db()
    cursor = db.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO contacts (
                id, nom, prenom, email, telephone, type, type_personne,
                statut, is_blacklisted, civilite, code, societe,
                adresse_rue, adresse_ville, adresse_code_postal, adresse_pays,
                notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            new_id, data.get('nom'), data.get('prenom'), data.get('email'),
            data.get('telephone'), data.get('type'), data.get('type_personne', 'P'),
            data.get('statut', 'actif'), 0, data.get('civilite'), data.get('code'),
            data.get('societe'), data.get('adresse_rue'), data.get('adresse_ville'),
            data.get('adresse_code_postal'), data.get('adresse_pays', 'France'),
            data.get('notes'), now, now
        ))
        db.commit()
        
        print(f"[API.CONTACTS.CREATE] SUCCESS: Contact created with id={new_id}")
        
        return jsonify({
            'id': new_id,
            'message': 'Contact créé avec succès'
        }), 201
        
    except Exception as e:
        print(f"[API.CONTACTS.CREATE] ERROR: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/<id>', methods=['PUT'])
def update_contact(id):
    """Update contact."""
    print(f"[API.CONTACTS.UPDATE] START: id={id}")
    
    data = request.get_json()
    if not data:
        print("[API.CONTACTS.UPDATE] ERROR: No JSON data")
        return jsonify({'error': 'Données manquantes'}), 400
    
    db = get_db()
    cursor = db.cursor()
    
    # Check contact exists
    cursor.execute("SELECT id FROM contacts WHERE id = ?", (id,))
    if not cursor.fetchone():
        print(f"[API.CONTACTS.UPDATE] ERROR: Contact not found: {id}")
        return jsonify({'error': 'Contact non trouvé'}), 404
    
    print("[API.CONTACTS.UPDATE] STEP: Building update query")
    
    # Build update
    allowed_fields = [
        'nom', 'prenom', 'email', 'telephone', 'type', 'type_personne',
        'statut', 'is_blacklisted', 'blacklist_date', 'blacklist_motif',
        'civilite', 'code', 'societe', 'adresse_rue', 'adresse_ville',
        'adresse_code_postal', 'adresse_pays', 'notes'
    ]
    
    updates = []
    params = []
    
    for field in allowed_fields:
        if field in data:
            updates.append(f"{field} = ?")
            params.append(data[field])
    
    if not updates:
        print("[API.CONTACTS.UPDATE] ERROR: No fields to update")
        return jsonify({'error': 'Aucun champ à mettre à jour'}), 400
    
    updates.append("updated_at = ?")
    params.append(datetime.datetime.now().isoformat())
    params.append(id)
    
    query = f"UPDATE contacts SET {', '.join(updates)} WHERE id = ?"
    
    try:
        cursor.execute(query, params)
        db.commit()
        
        print("[API.CONTACTS.UPDATE] SUCCESS: Contact updated")
        return jsonify({'message': 'Contact mis à jour'})
        
    except Exception as e:
        print(f"[API.CONTACTS.UPDATE] ERROR: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/<id>', methods=['DELETE'])
def delete_contact(id):
    """Delete contact."""
    print(f"[API.CONTACTS.DELETE] START: id={id}")
    
    db = get_db()
    cursor = db.cursor()
    
    # Check contact exists
    cursor.execute("SELECT id FROM contacts WHERE id = ?", (id,))
    if not cursor.fetchone():
        print(f"[API.CONTACTS.DELETE] ERROR: Contact not found: {id}")
        return jsonify({'error': 'Contact non trouvé'}), 404
    
    try:
        cursor.execute("DELETE FROM contacts WHERE id = ?", (id,))
        db.commit()
        
        print("[API.CONTACTS.DELETE] SUCCESS: Contact deleted")
        return jsonify({'message': 'Contact supprimé'})
        
    except Exception as e:
        print(f"[API.CONTACTS.DELETE] ERROR: {str(e)}")
        return jsonify({'error': str(e)}), 500
