"""
Workflow: Génération de Token Contact

Génère un token de connexion pour le portail client.
"""

import uuid
import datetime
import secrets
from ..db import get_db


def generate_contact_token(contact_id, expires_days=30):
    """Generate access token for contact portal."""
    workflow_id = str(uuid.uuid4())
    print(f"[WORKFLOW.GENERATE_TOKEN] START: {workflow_id}, contact={contact_id}")
    
    db = get_db()
    cursor = db.cursor()
    
    try:
        # Vérifier que le contact existe
        cursor.execute("SELECT * FROM contacts WHERE id = ?", (contact_id,))
        contact = cursor.fetchone()
        
        if not contact:
            raise ValueError(f"Contact {contact_id} non trouvé")
        
        # Générer un token sécurisé
        token = secrets.token_urlsafe(32)
        expires_at = datetime.datetime.now() + datetime.timedelta(days=expires_days)
        
        # Créer la table si elle n'existe pas
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS contact_tokens (
                id TEXT PRIMARY KEY,
                contact_id TEXT NOT NULL,
                token TEXT NOT NULL UNIQUE,
                expires_at TEXT NOT NULL,
                used INTEGER DEFAULT 0,
                created_at TEXT NOT NULL
            )
        """)
        
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
        
        print(f"[WORKFLOW.GENERATE_TOKEN] SUCCESS: token generated for {contact_id}")
        
        return {
            'token': token,
            'expires_at': expires_at.isoformat(),
            'contact_id': contact_id,
            'contact_email': contact['email']
        }
        
    except Exception as e:
        print(f"[WORKFLOW.GENERATE_TOKEN] ERROR: {str(e)}")
        raise
