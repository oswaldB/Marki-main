"""
Workflow: Gestion de la Blacklist

Blacklister ou déblacklister un contact avec gestion des relances.
"""

import uuid
import datetime
from ..db import get_db


def blacklist_contact(contact_id, motif=None):
    """Blacklist a contact and cancel related relances."""
    workflow_id = str(uuid.uuid4())
    print(f"[WORKFLOW.BLACKLIST] START: {workflow_id}, contact={contact_id}")
    
    db = get_db()
    cursor = db.cursor()
    
    try:
        # Mettre à jour le contact
        cursor.execute("""
            UPDATE contacts 
            SET is_blacklisted = 1, 
                blacklist_date = ?,
                blacklist_motif = ?,
                updated_at = ?
            WHERE id = ?
        """, (
            datetime.datetime.now().isoformat(),
            motif or 'Blacklist manuelle',
            datetime.datetime.now().isoformat(),
            contact_id
        ))
        
        # Annuler les relances en attente
        cursor.execute("""
            UPDATE relances 
            SET statut = 'annulee',
                updated_at = ?
            WHERE contact_id = ? 
            AND statut IN ('brouillon', 'pret pour envoi')
        """, (
            datetime.datetime.now().isoformat(),
            contact_id
        ))
        
        cancelled_count = cursor.rowcount
        
        # Blacklister aussi les impayés
        cursor.execute("""
            UPDATE impayes 
            SET is_blacklisted = 1,
                blacklist_date = ?,
                updated_at = ?
            WHERE payer_id = ? OR contact_relance_id = ?
        """, (
            datetime.datetime.now().isoformat(),
            datetime.datetime.now().isoformat(),
            contact_id,
            contact_id
        ))
        
        db.commit()
        
        print(f"[WORKFLOW.BLACKLIST] SUCCESS: Contact blacklisted, {cancelled_count} relances cancelled")
        
        return {
            'contact_id': contact_id,
            'relances_cancelled': cancelled_count
        }
        
    except Exception as e:
        print(f"[WORKFLOW.BLACKLIST] ERROR: {str(e)}")
        raise


def unblacklist_contact(contact_id):
    """Remove contact from blacklist."""
    workflow_id = str(uuid.uuid4())
    print(f"[WORKFLOW.UNBLACKLIST] START: {workflow_id}, contact={contact_id}")
    
    db = get_db()
    cursor = db.cursor()
    
    try:
        cursor.execute("""
            UPDATE contacts 
            SET is_blacklisted = 0, 
                blacklist_date = NULL,
                blacklist_motif = NULL,
                updated_at = ?
            WHERE id = ?
        """, (
            datetime.datetime.now().isoformat(),
            contact_id
        ))
        
        # Déblacklister les impayés
        cursor.execute("""
            UPDATE impayes 
            SET is_blacklisted = 0,
                blacklist_date = NULL,
                blacklist_motif = NULL,
                updated_at = ?
            WHERE payer_id = ? OR contact_relance_id = ?
        """, (
            datetime.datetime.now().isoformat(),
            contact_id,
            contact_id
        ))
        
        db.commit()
        
        print(f"[WORKFLOW.UNBLACKLIST] SUCCESS: Contact unblacklisted")
        
        return {'contact_id': contact_id}
        
    except Exception as e:
        print(f"[WORKFLOW.UNBLACKLIST] ERROR: {str(e)}")
        raise
