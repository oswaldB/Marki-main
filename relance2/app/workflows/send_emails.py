"""
Workflow: Envoi des Emails de Relance

Envoie les emails de relance programmés.
"""

import uuid
import datetime
from ..db import get_db


def send_emails():
    """Send scheduled relance emails."""
    workflow_id = str(uuid.uuid4())
    print(f"[WORKFLOW.SEND_EMAILS] START: {workflow_id}")
    
    db = get_db()
    cursor = db.cursor()
    
    try:
        # Récupérer les relances prêtes à envoyer
        print(f"[WORKFLOW.SEND_EMAILS] STEP: Fetching ready relances")
        
        today = datetime.datetime.now().isoformat()
        
        cursor.execute("""
            SELECT r.*, c.email, c.nom, c.prenom
            FROM relances r
            JOIN contacts c ON r.contact_id = c.id
            WHERE r.statut = 'pret pour envoi'
              AND r.date_prevue <= ?
              AND r.validation_requise = 0
        """, (today,))
        
        relances = [dict(row) for row in cursor.fetchall()]
        print(f"[WORKFLOW.SEND_EMAILS] STEP: Found {len(relances)} relances to send")
        
        sent_count = 0
        error_count = 0
        
        for relance in relances:
            try:
                # Simuler l'envoi d'email (à remplacer par SMTP réel)
                print(f"[WORKFLOW.SEND_EMAILS] STEP: Sending to {relance['email']}")
                
                # Marquer comme envoyée
                cursor.execute("""
                    UPDATE relances 
                    SET statut = 'envoyee', date_envoi = ?
                    WHERE id = ?
                """, (datetime.datetime.now().isoformat(), relance['id']))
                
                # Créer un événement
                event_id = f"evt_{datetime.datetime.now().timestamp()}"
                cursor.execute("""
                    INSERT INTO events (id, type, message, data, lu, created_at)
                    VALUES (?, ?, ?, ?, 0, ?)
                """, (
                    event_id,
                    'relance_envoyee',
                    f"Relance envoyée à {relance['email']}",
                    relance['id'],
                    datetime.datetime.now().isoformat()
                ))
                
                sent_count += 1
                
            except Exception as e:
                print(f"[WORKFLOW.SEND_EMAILS] ERROR sending to {relance['email']}: {str(e)}")
                error_count += 1
        
        db.commit()
        
        print(f"[WORKFLOW.SEND_EMAILS] SUCCESS: Sent {sent_count}, Errors {error_count}")
        
        return {
            'sent': sent_count,
            'errors': error_count
        }
        
    except Exception as e:
        print(f"[WORKFLOW.SEND_EMAILS] ERROR: {str(e)}")
        raise
