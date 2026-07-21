"""Routes relances (API)."""

from flask import Blueprint, request, jsonify
import uuid
from datetime import datetime, date

relances_bp = Blueprint('relances', __name__, url_prefix='/api/relances')


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


@relances_bp.route('', methods=['GET'])
def list_relances():
    """Liste des relances."""
    print(f"[API.RELANCES.LIST] START: params={dict(request.args)}")
    
    db = get_db()
    
    # Paramètres
    statut = request.args.get('statut')
    contact_id = request.args.get('contact_id')
    sequence_id = request.args.get('sequence_id')
    today = request.args.get('today') == '1' or request.args.get('date') == 'today'
    
    print(f"[API.RELANCES.LIST] STEP: Filtres statut={statut}, contact={contact_id}")
    
    # Construction de la requête
    where_clauses = []
    params = []
    
    if statut:
        where_clauses.append("r.statut = ?")
        params.append(statut)
    
    if contact_id:
        where_clauses.append("r.contact_id = ?")
        params.append(contact_id)
    
    if sequence_id:
        where_clauses.append("r.sequence_id = ?")
        params.append(sequence_id)
    
    if today:
        today_str = date.today().isoformat()
        where_clauses.append("DATE(r.date_envoi) = ?")
        params.append(today_str)
    
    where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""
    
    # Récupération des relances
    query = f"""
        SELECT r.*, c.nom as contact_nom, c.email as contact_email,
               s.nom as sequence_nom
        FROM relances r
        LEFT JOIN contacts c ON r.contact_id = c.id
        LEFT JOIN sequences s ON r.sequence_id = s.id
        {where_sql}
        ORDER BY r.created_at DESC
    """
    
    rows = db.execute(query, params).fetchall()
    
    relances = [dict(row) for row in rows]
    
    print(f"[API.RELANCES.LIST] SUCCESS: {len(relances)} relances retournées")
    return jsonify({'relances': relances}), 200


@relances_bp.route('/<id>', methods=['GET'])
def get_relance(id):
    """Détail d'une relance."""
    print(f"[API.RELANCES.GET] START: id={id}")
    
    db = get_db()
    print(f"[API.RELANCES.GET] STEP: Recherche relance id={id}")
    
    row = db.execute("""
        SELECT r.*, c.nom as contact_nom, c.email as contact_email,
               s.nom as sequence_nom
        FROM relances r
        LEFT JOIN contacts c ON r.contact_id = c.id
        LEFT JOIN sequences s ON r.sequence_id = s.id
        WHERE r.id = ?
    """, (id,)).fetchone()
    
    if row is None:
        return jsonify({'error': 'Relance non trouvée'}), 404
    
    relance = dict(row)
    
    # Récupérer les impayés liés
    impayes = db.execute("""
        SELECT i.* FROM impayes i
        JOIN relance_impayes ri ON i.id = ri.impaye_id
        WHERE ri.relance_id = ?
    """, (id,)).fetchall()
    
    print(f"[API.RELANCES.GET] STEP: Recherche {len(impayes)} impayés liés")
    
    relance['impayes'] = [dict(row) for row in impayes]
    
    print(f"[API.RELANCES.GET] SUCCESS: Relance trouvée")
    return jsonify(relance), 200


@relances_bp.route('', methods=['POST'])
def create_relance():
    """Créer une relance."""
    data = request.get_json() or {}
    print(f"[API.RELANCES.CREATE] START: data={data}")
    
    db = get_db()
    
    contact_id = data.get('contact_id')
    print(f"[API.RELANCES.CREATE] STEP: Création relance contact_id={contact_id}")
    
    new_id = str(uuid.uuid4())
    
    db.execute("""
        INSERT INTO relances (id, contact_id, sequence_id, statut, date_envoi, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        new_id,
        contact_id,
        data.get('sequence_id'),
        data.get('statut', 'pending'),
        data.get('date_envoi'),
        datetime.utcnow().isoformat()
    ))
    
    # Lier les impayés
    for impaye_id in data.get('impaye_ids', []):
        db.execute("""
            INSERT INTO relance_impayes (relance_id, impaye_id)
            VALUES (?, ?)
        """, (new_id, impaye_id))
    
    db.commit()
    
    print(f"[API.RELANCES.CREATE] SUCCESS: Relance créée id={new_id}")
    return jsonify({'id': new_id, 'success': True}), 201


@relances_bp.route('/<id>', methods=['PUT'])
def update_relance(id):
    """Modifier une relance."""
    data = request.get_json() or {}
    print(f"[API.RELANCES.UPDATE] START: id={id}")
    
    db = get_db()
    
    # Vérifier existence
    existing = db.execute("SELECT id FROM relances WHERE id = ?", (id,)).fetchone()
    if existing is None:
        return jsonify({'error': 'Relance non trouvée'}), 404
    
    statut = data.get('statut')
    print(f"[API.RELANCES.UPDATE] STEP: Mise à jour statut={statut}")
    
    fields = []
    values = []
    
    if 'statut' in data:
        fields.append("statut = ?")
        values.append(data['statut'])
    
    if 'date_envoi' in data:
        fields.append("date_envoi = ?")
        values.append(data['date_envoi'])
    
    if not fields:
        return jsonify({'error': 'Aucun champ à mettre à jour'}), 400
    
    values.append(id)
    sql = f"UPDATE relances SET {', '.join(fields)}, updated_at = ? WHERE id = ?"
    values.insert(-1, datetime.utcnow().isoformat())
    
    db.execute(sql, values)
    db.commit()
    
    print(f"[API.RELANCES.UPDATE] SUCCESS: Relance mise à jour")
    return jsonify({'success': True}), 200


@relances_bp.route('/<id>', methods=['DELETE'])
def delete_relance(id):
    """Supprimer une relance."""
    print(f"[API.RELANCES.DELETE] START: id={id}")
    
    db = get_db()
    
    existing = db.execute("SELECT id FROM relances WHERE id = ?", (id,)).fetchone()
    if existing is None:
        return jsonify({'error': 'Relance non trouvée'}), 404
    
    # Supprimer les liens d'abord
    db.execute("DELETE FROM relance_impayes WHERE relance_id = ?", (id,))
    db.execute("DELETE FROM relances WHERE id = ?", (id,))
    db.commit()
    
    print(f"[API.RELANCES.DELETE] SUCCESS: Relance supprimée")
    return jsonify({'success': True}), 200
