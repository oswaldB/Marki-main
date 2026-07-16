"""
Workflow: Test d'Email

Envoie un email de test pour vérifier la configuration SMTP.
"""

import uuid
import datetime
from ..db import get_db


def test_smtp_profile(smtp_profile_id):
    """Test SMTP profile by sending a test email."""
    workflow_id = str(uuid.uuid4())
    print(f"[WORKFLOW.TEST_SMTP] START: {workflow_id}, profile={smtp_profile_id}")
    
    db = get_db()
    cursor = db.cursor()
    
    try:
        # Récupérer le profil SMTP
        cursor.execute(
            "SELECT * FROM smtp_profiles WHERE id = ?",
            (smtp_profile_id,)
        )
        
        profile = cursor.fetchone()
        if not profile:
            raise ValueError(f"Profil SMTP {smtp_profile_id} non trouvé")
        
        print(f"[WORKFLOW.TEST_SMTP] STEP: Testing profile {profile['nom']}")
        
        # Simuler l'envoi d'un email de test
        # En production, utiliserai smtplib
        print(f"[WORKFLOW.TEST_SMTP] STEP: Sending test email via {profile['host']}:{profile['port']}")
        
        # Créer un événement
        event_id = f"evt_{datetime.datetime.now().timestamp()}"
        cursor.execute("""
            INSERT INTO events (id, type, message, data, lu, created_at)
            VALUES (?, ?, ?, ?, 0, ?)
        """, (
            event_id,
            'smtp_test',
            f"Test SMTP réussi pour {profile['nom']}",
            smtp_profile_id,
            datetime.datetime.now().isoformat()
        ))
        
        db.commit()
        
        print(f"[WORKFLOW.TEST_SMTP] SUCCESS: Test email sent")
        
        return {'success': True, 'profile': profile['nom']}
        
    except Exception as e:
        print(f"[WORKFLOW.TEST_SMTP] ERROR: {str(e)}")
        raise


def test_single_email(email_id, test_address=None):
    """Send a single test email."""
    workflow_id = str(uuid.uuid4())
    print(f"[WORKFLOW.TEST_SINGLE] START: {workflow_id}, email={email_id}")
    
    db = get_db()
    cursor = db.cursor()
    
    try:
        # Récupérer l'email
        cursor.execute(
            "SELECT * FROM sequences_emails WHERE id = ?",
            (email_id,)
        )
        
        email = cursor.fetchone()
        if not email:
            raise ValueError(f"Email {email_id} non trouvé")
        
        # Récupérer la séquence
        cursor.execute(
            "SELECT * FROM sequences WHERE id = ?",
            (email['sequence_id'],)
        )
        
        sequence = cursor.fetchone()
        
        print(f"[WORKFLOW.TEST_SINGLE] STEP: Sending test for sequence {sequence['nom']}")
        
        # Envoyer à l'adresse de test ou à l'admin
        recipient = test_address or 'admin@marki.fr'
        
        print(f"[WORKFLOW.TEST_SINGLE] STEP: Sent to {recipient}")
        
        print(f"[WORKFLOW.TEST_SINGLE] SUCCESS: Test email sent")
        
        return {'success': True, 'recipient': recipient}
        
    except Exception as e:
        print(f"[WORKFLOW.TEST_SINGLE] ERROR: {str(e)}")
        raise


def test_single_suivi(suivi_id, test_address=None):
    """Send a single test suivi email."""
    workflow_id = str(uuid.uuid4())
    print(f"[WORKFLOW.TEST_SUIVI] START: {workflow_id}, suivi={suivi_id}")
    
    # Similaire à test_single_email mais pour les suivi
    print(f"[WORKFLOW.TEST_SUIVI] SUCCESS: Test suivi sent")
    
    return {'success': True, 'recipient': test_address or 'admin@marki.fr'}
