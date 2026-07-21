"""Workflow backend: Suspendre un impayé."""

from datetime import datetime


def suspend_impaye_workflow(db, impaye_id, motif, user_id=None):
    """
    Suspendre un impayé et annuler ses relances.
    
    Args:
        db: Connexion SQLite
        impaye_id: ID de l'impayé (imp_xxx)
        motif: Motif de la suspension
        user_id: ID de l'utilisateur qui effectue l'action
        
    Returns:
        dict: Résultat avec relances_annulees
    """
    print(f"[WORKFLOW.SUSPEND] START: impaye_id={impaye_id}, motif={motif}")
    
    # Étape 1: Vérifier existence
    impaye = db.execute(
        "SELECT * FROM impayes WHERE id = ?", (impaye_id,)
    ).fetchone()
    
    if impaye is None:
        raise ValueError('Impayé non trouvé')
    
    impaye = dict(impaye)
    
    # Étape 2: Suspendre l'impayé
    now = datetime.utcnow().isoformat()
    db.execute("""
        UPDATE impayes 
        SET is_blacklisted = 1,
            statut = 'suspendue',
            blacklist_motif = ?,
            blacklist_date = ?,
            updated_at = ?
        WHERE id = ?
    """, (
        motif or 'Suspension manuelle',
        now,
        now,
        impaye_id
    ))
    
    # Étape 3: Annuler les relances en cours
    relances_annulees = 0
    if impaye.get('contact_relance_id'):
        cursor = db.execute("""
            UPDATE relances 
            SET statut = 'annulee', updated_at = ?
            WHERE contact_id = ? 
              AND statut IN ('brouillon', 'pret pour envoi', 'planifiee')
        """, (now, impaye['contact_relance_id']))
        relances_annulees = cursor.rowcount
    
    # Étape 4: Créer un event
    event_id = f"evt_{datetime.utcnow().timestamp()}_{impaye_id}"
    db.execute("""
        INSERT INTO events (id, type, titre, description, entity_type, entity_id, created_at, icon, who_id, by_marki)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        event_id,
        'suspension',
        'Facture suspendue',
        f"Motif: {motif or 'Non précisé'}. {relances_annulees} relance(s) annulée(s).",
        'impaye',
        impaye_id,
        now,
        'fa-pause-circle',
        user_id,
        0
    ))
    
    db.commit()
    
    print(f"[WORKFLOW.SUSPEND] SUCCESS: relances_annulees={relances_annulees}")
    
    return {
        'impaye_id': impaye_id,
        'relances_annulees': relances_annulees,
        'motif': motif,
        'event_id': event_id
    }
