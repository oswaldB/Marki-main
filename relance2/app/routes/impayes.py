from flask import Blueprint, request, jsonify
import uuid
import datetime
from ..db import get_db

bp = Blueprint('impayes', __name__)


@bp.route('/', methods=['GET'])
def get_impayes():
    """Get impayes list with filters and pagination."""
    print(f"[API.IMPAYES.LIST] START: params={dict(request.args)}")
    
    # Query params
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    statut = request.args.get('statut', 'impaye')
    contact_id = request.args.get('contact_id')
    suspendu = request.args.get('suspendu', type=int)
    
    print(f"[API.IMPAYES.LIST] STEP: Application filtres (statut={statut}, contact={contact_id})")
    
    db = get_db()
    cursor = db.cursor()
    
    # Build query
    query = """
        SELECT i.*, c.nom as contact_nom, c.prenom as contact_prenom 
        FROM impayes i 
        LEFT JOIN contacts c ON i.contact_relance_id = c.id 
        WHERE 1=1
    """
    params = []
    
    if statut:
        query += " AND i.statut = ?"
        params.append(statut)
    
    if contact_id:
        query += " AND i.contact_relance_id = ?"
        params.append(contact_id)
    
    if suspendu is not None:
        query += " AND i.suspendu = ?"
        params.append(suspendu)
    
    # Count total
    count_query = f"SELECT COUNT(*) FROM ({query})"
    cursor.execute(count_query, params)
    total = cursor.fetchone()[0]
    
    print(f"[API.IMPAYES.LIST] STEP: Requête count exécutée, total={total}")
    
    # Add pagination
    query += " ORDER BY i.date_echeance ASC LIMIT ? OFFSET ?"
    params.extend([per_page, (page - 1) * per_page])
    
    cursor.execute(query, params)
    impayes = [dict(row) for row in cursor.fetchall()]
    
    total_pages = (total + per_page - 1) // per_page
    
    print(f"[API.IMPAYES.LIST] SUCCESS: {len(impayes)} impayés retournés (page {page}/{total_pages})")
    
    return jsonify({
        'impayes': impayes,
        'total': total,
        'page': page,
        'per_page': per_page,
        'total_pages': total_pages
    })


@bp.route('/<id>', methods=['GET'])
def get_impaye(id):
    """Get single impaye by ID."""
    print(f"[API.IMPAYES.GET] START: id={id}")
    
    db = get_db()
    cursor = db.cursor()
    
    cursor.execute("""
        SELECT i.*, c.nom as contact_nom, c.prenom as contact_prenom 
        FROM impayes i 
        LEFT JOIN contacts c ON i.contact_relance_id = c.id 
        WHERE i.id = ?
    """, (id,))
    impaye = cursor.fetchone()
    
    if not impaye:
        print(f"[API.IMPAYES.GET] ERROR: Impayé non trouvé: {id}")
        return jsonify({'error': 'Impayé non trouvé'}), 404
    
    print("[API.IMPAYES.GET] SUCCESS: Impayé trouvé")
    return jsonify(dict(impaye))


@bp.route('/', methods=['POST'])
def create_impaye():
    """Create new impaye."""
    print("[API.IMPAYES.CREATE] START: received request")
    
    data = request.get_json()
    if not data:
        print("[API.IMPAYES.CREATE] ERROR: No JSON data")
        return jsonify({'error': 'Données manquantes'}), 400
    
    # Required fields
    if not data.get('nfacture'):
        print("[API.IMPAYES.CREATE] ERROR: Missing nfacture")
        return jsonify({'error': 'Le numéro de facture est requis'}), 400
    
    print("[API.IMPAYES.CREATE] STEP: Génération UUID")
    new_id = str(uuid.uuid4())
    now = datetime.datetime.now().isoformat()
    
    print("[API.IMPAYES.CREATE] STEP: Insertion en base")
    
    db = get_db()
    cursor = db.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO impayes (
                id, payer_id, contact_relance_id, proprietaire_id, apporteur_id,
                sequence_id, nfacture, date_facture, date_echeance, date_piece,
                montant_ttc, solde_du, reste_a_payer, statut, suspendu,
                notes, lien_paiement, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            new_id, data.get('payer_id'), data.get('contact_relance_id'),
            data.get('proprietaire_id'), data.get('apporteur_id'),
            data.get('sequence_id'), data.get('nfacture'), data.get('date_facture'),
            data.get('date_echeance'), data.get('date_piece'),
            data.get('montant_ttc', 0), data.get('solde_du', 0),
            data.get('reste_a_payer', 0), data.get('statut', 'impaye'),
            0, data.get('notes'), data.get('lien_paiement'), now, now
        ))
        db.commit()
        
        print(f"[API.IMPAYES.CREATE] SUCCESS: Impayé créé avec id={new_id}")
        
        return jsonify({
            'id': new_id,
            'message': 'Impayé créé avec succès'
        }), 201
        
    except Exception as e:
        print(f"[API.IMPAYES.CREATE] ERROR: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/<id>', methods=['PUT'])
def update_impaye(id):
    """Update impaye."""
    print(f"[API.IMPAYES.UPDATE] START: id={id}, data={request.get_json()}")
    
    data = request.get_json()
    if not data:
        print("[API.IMPAYES.UPDATE] ERROR: No JSON data")
        return jsonify({'error': 'Données manquantes'}), 400
    
    db = get_db()
    cursor = db.cursor()
    
    # Check impaye exists
    cursor.execute("SELECT id FROM impayes WHERE id = ?", (id,))
    if not cursor.fetchone():
        print(f"[API.IMPAYES.UPDATE] ERROR: Impayé non trouvé: {id}")
        return jsonify({'error': 'Impayé non trouvé'}), 404
    
    print("[API.IMPAYES.UPDATE] STEP: Mise à jour impayé")
    
    # Build update
    allowed_fields = [
        'payer_id', 'contact_relance_id', 'proprietaire_id', 'apporteur_id',
        'sequence_id', 'nfacture', 'date_facture', 'date_echeance', 'date_piece',
        'montant_ttc', 'solde_du', 'reste_a_payer', 'statut', 'suspendu',
        'suspend_date', 'suspend_motif', 'notes', 'lien_paiement'
    ]
    
    updates = []
    params = []
    
    for field in allowed_fields:
        if field in data:
            updates.append(f"{field} = ?")
            params.append(data[field])
    
    if not updates:
        print("[API.IMPAYES.UPDATE] ERROR: No fields to update")
        return jsonify({'error': 'Aucun champ à mettre à jour'}), 400
    
    updates.append("updated_at = ?")
    params.append(datetime.datetime.now().isoformat())
    params.append(id)
    
    query = f"UPDATE impayes SET {', '.join(updates)} WHERE id = ?"
    
    try:
        cursor.execute(query, params)
        db.commit()
        
        print("[API.IMPAYES.UPDATE] SUCCESS: Impayé mis à jour")
        return jsonify({'message': 'Impayé mis à jour'})
        
    except Exception as e:
        print(f"[API.IMPAYES.UPDATE] ERROR: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/<id>', methods=['DELETE'])
def delete_impaye(id):
    """Delete impaye."""
    print(f"[API.IMPAYES.DELETE] START: id={id}")
    
    db = get_db()
    cursor = db.cursor()
    
    # Check impaye exists
    cursor.execute("SELECT id FROM impayes WHERE id = ?", (id,))
    if not cursor.fetchone():
        print(f"[API.IMPAYES.DELETE] ERROR: Impayé non trouvé: {id}")
        return jsonify({'error': 'Impayé non trouvé'}), 404
    
    try:
        cursor.execute("DELETE FROM impayes WHERE id = ?", (id,))
        db.commit()
        
        print("[API.IMPAYES.DELETE] SUCCESS: Impayé supprimé")
        return jsonify({'message': 'Impayé supprimé'})
        
    except Exception as e:
        print(f"[API.IMPAYES.DELETE] ERROR: {str(e)}")
        return jsonify({'error': str(e)}), 500
