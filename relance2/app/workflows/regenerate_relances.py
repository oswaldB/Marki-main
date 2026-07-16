"""
Workflow: Régénération des Relances

Régénère les relances pour un contact ou avec un statut spécifique.
"""

import uuid
import datetime
from ..db import get_db


def regenerate_relances_contact(contact_id):
    """Regenerate relances for a specific contact."""
    workflow_id = str(uuid.uuid4())
    print(f"[WORKFLOW.REGENERATE_CONTACT] START: {workflow_id}, contact={contact_id}")
    
    db = get_db()
    cursor = db.cursor()
    
    try:
        # Annuler les relances existantes
        cursor.execute("""
            UPDATE relances SET statut = 'annulee'
            WHERE contact_id = ? AND statut IN ('brouillon', 'pret pour envoi')
        """, (contact_id,))
        
        # Régénérer
        cursor.execute("""
            SELECT i.* FROM impayes i
            JOIN contacts c ON i.payer_id = c.id
            WHERE c.id = ? AND i.statut = 'impaye' AND i.suspendu = 0
        """, (contact_id,))
        
        impayes = cursor.fetchall()
        
        created_count = 0
        for impaye in impayes:
            # Créer nouvelle relance
            relance_id = f"rel_{datetime.datetime.now().timestamp()}"
            cursor.execute("""
                INSERT INTO relances (
                    id, contact_id, impaye_id, sequence_id, statut, type_relance,
                    date_prevue, validation_requise, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                relance_id,
                contact_id,
                impaye['id'],
                impaye['sequence_id'],
                'brouillon',
                'regenerée',
                datetime.datetime.now().isoformat(),
                1,
                datetime.datetime.now().isoformat(),
                datetime.datetime.now().isoformat()
            ))
            created_count += 1
        
        db.commit()
        
        print(f"[WORKFLOW.REGENERATE_CONTACT] SUCCESS: Created {created_count} relances")
        
        return {'created': created_count}
        
    except Exception as e:
        print(f"[WORKFLOW.REGENERATE_CONTACT] ERROR: {str(e)}")
        raise


def regenerate_relances_with_status(old_status, new_status='brouillon'):
    """Regenerate relances with specific status."""
    workflow_id = str(uuid.uuid4())
    print(f"[WORKFLOW.REGENERATE_STATUS] START: {workflow_id}, old={old_status}, new={new_status}")
    
    db = get_db()
    cursor = db.cursor()
    
    try:
        cursor.execute("""
            SELECT DISTINCT contact_id FROM relances
            WHERE statut = ?
        """, (old_status,))
        
        contacts = cursor.fetchall()
        
        total_created = 0
        for contact in contacts:
            result = regenerate_relances_contact(contact['contact_id'])
            total_created += result.get('created', 0)
        
        print(f"[WORKFLOW.REGENERATE_STATUS] SUCCESS: Created {total_created} relances")
        
        return {'created': total_created, 'contacts': len(contacts)}
        
    except Exception as e:
        print(f"[WORKFLOW.REGENERATE_STATUS] ERROR: {str(e)}")
        raise
