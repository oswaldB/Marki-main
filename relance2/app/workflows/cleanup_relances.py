"""
Workflow Backend: Cleanup Relances Impayés Soldés
Annule les relances dont tous les impayés sont soldés.
"""

import os
import json
import sqlite3
from datetime import datetime
from flask import current_app


def log(level, message, data=None):
    """Logger structuré pour le workflow."""
    entry = {
        'timestamp': datetime.utcnow().isoformat(),
        'level': level,
        'message': message,
        'data': data or {},
        'workflow': 'cleanup-relances'
    }
    print(f"[CLEANUP] {level.upper()}: {message}", flush=True)
    return entry


def creer_evenement(db, type_event, titre, description, data=None, icon='fa-bell'):
    """Crée un événement dans la base Marki (par Marki, pas par un utilisateur)."""
    try:
        event_id = f"evt_{datetime.utcnow().timestamp()}_{type_event}"
        print(f"[CLEANUP] Création événement: type={type_event}, titre={titre}")
        db.execute("""
            INSERT INTO events (id, type, titre, description, by_marki, created_at, metadata, icon)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            event_id,
            type_event,
            titre,
            description,
            1,  # by_marki = true (1 en SQLite)
            datetime.utcnow().isoformat(),
            json.dumps(data) if data else None,
            icon
        ))
        print(f"[CLEANUP] Événement créé avec succès: {event_id}")
        return event_id
    except Exception as e:
        log('warn', f'Erreur création événement: {str(e)}')
        print(f"[CLEANUP] ERREUR création événement: {str(e)}")
        return None


def get_db():
    """Get Marki database connection."""
    import sqlite3
    db = sqlite3.connect(
        current_app.config['DATABASE'],
        detect_types=sqlite3.PARSE_DECLTYPES
    )
    db.row_factory = sqlite3.Row
    return db


def cleanup_relances_paid():
    """
    Annule les relances dont tous les impayés sont soldés.
    
    @checkpoint cleanup-start
    @checkpoint relances-fetched
    @checkpoint verification-complete
    @checkpoint updates-complete
    @checkpoint cleanup-complete
    """
    stats = {
        'relances_verifiees': 0,
        'relances_annulees': 0,
        'erreurs': []
    }
    
    relances_annulees_list = []
    
    start_time = datetime.utcnow()
    
    try:
        # @checkpoint cleanup-start
        log('info', 'Démarrage cleanup des relances payées')
        
        db = get_db()
        
        # Récupérer les relances actives
        log('info', 'Récupération des relances actives')
        cursor = db.execute("""
            SELECT r.id, r.contact_id, r.sujet, r.statut, 
                   c.nom as contact_nom, c.email as contact_email
            FROM relances r
            LEFT JOIN contacts c ON r.contact_id = c.id
            WHERE r.statut IN ('brouillon', 'pret pour envoi', 'planifiee')
        """)
        relances = [dict(row) for row in cursor.fetchall()]
        stats['relances_verifiees'] = len(relances)
        log('info', f'{len(relances)} relances actives à vérifier')
        
        # @checkpoint relances-fetched
        
        # Vérifier chaque relance
        for relance in relances:
            contact_id = relance.get('contact_id')
            if not contact_id:
                continue
            
            try:
                # Compter les impayés non soldés pour ce contact
                impayes_count = db.execute("""
                    SELECT COUNT(*) as count 
                    FROM impayes 
                    WHERE contact_relance_id = ? 
                      AND facture_soldee = 0
                      AND statut != 'paye'
                """, (contact_id,)).fetchone()['count']
                
                # Si aucun impayé actif, annuler la relance
                if impayes_count == 0:
                    db.execute("""
                        UPDATE relances 
                        SET statut = 'annulee',
                            updated_at = ?
                        WHERE id = ?
                    """, (
                        datetime.utcnow().isoformat(),
                        relance['id']
                    ))
                    
                    stats['relances_annulees'] += 1
                    
                    relance_info = {
                        'relance_id': relance['id'],
                        'contact_id': contact_id,
                        'contact_nom': relance.get('contact_nom', 'N/A'),
                        'sujet': relance.get('sujet', 'N/A'),
                        'ancien_statut': relance.get('statut')
                    }
                    relances_annulees_list.append(relance_info)
                    
                    log('info', f"Relance {relance['id']} annulée - contact {relance.get('contact_nom', 'N/A')}")
                    
            except Exception as e:
                error_msg = f"Erreur vérification relance {relance['id']}: {str(e)}"
                log('error', error_msg)
                stats['erreurs'].append(error_msg)
        
        # @checkpoint verification-complete
        
        # Commit des changements
        db.commit()
        
        # @checkpoint updates-complete
        
        # Créer des événements pour les relances annulées
        if relances_annulees_list:
            for relance_info in relances_annulees_list:
                creer_evenement(
                    db,
                    'cleanup',
                    f"Relance annulée - {relance_info['contact_nom']}",
                    f"La relance pour '{relance_info['sujet']}' a été annulée car toutes les factures sont réglées",
                    relance_info,
                    'fa-broom'
                )
            
            # Événement récapitulatif
            creer_evenement(
                db,
                'sync',
                f"Nettoyage terminé: {stats['relances_annulees']} relances annulées",
                f"Cleanup des relances terminé: {stats['relances_verifiees']} relances vérifiées, {stats['relances_annulees']} annulées",
                {
                    'verifiees': stats['relances_verifiees'],
                    'annulees': stats['relances_annulees'],
                    'relances': relances_annulees_list
                },
                'fa-check-circle'
            )
            
            db.commit()
        
        duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        
        # @checkpoint cleanup-complete
        log('info', 'Cleanup terminé avec succès', {
            'verifiees': stats['relances_verifiees'],
            'annulees': stats['relances_annulees'],
            'duration_ms': duration_ms
        })
        
        return {
            'success': True,
            'stats': stats,
            'duration_ms': duration_ms,
            'relances_annulees': relances_annulees_list
        }
        
    except Exception as e:
        error_msg = f'Erreur lors du cleanup: {str(e)}'
        log('error', error_msg)
        stats['erreurs'].append(error_msg)
        return {
            'success': False,
            'stats': stats,
            'error': str(e)
        }


# Pour test direct
if __name__ == '__main__':
    print("Workflow cleanup_relances - utiliser via l'API")
