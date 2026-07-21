"""Workflow backend: Générer les relances pour un contact."""

from datetime import datetime, timedelta
import uuid
import json


def generate_relances_for_contact(db, contact_id, sequence_id):
    """
    Générer les relances pour un contact selon une séquence.
    
    Args:
        db: Connexion SQLite
        contact_id: ID du contact (cont_xxx)
        sequence_id: ID de la séquence
        
    Returns:
        dict: Résultat avec relances_crees
    """
    print(f"[WORKFLOW.GENERATE_RELANCES] START: contact_id={contact_id}, sequence_id={sequence_id}")
    
    if not contact_id or not sequence_id:
        return {'relances_crees': 0}
    
    # Récupérer les emails de la séquence depuis sequences_emails
    emails = db.execute("""
        SELECT * FROM sequences_emails 
        WHERE sequence_id = ? 
        ORDER BY email_index ASC
    """, (sequence_id,)).fetchall()
    
    if not emails:
        print(f"[WORKFLOW.GENERATE_RELANCES] WARN: No emails found for sequence {sequence_id}")
        return {'relances_crees': 0}
    
    # Récupérer le contenu des emails depuis sequences.emails_json
    sequence = db.execute(
        "SELECT emails_json FROM sequences WHERE id = ?", (sequence_id,)
    ).fetchone()
    
    emails_content = {}
    if sequence and sequence['emails_json']:
        try:
            emails_content = json.loads(sequence['emails_json'])
        except json.JSONDecodeError:
            print(f"[WORKFLOW.GENERATE_RELANCES] WARN: Invalid emails_json for sequence {sequence_id}")
    
    relances_crees = 0
    now = datetime.utcnow()
    
    for email in emails:
        email_dict = dict(email)
        email_index = email_dict.get('email_index', 0)
        
        # Calculer la date de programmation
        delai_jours = email_dict.get('delai', 0) or 0
        date_programmation = (now + timedelta(days=delai_jours)).isoformat()
        
        # Récupérer le contenu de l'email
        content = emails_content.get(str(email_index), {})
        sujet = content.get('sujet', content.get('objet', f"Relance {email_index}"))
        corps = content.get('corps', '')
        
        # Créer la relance
        relance_id = f"rel_{uuid.uuid4().hex[:12]}"
        db.execute("""
            INSERT INTO relances (
                id, contact_id, sequence_id, statut,
                date_programmation, sujet, corps,
                email_index, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            relance_id,
            contact_id,
            sequence_id,
            'brouillon',
            date_programmation,
            sujet,
            corps,
            email_index,
            now.isoformat(),
            now.isoformat()
        ))
        
        relances_crees += 1
    
    db.commit()
    
    print(f"[WORKFLOW.GENERATE_RELANCES] SUCCESS: {relances_crees} relances créées")
    
    return {
        'relances_crees': relances_crees,
        'contact_id': contact_id,
        'sequence_id': sequence_id
    }
