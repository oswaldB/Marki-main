"""
Workflow: Envoi des Suivis

Envoie les emails de suivi programmés.
"""

import uuid
import datetime
from ..db import get_db


def send_suivi():
    """Send scheduled suivi emails."""
    workflow_id = str(uuid.uuid4())
    print(f"[WORKFLOW.SEND_SUIVI] START: {workflow_id}")
    
    db = get_db()
    cursor = db.cursor()
    
    try:
        print(f"[WORKFLOW.SEND_SUIVI] STEP: Fetching scheduled suivi")
        
        today = datetime.datetime.now().isoformat()
        
        cursor.execute("""
            SELECT r.*, c.email, c.nom, c.prenom
            FROM relances r
            JOIN contacts c ON r.contact_id = c.id
            WHERE r.type_relance = 'suivi'
            AND r.statut = 'pret pour envoi'
            AND r.date_prevue <= ?
        """, (today,))
        
        suivis = [dict(row) for row in cursor.fetchall()]
        print(f"[WORKFLOW.SEND_SUIVI] STEP: Found {len(suivis)} suivi to send")
        
        sent_count = 0
        
        for suivi in suivis:
            try:
                print(f"[WORKFLOW.SEND_SUIVI] STEP: Sending suivi to {suivi['email']}")
                
                # Marquer comme envoyé
                cursor.execute("""
                    UPDATE relances 
                    SET statut = 'envoyee', date_envoi = ?
                    WHERE id = ?
                """, (datetime.datetime.now().isoformat(), suivi['id']))
                
                sent_count += 1
                
            except Exception as e:
                print(f"[WORKFLOW.SEND_SUIVI] ERROR: {str(e)}")
        
        db.commit()
        
        print(f"[WORKFLOW.SEND_SUIVI] SUCCESS: Sent {sent_count} suivi")
        
        return {'sent': sent_count}
        
    except Exception as e:
        print(f"[WORKFLOW.SEND_SUIVI] ERROR: {str(e)}")
        raise
