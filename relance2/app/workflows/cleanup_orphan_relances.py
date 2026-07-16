"""
Workflow: Cleanup Orphan Relances

Supprime les relances orphelines (sans contact ou sans impayé).
"""

import uuid
import datetime
from ..db import get_db


def cleanup_orphan_relances():
    """Remove relances without valid contact or impaye."""
    workflow_id = str(uuid.uuid4())
    print(f"[WORKFLOW.CLEANUP_ORPHAN] START: {workflow_id}")
    
    db = get_db()
    cursor = db.cursor()
    
    try:
        deleted_count = 0
        
        # Supprimer les relances sans contact
        print(f"[WORKFLOW.CLEANUP_ORPHAN] STEP: Cleaning orphan by contact")
        
        cursor.execute("""
            DELETE FROM relances 
            WHERE contact_id NOT IN (SELECT id FROM contacts)
            AND statut NOT IN ('envoyee', 'payee')
        """)
        
        deleted_count += cursor.rowcount
        
        # Supprimer les relances sans impayé
        print(f"[WORKFLOW.CLEANUP_ORPHAN] STEP: Cleaning orphan by impaye")
        
        cursor.execute("""
            DELETE FROM relances 
            WHERE impaye_id IS NOT NULL 
            AND impaye_id NOT IN (SELECT id FROM impayes)
        """)
        
        deleted_count += cursor.rowcount
        
        # Supprimer les relances sans séquence
        print(f"[WORKFLOW.CLEANUP_ORPHAN] STEP: Cleaning orphan by sequence")
        
        cursor.execute("""
            DELETE FROM relances 
            WHERE sequence_id NOT IN (SELECT id FROM sequences)
        """)
        
        deleted_count += cursor.rowcount
        
        db.commit()
        
        print(f"[WORKFLOW.CLEANUP_ORPHAN] SUCCESS: Deleted {deleted_count} orphan relances")
        
        return {'deleted': deleted_count}
        
    except Exception as e:
        print(f"[WORKFLOW.CLEANUP_ORPHAN] ERROR: {str(e)}")
        raise
