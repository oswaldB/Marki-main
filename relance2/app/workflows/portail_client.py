"""
Workflow: Portail Client

Gestion du portail client et des accès.
"""

import uuid
import datetime
from ..db import get_db


def get_portail_data(token):
    """Get client data for portal using token."""
    workflow_id = str(uuid.uuid4())
    print(f"[WORKFLOW.PORTAIL_DATA] START: {workflow_id}")
    
    db = get_db()
    cursor = db.cursor()
    
    try:
        # Vérifier le token
        cursor.execute("""
            SELECT ct.*, c.* FROM contact_tokens ct
            JOIN contacts c ON ct.contact_id = c.id
            WHERE ct.token = ? AND ct.expires_at > ?
        """, (token, datetime.datetime.now().isoformat()))
        
        token_data = cursor.fetchone()
        
        if not token_data:
            raise ValueError("Token invalide ou expiré")
        
        contact_id = token_data['contact_id']
        
        # Récupérer les impayés
        cursor.execute("""
            SELECT * FROM impayes 
            WHERE payer_id = ? AND statut = 'impaye'
            ORDER BY date_echeance ASC
        """, (contact_id,))
        
        impayes = [dict(row) for row in cursor.fetchall()]
        
        # Récupérer les factures payées
        cursor.execute("""
            SELECT * FROM impayes 
            WHERE payer_id = ? AND statut = 'paye'
            ORDER BY date_echeance DESC
            LIMIT 10
        """, (contact_id,))
        
        factures = [dict(row) for row in cursor.fetchall()]
        
        print(f"[WORKFLOW.PORTAIL_DATA] SUCCESS: Data retrieved for {contact_id}")
        
        return {
            'contact': {
                'id': contact_id,
                'nom': token_data['nom'],
                'prenom': token_data['prenom'],
                'email': token_data['email']
            },
            'impayes': impayes,
            'factures': factures,
            'total_du': sum(i['reste_a_payer'] or 0 for i in impayes)
        }
        
    except Exception as e:
        print(f"[WORKFLOW.PORTAIL_DATA] ERROR: {str(e)}")
        raise


def initiate_payment(impaye_id, token):
    """Initiate payment for an invoice."""
    workflow_id = str(uuid.uuid4())
    print(f"[WORKFLOW.INITIATE_PAYMENT] START: {workflow_id}, impaye={impaye_id}")
    
    db = get_db()
    cursor = db.cursor()
    
    try:
        # Vérifier le token et l'impayé
        cursor.execute("""
            SELECT ct.contact_id FROM contact_tokens ct
            WHERE ct.token = ? AND ct.expires_at > ?
        """, (token, datetime.datetime.now().isoformat()))
        
        token_data = cursor.fetchone()
        if not token_data:
            raise ValueError("Token invalide")
        
        cursor.execute("""
            SELECT * FROM impayes 
            WHERE id = ? AND payer_id = ?
        """, (impaye_id, token_data['contact_id']))
        
        impaye = cursor.fetchone()
        if not impaye:
            raise ValueError("Facture non trouvée")
        
        # Créer une session de paiement (simulé)
        payment_session = {
            'session_id': str(uuid.uuid4()),
            'impaye_id': impaye_id,
            'amount': impaye['reste_a_payer'],
            'status': 'pending'
        }
        
        print(f"[WORKFLOW.INITIATE_PAYMENT] SUCCESS: Payment session created")
        
        return payment_session
        
    except Exception as e:
        print(f"[WORKFLOW.INITIATE_PAYMENT] ERROR: {str(e)}")
        raise
