"""
Workflow: Synchronisation des Contacts

Synchronise les contacts depuis une source externe (CRM, etc.).
"""

import uuid
import datetime
from ..db import get_db


def sync_contacts(source='external'):
    """Sync contacts from external source."""
    workflow_id = str(uuid.uuid4())
    print(f"[WORKFLOW.SYNC_CONTACTS] START: {workflow_id}, source={source}")
    
    db = get_db()
    cursor = db.cursor()
    
    try:
        print(f"[WORKFLOW.SYNC_CONTACTS] STEP: Syncing from {source}")
        
        # Simulation de récupération de contacts externes
        # En production, cela appellerait une API externe
        external_contacts = []
        
        # Pour chaque contact externe
        created_count = 0
        updated_count = 0
        
        for ext_contact in external_contacts:
            # Vérifier si le contact existe déjà
            cursor.execute(
                "SELECT id FROM contacts WHERE email = ?",
                (ext_contact.get('email'),)
            )
            
            existing = cursor.fetchone()
            
            if existing:
                # Mettre à jour
                cursor.execute("""
                    UPDATE contacts 
                    SET nom = ?, prenom = ?, telephone = ?, updated_at = ?
                    WHERE id = ?
                """, (
                    ext_contact.get('nom'),
                    ext_contact.get('prenom'),
                    ext_contact.get('telephone'),
                    datetime.datetime.now().isoformat(),
                    existing['id']
                ))
                updated_count += 1
            else:
                # Créer
                contact_id = f"cont_{datetime.datetime.now().timestamp()}"
                cursor.execute("""
                    INSERT INTO contacts (
                        id, nom, prenom, email, telephone, type_personne,
                        statut, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    contact_id,
                    ext_contact.get('nom'),
                    ext_contact.get('prenom'),
                    ext_contact.get('email'),
                    ext_contact.get('telephone'),
                    ext_contact.get('type', 'P'),
                    'actif',
                    datetime.datetime.now().isoformat(),
                    datetime.datetime.now().isoformat()
                ))
                created_count += 1
        
        db.commit()
        
        print(f"[WORKFLOW.SYNC_CONTACTS] SUCCESS: Created {created_count}, Updated {updated_count}")
        
        return {
            'created': created_count,
            'updated': updated_count
        }
        
    except Exception as e:
        print(f"[WORKFLOW.SYNC_CONTACTS] ERROR: {str(e)}")
        raise
