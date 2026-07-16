"""
Routes pour l'Import de Données

Import de factures et contacts depuis des fichiers CSV/Excel.
"""

from flask import Blueprint, request, jsonify
import uuid
import datetime
from ..db import get_db
from ..workflows.import_invoices import import_invoices

bp = Blueprint('import', __name__)


@bp.route('/invoices', methods=['POST'])
def import_invoices_endpoint():
    """Import invoices from uploaded data."""
    print("[API.IMPORT.INVOICES] START: importing invoices")
    
    data = request.get_json()
    invoices = data.get('invoices', [])
    
    if not invoices:
        return jsonify({'error': 'Aucune facture à importer'}), 400
    
    try:
        result = import_invoices(invoices, source='api')
        
        print(f"[API.IMPORT.INVOICES] SUCCESS: {result['imported']} imported")
        
        return jsonify({
            'success': True,
            'imported': result['imported'],
            'errors': result['errors']
        })
        
    except Exception as e:
        print(f"[API.IMPORT.INVOICES] ERROR: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/contacts', methods=['POST'])
def import_contacts():
    """Import contacts from uploaded data."""
    print("[API.IMPORT.CONTACTS] START: importing contacts")
    
    data = request.get_json()
    contacts = data.get('contacts', [])
    
    if not contacts:
        return jsonify({'error': 'Aucun contact à importer'}), 400
    
    db = get_db()
    cursor = db.cursor()
    
    created_count = 0
    errors = []
    
    try:
        for contact in contacts:
            try:
                # Vérifier si existe déjà
                cursor.execute(
                    "SELECT id FROM contacts WHERE email = ?",
                    (contact.get('email'),)
                )
                
                if cursor.fetchone():
                    errors.append(f"Contact {contact.get('email')} existe déjà")
                    continue
                
                # Créer
                contact_id = f"cont_{datetime.datetime.now().timestamp()}"
                cursor.execute("""
                    INSERT INTO contacts (
                        id, nom, prenom, email, telephone, type_personne,
                        statut, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    contact_id,
                    contact.get('nom'),
                    contact.get('prenom'),
                    contact.get('email'),
                    contact.get('telephone'),
                    contact.get('type', 'P'),
                    'actif',
                    datetime.datetime.now().isoformat(),
                    datetime.datetime.now().isoformat()
                ))
                
                created_count += 1
                
            except Exception as e:
                errors.append(f"Erreur {contact.get('email')}: {str(e)}")
        
        db.commit()
        
        print(f"[API.IMPORT.CONTACTS] SUCCESS: {created_count} contacts imported")
        
        return jsonify({
            'success': True,
            'imported': created_count,
            'errors': errors
        })
        
    except Exception as e:
        print(f"[API.IMPORT.CONTACTS] ERROR: {str(e)}")
        return jsonify({'error': str(e)}), 500
