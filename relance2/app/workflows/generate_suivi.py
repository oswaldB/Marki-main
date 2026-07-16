"""
Workflow: Génération des Séquences de Suivi

Génère les séquences de suivi pour les clients actifs.
"""

import uuid
import datetime
from ..db import get_db


def generate_suivi():
    """Generate suivi sequences for active clients."""
    workflow_id = str(uuid.uuid4())
    print(f"[WORKFLOW.GENERATE_SUIVI] START: {workflow_id}")
    
    db = get_db()
    cursor = db.cursor()
    
    try:
        # Récupérer les séquences de suivi actives
        print(f"[WORKFLOW.GENERATE_SUIVI] STEP: Fetching active suivi sequences")
        
        cursor.execute("""
            SELECT * FROM sequences 
            WHERE type_sequence = 'suivi' AND actif = 1
        """)
        
        sequences = [dict(row) for row in cursor.fetchall()]
        print(f"[WORKFLOW.GENERATE_SUIVI] STEP: Found {len(sequences)} sequences")
        
        created_count = 0
        
        for sequence in sequences:
            # Récupérer les emails de la séquence
            cursor.execute("""
                SELECT * FROM sequences_emails 
                WHERE sequence_id = ? ORDER BY email_index
            """, (sequence['id'],))
            
            emails = cursor.fetchall()
            
            if not emails:
                continue
            
            # Récupérer les contacts actifs pour ce suivi
            cursor.execute("""
                SELECT c.* FROM contacts c
                JOIN users u ON u.id = c.user_id
                WHERE c.is_blacklisted = 0 AND u.is_active = 1
            """)
            
            contacts = cursor.fetchall()
            
            for contact in contacts:
                # Vérifier si un suivi existe déjà pour ce contact/séquence
                cursor.execute("""
                    SELECT id FROM relances 
                    WHERE contact_id = ? AND sequence_id = ? AND type_relance = 'suivi'
                    AND statut IN ('brouillon', 'pret pour envoi')
                """, (contact['id'], sequence['id']))
                
                if cursor.fetchone():
                    continue
                
                # Créer les relances de suivi
                for email in emails:
                    relance_id = f"rel_{datetime.datetime.now().timestamp()}"
                    
                    # Calculer la date d'envoi
                    if sequence['frequence'] == 'quotidien':
                        date_prevue = datetime.datetime.now() + datetime.timedelta(days=email['delai'] or 1)
                    elif sequence['frequence'] == 'hebdomadaire':
                        date_prevue = datetime.datetime.now() + datetime.timedelta(weeks=email['delai'] or 1)
                    else:  # mensuel
                        date_prevue = datetime.datetime.now() + datetime.timedelta(days=(email['delai'] or 1) * 30)
                    
                    cursor.execute("""
                        INSERT INTO relances (
                            id, contact_id, sequence_id, statut, type_relance,
                            date_prevue, email_sujet, email_corps, validation_requise,
                            created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        relance_id,
                        contact['id'],
                        sequence['id'],
                        'pret pour envoi',
                        'suivi',
                        date_prevue.isoformat(),
                        f"Suivi: {sequence['nom']}",
                        f"Email de suivi automatique #{email['email_index'] + 1}",
                        0,
                        datetime.datetime.now().isoformat(),
                        datetime.datetime.now().isoformat()
                    ))
                    
                    created_count += 1
        
        db.commit()
        
        print(f"[WORKFLOW.GENERATE_SUIVI] SUCCESS: Created {created_count} suivi relances")
        
        return {
            'suivi_crees': created_count,
            'sequences': len(sequences)
        }
        
    except Exception as e:
        print(f"[WORKFLOW.GENERATE_SUIVI] ERROR: {str(e)}")
        raise
