"""
Workflow: Gestion des Utilisateurs

Création, modification et suppression des utilisateurs.
"""

import uuid
import datetime
from ..db import get_db


def create_user(username, email, password, role='user'):
    """Create a new user."""
    workflow_id = str(uuid.uuid4())
    print(f"[WORKFLOW.CREATE_USER] START: {workflow_id}, username={username}")
    
    db = get_db()
    cursor = db.cursor()
    
    try:
        # Vérifier si existe déjà
        cursor.execute(
            "SELECT id FROM users WHERE username = ? OR email = ?",
            (username, email)
        )
        
        if cursor.fetchone():
            raise ValueError("Utilisateur existe déjà")
        
        # Créer l'utilisateur
        user_id = str(uuid.uuid4())
        password_hash = password  # En production: utiliser bcrypt
        
        cursor.execute("""
            INSERT INTO users (
                id, username, email, password_hash, role,
                is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id,
            username,
            email,
            password_hash,
            role,
            1,
            datetime.datetime.now().isoformat(),
            datetime.datetime.now().isoformat()
        ))
        
        db.commit()
        
        print(f"[WORKFLOW.CREATE_USER] SUCCESS: User {user_id} created")
        
        return {
            'user_id': user_id,
            'username': username,
            'email': email,
            'role': role
        }
        
    except Exception as e:
        print(f"[WORKFLOW.CREATE_USER] ERROR: {str(e)}")
        raise


def update_user(user_id, data):
    """Update user information."""
    workflow_id = str(uuid.uuid4())
    print(f"[WORKFLOW.UPDATE_USER] START: {workflow_id}, user={user_id}")
    
    db = get_db()
    cursor = db.cursor()
    
    try:
        # Construire la requête dynamiquement
        allowed_fields = ['username', 'email', 'role', 'is_active']
        updates = []
        values = []
        
        for field in allowed_fields:
            if field in data:
                updates.append(f"{field} = ?")
                values.append(data[field])
        
        if not updates:
            return {'updated': False}
        
        updates.append("updated_at = ?")
        values.append(datetime.datetime.now().isoformat())
        values.append(user_id)
        
        cursor.execute(f"""
            UPDATE users SET {', '.join(updates)}
            WHERE id = ?
        """, values)
        
        db.commit()
        
        print(f"[WORKFLOW.UPDATE_USER] SUCCESS: User {user_id} updated")
        
        return {'user_id': user_id, 'updated': True}
        
    except Exception as e:
        print(f"[WORKFLOW.UPDATE_USER] ERROR: {str(e)}")
        raise


def delete_user(user_id):
    """Delete a user (soft delete)."""
    workflow_id = str(uuid.uuid4())
    print(f"[WORKFLOW.DELETE_USER] START: {workflow_id}, user={user_id}")
    
    db = get_db()
    cursor = db.cursor()
    
    try:
        cursor.execute("""
            UPDATE users 
            SET is_active = 0, updated_at = ?
            WHERE id = ?
        """, (
            datetime.datetime.now().isoformat(),
            user_id
        ))
        
        db.commit()
        
        print(f"[WORKFLOW.DELETE_USER] SUCCESS: User {user_id} deactivated")
        
        return {'user_id': user_id}
        
    except Exception as e:
        print(f"[WORKFLOW.DELETE_USER] ERROR: {str(e)}")
        raise
