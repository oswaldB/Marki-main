"""
Workflow: Vérification des Factures Payées

Vérifie périodiquement les factures payées et met à jour les statuts.
"""

import uuid
import datetime
from ..db import get_db


def verify_paid_invoices():
    """Verify paid invoices and update status."""
    workflow_id = str(uuid.uuid4())
    print(f"[WORKFLOW.VERIFY_PAID] START: {workflow_id}")
    
    db = get_db()
    cursor = db.cursor()
    
    try:
        # Récupérer les impayés avec reste_a_payer = 0 mais statut != 'paye'
        cursor.execute("""
            SELECT * FROM impayes 
            WHERE reste_a_payer = 0 AND statut != 'paye'
        """)
        
        paid_impayes = [dict(row) for row in cursor.fetchall()]
        print(f"[WORKFLOW.VERIFY_PAID] STEP: Found {len(paid_impayes)} paid impayes")
        
        updated_count = 0
        
        for impaye in paid_impayes:
            # Mettre à jour le statut
            cursor.execute("""
                UPDATE impayes SET statut = 'paye', updated_at = ? WHERE id = ?
            """, (datetime.datetime.now().isoformat(), impaye['id']))
            
            # Annuler les relances en attente
            cursor.execute("""
                UPDATE relances SET statut = 'annulee' 
                WHERE impaye_id = ? AND statut IN ('brouillon', 'pret pour envoi')
            """, (impaye['id'],))
            
            # Créer un événement
            event_id = f"evt_{datetime.datetime.now().timestamp()}"
            cursor.execute("""
                INSERT INTO events (id, type, message, data, lu, created_at)
                VALUES (?, ?, ?, ?, 0, ?)
            """, (
                event_id,
                'facture_payee',
                f"Facture {impaye['nfacture']} marquée comme payée",
                impaye['id'],
                datetime.datetime.now().isoformat()
            ))
            
            updated_count += 1
        
        db.commit()
        
        print(f"[WORKFLOW.VERIFY_PAID] SUCCESS: Updated {updated_count} impayes")
        
        return {'updated': updated_count}
        
    except Exception as e:
        print(f"[WORKFLOW.VERIFY_PAID] ERROR: {str(e)}")
        raise
