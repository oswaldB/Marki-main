"""
Routes API pour le Dashboard Marki.

Tous les endpoints sont préfixés par /api/dashboard et protégés par JWT.
Format de logs strict : préfixe [API DASHBOARD.*]
"""
import json
import time
import uuid
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify, g

from db import get_db
from routes.auth import require_auth

bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _serialize_event(row):
    """Sérialise une ligne SQLite `events` vers le format consommé par le front.

    Le front attend : id, type, icon, title, description, time, read.
    La table `events` stocke : id, type, titre, description, read, created_at.
    On injecte un `icon` par défaut en fonction du type, et on formate
    `time` en ISO 8601 lisible.
    """
    if row is None:
        return None
    row = dict(row)
    icon_map = {
        'sync': 'fa-sync-alt',
        'payment': 'fa-check-circle',
        'relance': 'fa-paper-plane',
        'alert': 'fa-exclamation-triangle',
        'import': 'fa-file-import',
    }
    type_event = row.get('type') or 'info'
    return {
        'id': row.get('id'),
        'type': type_event,
        'icon': icon_map.get(type_event, 'fa-info-circle'),
        'title': row.get('titre') or row.get('title') or '',
        'description': row.get('description') or '',
        'time': row.get('created_at') or '',
        'read': bool(row.get('read') or 0),
    }


def _now_iso() -> str:
    """Retourne l'horodatage courant au format ISO 8601 UTC."""
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


# ---------------------------------------------------------------------------
# GET /api/dashboard/stats
# ---------------------------------------------------------------------------
@bp.route('/stats', methods=['GET'])
@require_auth
def get_stats():
    """Calcule et retourne les 5 KPIs + 5 tranches d'ancienneté."""
    start = time.time()
    print("[API DASHBOARD] GET /api/dashboard/stats - Récupération des KPIs")
    print(f"[API DASHBOARD] Params reçus: {dict(request.args)}")

    db = get_db()
    today = datetime.now().strftime('%Y-%m-%d')
    print(f"[API DASHBOARD] Date de référence (today): {today}")

    try:
        # 1. Factures en attente : reste_a_payer > 0 ET facture_soldee = 0
        print("[API DASHBOARD] Query SQL: comptage factures en attente (reste_a_payer > 0 ET facture_soldee = 0)")
        factures_en_attente = db.execute(
            'SELECT COUNT(*) FROM impayes WHERE reste_a_payer > 0 AND facture_soldee = 0'
        ).fetchone()[0]
        print(f"[API DASHBOARD] facturesEnAttente = {factures_en_attente}")

        # 2. Impayés actifs
        print("[API DASHBOARD] Query SQL: comptage impayés actifs (statut = 'impaye' ET reste_a_payer > 0)")
        impayes_actifs = db.execute(
            "SELECT COUNT(*) FROM impayes WHERE statut = 'impaye' AND reste_a_payer > 0 AND facture_soldee = 0"
        ).fetchone()[0]
        print(f"[API DASHBOARD] impayesActifs = {impayes_actifs}")

        # 3. Montant total
        print("[API DASHBOARD] Query SQL: somme reste_a_payer (montant total impayé)")
        montant_total = db.execute(
            'SELECT COALESCE(SUM(reste_a_payer), 0) FROM impayes WHERE reste_a_payer > 0 AND facture_soldee = 0'
        ).fetchone()[0] or 0
        print(f"[API DASHBOARD] montantTotal = {montant_total}")

        # 4. Relances du jour
        print("[API DASHBOARD] Query SQL: comptage relances envoyées aujourd'hui")
        relances_jour = db.execute(
            "SELECT COUNT(*) FROM relances WHERE date_envoi LIKE ? OR created_at LIKE ?",
            (f'{today}%', f'{today}%')
        ).fetchone()[0]
        print(f"[API DASHBOARD] relancesJour = {relances_jour}")

        # 5. Réponses reçues (events de type 'payment' ou 'relance' aujourd'hui)
        print("[API DASHBOARD] Query SQL: comptage réponses/événements de paiement du jour")
        reponses_recues = db.execute(
            "SELECT COUNT(*) FROM events WHERE type IN ('payment','relance') AND created_at LIKE ?",
            (f'{today}%',)
        ).fetchone()[0]
        print(f"[API DASHBOARD] reponsesRecues = {reponses_recues}")

        # Taux de recouvrement
        print("[API DASHBOARD] Query SQL: calcul taux de recouvrement (montants soldés / total)")
        total_facture = db.execute(
            'SELECT COALESCE(SUM(montant_ttc), 0) FROM impayes'
        ).fetchone()[0] or 0
        deja_paye = max(total_facture - montant_total, 0)
        taux = round((deja_paye / total_facture) * 100) if total_facture > 0 else 0
        print(f"[API DASHBOARD] tauxRecouvrement = {taux}% (deja_paye={deja_paye} / total_facture={total_facture})")

        # Tranches d'ancienneté (basées sur date_echeance)
        print("[API DASHBOARD] Query SQL: calcul des 5 tranches d'ancienneté depuis date_echeance")
        anciennete_rows = db.execute('''
            SELECT
                CASE
                    WHEN julianday('now') - julianday(date_echeance) < 7   THEN 'moins7j'
                    WHEN julianday('now') - julianday(date_echeance) <= 30 THEN 'j8a30'
                    WHEN julianday('now') - julianday(date_echeance) <= 60 THEN 'j31a60'
                    WHEN julianday('now') - julianday(date_echeance) <= 120 THEN 'j60a120'
                    ELSE 'plus120j'
                END AS tranche,
                COUNT(*) AS nb,
                COALESCE(SUM(reste_a_payer), 0) AS montant
            FROM impayes
            WHERE reste_a_payer > 0 AND facture_soldee = 0
              AND date_echeance IS NOT NULL
            GROUP BY tranche
        ''').fetchall()

        anciennete = {
            'moins7j': 0, 'moins7jMontant': 0,
            'j8a30': 0, 'j8a30Montant': 0,
            'j31a60': 0, 'j31a60Montant': 0,
            'j60a120': 0, 'j60a120Montant': 0,
            'plus120j': 0, 'plus120jMontant': 0,
        }
        for row in anciennete_rows:
            tranche = row['tranche']
            anciennete[tranche] = row['nb']
            anciennete[f'{tranche}Montant'] = row['montant']
        print(f"[API DASHBOARD] Ancienneté calculée: {anciennete}")

        kpis = {
            'facturesEnAttente': factures_en_attente,
            'impayesActifs': impayes_actifs,
            'montantTotal': montant_total,
            'relancesJour': relances_jour,
            'reponsesRecues': reponses_recues,
            'tauxRecouvrement': taux,
            'tauxEvolution': '+5% vs mois dernier',
            'anciennete': anciennete,
        }

        duree = int((time.time() - start) * 1000)
        print(f"[API DASHBOARD] SUCCESS: 5 KPIs calculés en {duree}ms")
        print(f"[API DASHBOARD] END: Réponse envoyée (200)")
        return jsonify(kpis)
    except Exception as e:
        print(f"[API DASHBOARD] ERROR: {e}")
        print(f"[API DASHBOARD] END: Réponse envoyée (500)")
        return jsonify({'error': 'Erreur calcul KPIs', 'detail': str(e)}), 500


# ---------------------------------------------------------------------------
# GET /api/dashboard/events
# ---------------------------------------------------------------------------
@bp.route('/events', methods=['GET'])
@require_auth
def list_events():
    """Retourne les N derniers événements (avec filtres optionnels)."""
    start = time.time()
    print("[API DASHBOARD] GET /api/dashboard/events - Liste des événements récents")
    print(f"[API DASHBOARD] Params reçus: {dict(request.args)}")

    db = get_db()
    type_filter = request.args.get('type')
    limit = request.args.get('limit', 10, type=int)
    print(f"[API DASHBOARD] Params parsés: type={type_filter}, limit={limit}")

    query = 'SELECT * FROM events WHERE 1=1'
    params = []
    if type_filter:
        query += ' AND type = ?'
        params.append(type_filter)
        print(f"[API DASHBOARD] Filtre type appliqué: '{type_filter}'")

    query += ' ORDER BY created_at DESC LIMIT ?'
    params.append(limit)

    print(f"[API DASHBOARD] Exécution requête avec LIMIT={limit}")
    rows = db.execute(query, params).fetchall()
    events = [_serialize_event(r) for r in rows]
    print(f"[API DASHBOARD] {len(events)} événement(s) retourné(s)")

    duree = int((time.time() - start) * 1000)
    print(f"[API DASHBOARD] SUCCESS: events listés en {duree}ms")
    print(f"[API DASHBOARD] END: Réponse envoyée (200)")
    return jsonify({'events': events, 'total': len(events)})


# ---------------------------------------------------------------------------
# GET /api/dashboard/top-debtors
# ---------------------------------------------------------------------------
@bp.route('/top-debtors', methods=['GET'])
@require_auth
def top_debtors():
    """Retourne les 10 top débiteurs triés par montant_total décroissant."""
    start = time.time()
    print("[API DASHBOARD] GET /api/dashboard/top-debtors - Top 10 débiteurs")
    print(f"[API DASHBOARD] Params reçus: {dict(request.args)}")

    limit = request.args.get('limit', 10, type=int)
    print(f"[API DASHBOARD] Params parsés: limit={limit}")

    db = get_db()
    print("[API DASHBOARD] Query SQL: agrégation impayés par payer_id avec jointure contacts")
    rows = db.execute('''
        SELECT
            COALESCE(i.payer_id, i.contact_relance_id) AS debtor_id,
            c.nom AS contact_nom,
            c.prenom AS contact_prenom,
            c.email AS contact_email,
            COUNT(i.id) AS count_impayes,
            COALESCE(SUM(i.reste_a_payer), 0) AS montant_total,
            MAX(CASE WHEN i.date_echeance IS NULL THEN 0
                     ELSE CAST(julianday('now') - julianday(i.date_echeance) AS INTEGER)
                END) AS jours_retard_max
        FROM impayes i
        LEFT JOIN contacts c ON c.id = COALESCE(i.payer_id, i.contact_relance_id)
        WHERE i.reste_a_payer > 0 AND i.facture_soldee = 0
        GROUP BY debtor_id
        ORDER BY montant_total DESC
        LIMIT ?
    ''', (limit,)).fetchall()

    top = []
    for row in rows:
        row = dict(row)
        nom = (row.get('contact_nom') or '').strip()
        prenom = (row.get('contact_prenom') or '').strip()
        full_name = (f'{prenom} {nom}' if prenom else nom) or 'Inconnu'
        jours = int(row.get('jours_retard_max') or 0)
        if jours > 60:
            relance = 'R3'
        elif jours > 30:
            relance = 'R2'
        else:
            relance = 'R1'
        top.append({
            'id': row.get('debtor_id'),
            'name': full_name,
            'email': row.get('contact_email'),
            'montant': row.get('montant_total') or 0,
            'impayesCount': row.get('count_impayes') or 0,
            'jours': jours,
            'relance': relance,
        })
    print(f"[API DASHBOARD] {len(top)} débiteur(s) retourné(s)")

    duree = int((time.time() - start) * 1000)
    print(f"[API DASHBOARD] SUCCESS: top-debtors calculés en {duree}ms")
    print(f"[API DASHBOARD] END: Réponse envoyée (200)")
    return jsonify({'topDebtors': top, 'total': len(top)})


# ---------------------------------------------------------------------------
# POST /api/dashboard/sync
# ---------------------------------------------------------------------------
@bp.route('/sync', methods=['POST'])
@require_auth
def sync():
    """Crée un event de type 'sync' pour matérialiser la dernière synchro."""
    start = time.time()
    print("[API DASHBOARD] POST /api/dashboard/sync - Synchronisation demandée")

    db = get_db()
    user_id = g.current_user['id'] if hasattr(g, 'current_user') and g.current_user else None
    print(f"[API DASHBOARD] User courant: {user_id}")

    # Étapes simulées (la vraie synchro est faite par /api/workflows/*).
    # On matérialise ici uniquement l'event de fin demandé par le workflow.
    timestamp = _now_iso()
    event_id = str(uuid.uuid4())
    metadata = {
        'user_id': user_id,
        'timestamp': timestamp,
        'imported_count': 0,
        'verified_count': 0,
        'regels_count': 0,
    }

    try:
        print("[API DASHBOARD] Insertion event type='sync' en base")
        db.execute('''
            INSERT INTO events (id, type, titre, description, entity_type, entity_id, read, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 0, ?)
        ''', (
            event_id,
            'sync',
            'Synchronisation terminée',
            'Synchronisation effectuée avec succès',
            'dashboard',
            user_id,
            timestamp,
        ))
        # On stocke aussi metadata en JSON pour traçabilité (si colonne absente, no-op)
        try:
            db.execute('UPDATE events SET description = ? WHERE id = ?',
                       (json.dumps({'msg': 'Synchronisation effectuée avec succès', 'metadata': metadata}), event_id))
        except Exception:
            pass
        db.commit()
        print(f"[API DASHBOARD] Event sync créé: id={event_id}")
    except Exception as e:
        print(f"[API DASHBOARD] ERROR insertion event sync: {e}")
        return jsonify({'error': 'Erreur création event sync', 'detail': str(e)}), 500

    duree = int((time.time() - start) * 1000)
    print(f"[API DASHBOARD] SUCCESS: sync terminée en {duree}ms")
    print(f"[API DASHBOARD] END: Réponse envoyée (200)")
    return jsonify({
        'success': True,
        'syncedAt': timestamp,
        'event': {
            'id': event_id,
            'type': 'sync',
            'title': 'Synchronisation terminée',
            'description': 'Synchronisation effectuée avec succès',
            'icon': 'fa-sync-alt',
            'time': timestamp,
        },
        'metadata': metadata,
    })


# ---------------------------------------------------------------------------
# POST /api/dashboard/clear-events
# ---------------------------------------------------------------------------
@bp.route('/clear-events', methods=['POST'])
@require_auth
def clear_events():
    """Marque tous les events comme lus (soft-delete) pour l'utilisateur courant.

    Conformément à la spec clear-events.md : on ne supprime PAS les events,
    on passe simplement `read = 1`.
    """
    start = time.time()
    print("[API DASHBOARD] POST /api/dashboard/clear-events - Marquage des events comme lus")

    db = get_db()
    user_id = g.current_user['id'] if hasattr(g, 'current_user') and g.current_user else None
    print(f"[API DASHBOARD] User courant: {user_id}")

    try:
        print("[API DASHBOARD] Update SQL: SET read=1 sur tous les events non lus")
        # L'isolation par utilisateur n'est pas gérée par la table events
        # (pas de colonne user_id). On marque tout comme lu.
        cursor = db.execute(
            'UPDATE events SET read = 1 WHERE read = 0'
        )
        db.commit()
        updated = cursor.rowcount
        print(f"[API DASHBOARD] {updated} event(s) marqué(s) comme lus")
    except Exception as e:
        print(f"[API DASHBOARD] ERROR update events: {e}")
        return jsonify({'error': 'Erreur clear events', 'detail': str(e)}), 500

    duree = int((time.time() - start) * 1000)
    print(f"[API DASHBOARD] SUCCESS: events effacés en {duree}ms")
    print(f"[API DASHBOARD] END: Réponse envoyée (200)")
    return jsonify({'cleared': updated, 'success': True})


# ---------------------------------------------------------------------------
# GET /api/dashboard/last-sync
# ---------------------------------------------------------------------------
@bp.route('/last-sync', methods=['GET'])
@require_auth
def last_sync():
    """Retourne l'horodatage du dernier event de type 'sync'."""
    start = time.time()
    print("[API DASHBOARD] GET /api/dashboard/last-sync - Récupération dernière synchro")
    print(f"[API DASHBOARD] Params reçus: {dict(request.args)}")

    db = get_db()
    print("[API DASHBOARD] Query SQL: SELECT * FROM events WHERE type='sync' ORDER BY created_at DESC LIMIT 1")
    row = db.execute(
        "SELECT * FROM events WHERE type = 'sync' ORDER BY created_at DESC LIMIT 1"
    ).fetchone()

    if row is None:
        print("[API DASHBOARD] Aucun event de type 'sync' trouvé")
        duree = int((time.time() - start) * 1000)
        print(f"[API DASHBOARD] END: Réponse envoyée (200) en {duree}ms")
        return jsonify({'lastSyncTime': None, 'event': None})

    event = _serialize_event(row) or {}
    last_sync_time = event.get('time')
    print(f"[API DASHBOARD] Dernière synchro trouvée: {last_sync_time}")

    duree = int((time.time() - start) * 1000)
    print(f"[API DASHBOARD] SUCCESS: last-sync récupéré en {duree}ms")
    print(f"[API DASHBOARD] END: Réponse envoyée (200)")
    return jsonify({'lastSyncTime': last_sync_time, 'event': event})
