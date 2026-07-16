"""
Routes pour la Gestion des Tokens

Génération et validation des tokens de connexion pour le portail client.
"""

from flask import Blueprint, request, jsonify
import uuid
import datetime
from ..db import get_db

bp = Blueprint('tokens', __name__)


@bp.route('/generate', methods=['POST'])
def generate_token():
    """Generate a new access token for a contact."""
    print("[API.TOKENS.GENERATE] START: generating token")
    
    data = request.get_json()
    contact_id = data.get('contact_id')
    
    if not contact_id:
        return jsonify({'error': 'contact_id requis'}), 400
    
    db = get_db()
    cursor = db.cursor()
    
    try:
        # Vérifier que le contact existe
        cursor.execute("SELECT * FROM contacts WHERE id = ?", (contact_id,))
        contact = cursor.fetchone()
        
        if not contact:
            return jsonify({'error': 'Contact non trouvé'}), 404
        
        # Générer un token unique
        token = str(uuid.uuid4())
        expires_at = datetime.datetime.now() + datetime.timedelta(days=30)
        
        # Sauvegarder le token
        cursor.execute("""
            INSERT INTO contact_tokens (id, contact_id, token, expires_at, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (
            str(uuid.uuid4()),
            contact_id,
            token,
            expires_at.isoformat(),
            datetime.datetime.now().isoformat()
        ))
        
        db.commit()
        
        print(f"[API.TOKENS.GENERATE] SUCCESS: token generated for {contact_id}")
        
        return jsonify({
            'token': token,
            'expires_at': expires_at.isoformat(),
            'contact_id': contact_id
        })
        
    except Exception as e:
        print(f"[API.TOKENS.GENERATE] ERROR: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/validate', methods=['POST'])
def validate_token():
    """Validate an access token."""
    print("[API.TOKENS.VALIDATE] START: validating token")
    
    data = request.get_json()
    token = data.get('token')
    
    if not token:
        return jsonify({'error': 'token requis'}), 400
    
    db = get_db()
    cursor = db.cursor()
    
    try:
        cursor.execute("""
            SELECT t.*, c.nom, c.prenom, c.email 
            FROM contact_tokens t
            JOIN contacts c ON t.contact_id = c.id
            WHERE t.token = ? AND t.expires_at > ?
        """, (token, datetime.datetime.now().isoformat()))
        
        token_data = cursor.fetchone()
        
        if not token_data:
            return jsonify({'valid': False, 'error': 'Token invalide ou expiré'}), 401
        
        print(f"[API.TOKENS.VALIDATE] SUCCESS: token valid for {token_data['contact_id']}")
        
        return jsonify({
            'valid': True,
            'contact': {
                'id': token_data['contact_id'],
                'nom': token_data['nom'],
                'prenom': token_data['prenom'],
                'email': token_data['email']
            }
        })
        
    except Exception as e:
        print(f"[API.TOKENS.VALIDATE] ERROR: {str(e)}")
        return jsonify({'error': str(e)}), 500
