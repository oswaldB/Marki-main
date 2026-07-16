from flask import Blueprint, request, jsonify
from db import get_db
from routes.auth import require_auth

bp = Blueprint('events', __name__)


@bp.route('', methods=['GET'])
@require_auth
def list_events():
    """Liste des événements."""
    print(f"[API EVENTS] GET /api/events - Liste des événements")
    print(f"[API EVENTS] Params reçus: {dict(request.args)}")
    db = get_db()
    
    type_event = request.args.get('type')
    contact_id = request.args.get('contact_id', type=int)
    date_debut = request.args.get('date_debut')
    date_fin = request.args.get('date_fin')
    limit = request.args.get('limit', 50, type=int)
    
    print(f"[API EVENTS] Paramètres parsés: type={type_event}, contact_id={contact_id}, limit={limit}")
    
    query = 'SELECT * FROM events WHERE 1=1'
    params = []
    
    if type_event:
        query += ' AND type = ?'
        params.append(type_event)
        print(f"[API EVENTS] Filtre type appliqué: '{type_event}'")
    
    if contact_id:
        query += ' AND contact_id = ?'
        params.append(contact_id)
        print(f"[API EVENTS] Filtre contact_id appliqué: {contact_id}")
    
    if date_debut:
        query += ' AND created_at >= ?'
        params.append(date_debut)
        print(f"[API EVENTS] Filtre date_debut appliqué: '{date_debut}'")
    
    if date_fin:
        query += ' AND created_at <= ?'
        params.append(date_fin)
        print(f"[API EVENTS] Filtre date_fin appliqué: '{date_fin}'")
    
    query += ' ORDER BY created_at DESC LIMIT ?'
    params.append(limit)
    
    print(f"[API EVENTS] Exécution requête avec LIMIT={limit}")
    events = db.execute(query, params).fetchall()
    
    print(f"[API EVENTS] ✅ Requête exécutée: {len(events)} événements retournés")
    return jsonify({'events': [dict(row) for row in events]})


@bp.route('', methods=['POST'])
@require_auth
def create_event():
    """Créer un événement."""
    print(f"[API EVENTS] POST /api/events - Création événement")
    data = request.get_json()
    print(f"[API EVENTS] Données: {data}")
    db = get_db()
    
    cursor = db.execute('''
        INSERT INTO events (type, description, contact_id, user_id, metadata)
        VALUES (?, ?, ?, ?, ?)
    ''', (
        data.get('type'),
        data.get('description'),
        data.get('contact_id'),
        data.get('user_id'),
        data.get('metadata')
    ))
    db.commit()
    
    print(f"[API EVENTS] ✅ Événement créé avec id={cursor.lastrowid}")
    return jsonify({'id': cursor.lastrowid}), 201
