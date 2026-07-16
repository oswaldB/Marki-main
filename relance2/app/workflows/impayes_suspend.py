"""
Workflow: Suspension et Réactivation des Impayés

Suspendre ou réactiver des factures.
"""

import uuid
import datetime
from ..db import get_db


def suspend_impaye(impaye_id, motif=None):
    """Suspend an impaye."""
    workflow_id = str(uuid.uuid4())
    print(f"[WORKFLOW.SUSPEND] START: {workflow_id}, impaye={impaye_id}")
    
    db = get_db()
    cursor = db.cursor()
    
    try:
        cursor.execute("""
            UPDATE impayes 
            SET suspendu = 1,
                suspend_date = ?,
                suspend_motif = ?,
                updated_at = ?
            WHERE id = ?
        """, (
            datetime.datetime.now().isoformat(),
            motif or 'Suspension manuelle',
            datetime.datetime.now().isoformat(),
            impaye_id
        ))
        
        # Annuler les relances liées
        cursor.execute("""
            UPDATE relances 
            SET statut = 'annulee',
                updated_at = ?
            WHERE impaye_id = ?
            AND statut IN ('brouillon', 'pret pour envoi')
        """, (
            datetime.datetime.now().isoformat(),
            impaye_id
        ))
        
        db.commit()
        
        print(f"[WORKFLOW.SUSPEND] SUCCESS: Impaye {impaye_id} suspended")
        
        return {'impaye_id': impaye_id, 'suspended': True}
        
    except Exception as e:
        print(f"[WORKFLOW.SUSPEND] ERROR: {str(e)}")
        raise


def unsuspend_impaye(impaye_id):
    """Reactivate a suspended impaye."""
    workflow_id = str(uuid.uuid4())
    print(f"[WORKFLOW.UNSUSPEND] START: {workflow_id}, impaye={impaye_id}")
    
    db = get_db()
    cursor = db.cursor()
    
    try:
        cursor.execute("""
            UPDATE impayes 
            SET suspendu = 0,
                suspend_date = NULL,
                suspend_motif = NULL,
                updated_at = ?
            WHERE id = ?
        """, (
            datetime.datetime.now().isoformat(),
            impaye_id
        ))
        
        db.commit()
        
        print(f"[WORKFLOW.UNSUSPEND] SUCCESS: Impaye {impaye_id} reactivated")
        
        return {'impaye_id': impaye_id, 'suspended': False}
        
    except Exception as e:
        print(f"[WORKFLOW.UNSUSPEND] ERROR: {str(e)}")
        raise
