"""Workflow backend: Réactiver un impayé."""

from datetime import datetime


def unsuspend_impaye_workflow(db, impaye_id, user_id=None):
    """
    Réactiver un impayé suspendu et régénérer les relances si nécessaire.
    
    Args:
        db: Connexion SQLite
        impaye_id: ID de l'impayé (imp_xxx)
        user_id: ID de l'utilisateur qui effectue l'action
        
    Returns:
        dict: Résultat avec relances_crees
    """
    print(f"[WORKFLOW.UNSUSPEND] START: impaye_id={impaye_id}")
    
    # Étape 1: Vérifier existence
    impaye = db.execute(
        "SELECT * FROM impayes WHERE id = ?", (impaye_id,)
    ).fetchone()
    
    if impaye is None:
        raise ValueError('Impayé non trouvé')
    
    impaye = dict(impaye)
    
    if impaye.get('is_blacklisted') != 1:
        raise ValueError('Impayé n\'est pas suspendu')
    
    # Étape 2: Réactiver l'impayé
    now = datetime.utcnow().isoformat()
    db.execute("""
        UPDATE impayes 
        SET is_blacklisted = 0,
            statut = 'en-relance',
            blacklist_motif = NULL,
            blacklist_date = NULL,
            updated_at = ?
        WHERE id = ?
    """, (now, impaye_id))
    
    # Étape 3: Générer les relances si séquence attribuée
    relances_crees = 0
    if impaye.get('sequence_id') and not impaye.get('facture_soldee'):
        # Importer la fonction de génération de relances
        try:
            from workflows.generate_relances import generate_relances_for_contact
            result = generate_relances_for_contact(
                db, 
                impaye['contact_relance_id'],
                impaye['sequence_id']
            )
            relances_crees = result.get('relances_crees', 0)
        except ImportError:
            print(f"[WORKFLOW.UNSUSPEND] WARN: generate_relances module not found")
        except Exception as e:
            print(f"[WORKFLOW.UNSUSPEND] WARN: Error generating relances: {e}")
    
    # Étape 4: Créer un event
    event_id = f"evt_{datetime.utcnow().timestamp()}_{impaye_id}"
    db.execute("""
        INSERT INTO events (id, type, titre, description, entity_type, entity_id, created_at, icon, who_id, by_marki)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        event_id,
        'reactivation',
        'Facture réactivée',
        f"L'impayé a été réactivé. {relances_crees} relance(s) créée(s).",
        'impaye',
        impaye_id,
        now,
        'fa-play-circle',
        user_id,
        0
    ))
    
    db.commit()
    
    print(f"[WORKFLOW.UNSUSPEND] SUCCESS: relances_crees={relances_crees}")
    
    return {
        'impaye_id': impaye_id,
        'relances_crees': relances_crees,
        'event_id': event_id
    }
