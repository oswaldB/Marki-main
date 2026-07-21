"""
Workflow Backend: Vérifier Factures Payées
Vérifie les factures payées depuis la base externe et met à jour les impayés.
"""

import os
import json
import sqlite3
from datetime import datetime
from flask import current_app

# Configuration - Chemin configurable via variable d'environnement
SYNC_DB_PATH = os.environ.get('SYNC_DB_PATH', '/home/arthur/adti/sync.db')


def log(level, message, data=None):
    """Logger structuré pour le workflow."""
    entry = {
        'timestamp': datetime.utcnow().isoformat(),
        'level': level,
        'message': message,
        'data': data or {},
        'workflow': 'verify-paid-invoices'
    }
    print(f"[VERIFY] {level.upper()}: {message}", flush=True)
    return entry


def creer_evenement(db, type_event, titre, description, data=None, icon='fa-bell'):
    """Crée un événement dans la base Marki (par Marki, pas par un utilisateur)."""
    try:
        event_id = f"evt_{datetime.utcnow().timestamp()}_{type_event}"
        print(f"[VERIFY] Création événement: type={type_event}, titre={titre}")
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
        print(f"[VERIFY] Événement créé avec succès: {event_id}")
        return event_id
    except Exception as e:
        log('warn', f'Erreur création événement: {str(e)}')
        print(f"[VERIFY] ERREUR création événement: {str(e)}")
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


def get_sync_db():
    """Get external sync database connection."""
    if not os.path.exists(SYNC_DB_PATH):
        raise FileNotFoundError(f"Base sync introuvable: {SYNC_DB_PATH}")
    
    db = sqlite3.connect(SYNC_DB_PATH)
    db.row_factory = sqlite3.Row
    return db


def verify_paid_invoices():
    """
    Vérifie les factures payées depuis la source et met à jour les impayés.
    
    @checkpoint verify-start
    @checkpoint verification-complete
    @checkpoint updates-complete
    @checkpoint verify-complete
    """
    stats = {
        'verifiees': 0,
        'mises_a_jour': 0,
        'deja_payees': 0,
        'erreurs': []
    }
    
    factures_mises_a_jour = []
    
    start_time = datetime.utcnow()
    
    try:
        # @checkpoint verify-start
        log('info', 'Démarrage vérification des factures payées')
        
        db = get_db()
        sync_db = get_sync_db()
        
        # Récupérer les impayés non soldés dans Marki
        log('info', 'Récupération des impayés non soldés')
        cursor = db.execute(
            'SELECT * FROM impayes WHERE facture_soldee = 0 AND statut != ?',
            ('paye',)
        )
        impayes = [dict(row) for row in cursor.fetchall()]
        stats['verifiees'] = len(impayes)
        log('info', f'{len(impayes)} impayés à vérifier')
        
        # @checkpoint verification-complete
        
        # Vérifier chaque impayé dans la source
        for impaye in impayes:
            nfacture = impaye.get('nfacture')
            if not nfacture:
                continue
            
            try:
                # Vérifier dans la base externe
                piece = sync_db.execute(
                    'SELECT facturesoldee, resteapayer FROM _GCO__GcoPiece WHERE nfacture = ?',
                    (nfacture,)
                ).fetchone()
                
                if piece:
                    # Déterminer si la facture est payée
                    is_soldee = piece['facturesoldee'] == 1 or piece['resteapayer'] == 0
                    
                    if is_soldee:
                        # Mettre à jour l'impayé
                        db.execute("""
                            UPDATE impayes 
                            SET facture_soldee = 1, 
                                statut = 'paye',
                                reste_a_payer = 0,
                                updated_at = ?
                            WHERE id = ?
                        """, (
                            datetime.utcnow().isoformat(),
                            impaye['id']
                        ))
                        
                        stats['mises_a_jour'] += 1
                        
                        # Préparer les données pour l'événement
                        montant_ttc = impaye.get('montant_ttc', 0) or 0
                        montant_fmt = f"{montant_ttc:,.2f}€".replace(',', ' ')
                        
                        facture_info = {
                            'impaye_id': impaye['id'],
                            'nfacture': nfacture,
                            'montant': montant_ttc,
                            'dossier': impaye.get('numero_dossier', ''),
                            'verification_source': True
                        }
                        
                        factures_mises_a_jour.append(facture_info)
                        
                        # Créer l'événement de paiement (même format que dans import_invoice.py)
                        creer_evenement(
                            db, 
                            'payment',
                            f"Facture {nfacture} réglée ({montant_fmt})",
                            f"La facture {nfacture} du dossier {impaye.get('numero_dossier', 'N/A')} a été vérifiée comme réglée pour un montant de {montant_fmt}",
                            facture_info,
                            'fa-money-bill-wave'
                        )
                        
                        log('info', f'Facture {nfacture} marquée comme payée', facture_info)
                        
            except Exception as e:
                error_msg = f"Erreur vérification facture {nfacture}: {str(e)}"
                log('error', error_msg)
                stats['erreurs'].append(error_msg)
        
        # @checkpoint updates-complete
        
        # Commit des changements
        db.commit()
        
        # Créer un événement récapitulatif si des mises à jour ont été faites
        if stats['mises_a_jour'] > 0:
            creer_evenement(
                db,
                'sync',
                f"Vérification terminée: {stats['mises_a_jour']} factures réglées",
                f"Vérification des paiements terminée: {stats['verifiees']} factures vérifiées, {stats['mises_a_jour']} marquées comme payées",
                {
                    'verifiees': stats['verifiees'],
                    'mises_a_jour': stats['mises_a_jour'],
                    'factures': factures_mises_a_jour
                },
                'fa-check-circle'
            )
            db.commit()
        
        sync_db.close()
        
        duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        
        # Lancer le cleanup des relances automatiquement si des factures ont été payées
        cleanup_result = None
        if stats['mises_a_jour'] > 0:
            log('info', 'Lancement automatique du cleanup des relances...')
            try:
                # Import ici pour éviter les imports circulaires
                from workflows.cleanup_relances import cleanup_relances_paid
                cleanup_result = cleanup_relances_paid()
                if cleanup_result['success']:
                    log('info', f"Cleanup auto: {cleanup_result['stats']['relances_annulees']} relances annulées")
                else:
                    log('warn', f"Cleanup auto échoué: {cleanup_result.get('error', 'erreur inconnue')}")
            except Exception as e:
                log('warn', f"Erreur lors du cleanup auto: {str(e)}")
        
        # @checkpoint verify-complete
        log('info', 'Vérification terminée avec succès', {
            'verifiees': stats['verifiees'],
            'mises_a_jour': stats['mises_a_jour'],
            'duration_ms': duration_ms,
            'cleanup': cleanup_result['stats'] if cleanup_result and cleanup_result['success'] else None
        })
        
        return {
            'success': True,
            'stats': stats,
            'duration_ms': duration_ms,
            'factures_mises_a_jour': factures_mises_a_jour,
            'cleanup': cleanup_result['stats'] if cleanup_result and cleanup_result['success'] else None
        }
        
    except Exception as e:
        error_msg = f'Erreur lors de la vérification: {str(e)}'
        log('error', error_msg)
        stats['erreurs'].append(error_msg)
        return {
            'success': False,
            'stats': stats,
            'error': str(e)
        }


def verify_single_invoice(nfacture):
    """
    Vérifie le statut d'une facture spécifique dans la source externe.
    
    @checkpoint single-verify-start
    @checkpoint single-verify-complete
    """
    try:
        log('info', f'Vérification manuelle facture {nfacture}')
        
        sync_db = get_sync_db()
        
        piece = sync_db.execute(
            'SELECT facturesoldee, resteapayer FROM _GCO__GcoPiece WHERE nfacture = ?',
            (nfacture,)
        ).fetchone()
        
        sync_db.close()
        
        if not piece:
            return {
                'success': False,
                'found': False,
                'nfacture': nfacture,
                'message': f'Facture {nfacture} non trouvée dans la source'
            }
        
        is_soldee = piece['facturesoldee'] == 1 or piece['resteapayer'] == 0
        
        return {
            'success': True,
            'found': True,
            'nfacture': nfacture,
            'is_paid': is_soldee,
            'facturesoldee': piece['facturesoldee'],
            'resteapayer': piece['resteapayer']
        }
        
    except Exception as e:
        return {
            'success': False,
            'nfacture': nfacture,
            'error': str(e)
        }


# Pour test direct
if __name__ == '__main__':
    print("Workflow verify_paid_invoices - utiliser via l'API")
