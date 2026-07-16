from flask import Blueprint, request, jsonify
import uuid
import datetime
from ..db import get_db

bp = Blueprint('events', __name__)


@bp.route('/', methods=['GET'])
def get_events():
    """Get events/notifications list."""
    print("[API.EVENTS.LIST] START: fetching events")
    
    db = get_db()
    cursor = db.cursor()
    
    cursor.execute("""
        SELECT * FROM events 
        ORDER BY created_at DESC 
        LIMIT 50
    """)
    
    events = [dict(row) for row in cursor.fetchall()]
    
    # Count unread
    cursor.execute("SELECT COUNT(*) FROM events WHERE lu = 0")
    unread_count = cursor.fetchone()[0]
    
    print(f"[API.EVENTS.LIST] SUCCESS: {len(events)} events, {unread_count} unread")
    
    return jsonify({
        'events': events,
        'unread_count': unread_count
    })


@bp.route('/<id>/read', methods=['POST'])
def mark_as_read(id):
    """Mark event as read."""
    print(f"[API.EVENTS.READ] START: id={id}")
    
    db = get_db()
    cursor = db.cursor()
    
    cursor.execute("UPDATE events SET lu = 1 WHERE id = ?", (id,))
    db.commit()
    
    print("[API.EVENTS.READ] SUCCESS")
    return jsonify({'message': 'Événement marqué comme lu'})


@bp.route('/mark-all-read', methods=['POST'])
def mark_all_read():
    """Mark all events as read."""
    print("[API.EVENTS.MARK_ALL_READ] START")
    
    db = get_db()
    cursor = db.cursor()
    
    cursor.execute("UPDATE events SET lu = 1 WHERE lu = 0")
    db.commit()
    
    print("[API.EVENTS.MARK_ALL_READ] SUCCESS")
    return jsonify({'message': 'Tous les événements marqués comme lus'})
