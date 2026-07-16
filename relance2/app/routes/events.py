"""Routes événements (API)."""

from flask import Blueprint, request, jsonify
import uuid
import json
from datetime import datetime

events_bp = Blueprint('events', __name__, url_prefix='/api/events')


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


@events_bp.route('', methods=['GET'])
def list_events():
    """Liste des événements."""
    print(f"[API.EVENTS.LIST] START: params={dict(request.args)}")
    
    db = get_db()
    
    # Paramètres
    event_type = request.args.get('type')
    limit = int(request.args.get('limit', 10))
    
    print(f"[API.EVENTS.LIST] STEP: Filtre type={event_type}, limit={limit}")
    
    # Construction de la requête
    where_clauses = []
    params = []
    
    if event_type:
        where_clauses.append("type = ?")
        params.append(event_type)
    
    where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""
    
    # Récupération des événements
    query = f"""
        SELECT * FROM events
        {where_sql}
        ORDER BY created_at DESC
        LIMIT ?
    """
    
    rows = db.execute(query, params + [limit]).fetchall()
    
    events = [dict(row) for row in rows]
    
    print(f"[API.EVENTS.LIST] SUCCESS: {len(events)} événements retournés")
    return jsonify({'events': events}), 200


@events_bp.route('', methods=['POST'])
def create_event():
    """Créer un événement."""
    data = request.get_json() or {}
    print(f"[API.EVENTS.CREATE] START: data={data}")
    
    db = get_db()
    
    event_type = data.get('type', 'system')
    print(f"[API.EVENTS.CREATE] STEP: Création event type={event_type}")
    
    new_id = str(uuid.uuid4())
    
    db.execute("""
        INSERT INTO events (id, type, title, description, metadata, icon, user_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        new_id,
        event_type,
        data.get('title', ''),
        data.get('description', ''),
        json.dumps(data.get('metadata', {})) if data.get('metadata') else None,
        data.get('icon', 'fa-bell'),
        data.get('user_id'),
        datetime.utcnow().isoformat()
    ))
    db.commit()
    
    print(f"[API.EVENTS.CREATE] SUCCESS: Event créé id={new_id}")
    return jsonify({'id': new_id, 'success': True}), 201
