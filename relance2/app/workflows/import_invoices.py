"""
Workflow: Import des Factures

Importe les factures depuis un fichier (CSV, Excel, etc.).
"""

import uuid
import datetime
from ..db import get_db


def import_invoices(data, source='manual'):
    """Import invoices from data."""
    workflow_id = str(uuid.uuid4())
    print(f"[WORKFLOW.IMPORT_INVOICES] START: {workflow_id}, source={source}")
    
    db = get_db()
    cursor = db.cursor()
    
    try:
        imported_count = 0
        errors = []
        
        for row in data:
            try:
                # Vérifier si la facture existe déjà
                cursor.execute(
                    "SELECT id FROM impayes WHERE nfacture = ?",
                    (row.get('nfacture'),)
                )
                
                if cursor.fetchone():
                    errors.append(f"Facture {row.get('nfacture')} déjà existante")
                    continue
                
                # Créer l'impayé
                impaye_id = f"imp_{datetime.datetime.now().timestamp()}"
                
                cursor.execute("""
                    INSERT INTO impayes (
                        id, payer_id, nfacture, date_facture, date_echeance,
                        montant_ttc, reste_a_payer, statut, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    impaye_id,
                    row.get('payer_id'),
                    row.get('nfacture'),
                    row.get('date_facture'),
                    row.get('date_echeance'),
                    row.get('montant_ttc', 0),
                    row.get('reste_a_payer', row.get('montant_ttc', 0)),
                    'impaye',
                    datetime.datetime.now().isoformat(),
                    datetime.datetime.now().isoformat()
                ))
                
                imported_count += 1
                
            except Exception as e:
                errors.append(f"Erreur ligne {row}: {str(e)}")
        
        db.commit()
        
        print(f"[WORKFLOW.IMPORT_INVOICES] SUCCESS: Imported {imported_count}, Errors {len(errors)}")
        
        return {
            'imported': imported_count,
            'errors': errors
        }
        
    except Exception as e:
        print(f"[WORKFLOW.IMPORT_INVOICES] ERROR: {str(e)}")
        raise
