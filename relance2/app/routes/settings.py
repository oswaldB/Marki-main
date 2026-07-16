from flask import Blueprint, request, jsonify
import uuid
import datetime
from ..db import get_db

bp = Blueprint('settings', __name__)


# SMTP Profiles
@bp.route('/smtp', methods=['GET'])
def get_smtp_profiles():
    """Get SMTP profiles."""
    print("[API.SETTINGS.SMTP_LIST] START")
    
    db = get_db()
    cursor = db.cursor()
    
    cursor.execute("SELECT * FROM smtp_profiles")
    profiles = [dict(row) for row in cursor.fetchall()]
    
    print(f"[API.SETTINGS.SMTP_LIST] SUCCESS: {len(profiles)} profiles")
    return jsonify({'profiles': profiles})


@bp.route('/smtp/<id>', methods=['GET'])
def get_smtp_profile(id):
    """Get single SMTP profile."""
    print(f"[API.SETTINGS.SMTP_GET] START: id={id}")
    
    db = get_db()
    cursor = db.cursor()
    
    cursor.execute("SELECT * FROM smtp_profiles WHERE id = ?", (id,))
    profile = cursor.fetchone()
    
    if not profile:
        return jsonify({'error': 'Profil SMTP non trouvé'}), 404
    
    return jsonify(dict(profile))


@bp.route('/smtp', methods=['POST'])
def create_smtp_profile():
    """Create SMTP profile."""
    print("[API.SETTINGS.SMTP_CREATE] START")
    
    data = request.get_json() or {}
    new_id = str(uuid.uuid4())
    now = datetime.datetime.now().isoformat()
    
    db = get_db()
    cursor = db.cursor()
    
    cursor.execute("""
        INSERT INTO smtp_profiles (id, nom, host, port, secure, username, 
        password, from_email, from_name, actif, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (new_id, data.get('nom'), data.get('host'), data.get('port', 587),
          data.get('secure', 0), data.get('username'), data.get('password'),
          data.get('from_email'), data.get('from_name'), 1, now, now))
    
    db.commit()
    
    print(f"[API.SETTINGS.SMTP_CREATE] SUCCESS: id={new_id}")
    return jsonify({'id': new_id, 'message': 'Profil créé'}), 201


@bp.route('/smtp/<id>', methods=['PUT'])
def update_smtp_profile(id):
    """Update SMTP profile."""
    print(f"[API.SETTINGS.SMTP_UPDATE] START: id={id}")
    
    data = request.get_json() or {}
    now = datetime.datetime.now().isoformat()
    
    db = get_db()
    cursor = db.cursor()
    
    cursor.execute("SELECT id FROM smtp_profiles WHERE id = ?", (id,))
    if not cursor.fetchone():
        return jsonify({'error': 'Profil non trouvé'}), 404
    
    updates = []
    params = []
    
    for field in ['nom', 'host', 'port', 'secure', 'username', 'password', 
                  'from_email', 'from_name', 'actif']:
        if field in data:
            updates.append(f"{field} = ?")
            params.append(data[field])
    
    if updates:
        updates.append("updated_at = ?")
        params.append(now)
        params.append(id)
        
        query = f"UPDATE smtp_profiles SET {', '.join(updates)} WHERE id = ?"
        cursor.execute(query, params)
        db.commit()
    
    print("[API.SETTINGS.SMTP_UPDATE] SUCCESS")
    return jsonify({'message': 'Profil mis à jour'})


@bp.route('/smtp/<id>', methods=['DELETE'])
def delete_smtp_profile(id):
    """Delete SMTP profile."""
    print(f"[API.SETTINGS.SMTP_DELETE] START: id={id}")
    
    db = get_db()
    cursor = db.cursor()
    
    cursor.execute("DELETE FROM smtp_profiles WHERE id = ?", (id,))
    db.commit()
    
    print("[API.SETTINGS.SMTP_DELETE] SUCCESS")
    return jsonify({'message': 'Profil supprimé'})


# Users
@bp.route('/users', methods=['GET'])
def get_users():
    """Get users list."""
    print("[API.SETTINGS.USERS_LIST] START")
    
    db = get_db()
    cursor = db.cursor()
    
    cursor.execute("SELECT id, username, email, role, is_active FROM users")
    users = [dict(row) for row in cursor.fetchall()]
    
    print(f"[API.SETTINGS.USERS_LIST] SUCCESS: {len(users)} users")
    return jsonify({'users': users})


@bp.route('/users/<id>', methods=['PUT'])
def update_user(id):
    """Update user."""
    print(f"[API.SETTINGS.USER_UPDATE] START: id={id}")
    
    data = request.get_json() or {}
    now = datetime.datetime.now().isoformat()
    
    db = get_db()
    cursor = db.cursor()
    
    cursor.execute("SELECT id FROM users WHERE id = ?", (id,))
    if not cursor.fetchone():
        return jsonify({'error': 'Utilisateur non trouvé'}), 404
    
    updates = []
    params = []
    
    for field in ['username', 'email', 'role', 'is_active']:
        if field in data:
            updates.append(f"{field} = ?")
            params.append(data[field])
    
    if 'password' in data:
        updates.append("password_hash = ?")
        params.append(data['password'])  # TODO: hash password
    
    if updates:
        updates.append("updated_at = ?")
        params.append(now)
        params.append(id)
        
        query = f"UPDATE users SET {', '.join(updates)} WHERE id = ?"
        cursor.execute(query, params)
        db.commit()
    
    print("[API.SETTINGS.USER_UPDATE] SUCCESS")
    return jsonify({'message': 'Utilisateur mis à jour'})
