"""
Workflow Backend: Cleanup Relances Orphelines
Supprime les relances dont le contact n'existe plus.
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
        'workflow': 'cleanup-orphan-relances'
    }
    print(f"[CLEANUP-ORPHAN] {level.upper()}: {message}", flush=True)
    return entry


def creer_evenement(db, type_event, titre, description, data=None, icon='fa-bell'):
    """Crée un événement dans la base Marki (par Marki, pas par un utilisateur)."""
    try:
        event_id = f"evt_{datetime.utcnow().timestamp()}_{type_event}"
        print(f"[CLEANUP-ORPHAN] Création événement: type={type_event}, titre={titre}")
        db.execute("""
            INSERT INTO events (id, type, titre, description, by_marki, created_at, metadata, icon)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            event_id,
            type_event,
            titre,
            description,
            1,
            datetime.utcnow().isoformat(),
            json.dumps(data) if data else None,
            icon
        ))
        print(f"[CLEANUP-ORPHAN] Événement créé avec succès: {event_id}")
        return event_id
    except Exception as e:
        log('warn', f'Erreur création événement: {str(e)}')
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


def cleanup_orphan_relances():
    """
    Supprime les relances orphelines (contact inexistant).
    
    @checkpoint cleanup-orphan-start
    @checkpoint orphan-fetched
    @checkpoint deletion-complete
    @checkpoint cleanup-orphan-complete
    """
    stats = {
        'relances_verifiees': 0,
        'relances_orphelines': 0,
        'relances_supprimees': 0,
        'erreurs': []
    }
    
    relances_supprimees_list = []
    
    start_time = datetime.utcnow()
    
    try:
        # @checkpoint cleanup-orphan-start
        log('info', 'Démarrage cleanup des relances orphelines')
        
        db = get_db()
        
        # Récupérer les relances avec contact inexistant
        log('info', 'Recherche des relances orphelines')
        cursor = db.execute("""
            SELECT r.id, r.sujet, r.contact_id, r.statut
            FROM relances r
            LEFT JOIN contacts c ON r.contact_id = c.id
            WHERE c.id IS NULL
        """)
        orphelines = [dict(row) for row in cursor.fetchall()]
        stats['relances_orphelines'] = len(orphelines)
        log('info', f'{len(orphelines)} relances orphelines trouvées')
        
        # @checkpoint orphan-fetched
        
        # Supprimer chaque relance orpheline
        for relance in orphelines:
            try:
                db.execute("DELETE FROM relances WHERE id = ?", (relance['id'],))
                
                stats['relances_supprimees'] += 1
                
                relance_info = {
                    'relance_id': relance['id'],
                    'contact_id': relance.get('contact_id'),
                    'sujet': relance.get('sujet', 'N/A'),
                    'statut': relance.get('statut')
                }
                relances_supprimees_list.append(relance_info)
                
                log('info', f"Relance orpheline {relance['id']} supprimée")
                
            except Exception as e:
                error_msg = f"Erreur suppression relance {relance['id']}: {str(e)}"
                log('error', error_msg)
                stats['erreurs'].append(error_msg)
        
        # @checkpoint deletion-complete
        
        # Commit des changements
        db.commit()
        
        # Créer des événements pour les suppressions
        if relances_supprimees_list:
            for relance_info in relances_supprimees_list[:5]:  # Limiter à 5 événements individuels
                creer_evenement(
                    db,
                    'cleanup',
                    f"Relance orpheline supprimée",
                    f"La relance '{relance_info['sujet']}' a été supprimée car le contact n'existe plus",
                    relance_info,
                    'fa-trash-alt'
                )
            
            # Événement récapitulatif
            creer_evenement(
                db,
                'sync',
                f"Nettoyage orphelins: {stats['relances_supprimees']} relances supprimées",
                f"Cleanup des relances orphelines terminé: {stats['relances_orphelines']} trouvées, {stats['relances_supprimees']} supprimées",
                {
                    'orphelines': stats['relances_orphelines'],
                    'supprimees': stats['relances_supprimees'],
                    'relances': relances_supprimees_list
                },
                'fa-broom'
            )
            
            db.commit()
        
        duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        
        # @checkpoint cleanup-orphan-complete
        log('info', 'Cleanup orphelines terminé avec succès', {
            'orphelines': stats['relances_orphelines'],
            'supprimees': stats['relances_supprimees'],
            'duration_ms': duration_ms
        })
        
        return {
            'success': True,
            'stats': stats,
            'duration_ms': duration_ms,
            'relances_supprimees': relances_supprimees_list
        }
        
    except Exception as e:
        error_msg = f'Erreur lors du cleanup orphelines: {str(e)}'
        log('error', error_msg)
        stats['erreurs'].append(error_msg)
        return {
            'success': False,
            'stats': stats,
            'error': str(e)
        }


if __name__ == '__main__':
    print("Workflow cleanup_orphan_relances - utiliser via l'API")
