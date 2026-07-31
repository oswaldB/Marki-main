"""Workflow backend: Generer une URL PDF securisee via proxy SFTP."""

import uuid
import os
from datetime import datetime, timedelta


# Charger les credentials depuis le fichier .env de production
ENV_PATH = os.path.expanduser('~/prod/adti/.env')
FTP_CONFIG = {}

def _load_ftp_config():
    """Charger la configuration FTP depuis le fichier .env."""
    if FTP_CONFIG:
        return FTP_CONFIG
    
    try:
        with open(ENV_PATH, 'r') as f:
            for line in f:
                line = line.strip()
                if line.startswith('#') or not line:
                    continue
                if '=' in line:
                    key, value = line.split('=', 1)
                    FTP_CONFIG[key] = value
    except Exception as e:
        print(f"[WORKFLOW.GENERATE_PDF_URL] WARN: Impossible de charger {ENV_PATH}: {e}")
    
    return FTP_CONFIG


def generate_pdf_url(impaye_id, user_context=None):
    """
    Generer une URL proxy securisee pour acceder au PDF via SFTP.
    
    Args:
        impaye_id: ID de l'impaye
        user_context: Contexte utilisateur (optionnel)
    
    Returns:
        dict: { success, data: { pdfUrl, token, expiresAt }, error }
    """
    print(f"[WORKFLOW.GENERATE_PDF_URL] START: impaye_id={impaye_id}")
    
    from flask import current_app
    import sqlite3
    
    db = sqlite3.connect(
        current_app.config['DATABASE'],
        detect_types=sqlite3.PARSE_DECLTYPES
    )
    db.row_factory = sqlite3.Row
    
    try:
        # Verifier que l'impaye existe
        row = db.execute(
            "SELECT id, url_pdf, nfacture FROM impayes WHERE id = ?",
            (impaye_id,)
        ).fetchone()
        
        if row is None:
            print(f"[WORKFLOW.GENERATE_PDF_URL] ERROR: Impaye non trouve")
            return {'success': False, 'error': {'message': 'Impaye non trouve'}}
        
        impaye = dict(row)
        
        if not impaye.get('url_pdf'):
            print(f"[WORKFLOW.GENERATE_PDF_URL] ERROR: PDF non disponible")
            return {'success': False, 'error': {'message': 'PDF non disponible'}}
        
        # Generer un token unique (valide 1 heure)
        token = str(uuid.uuid4())
        expires_at = datetime.utcnow() + timedelta(hours=1)
        
        # Sauvegarder le token dans la base
        db.execute("""
            UPDATE impayes 
            SET url_pdf_token = ?,
                url_pdf_token_expires = ?,
                updated_at = ?
            WHERE id = ?
        """, (token, expires_at.isoformat(), datetime.utcnow().isoformat(), impaye_id))
        
        db.commit()
        
        # Construire l'URL de proxy
        # L'URL pointe vers la route qui va streamer le PDF depuis le SFTP
        from flask import current_app
        api_url = os.environ.get('API_URL', 'http://localhost:5000')
        proxy_url = f"{api_url}/api/pdf/{token}"
        
        print(f"[WORKFLOW.GENERATE_PDF_URL] SUCCESS: URL proxy generee")
        return {
            'success': True,
            'data': {
                'pdfUrl': proxy_url,
                'token': token,
                'expiresAt': expires_at.isoformat()
            }
        }
        
    except Exception as e:
        print(f"[WORKFLOW.GENERATE_PDF_URL] ERROR: {e}")
        return {'success': False, 'error': {'message': str(e)}}
    finally:
        db.close()


def get_pdf_from_sftp(token):
    """
    Recuperer le contenu du PDF depuis le SFTP en utilisant le token.
    
    Args:
        token: Token d'acces
    
    Returns:
        tuple: (success, content_bytes or None, filename or error_message)
    """
    print(f"[WORKFLOW.GET_PDF_SFTP] START: token={token[:8]}...")
    
    from flask import current_app
    import sqlite3
    
    db = sqlite3.connect(
        current_app.config['DATABASE'],
        detect_types=sqlite3.PARSE_DECLTYPES
    )
    db.row_factory = sqlite3.Row
    
    try:
        # Verifier le token et recuperer le chemin du PDF
        row = db.execute("""
            SELECT id, url_pdf, url_pdf_token_expires, nfacture 
            FROM impayes 
            WHERE url_pdf_token = ?
        """, (token,)).fetchone()
        
        if row is None:
            return False, None, "Token invalide"
        
        impaye = dict(row)
        
        # Verifier expiration
        expires = impaye.get('url_pdf_token_expires')
        if expires:
            expires_dt = datetime.fromisoformat(expires)
            if datetime.utcnow() > expires_dt:
                return False, None, "Token expire"
        
        # Charger la config FTP
        config = _load_ftp_config()
        
        host = config.get('FTP_HOST')
        port = int(config.get('FTP_PORT', 2222))
        username = config.get('FTP_USERNAME')
        password = config.get('FTP_PASSWORD')
        
        if not all([host, username, password]):
            return False, None, "Configuration SFTP incomplete"
        
        # Connexion SFTP
        import paramiko
        
        print(f"[WORKFLOW.GET_PDF_SFTP] Connecting to {host}:{port}")
        
        transport = paramiko.Transport((host, port))
        transport.connect(username=username, password=password)
        sftp = paramiko.SFTPClient.from_transport(transport)
        
        try:
            # Recuperer le fichier - essayer plusieurs chemins possibles
            remote_paths = [
                impaye['url_pdf'],  # Chemin avec TMP_ si present
                impaye['url_pdf'].replace('/TMP_', '/'),  # Chemin sans TMP_
            ]
            
            content = None
            used_path = None
            
            for remote_path in remote_paths:
                print(f"[WORKFLOW.GET_PDF_SFTP] Trying: {remote_path}")
                try:
                    # Verifier que le fichier existe
                    sftp.stat(remote_path)
                    
                    # Lire le fichier en memoire
                    import io
                    buffer = io.BytesIO()
                    sftp.getfo(remote_path, buffer)
                    content = buffer.getvalue()
                    used_path = remote_path
                    print(f"[WORKFLOW.GET_PDF_SFTP] SUCCESS: {len(content)} bytes from {remote_path}")
                    break
                except FileNotFoundError:
                    continue
            
            if content is None:
                print(f"[WORKFLOW.GET_PDF_SFTP] ERROR: File not found in any location")
                return False, None, "Fichier PDF introuvable sur le serveur SFTP"
            
            filename = os.path.basename(used_path)
            return True, content, filename
            
        except FileNotFoundError as e:
            print(f"[WORKFLOW.GET_PDF_SFTP] ERROR: File not found: {e}")
            return False, None, "Fichier PDF introuvable sur le serveur SFTP"
        except PermissionError as e:
            print(f"[WORKFLOW.GET_PDF_SFTP] ERROR: Permission denied: {e}")
            return False, None, "Acces refuse au fichier PDF"
            
        finally:
            sftp.close()
            transport.close()
            
    except Exception as e:
        print(f"[WORKFLOW.GET_PDF_SFTP] ERROR: {e}")
        return False, None, str(e)
    finally:
        db.close()
