from flask import Blueprint, request, jsonify
import jwt
import datetime
from flask import current_app
from ..db import get_db

bp = Blueprint('portail', __name__)


def get_token_from_header():
    """Extract Bearer token from Authorization header."""
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        return auth_header.split(' ')[1]
    return None


def verify_portail_token(token):
    """Verify portail JWT token."""
    try:
        payload = jwt.decode(
            token, 
            current_app.config['SECRET_KEY'], 
            algorithms=['HS256']
        )
        return payload
    except:
        return None


@bp.route('/login', methods=['POST'])
def portail_login():
    """Portail login with magic token."""
    print("[API.PORTAIL.LOGIN] START")
    
    data = request.get_json() or {}
    contact_id = data.get('contact_id')
    
    if not contact_id:
        return jsonify({'error': 'Contact ID requis'}), 400
    
    db = get_db()
    cursor = db.cursor()
    
    cursor.execute("SELECT * FROM contacts WHERE id = ?", (contact_id,))
    contact = cursor.fetchone()
    
    if not contact:
        return jsonify({'error': 'Contact non trouvé'}), 404
    
    # Generate portail token
    token = jwt.encode(
        {
            'contact_id': contact['id'],
            'type': 'portail',
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        },
        current_app.config['SECRET_KEY'],
        algorithm='HS256'
    )
    
    print(f"[API.PORTAIL.LOGIN] SUCCESS: token generated for contact {contact_id}")
    
    return jsonify({
        'token': token,
        'contact': {
            'id': contact['id'],
            'nom': contact['nom'],
            'prenom': contact['prenom'],
            'email': contact['email']
        }
    })


@bp.route('/data', methods=['GET'])
def portail_data():
    """Get portail data (impayes for contact)."""
    print("[API.PORTAIL.DATA] START")
    
    token = get_token_from_header()
    if not token:
        return jsonify({'error': 'Token manquant'}), 401
    
    payload = verify_portail_token(token)
    if not payload or payload.get('type') != 'portail':
        return jsonify({'error': 'Token invalide'}), 401
    
    contact_id = payload['contact_id']
    
    db = get_db()
    cursor = db.cursor()
    
    # Get contact
    cursor.execute("SELECT * FROM contacts WHERE id = ?", (contact_id,))
    contact = cursor.fetchone()
    
    if not contact:
        return jsonify({'error': 'Contact non trouvé'}), 404
    
    # Get impayes for this contact
    cursor.execute("""
        SELECT * FROM impayes 
        WHERE contact_relance_id = ? AND statut = 'impaye'
        ORDER BY date_echeance ASC
    """, (contact_id,))
    
    impayes = [dict(row) for row in cursor.fetchall()]
    
    total_du = sum(i['reste_a_payer'] or 0 for i in impayes)
    
    print(f"[API.PORTAIL.DATA] SUCCESS: {len(impayes)} impayes for contact {contact_id}")
    
    return jsonify({
        'contact': dict(contact),
        'impayes': impayes,
        'total_du': total_du
    })
