"""Workflow backend: Toggle blacklist d'un contact."""

from datetime import datetime


def toggle_contact_blacklist_workflow(db, contact_id, motif=None, user_id=None):
    """
    Basculer le statut blacklist d'un contact.
    Si mise en blacklist: annule toutes les relances en cours.
    
    Args:
        db: Connexion SQLite
        contact_id: ID du contact (cont_xxx)
        motif: Motif de la blacklist (si mise en blacklist)
        user_id: ID de l'utilisateur qui effectue l'action
        
    Returns:
        dict: Résultat avec is_blacklisted, action, relances_annulees
    """
    print(f"[WORKFLOW.TOGGLE_BLACKLIST] START: contact_id={contact_id}, motif={motif}")
    
    # Étape 1: Vérifier existence
    contact = db.execute(
        "SELECT * FROM contacts WHERE id = ?", (contact_id,)
    ).fetchone()
    
    if contact is None:
        raise ValueError('Contact non trouvé')
    
    contact = dict(contact)
    current_state = contact.get('is_blacklisted', 0)
    new_state = 0 if current_state else 1
    
    now = datetime.utcnow().isoformat()
    
    # Étape 2: Toggle blacklist
    db.execute("""
        UPDATE contacts 
        SET is_blacklisted = ?,
            blacklist_date = ?,
            blacklist_motif = ?,
            updated_at = ?
        WHERE id = ?
    """, (
        new_state,
        now if new_state else None,
        motif if new_state else None,
        now,
        contact_id
    ))
    
    # Étape 3: Mettre à jour les impayés du contact
    db.execute("""
        UPDATE impayes 
        SET is_blacklisted = ?,
            statut = ?,
            blacklist_date = ?,
            blacklist_motif = ?,
            updated_at = ?
        WHERE payer_id = ?
    """, (
        new_state,
        'suspendue' if new_state else 'en-relance',
        now if new_state else None,
        motif if new_state else None,
        now,
        contact_id
    ))
    
    # Étape 4: Annuler les relances si blacklist
    relances_annulees = 0
    if new_state:
        cursor = db.execute("""
            UPDATE relances 
            SET statut = 'annulee', updated_at = ?
            WHERE contact_id = ? 
              AND statut IN ('brouillon', 'pret pour envoi', 'planifiee')
        """, (now, contact_id))
        relances_annulees = cursor.rowcount
    
    # Étape 5: Créer un event
    event_id = f"evt_{datetime.utcnow().timestamp()}_{contact_id}"
    action_label = 'blacklisté' if new_state else 'retiré de la blacklist'
    db.execute("""
        INSERT INTO events (id, type, titre, description, entity_type, entity_id, created_at, icon, who_id, by_marki)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        event_id,
        'blacklist' if new_state else 'unblacklist',
        f"Contact {action_label}",
        f"Le contact a été {action_label}. {relances_annulees} relance(s) annulée(s). Motif: {motif or 'Non précisé'}",
        'contact',
        contact_id,
        now,
        'fa-user-slash' if new_state else 'fa-user-check',
        user_id,  # Qui a fait l'action
        0         # Fait par un humain, pas Marki
    ))
    
    db.commit()
    
    print(f"[WORKFLOW.TOGGLE_BLACKLIST] SUCCESS: action={action_label}, relances_annulees={relances_annulees}")
    
    return {
        'contact_id': contact_id,
        'is_blacklisted': new_state,
        'action': action_label,
        'relances_annulees': relances_annulees,
        'motif': motif if new_state else None,
        'event_id': event_id
    }
