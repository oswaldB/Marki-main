from flask import Blueprint, request, jsonify
from db import get_db
from routes.auth import require_auth

bp = Blueprint('impayes', __name__)


@bp.route('', methods=['GET'])
@require_auth
def list_impayes():
    """Liste des impayés avec filtres."""
    print(f"[API IMPAYES] GET /api/impayes - Liste des impayés")
    print(f"[API IMPAYES] Params reçus: {dict(request.args)}")
    db = get_db()
    
    statut = request.args.get('statut')
    contact_id = request.args.get('contact_id')
    date_debut = request.args.get('date_debut')
    date_fin = request.args.get('date_fin')
    montant_min = request.args.get('montant_min', type=float)
    montant_max = request.args.get('montant_max', type=float)
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    
    print(f"[API IMPAYES] Paramètres parsés: statut={statut}, contact_id={contact_id}, date_debut={date_debut}, date_fin={date_fin}, montant_min={montant_min}, montant_max={montant_max}, page={page}")
    
    query = '''
        SELECT i.*, c.nom as contact_nom, c.prenom as contact_prenom
        FROM impayes i
        LEFT JOIN contacts c ON i.contact_relance_id = c.id
        WHERE 1=1
    '''
    params = []
    
    if statut:
        query += ' AND i.statut = ?'
        params.append(statut)
        print(f"[API IMPAYES] Filtre statut appliqué: '{statut}'")
    
    if contact_id:
        query += ' AND i.contact_relance_id = ?'
        params.append(contact_id)
        print(f"[API IMPAYES] Filtre contact_id appliqué: '{contact_id}'")
    
    if date_debut:
        query += ' AND i.date_facture >= ?'
        params.append(date_debut)
        print(f"[API IMPAYES] Filtre date_debut appliqué: '{date_debut}'")
    
    if date_fin:
        query += ' AND i.date_facture <= ?'
        params.append(date_fin)
        print(f"[API IMPAYES] Filtre date_fin appliqué: '{date_fin}'")
    
    if montant_min is not None:
        query += ' AND i.reste_a_payer >= ?'
        params.append(montant_min)
        print(f"[API IMPAYES] Filtre montant_min appliqué: {montant_min}")
    
    if montant_max is not None:
        query += ' AND i.reste_a_payer <= ?'
        params.append(montant_max)
        print(f"[API IMPAYES] Filtre montant_max appliqué: {montant_max}")
    
    count_query = query.replace('SELECT i.*, c.nom as contact_nom, c.prenom as contact_prenom', 'SELECT COUNT(*)')
    print(f"[API IMPAYES] Exécution requête count avec {len(params)} paramètres")
    total = db.execute(count_query, params).fetchone()[0]
    print(f"[API IMPAYES] Total impayés trouvés: {total}")
    
    query += ' ORDER BY i.date_facture DESC LIMIT ? OFFSET ?'
    params.extend([per_page, (page - 1) * per_page])
    
    print(f"[API IMPAYES] Exécution requête avec LIMIT={per_page}, OFFSET={(page-1)*per_page}")
    impayes = db.execute(query, params).fetchall()
    
    print(f"[API IMPAYES] ✅ Requête exécutée: {len(impayes)} impayés retournés (page {page})")
    return jsonify({
        'impayes': [dict(row) for row in impayes],
        'total': total,
        'page': page
    })


@bp.route('/<id>', methods=['GET'])
@require_auth
def get_impaye(id):
    """Détail d'un impayé."""
    print(f"[API IMPAYES] GET /api/impayes/{id} - Détail impayé")
    db = get_db()
    impaye = db.execute('''
        SELECT i.*, c.nom as contact_nom, c.prenom as contact_prenom
        FROM impayes i
        LEFT JOIN contacts c ON i.contact_relance_id = c.id
        WHERE i.id = ?
    ''', (id,)).fetchone()
    
    if impaye is None:
        print(f"[API IMPAYES] ❌ Impayé id={id} non trouvé")
        return jsonify({'error': 'Impayé non trouvé'}), 404
    
    print(f"[API IMPAYES] ✅ Impayé trouvé")
    return jsonify(dict(impaye))


@bp.route('', methods=['POST'])
@require_auth
def create_impaye():
    """Créer un impayé."""
    print(f"[API IMPAYES] POST /api/impayes - Création impayé")
    data = request.get_json()
    print(f"[API IMPAYES] Données: {data}")
    db = get_db()
    
    import uuid
    new_id = str(uuid.uuid4())
    
    db.execute('''
        INSERT INTO impayes (id, contact_relance_id, nfacture, date_facture, date_echeance, 
                           reste_a_payer, statut, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ''', (
        new_id,
        data.get('contact_id'),
        data.get('nfacture'),
        data.get('date_facture'),
        data.get('date_echeance'),
        data.get('montant', 0),
        data.get('statut', 'impaye')
    ))
    db.commit()
    
    print(f"[API IMPAYES] ✅ Impayé créé avec id={new_id}")
    return jsonify({'id': new_id}), 201


@bp.route('/<id>', methods=['PUT'])
@require_auth
def update_impaye(id):
    """Modifier un impayé."""
    print(f"[API IMPAYES] PUT /api/impayes/{id} - Modification impayé")
    data = request.get_json()
    print(f"[API IMPAYES] Données: {data}")
    db = get_db()
    
    db.execute('''
        UPDATE impayes 
        SET reste_a_payer = ?, statut = ?, updated_at = datetime('now')
        WHERE id = ?
    ''', (
        data.get('montant'),
        data.get('statut'),
        id
    ))
    db.commit()
    
    print(f"[API IMPAYES] ✅ Impayé id={id} mis à jour")
    return jsonify({'success': True})
