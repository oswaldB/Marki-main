from flask import Blueprint, request, jsonify
from db import get_db
from routes.auth import require_auth

bp = Blueprint('contacts', __name__)


@bp.route('', methods=['GET'])
@require_auth
def list_contacts():
    """Liste des contacts."""
    print(f"[API CONTACTS] GET /api/contacts - Liste des contacts")
    print(f"[API CONTACTS] Params reçus: {dict(request.args)}")
    db = get_db()
    
    search = request.args.get('search')
    blacklist = request.args.get('blacklist', type=bool)
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    
    print(f"[API CONTACTS] Paramètres parsés: search={search}, blacklist={blacklist}, page={page}, per_page={per_page}")
    
    query = 'SELECT * FROM contacts WHERE 1=1'
    params = []
    
    if search:
        query += ' AND (nom LIKE ? OR email LIKE ?)'
        params.extend([f'%{search}%', f'%{search}%'])
        print(f"[API CONTACTS] Filtre search appliqué: '{search}'")
    
    if blacklist is not None:
        query += ' AND blacklist = ?'
        params.append(1 if blacklist else 0)
        print(f"[API CONTACTS] Filtre blacklist appliqué: {blacklist}")
    
    count_query = query.replace('SELECT *', 'SELECT COUNT(*)')
    print(f"[API CONTACTS] Exécution requête count: {count_query} avec params={params}")
    total = db.execute(count_query, params).fetchone()[0]
    print(f"[API CONTACTS] Total contacts trouvés: {total}")
    
    query += ' ORDER BY nom LIMIT ? OFFSET ?'
    params.extend([per_page, (page - 1) * per_page])
    
    print(f"[API CONTACTS] Exécution requête: {query[:80]}... avec LIMIT={per_page}, OFFSET={(page-1)*per_page}")
    contacts = db.execute(query, params).fetchall()
    print(f"[API CONTACTS] ✅ Requête exécutée: {len(contacts)} contacts retournés (page {page} sur {max(1, (total + per_page - 1) // per_page)})")
    
    return jsonify({
        'contacts': [dict(row) for row in contacts],
        'total': total,
        'page': page
    })


@bp.route('/<id>', methods=['GET'])
@require_auth
def get_contact(id):
    """Détail d'un contact."""
    print(f"[API CONTACTS] GET /api/contacts/{id} - Détail contact")
    db = get_db()
    contact = db.execute('SELECT * FROM contacts WHERE id = ?', (id,)).fetchone()
    
    if contact is None:
        print(f"[API CONTACTS] ❌ Contact id={id} non trouvé")
        return jsonify({'error': 'Contact non trouvé'}), 404
    
    print(f"[API CONTACTS] ✅ Contact trouvé: {dict(contact)}")
    return jsonify(dict(contact))


@bp.route('', methods=['POST'])
@require_auth
def create_contact():
    """Créer un contact."""
    print(f"[API CONTACTS] POST /api/contacts - Création contact")
    data = request.get_json()
    print(f"[API CONTACTS] Données: {data}")
    db = get_db()
    
    cursor = db.execute('''
        INSERT INTO contacts (nom, prenom, email, telephone, adresse, blacklist)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        data.get('nom'),
        data.get('prenom'),
        data.get('email'),
        data.get('telephone'),
        data.get('adresse'),
        data.get('blacklist', False)
    ))
    db.commit()
    
    print(f"[API CONTACTS] ✅ Contact créé avec id={cursor.lastrowid}")
    return jsonify({'id': cursor.lastrowid}), 201


@bp.route('/<id>', methods=['PUT'])
@require_auth
def update_contact(id):
    """Modifier un contact."""
    print(f"[API CONTACTS] PUT /api/contacts/{id} - Modification contact")
    data = request.get_json()
    print(f"[API CONTACTS] Données: {data}")
    db = get_db()
    
    db.execute('''
        UPDATE contacts 
        SET nom = ?, prenom = ?, email = ?, telephone = ?, adresse = ?, blacklist = ?
        WHERE id = ?
    ''', (
        data.get('nom'),
        data.get('prenom'),
        data.get('email'),
        data.get('telephone'),
        data.get('adresse'),
        data.get('blacklist'),
        id
    ))
    db.commit()
    
    print(f"[API CONTACTS] ✅ Contact id={id} mis à jour")
    return jsonify({'success': True})


@bp.route('/<id>', methods=['DELETE'])
@require_auth
def delete_contact(id):
    """Supprimer un contact."""
    print(f"[API CONTACTS] DELETE /api/contacts/{id} - Suppression contact")
    db = get_db()
    db.execute('DELETE FROM contacts WHERE id = ?', (id,))
    db.commit()
    
    print(f"[API CONTACTS] ✅ Contact id={id} supprimé")
    return jsonify({'success': True})


@bp.route('/<id>/impayes', methods=['GET'])
@require_auth
def get_contact_impayes(id):
    """Liste des impayés d'un contact."""
    print(f"[API CONTACTS] GET /api/contacts/{id}/impayes - Impayés du contact")
    db = get_db()
    
    contact = db.execute('SELECT * FROM contacts WHERE id = ?', (id,)).fetchone()
    if contact is None:
        print(f"[API CONTACTS] ❌ Contact id={id} non trouvé")
        return jsonify({'error': 'Contact non trouvé'}), 404
    
    impayes = db.execute('SELECT * FROM impayes WHERE contact_id = ?', (id,)).fetchall()
    total = sum(i['montant'] for i in impayes)
    
    print(f"[API CONTACTS] ✅ {len(impayes)} impayés trouvés, total={total}")
    return jsonify({
        'contact': dict(contact),
        'impayes': [dict(row) for row in impayes],
        'total_impaye': total
    })
