from flask import Blueprint, request, jsonify
from db import get_db
from routes.auth import require_auth

bp = Blueprint('relances', __name__)


@bp.route('', methods=['GET'])
@require_auth
def list_relances():
    """Liste des relances."""
    print(f"[API RELANCES] GET /api/relances - Liste des relances")
    print(f"[API RELANCES] Params reçus: {dict(request.args)}")
    db = get_db()
    
    statut = request.args.get('statut')
    contact_id = request.args.get('contact_id', type=int)
    sequence_id = request.args.get('sequence_id', type=int)
    date_debut = request.args.get('date_debut')
    date_fin = request.args.get('date_fin')
    
    print(f"[API RELANCES] Paramètres parsés: statut={statut}, contact_id={contact_id}, sequence_id={sequence_id}")
    
    query = '''
        SELECT r.*, c.nom as contact_nom, s.nom as sequence_nom
        FROM relances r
        JOIN contacts c ON r.contact_id = c.id
        JOIN sequences s ON r.sequence_id = s.id
        WHERE 1=1
    '''
    params = []
    
    if statut:
        query += ' AND r.statut = ?'
        params.append(statut)
        print(f"[API RELANCES] Filtre statut appliqué: '{statut}'")
    
    if contact_id:
        query += ' AND r.contact_id = ?'
        params.append(contact_id)
        print(f"[API RELANCES] Filtre contact_id appliqué: {contact_id}")
    
    if sequence_id:
        query += ' AND r.sequence_id = ?'
        params.append(sequence_id)
        print(f"[API RELANCES] Filtre sequence_id appliqué: {sequence_id}")
    
    if date_debut:
        query += ' AND r.created_at >= ?'
        params.append(date_debut)
        print(f"[API RELANCES] Filtre date_debut appliqué: '{date_debut}'")
    
    if date_fin:
        query += ' AND r.created_at <= ?'
        params.append(date_fin)
        print(f"[API RELANCES] Filtre date_fin appliqué: '{date_fin}'")
    
    query += ' ORDER BY r.created_at DESC'
    
    print(f"[API RELANCES] Exécution requête avec {len(params)} filtres")
    relances = db.execute(query, params).fetchall()
    
    print(f"[API RELANCES] ✅ Requête exécutée: {len(relances)} relances retournées")
    return jsonify({'relances': [dict(row) for row in relances]})


@bp.route('/<id>', methods=['GET'])
@require_auth
def get_relance(id):
    """Détail d'une relance avec ses impayés liés."""
    print(f"[API RELANCES] GET /api/relances/{id} - Détail relance")
    db = get_db()
    
    relance = db.execute('''
        SELECT r.*, c.nom as contact_nom, s.nom as sequence_nom
        FROM relances r
        JOIN contacts c ON r.contact_id = c.id
        JOIN sequences s ON r.sequence_id = s.id
        WHERE r.id = ?
    ''', (id,)).fetchone()
    
    if relance is None:
        print(f"[API RELANCES] ❌ Relance id={id} non trouvée")
        return jsonify({'error': 'Relance non trouvée'}), 404
    
    impayes = db.execute('''
        SELECT i.* FROM impayes i
        JOIN relance_impayes ri ON i.id = ri.impaye_id
        WHERE ri.relance_id = ?
    ''', (id,)).fetchall()
    
    result = dict(relance)
    result['impayes'] = [dict(row) for row in impayes]
    
    print(f"[API RELANCES] ✅ Relance trouvée avec {len(impayes)} impayés")
    return jsonify(result)


@bp.route('', methods=['POST'])
@require_auth
def create_relance():
    """Créer une relance manuelle."""
    print(f"[API RELANCES] POST /api/relances - Création relance")
    data = request.get_json()
    print(f"[API RELANCES] Données: {data}")
    db = get_db()
    
    cursor = db.execute('''
        INSERT INTO relances (contact_id, sequence_id, statut, montant_total)
        VALUES (?, ?, ?, ?)
    ''', (
        data.get('contact_id'),
        data.get('sequence_id'),
        data.get('statut', 'en_cours'),
        data.get('montant_total', 0)
    ))
    db.commit()
    
    print(f"[API RELANCES] ✅ Relance créée avec id={cursor.lastrowid}")
    return jsonify({'id': cursor.lastrowid}), 201


@bp.route('/<id>', methods=['PUT'])
@require_auth
def update_relance(id):
    """Modifier une relance."""
    print(f"[API RELANCES] PUT /api/relances/{id} - Modification relance")
    data = request.get_json()
    print(f"[API RELANCES] Données: {data}")
    db = get_db()
    
    db.execute('''
        UPDATE relances 
        SET statut = ?, notes = ?
        WHERE id = ?
    ''', (
        data.get('statut'),
        data.get('notes'),
        id
    ))
    db.commit()
    
    print(f"[API RELANCES] ✅ Relance id={id} mise à jour")
    return jsonify({'success': True})


@bp.route('/<id>', methods=['DELETE'])
@require_auth
def delete_relance(id):
    """Supprimer une relance."""
    print(f"[API RELANCES] DELETE /api/relances/{id} - Suppression relance")
    db = get_db()
    db.execute('DELETE FROM relances WHERE id = ?', (id,))
    db.commit()
    
    print(f"[API RELANCES] ✅ Relance id={id} supprimée")
    return jsonify({'success': True})
