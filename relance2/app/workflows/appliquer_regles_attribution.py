"""
Workflow: Appliquer les Règles d'Attribution

Attribue automatiquement les séquences aux impayés selon les règles métier.
"""

import uuid
import datetime
from ..db import get_db


def appliquer_regles_attribution():
    """Apply attribution rules to unpaid invoices."""
    workflow_id = str(uuid.uuid4())
    print(f"[WORKFLOW.APPLIQUER_REGLES] START: {workflow_id}")
    
    db = get_db()
    cursor = db.cursor()
    
    try:
        print(f"[WORKFLOW.APPLIQUER_REGLES] STEP: Fetching unattributed impayes")
        
        # Récupérer les impayés sans séquence attribuée
        cursor.execute("""
            SELECT i.*, c.type_personne, c.activite_societe
            FROM impayes i
            JOIN contacts c ON i.payer_id = c.id
            WHERE i.sequence_id IS NULL 
            AND i.statut = 'impaye'
            AND i.suspendu = 0
            AND c.is_blacklisted = 0
        """)
        
        impayes = [dict(row) for row in cursor.fetchall()]
        print(f"[WORKFLOW.APPLIQUER_REGLES] STEP: Found {len(impayes)} unattributed impayes")
        
        attributed_count = 0
        
        for impaye in impayes:
            # Déterminer la séquence appropriée selon les règles
            sequence_id = None
            
            # Règle 1: Type de personne
            if impaye['type_personne'] == 'S':
                # Société
                cursor.execute("""
                    SELECT id FROM sequences 
                    WHERE type_sequence = 'relance' AND actif = 1
                    AND niveau = 1
                    ORDER BY created_at LIMIT 1
                """)
            else:
                # Particulier
                cursor.execute("""
                    SELECT id FROM sequences 
                    WHERE type_sequence = 'relance' AND actif = 1
                    AND niveau = 2
                    ORDER BY created_at LIMIT 1
                """)
            
            seq = cursor.fetchone()
            if seq:
                sequence_id = seq['id']
            
            # Règle 2: Montant
            if impaye['reste_a_payer'] > 10000:
                # Gros montant = séquence prioritaire
                cursor.execute("""
                    SELECT id FROM sequences 
                    WHERE type_sequence = 'relance' AND actif = 1
                    AND niveau = 3
                    ORDER BY created_at LIMIT 1
                """)
                seq = cursor.fetchone()
                if seq:
                    sequence_id = seq['id']
            
            if sequence_id:
                cursor.execute("""
                    UPDATE impayes 
                    SET sequence_id = ?, updated_at = ?
                    WHERE id = ?
                """, (
                    sequence_id,
                    datetime.datetime.now().isoformat(),
                    impaye['id']
                ))
                
                attributed_count += 1
        
        db.commit()
        
        print(f"[WORKFLOW.APPLIQUER_REGLES] SUCCESS: Attributed {attributed_count} impayes")
        
        return {
            'attributed': attributed_count,
            'total': len(impayes)
        }
        
    except Exception as e:
        print(f"[WORKFLOW.APPLIQUER_REGLES] ERROR: {str(e)}")
        raise
