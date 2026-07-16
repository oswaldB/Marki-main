"""
Workflow: Génération des Liens PDF

Génère des liens sécurisés pour télécharger les factures PDF.
"""

import uuid
import datetime
import hashlib
from ..db import get_db


def generate_pdf_links(impaye_ids=None):
    """Generate secure PDF download links for invoices."""
    workflow_id = str(uuid.uuid4())
    print(f"[WORKFLOW.GENERATE_PDF] START: {workflow_id}")
    
    db = get_db()
    cursor = db.cursor()
    
    try:
        # Récupérer les impayés
        if impaye_ids:
            placeholders = ','.join(['?' for _ in impaye_ids])
            cursor.execute(f"""
                SELECT i.*, c.email 
                FROM impayes i
                JOIN contacts c ON i.payer_id = c.id
                WHERE i.id IN ({placeholders})
            """, impaye_ids)
        else:
            cursor.execute("""
                SELECT i.*, c.email 
                FROM impayes i
                JOIN contacts c ON i.payer_id = c.id
                WHERE i.url_pdf_token IS NULL
            """)
        
        impayes = cursor.fetchall()
        print(f"[WORKFLOW.GENERATE_PDF] STEP: Found {len(impayes)} impayes")
        
        generated_count = 0
        
        for impaye in impayes:
            # Générer un token unique
            token_data = f"{impaye['id']}{impaye['nfacture']}{datetime.datetime.now().timestamp()}"
            token = hashlib.sha256(token_data.encode()).hexdigest()[:32]
            
            # Mettre à jour l'impayé
            cursor.execute("""
                UPDATE impayes 
                SET url_pdf_token = ?, updated_at = ?
                WHERE id = ?
            """, (
                token,
                datetime.datetime.now().isoformat(),
                impaye['id']
            ))
            
            generated_count += 1
        
        db.commit()
        
        print(f"[WORKFLOW.GENERATE_PDF] SUCCESS: Generated {generated_count} links")
        
        return {
            'generated': generated_count,
            'impayes': len(impayes)
        }
        
    except Exception as e:
        print(f"[WORKFLOW.GENERATE_PDF] ERROR: {str(e)}")
        raise
