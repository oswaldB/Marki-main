from flask import Blueprint, request, jsonify
import uuid
import datetime
from ..db import get_db

bp = Blueprint('relances', __name__)


@bp.route('/', methods=['GET'])
def get_relances():
    """Get relances list."""
    print("[API.RELANCES.LIST] START: fetching relances")
    
    db = get_db()
    cursor = db.cursor()
    
    cursor.execute("""
        SELECT r.*, i.nfacture, c.nom as contact_nom
        FROM relances r
        LEFT JOIN impayes i ON r.impaye_id = i.id
        LEFT JOIN contacts c ON r.contact_id = c.id
        ORDER BY r.created_at DESC
    """)
    
    relances = [dict(row) for row in cursor.fetchall()]
    print(f"[API.RELANCES.LIST] SUCCESS: {len(relances)} relances returned")
    
    return jsonify({'relances': relances})


@bp.route('/<id>', methods=['GET'])
def get_relance(id):
    """Get single relance."""
    print(f"[API.RELANCES.GET] START: id={id}")
    
    db = get_db()
    cursor = db.cursor()
    
    cursor.execute("SELECT * FROM relances WHERE id = ?", (id,))
    relance = cursor.fetchone()
    
    if not relance:
        return jsonify({'error': 'Relance non trouvée'}), 404
    
    return jsonify(dict(relance))


@bp.route('/', methods=['POST'])
def create_relance():
    """Create new relance."""
    print("[API.RELANCES.CREATE] START: creating relance")
    
    data = request.get_json() or {}
    new_id = str(uuid.uuid4())
    now = datetime.datetime.now().isoformat()
    
    db = get_db()
    cursor = db.cursor()
    
    cursor.execute("""
        INSERT INTO relances (id, impaye_id, contact_id, sequence_id, type_relance, 
        statut, date_prevue, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (new_id, data.get('impaye_id'), data.get('contact_id'),
          data.get('sequence_id'), data.get('type_relance'), 
          'en_attente', data.get('date_prevue'), now, now))
    
    db.commit()
    
    print(f"[API.RELANCES.CREATE] SUCCESS: id={new_id}")
    return jsonify({'id': new_id, 'message': 'Relance créée'}), 201


@bp.route('/<id>', methods=['PUT'])
def update_relance(id):
    """Update relance."""
    print(f"[API.RELANCES.UPDATE] START: id={id}")
    
    data = request.get_json() or {}
    now = datetime.datetime.now().isoformat()
    
    db = get_db()
    cursor = db.cursor()
    
    # Check exists
    cursor.execute("SELECT id FROM relances WHERE id = ?", (id,))
    if not cursor.fetchone():
        return jsonify({'error': 'Relance non trouvée'}), 404
    
    updates = []
    params = []
    
    for field in ['statut', 'date_envoi', 'email_sujet', 'email_corps', 
                  'validation_requise', 'valide_par', 'valide_le']:
        if field in data:
            updates.append(f"{field} = ?")
            params.append(data[field])
    
    if updates:
        updates.append("updated_at = ?")
        params.append(now)
        params.append(id)
        
        query = f"UPDATE relances SET {', '.join(updates)} WHERE id = ?"
        cursor.execute(query, params)
        db.commit()
    
    print("[API.RELANCES.UPDATE] SUCCESS")
    return jsonify({'message': 'Relance mise à jour'})


@bp.route('/<id>', methods=['DELETE'])
def delete_relance(id):
    """Delete relance."""
    print(f"[API.RELANCES.DELETE] START: id={id}")
    
    db = get_db()
    cursor = db.cursor()
    
    cursor.execute("DELETE FROM relances WHERE id = ?", (id,))
    db.commit()
    
    print("[API.RELANCES.DELETE] SUCCESS")
    return jsonify({'message': 'Relance supprimée'})
