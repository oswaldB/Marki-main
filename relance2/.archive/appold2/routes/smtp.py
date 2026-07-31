"""Routes API pour la gestion des profils SMTP."""
from functools import wraps
from flask import Blueprint, request, jsonify, g
from datetime import datetime
import sqlite3
import uuid
from routes.auth import require_auth


def get_db():
    """Get database connection from app context."""
    from flask import current_app
    db = sqlite3.connect(
        current_app.config['DATABASE'],
        detect_types=sqlite3.PARSE_DECLTYPES
    )
    db.row_factory = sqlite3.Row
    return db


def admin_required(f):
    """Décorateur pour restreindre aux admins."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if g.current_user.get('role') != 'admin':
            return jsonify({
                'success': False,
                'error': {'message': 'Accès réservé aux administrateurs'}
            }), 403
        return f(*args, **kwargs)
    return decorated


smtp_bp = Blueprint('smtp', __name__, url_prefix='/api/smtp-profiles')


@smtp_bp.route('', methods=['GET'])
@require_auth
def get_smtp_profiles():
    """Liste tous les profils SMTP."""
    db = get_db()
    cursor = db.cursor()
    
    cursor.execute("""
        SELECT id, nom, host, port, secure, username, 
               from_email, from_name, actif, is_default,
               created_at, updated_at
        FROM smtp_profiles
        ORDER BY created_at DESC
    """)
    
    profils = []
    for row in cursor.fetchall():
        # Convertir secure (0/1) en string pour compatibilité
        securite = 'ssl' if row['secure'] else 'tls'
        
        profils.append({
            'id': row['id'],
            'nom': row['nom'],
            'email': row['from_email'],
            'serveur': row['host'],
            'port': row['port'],
            'securite': securite,
            'username': row['username'] or '',
            'actif': bool(row['actif']),
            'is_default': bool(row['is_default']),
            'created_at': row['created_at'],
            'updated_at': row['updated_at']
        })
    
    return jsonify({
        'success': True,
        'profils': profils,
        'total': len(profils)
    })


@smtp_bp.route('/<profil_id>', methods=['GET'])
@require_auth
def get_smtp_profile(profil_id):
    """Récupère un profil SMTP par son ID."""
    db = get_db()
    cursor = db.cursor()
    
    cursor.execute("""
        SELECT id, nom, host, port, secure, username, 
               from_email, from_name, signature_html, 
               actif, is_default, created_at, updated_at
        FROM smtp_profiles
        WHERE id = ?
    """, (profil_id,))
    
    row = cursor.fetchone()
    if not row:
        return jsonify({
            'success': False,
            'error': {'message': 'Profil SMTP non trouvé'}
        }), 404
    
    # Convertir secure (0/1) en string pour compatibilité
    securite = 'ssl' if row['secure'] else 'tls'
    
    profil = {
        'id': row['id'],
        'nom': row['nom'],
        'email': row['from_email'],
        'serveur': row['host'],
        'port': row['port'],
        'securite': securite,
        'username': row['username'] or '',
        'signature': row['signature_html'] or '',
        'actif': bool(row['actif']),
        'is_default': bool(row['is_default']),
        'password': '••••••••',  # Ne jamais retourner le vrai mot de passe
        'created_at': row['created_at'],
        'updated_at': row['updated_at']
    }
    
    return jsonify({
        'success': True,
        'profil': profil
    })


@smtp_bp.route('', methods=['POST'])
@require_auth
@admin_required
def create_smtp_profile():
    """Créer un nouveau profil SMTP (admin only)."""
    data = request.get_json()
    
    # Validation
    required_fields = ['nom', 'email', 'serveur', 'port']
    for field in required_fields:
        if not data.get(field):
            return jsonify({
                'success': False,
                'error': {'message': f'Le champ {field} est requis'}
            }), 400
    
    db = get_db()
    cursor = db.cursor()
    
    # Vérifier si le nom existe déjà
    cursor.execute('SELECT id FROM smtp_profiles WHERE nom = ?', (data['nom'],))
    if cursor.fetchone():
        return jsonify({
            'success': False,
            'error': {'message': 'Un profil avec ce nom existe déjà'}
        }), 409
    
    # Convertir securite en secure (0/1)
    securite = data.get('securite', 'tls')
    secure = 1 if securite == 'ssl' else 0
    
    # Insérer le profil
    now = datetime.now().isoformat()
    profil_id = str(uuid.uuid4())
    
    cursor.execute("""
        INSERT INTO smtp_profiles (id, nom, host, port, secure, 
                                   username, password, from_email, from_name, 
                                   signature_html, actif, is_default,
                                   created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        profil_id,
        data['nom'],
        data['serveur'],
        int(data['port']),
        secure,
        data.get('username', ''),
        data.get('password', ''),  # Note: En production, il faudrait chiffrer
        data['email'],
        data['nom'],  # from_name = nom par défaut
        data.get('signature', ''),
        1 if data.get('actif', True) else 0,
        0,  # is_default
        now,
        now
    ))
    
    db.commit()
    
    return jsonify({
        'success': True,
        'message': 'Profil SMTP créé avec succès',
        'data': {
            'id': profil_id,
            'nom': data['nom'],
            'email': data['email'],
            'serveur': data['serveur'],
            'port': int(data['port']),
            'securite': securite,
            'username': data.get('username', ''),
            'actif': data.get('actif', True)
        }
    }), 201


@smtp_bp.route('/<profil_id>', methods=['PUT'])
@require_auth
@admin_required
def update_smtp_profile(profil_id):
    """Modifier un profil SMTP (admin only)."""
    data = request.get_json()
    
    db = get_db()
    cursor = db.cursor()
    
    # Vérifier si le profil existe
    cursor.execute('SELECT id FROM smtp_profiles WHERE id = ?', (profil_id,))
    if not cursor.fetchone():
        return jsonify({
            'success': False,
            'error': {'message': 'Profil SMTP non trouvé'}
        }), 404
    
    # Construire la requête de mise à jour
    updates = []
    params = []
    
    if 'nom' in data:
        updates.append('nom = ?')
        params.append(data['nom'])
        updates.append('from_name = ?')  # Synchroniser from_name avec nom
        params.append(data['nom'])
    if 'email' in data:
        updates.append('from_email = ?')
        params.append(data['email'])
    if 'serveur' in data:
        updates.append('host = ?')
        params.append(data['serveur'])
    if 'port' in data:
        updates.append('port = ?')
        params.append(int(data['port']))
    if 'securite' in data:
        updates.append('secure = ?')
        secure = 1 if data['securite'] == 'ssl' else 0
        params.append(secure)
    if 'username' in data:
        updates.append('username = ?')
        params.append(data['username'])
    if 'signature' in data:
        updates.append('signature_html = ?')
        params.append(data['signature'])
    if 'actif' in data:
        updates.append('actif = ?')
        params.append(1 if data['actif'] else 0)
    if 'password' in data and data['password']:
        updates.append('password = ?')
        params.append(data['password'])  # Note: En production, chiffrer
    
    if not updates:
        return jsonify({
            'success': False,
            'error': {'message': 'Aucune donnée à mettre à jour'}
        }), 400
    
    updates.append('updated_at = ?')
    params.append(datetime.now().isoformat())
    params.append(profil_id)
    
    cursor.execute(f"UPDATE smtp_profiles SET {', '.join(updates)} WHERE id = ?", params)
    db.commit()
    
    return jsonify({
        'success': True,
        'message': 'Profil SMTP mis à jour avec succès',
        'data': {
            'id': profil_id,
            'nom': data.get('nom'),
            'email': data.get('email'),
            'serveur': data.get('serveur'),
            'port': data.get('port'),
            'securite': data.get('securite'),
            'username': data.get('username'),
            'signature': data.get('signature'),
            'actif': data.get('actif')
        }
    })


@smtp_bp.route('/<profil_id>', methods=['DELETE'])
@require_auth
@admin_required
def delete_smtp_profile(profil_id):
    """Supprimer un profil SMTP (admin only)."""
    db = get_db()
    cursor = db.cursor()
    
    # Vérifier si le profil existe
    cursor.execute('SELECT id FROM smtp_profiles WHERE id = ?', (profil_id,))
    if not cursor.fetchone():
        return jsonify({
            'success': False,
            'error': {'message': 'Profil SMTP non trouvé'}
        }), 404
    
    cursor.execute('DELETE FROM smtp_profiles WHERE id = ?', (profil_id,))
    db.commit()
    
    return jsonify({
        'success': True,
        'message': 'Profil SMTP supprimé avec succès'
    })
