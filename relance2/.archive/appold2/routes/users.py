"""Routes API pour la gestion des utilisateurs."""
from functools import wraps
from flask import Blueprint, request, jsonify, g
import bcrypt
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

users_bp = Blueprint('users', __name__, url_prefix='/api/users')


@users_bp.route('', methods=['GET'])
@require_auth
def get_users():
    """Liste tous les utilisateurs."""
    db = get_db()
    cursor = db.cursor()
    
    cursor.execute("""
        SELECT id, username, email, role, is_active, created_at, updated_at
        FROM users
        ORDER BY created_at DESC
    """)
    
    users = []
    for row in cursor.fetchall():
        # Extraire prénom/nom du username (format: prenom.nom ou email)
        username = row['username'] or ''
        parts = username.split('.')
        if len(parts) >= 2:
            prenom = parts[0].capitalize()
            nom = parts[1].capitalize()
        else:
            prenom = username
            nom = ''
        
        users.append({
            'id': row['id'],
            'username': username,
            'nom': nom,
            'prenom': prenom,
            'email': row['email'] or '',
            'role': row['role'] or 'user',
            'actif': bool(row['is_active']),
            'initials': f"{prenom[0] if prenom else ''}{nom[0] if nom else ''}".upper(),
            'created_at': row['created_at'],
            'updated_at': row['updated_at']
        })
    
    return jsonify({
        'success': True,
        'users': users,
        'total': len(users)
    })


@users_bp.route('', methods=['POST'])
@require_auth
@admin_required
def create_user():
    """Créer un nouvel utilisateur (admin only)."""
    data = request.get_json()
    
    # Validation
    required_fields = ['prenom', 'nom', 'username', 'email', 'password']
    for field in required_fields:
        if not data.get(field):
            return jsonify({
                'success': False,
                'error': {'message': f'Le champ {field} est requis'}
            }), 400
    
    db = get_db()
    cursor = db.cursor()
    
    # Vérifier si username existe déjà
    cursor.execute('SELECT id FROM users WHERE username = ?', (data['username'],))
    if cursor.fetchone():
        return jsonify({
            'success': False,
            'error': {'message': 'Ce nom d\'utilisateur existe déjà'}
        }), 409
    
    # Vérifier si email existe déjà
    cursor.execute('SELECT id FROM users WHERE email = ?', (data['email'],))
    if cursor.fetchone():
        return jsonify({
            'success': False,
            'error': {'message': 'Cet email existe déjà'}
        }), 409
    
    # Hasher le mot de passe
    password_hash = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Insérer l'utilisateur
    now = datetime.now().isoformat()
    user_id = str(uuid.uuid4())
    cursor.execute("""
        INSERT INTO users (id, username, password_hash, email, role, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id,
        data['username'],
        password_hash,
        data['email'],
        data.get('role', 'user'),
        1,  # actif par défaut
        now,
        now
    ))
    
    db.commit()
    
    return jsonify({
        'success': True,
        'message': 'Utilisateur créé avec succès',
        'data': {
            'id': user_id,
            'username': data['username'],
            'nom': data['nom'],
            'prenom': data['prenom'],
            'email': data['email'],
            'role': data.get('role', 'user'),
            'actif': True,
            'initials': f"{data['prenom'][0]}{data['nom'][0]}".upper()
        }
    }), 201


@users_bp.route('/<user_id>', methods=['PUT'])
@require_auth
@admin_required
def update_user(user_id):
    """Modifier un utilisateur (admin only)."""
    data = request.get_json()
    
    db = get_db()
    cursor = db.cursor()
    
    # Vérifier si l'utilisateur existe
    cursor.execute('SELECT id FROM users WHERE id = ?', (user_id,))
    if not cursor.fetchone():
        return jsonify({
            'success': False,
            'error': {'message': 'Utilisateur non trouvé'}
        }), 404
    
    # Construire la requête de mise à jour
    updates = []
    params = []
    
    if 'email' in data:
        updates.append('email = ?')
        params.append(data['email'])
    if 'role' in data:
        updates.append('role = ?')
        params.append(data['role'])
    if 'actif' in data:
        updates.append('is_active = ?')
        params.append(1 if data['actif'] else 0)
    if 'password' in data and data['password']:
        password_hash = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        updates.append('password_hash = ?')
        params.append(password_hash)
    
    if not updates:
        return jsonify({
            'success': False,
            'error': {'message': 'Aucune donnée à mettre à jour'}
        }), 400
    
    updates.append('updated_at = ?')
    params.append(datetime.now().isoformat())
    params.append(user_id)
    
    cursor.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", params)
    db.commit()
    
    return jsonify({
        'success': True,
        'message': 'Utilisateur mis à jour avec succès'
    })
