from flask import Blueprint, request, jsonify
import uuid
import datetime
from ..db import get_db

bp = Blueprint('sequences', __name__)


@bp.route('/', methods=['GET'])
def get_sequences():
    """Get sequences list."""
    print("[API.SEQUENCES.LIST] START: fetching sequences")
    
    db = get_db()
    cursor = db.cursor()
    
    cursor.execute("SELECT * FROM sequences ORDER BY nom")
    sequences = [dict(row) for row in cursor.fetchall()]
    
    print(f"[API.SEQUENCES.LIST] SUCCESS: {len(sequences)} sequences returned")
    return jsonify({'sequences': sequences})


@bp.route('/<id>', methods=['GET'])
def get_sequence(id):
    """Get single sequence with emails."""
    print(f"[API.SEQUENCES.GET] START: id={id}")
    
    db = get_db()
    cursor = db.cursor()
    
    cursor.execute("SELECT * FROM sequences WHERE id = ?", (id,))
    sequence = cursor.fetchone()
    
    if not sequence:
        return jsonify({'error': 'Séquence non trouvée'}), 404
    
    cursor.execute("SELECT * FROM sequences_emails WHERE sequence_id = ? ORDER BY email_index", (id,))
    emails = [dict(row) for row in cursor.fetchall()]
    
    result = dict(sequence)
    result['emails'] = emails
    
    return jsonify(result)


@bp.route('/', methods=['POST'])
def create_sequence():
    """Create new sequence."""
    print("[API.SEQUENCES.CREATE] START: creating sequence")
    
    data = request.get_json() or {}
    new_id = str(uuid.uuid4())
    now = datetime.datetime.now().isoformat()
    
    db = get_db()
    cursor = db.cursor()
    
    cursor.execute("""
        INSERT INTO sequences (id, nom, type_sequence, niveau, actif, 
        validation_obligatoire, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (new_id, data.get('nom'), data.get('type_sequence', 'relance'),
          data.get('niveau', 0), 1, 0, now, now))
    
    db.commit()
    
    print(f"[API.SEQUENCES.CREATE] SUCCESS: id={new_id}")
    return jsonify({'id': new_id, 'message': 'Séquence créée'}), 201


@bp.route('/<id>', methods=['PUT'])
def update_sequence(id):
    """Update sequence."""
    print(f"[API.SEQUENCES.UPDATE] START: id={id}")
    
    data = request.get_json() or {}
    now = datetime.datetime.now().isoformat()
    
    db = get_db()
    cursor = db.cursor()
    
    cursor.execute("SELECT id FROM sequences WHERE id = ?", (id,))
    if not cursor.fetchone():
        return jsonify({'error': 'Séquence non trouvée'}), 404
    
    updates = []
    params = []
    
    for field in ['nom', 'type_sequence', 'niveau', 'actif', 'validation_obligatoire']:
        if field in data:
            updates.append(f"{field} = ?")
            params.append(data[field])
    
    if updates:
        updates.append("updated_at = ?")
        params.append(now)
        params.append(id)
        
        query = f"UPDATE sequences SET {', '.join(updates)} WHERE id = ?"
        cursor.execute(query, params)
        db.commit()
    
    print("[API.SEQUENCES.UPDATE] SUCCESS")
    return jsonify({'message': 'Séquence mise à jour'})


@bp.route('/<id>', methods=['DELETE'])
def delete_sequence(id):
    """Delete sequence."""
    print(f"[API.SEQUENCES.DELETE] START: id={id}")
    
    db = get_db()
    cursor = db.cursor()
    
    cursor.execute("DELETE FROM sequences WHERE id = ?", (id,))
    db.commit()
    
    print("[API.SEQUENCES.DELETE] SUCCESS")
    return jsonify({'message': 'Séquence supprimée'})
