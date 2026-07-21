"""Routes de synchronisation (import des factures)."""

from flask import Blueprint, jsonify, g
from datetime import datetime
import sys
import os

# Ajouter le dossier parent au path pour importer workflows
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from workflows.import_invoice import import_invoices_master
from workflows.verify_paid_invoices import verify_paid_invoices, verify_single_invoice
from workflows.cleanup_relances import cleanup_relances_paid

sync_bp = Blueprint('sync', __name__, url_prefix='/api/sync')


@sync_bp.route('/invoices', methods=['POST'])
def sync_invoices():
    """
    Lance la synchronisation des factures depuis la base externe.
    Cette route est protégée par JWT (voir before_request dans app.py).
    
    Returns:
        JSON avec statistiques de l'import
    """
    print(f"[API.SYNC] START: import des factures")
    
    try:
        result = import_invoices_master()
        
        if result['success']:
            print(f"[API.SYNC] SUCCESS: {result['stats']}")
            return jsonify({
                'success': True,
                'data': result['stats'],
                'duration_ms': result['duration_ms']
            }), 200
        else:
            print(f"[API.SYNC] ERROR: {result['error']}")
            return jsonify({
                'success': False,
                'error': result['error'],
                'stats': result['stats']
            }), 500
            
    except Exception as e:
        print(f"[API.SYNC] ERROR: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@sync_bp.route('/status', methods=['GET'])
def get_sync_status():
    """
    Récupère le statut de la dernière synchronisation.
    """
    # TODO: Implémenter le stockage du statut de dernière sync
    return jsonify({
        'last_sync': None,
        'status': 'idle'
    }), 200


@sync_bp.route('/verify-paid', methods=['POST'])
def verify_paid():
    """
    Vérifie les factures payées depuis la base externe.
    Met à jour les statuts des impayés marqués comme payés dans la source.
    
    Returns:
        JSON avec statistiques de la vérification
    """
    print(f"[API.VERIFY] START: vérification des factures payées")
    
    try:
        result = verify_paid_invoices()
        
        if result['success']:
            print(f"[API.VERIFY] SUCCESS: {result['stats']}")
            return jsonify({
                'success': True,
                'data': result['stats'],
                'duration_ms': result['duration_ms'],
                'factures_mises_a_jour': result.get('factures_mises_a_jour', [])
            }), 200
        else:
            print(f"[API.VERIFY] ERROR: {result['error']}")
            return jsonify({
                'success': False,
                'error': result['error'],
                'stats': result['stats']
            }), 500
            
    except Exception as e:
        print(f"[API.VERIFY] ERROR: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@sync_bp.route('/verify-paid/<nfacture>', methods=['GET'])
def check_invoice_status(nfacture):
    """
    Vérifie le statut d'une facture spécifique dans la source externe.
    
    Args:
        nfacture: Numéro de la facture à vérifier
        
    Returns:
        JSON avec le statut de la facture
    """
    print(f"[API.VERIFY] CHECK: vérification statut facture {nfacture}")
    
    try:
        result = verify_single_invoice(nfacture)
        
        if result['success']:
            return jsonify({
                'success': True,
                'data': result
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': result.get('message', result.get('error', 'Erreur inconnue'))
            }), 404 if not result.get('found', True) else 500
            
    except Exception as e:
        print(f"[API.VERIFY] ERROR: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500



@sync_bp.route('/cleanup/relances-paid', methods=['POST'])
def cleanup_relances():
    """
    Annule les relances dont tous les impayés sont soldés.
    Nettoie les relances orphelines.
    
    Returns:
        JSON avec statistiques du cleanup
    """
    print(f"[API.CLEANUP] START: cleanup relances payées")
    
    try:
        result = cleanup_relances_paid()
        
        if result['success']:
            print(f"[API.CLEANUP] SUCCESS: {result['stats']}")
            return jsonify({
                'success': True,
                'data': result['stats'],
                'duration_ms': result['duration_ms'],
                'relances_annulees': result.get('relances_annulees', [])
            }), 200
        else:
            print(f"[API.CLEANUP] ERROR: {result['error']}")
            return jsonify({
                'success': False,
                'error': result['error'],
                'stats': result['stats']
            }), 500
            
    except Exception as e:
        print(f"[API.CLEANUP] ERROR: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@sync_bp.route('/cleanup/orphan-relances', methods=['POST'])
def cleanup_orphan_relances():
    """
    Supprime les relances orphelines (contact inexistant).
    
    Returns:
        JSON avec statistiques du cleanup
    """
    print(f"[API.CLEANUP-ORPHAN] START: cleanup relances orphelines")
    
    try:
        from workflows.cleanup_orphan_relances import cleanup_orphan_relances
        result = cleanup_orphan_relances()
        
        if result['success']:
            print(f"[API.CLEANUP-ORPHAN] SUCCESS: {result['stats']}")
            return jsonify({
                'success': True,
                'data': result['stats'],
                'duration_ms': result['duration_ms'],
                'relances_supprimees': result.get('relances_supprimees', [])
            }), 200
        else:
            print(f"[API.CLEANUP-ORPHAN] ERROR: {result['error']}")
            return jsonify({
                'success': False,
                'error': result['error'],
                'stats': result['stats']
            }), 500
            
    except Exception as e:
        print(f"[API.CLEANUP-ORPHAN] ERROR: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
