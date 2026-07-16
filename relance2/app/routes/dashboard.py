from flask import Blueprint, request, jsonify
from ..db import get_db

bp = Blueprint('dashboard', __name__)


# NOTE: Les calculs sont faits côté frontend selon les specs
# Ce fichier ne contient que les routes pour récupérer les données brutes


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
    
    return jsonify({'data': events})
