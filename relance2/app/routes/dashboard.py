from flask import Blueprint, request, jsonify
from ..db import get_db

bp = Blueprint('dashboard', __name__)


@bp.route('/stats', methods=['GET'])
def get_stats():
    """Get dashboard statistics."""
    print("[API.DASHBOARD.STATS] START: calculating stats")
    
    db = get_db()
    cursor = db.cursor()
    
    # Count impayes
    cursor.execute("SELECT COUNT(*), SUM(reste_a_payer) FROM impayes WHERE statut = 'impaye'")
    row = cursor.fetchone()
    impayes_count = row[0]
    impayes_total = row[1] or 0
    
    # Count contacts
    cursor.execute("SELECT COUNT(*) FROM contacts")
    contacts_count = cursor.fetchone()[0]
    
    # Count relances en attente
    cursor.execute("SELECT COUNT(*) FROM relances WHERE statut = 'en_attente'")
    relances_count = cursor.fetchone()[0]
    
    # Count events unread
    cursor.execute("SELECT COUNT(*) FROM events WHERE lu = 0")
    events_unread = cursor.fetchone()[0]
    
    print("[API.DASHBOARD.STATS] SUCCESS: stats calculated")
    
    return jsonify({
        'impayes_count': impayes_count,
        'impayes_total': impayes_total,
        'contacts_count': contacts_count,
        'relances_count': relances_count,
        'events_unread': events_unread
    })


@bp.route('/recent', methods=['GET'])
def get_recent():
    """Get recent activity."""
    print("[API.DASHBOARD.RECENT] START: fetching recent activity")
    
    db = get_db()
    cursor = db.cursor()
    
    # Recent events
    cursor.execute("""
        SELECT * FROM events 
        ORDER BY created_at DESC 
        LIMIT 10
    """)
    events = [dict(row) for row in cursor.fetchall()]
    
    print(f"[API.DASHBOARD.RECENT] SUCCESS: {len(events)} recent events")
    
    return jsonify({'events': events})
