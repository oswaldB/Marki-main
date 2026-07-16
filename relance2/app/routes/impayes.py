"""Routes impayés (API)."""

from flask import Blueprint, request, jsonify, g
import uuid
from datetime import datetime

impayes_bp = Blueprint('impayes', __name__, url_prefix='/api/impayes')


def get_db():
    """Get database connection from app context."""
    from flask import current_app
    import sqlite3
    db = sqlite3.connect(
        current_app.config['DATABASE'],
        detect_types=sqlite3.PARSE_DECLTYPES
    )
    db.row_factory = sqlite3.Row
    return db


@impayes_bp.route('', methods=['GET'])
def list_impayes():
    """Liste des impayés avec filtres."""
    print(f"[API.IMPAYES.LIST] START: params={dict(request.args)}")
    
    db = get_db()
    
    # Paramètres
    statut = request.args.get('statut')
    facture_soldee = request.args.get('facture_soldee')
    contact_id = request.args.get('contact_id')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 50))
    
    print(f"[API.IMPAYES.LIST] STEP: Application filtres (statut={statut}, contact={contact_id})")
    
    # Construction de la requête
    where_clauses = []
    params = []
    
    if statut:
        where_clauses.append("i.statut = ?")
        params.append(statut)
    
    if facture_soldee is not None:
        where_clauses.append("i.facture_soldee = ?")
        params.append(1 if facture_soldee in ['1', 'true', 'True'] else 0)
    
    if contact_id:
        where_clauses.append("i.payer_id = ?")
        params.append(contact_id)
    
    where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""
    
    # Count total
    count_sql = f"SELECT COUNT(*) as total FROM impayes i {where_sql}"
    total = db.execute(count_sql, params).fetchone()['total']
    
    print(f"[API.IMPAYES.LIST] STEP: Requête count exécutée, total={total}")
    
    # Récupération des impayés
    offset = (page - 1) * per_page
    query = f"""
        SELECT i.*, c.nom as payer_nom, c.email as payer_email
        FROM impayes i
        LEFT JOIN contacts c ON i.payer_id = c.id
        {where_sql}
        ORDER BY i.date_echeance ASC
        LIMIT ? OFFSET ?
    """
    
    rows = db.execute(query, params + [per_page, offset]).fetchall()
    
    impayes = []
    for row in rows:
        impaye = dict(row)
        # Conversion des booléens
        impaye['facture_soldee'] = bool(impaye.get('facture_soldee', 0))
        impaye['is_blacklisted'] = bool(impaye.get('is_blacklisted', 0))
        impayes.append(impaye)
    
    total_pages = (total + per_page - 1) // per_page
    
    print(f"[API.IMPAYES.LIST] SUCCESS: {len(impayes)} impayés retournés (page {page}/{total_pages})")
    
    return jsonify({
        'impayes': impayes,
        'total': total,
        'page': page,
        'per_page': per_page,
        'total_pages': total_pages
    }), 200


@impayes_bp.route('/<id>', methods=['GET'])
def get_impaye(id):
    """Détail d'un impayé."""
    print(f"[API.IMPAYES.GET] START: id={id}")
    
    db = get_db()
    print(f"[API.IMPAYES.GET] STEP: Recherche impayé id={id}")
    
    row = db.execute("""
        SELECT i.*, c.nom as payer_nom, c.email as payer_email
        FROM impayes i
        LEFT JOIN contacts c ON i.payer_id = c.id
        WHERE i.id = ?
    """, (id,)).fetchone()
    
    if row is None:
        print(f"[API.IMPAYES.GET] ERROR: Impayé non trouvé")
        return jsonify({'error': 'Impayé non trouvé'}), 404
    
    impaye = dict(row)
    impaye['facture_soldee'] = bool(impaye.get('facture_soldee', 0))
    impaye['is_blacklisted'] = bool(impaye.get('is_blacklisted', 0))
    
    print(f"[API.IMPAYES.GET] SUCCESS: Impayé trouvé")
    return jsonify(impaye), 200


@impayes_bp.route('', methods=['POST'])
def create_impaye():
    """Créer un impayé."""
    data = request.get_json() or {}
    print(f"[API.IMPAYES.CREATE] START: data={data}")
    
    db = get_db()
    
    # Génération UUID
    print(f"[API.IMPAYES.CREATE] STEP: Génération UUID")
    new_id = str(uuid.uuid4())
    
    print(f"[API.IMPAYES.CREATE] STEP: Insertion en base")
    db.execute("""
        INSERT INTO impayes (
            id, payer_id, contact_relance_id, nfacture, date_echeance,
            montant_total, reste_a_payer, statut, is_blacklisted,
            facture_soldee, apporteur_id, sequence_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        new_id,
        data.get('payer_id'),
        data.get('contact_relance_id'),
        data.get('nfacture'),
        data.get('date_echeance'),
        data.get('montant_total', 0),
        data.get('reste_a_payer', 0),
        data.get('statut', 'unpaid'),
        data.get('is_blacklisted', False),
        data.get('facture_soldee', False),
        data.get('apporteur_id'),
        data.get('sequence_id'),
        datetime.utcnow().isoformat()
    ))
    db.commit()
    
    print(f"[API.IMPAYES.CREATE] SUCCESS: Impayé créé avec id={new_id}")
    return jsonify({'id': new_id, 'success': True}), 201


@impayes_bp.route('/<id>', methods=['PUT'])
def update_impaye(id):
    """Modifier un impayé."""
    data = request.get_json() or {}
    print(f"[API.IMPAYES.UPDATE] START: id={id}, data={data}")
    
    db = get_db()
    
    # Vérifier existence
    existing = db.execute("SELECT id FROM impayes WHERE id = ?", (id,)).fetchone()
    if existing is None:
        return jsonify({'error': 'Impayé non trouvé'}), 404
    
    print(f"[API.IMPAYES.UPDATE] STEP: Mise à jour impayé id={id}")
    
    # Construction dynamique de la requête
    fields = []
    values = []
    
    allowed_fields = ['payer_id', 'contact_relance_id', 'nfacture', 'date_echeance',
                      'montant_total', 'reste_a_payer', 'statut', 'is_blacklisted', 
                      'facture_soldee', 'sequence_id']
    
    for field in allowed_fields:
        if field in data:
            fields.append(f"{field} = ?")
            values.append(data[field])
    
    if not fields:
        return jsonify({'error': 'Aucun champ à mettre à jour'}), 400
    
    values.append(id)
    sql = f"UPDATE impayes SET {', '.join(fields)}, updated_at = ? WHERE id = ?"
    values.insert(-1, datetime.utcnow().isoformat())
    
    db.execute(sql, values)
    db.commit()
    
    print(f"[API.IMPAYES.UPDATE] SUCCESS: Impayé mis à jour")
    return jsonify({'success': True}), 200
