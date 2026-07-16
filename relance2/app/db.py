import sqlite3
import os
from flask import g, current_app


def get_db():
    """Get database connection for current request context."""
    if 'db' not in g:
        db_path = os.path.join(current_app.root_path, 'marki.db')
        g.db = sqlite3.connect(db_path)
        g.db.row_factory = sqlite3.Row
    return g.db


def close_db(e=None):
    """Close database connection at end of request."""
    db = g.pop('db', None)
    if db is not None:
        db.close()


def init_db():
    """Initialize database tables if they don't exist."""
    db = get_db()
    
    # Users table
    db.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            is_active INTEGER NOT NULL DEFAULT 1,
            last_login TEXT,
            login_count INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Sessions table
    db.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            ip_address TEXT,
            user_agent TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Contacts table
    db.execute("""
        CREATE TABLE IF NOT EXISTS contacts (
            id TEXT PRIMARY KEY,
            nom TEXT NOT NULL,
            prenom TEXT,
            email TEXT,
            telephone TEXT,
            type TEXT,
            type_personne TEXT DEFAULT 'P',
            statut TEXT DEFAULT 'actif',
            is_blacklisted INTEGER DEFAULT 0,
            blacklist_date TEXT,
            blacklist_motif TEXT,
            civilite TEXT,
            code TEXT,
            societe TEXT,
            activite_societe TEXT,
            adresse_rue TEXT,
            adresse_ville TEXT,
            adresse_code_postal TEXT,
            adresse_pays TEXT DEFAULT 'France',
            notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)
    
    # Impayes table
    db.execute("""
        CREATE TABLE IF NOT EXISTS impayes (
            id TEXT PRIMARY KEY,
            payer_id TEXT REFERENCES contacts(id),
            contact_relance_id TEXT REFERENCES contacts(id),
            proprietaire_id TEXT REFERENCES contacts(id),
            apporteur_id TEXT REFERENCES contacts(id),
            sequence_id TEXT REFERENCES sequences(id),
            nfacture TEXT NOT NULL,
            date_facture TEXT,
            date_echeance TEXT NOT NULL,
            date_piece TEXT,
            date_import TEXT,
            montant_ttc REAL DEFAULT 0,
            solde_du REAL DEFAULT 0,
            reste_a_payer REAL DEFAULT 0,
            statut TEXT DEFAULT 'impaye',
            is_blacklisted INTEGER DEFAULT 0,
            blacklist_date TEXT,
            blacklist_motif TEXT,
            suspendu INTEGER DEFAULT 0,
            suspend_date TEXT,
            suspend_motif TEXT,
            notes TEXT,
            lien_paiement TEXT,
            url_pdf_token TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Sequences table
    db.execute("""
        CREATE TABLE IF NOT EXISTS sequences (
            id TEXT PRIMARY KEY,
            nom TEXT NOT NULL,
            type_sequence TEXT NOT NULL,
            niveau INTEGER DEFAULT 0,
            actif INTEGER DEFAULT 1,
            validation_obligatoire INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)
    
    # Sequences emails table
    db.execute("""
        CREATE TABLE IF NOT EXISTS sequences_emails (
            id TEXT PRIMARY KEY,
            sequence_id TEXT NOT NULL REFERENCES sequences(id),
            email_index INTEGER NOT NULL,
            delai INTEGER,
            cc TEXT,
            frequence TEXT,
            jour_envoi INTEGER,
            heure_envoi TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)
    
    # Relances table
    db.execute("""
        CREATE TABLE IF NOT EXISTS relances (
            id TEXT PRIMARY KEY,
            impaye_id TEXT REFERENCES impayes(id),
            contact_id TEXT REFERENCES contacts(id),
            sequence_id TEXT REFERENCES sequences(id),
            type_relance TEXT,
            statut TEXT DEFAULT 'en_attente',
            date_prevue TEXT,
            date_envoi TEXT,
            email_sujet TEXT,
            email_corps TEXT,
            smtp_profile_id TEXT,
            validation_requise INTEGER DEFAULT 0,
            valide_par TEXT,
            valide_le TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Events table
    db.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            message TEXT NOT NULL,
            data TEXT,
            lu INTEGER DEFAULT 0,
            user_id TEXT REFERENCES users(id),
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # SMTP profiles table
    db.execute("""
        CREATE TABLE IF NOT EXISTS smtp_profiles (
            id TEXT PRIMARY KEY,
            nom TEXT NOT NULL,
            host TEXT NOT NULL,
            port INTEGER NOT NULL DEFAULT 587,
            secure INTEGER DEFAULT 0,
            username TEXT NOT NULL,
            password TEXT NOT NULL,
            from_email TEXT NOT NULL,
            from_name TEXT NOT NULL,
            actif INTEGER DEFAULT 1,
            is_default INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)
    
    db.commit()


def init_app(app):
    """Register database functions with Flask app."""
    app.teardown_appcontext(close_db)
