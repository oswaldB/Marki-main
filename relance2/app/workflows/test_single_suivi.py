"""
Workflow: Test Single Suivi

Envoie un email de test spécifique pour les séquences de suivi.
"""

import uuid
import datetime
from ..db import get_db


def test_single_suivi(suivi_id, test_address=None):
    """Send a test email for a suivi sequence."""
    workflow_id = str(uuid.uuid4())
    print(f"[WORKFLOW.TEST_SINGLE_SUIVI] START: {workflow_id}, suivi={suivi_id}")
    
    db = get_db()
    cursor = db.cursor()
    
    try:
        # Récupérer l'email de suivi
        cursor.execute(
            "SELECT * FROM sequences_emails WHERE id = ?",
            (suivi_id,)
        )
        
        suivi = cursor.fetchone()
        if not suivi:
            raise ValueError(f"Suivi {suivi_id} non trouvé")
        
        # Récupérer la séquence
        cursor.execute(
            "SELECT * FROM sequences WHERE id = ?",
            (suivi['sequence_id'],)
        )
        
        sequence = cursor.fetchone()
        
        print(f"[WORKFLOW.TEST_SINGLE_SUIVI] STEP: Testing suivi for sequence {sequence['nom']}")
        
        # Envoyer à l'adresse de test ou admin
        recipient = test_address or 'admin@marki.fr'
        
        # Simuler l'envoi
        print(f"[WORKFLOW.TEST_SINGLE_SUIVI] STEP: Sending test suivi to {recipient}")
        print(f"[WORKFLOW.TEST_SINGLE_SUIVI] STEP: Frequence: {sequence['frequence']}")
        print(f"[WORKFLOW.TEST_SINGLE_SUIVI] STEP: Email index: {suivi['email_index']}")
        
        # Créer un événement
        event_id = f"evt_{datetime.datetime.now().timestamp()}"
        cursor.execute("""
            INSERT INTO events (id, type, message, data, lu, created_at)
            VALUES (?, ?, ?, ?, 0, ?)
        """, (
            event_id,
            'test_suivi_sent',
            f"Test suivi envoyé à {recipient}",
            suivi_id,
            datetime.datetime.now().isoformat()
        ))
        
        db.commit()
        
        print(f"[WORKFLOW.TEST_SINGLE_SUIVI] SUCCESS: Test suivi sent")
        
        return {
            'success': True,
            'recipient': recipient,
            'sequence': sequence['nom'],
            'frequence': sequence['frequence']
        }
        
    except Exception as e:
        print(f"[WORKFLOW.TEST_SINGLE_SUIVI] ERROR: {str(e)}")
        raise
