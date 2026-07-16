"""
Workflow: Nettoyage des Relances

Nettoie les relances obsolètes ou orphelines.
"""

import uuid
import datetime
from ..db import get_db


def cleanup_relances():
    """Cleanup obsolete relances."""
    workflow_id = str(uuid.uuid4())
    print(f"[WORKFLOW.CLEANUP_RELANCES] START: {workflow_id}")
    
    db = get_db()
    cursor = db.cursor()
    
    try:
        deleted_count = 0
        
        # 1. Supprimer les relances des contacts blacklistés
        print(f"[WORKFLOW.CLEANUP_RELANCES] STEP: Cleaning blacklisted contacts")
        
        cursor.execute("""
            DELETE FROM relances 
            WHERE contact_id IN (
                SELECT id FROM contacts WHERE is_blacklisted = 1
            )
            AND statut NOT IN ('envoyee', 'payee')
        """)
        
        deleted_count += cursor.rowcount
        
        # 2. Supprimer les relances des impayés soldés
        print(f"[WORKFLOW.CLEANUP_RELANCES] STEP: Cleaning paid impayes")
        
        cursor.execute("""
            DELETE FROM relances 
            WHERE impaye_id IN (
                SELECT id FROM impayes WHERE statut = 'paye' OR reste_a_payer = 0
            )
            AND statut NOT IN ('envoyee', 'payee')
        """)
        
        deleted_count += cursor.rowcount
        
        # 3. Supprimer les relances orphelines (sans impaye)
        print(f"[WORKFLOW.CLEANUP_RELANCES] STEP: Cleaning orphan relances")
        
        cursor.execute("""
            DELETE FROM relances 
            WHERE impaye_id NOT IN (SELECT id FROM impayes)
        """)
        
        deleted_count += cursor.rowcount
        
        db.commit()
        
        print(f"[WORKFLOW.CLEANUP_RELANCES] SUCCESS: Deleted {deleted_count} relances")
        
        return {'deleted': deleted_count}
        
    except Exception as e:
        print(f"[WORKFLOW.CLEANUP_RELANCES] ERROR: {str(e)}")
        raise
