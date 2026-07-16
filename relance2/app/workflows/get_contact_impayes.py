"""
Workflow: Récupération des Impayés par Contact

Récupère tous les impayés d'un contact avec calcul des totaux.
"""

import uuid
from ..db import get_db


def get_contact_impayes(contact_id):
    """Get all impayes for a contact with totals."""
    workflow_id = str(uuid.uuid4())
    print(f"[WORKFLOW.GET_CONTACT_IMPAYES] START: {workflow_id}, contact={contact_id}")
    
    db = get_db()
    cursor = db.cursor()
    
    try:
        # Vérifier que le contact existe
        cursor.execute("SELECT * FROM contacts WHERE id = ?", (contact_id,))
        contact = cursor.fetchone()
        
        if not contact:
            raise ValueError(f"Contact {contact_id} non trouvé")
        
        # Récupérer les impayés
        cursor.execute("""
            SELECT * FROM impayes 
            WHERE (payer_id = ? OR contact_relance_id = ?)
            AND statut = 'impaye'
            AND suspendu = 0
            ORDER BY date_echeance ASC
        """, (contact_id, contact_id))
        
        impayes = [dict(row) for row in cursor.fetchall()]
        
        # Calculer les totaux
        total_restant = sum(i['reste_a_payer'] or 0 for i in impayes)
        total_ttc = sum(i['montant_ttc'] or 0 for i in impayes)
        
        print(f"[WORKFLOW.GET_CONTACT_IMPAYES] SUCCESS: Found {len(impayes)} impayes, total={total_restant}")
        
        return {
            'contact': dict(contact),
            'impayes': impayes,
            'count': len(impayes),
            'total_restant': total_restant,
            'total_ttc': total_ttc
        }
        
    except Exception as e:
        print(f"[WORKFLOW.GET_CONTACT_IMPAYES] ERROR: {str(e)}")
        raise
