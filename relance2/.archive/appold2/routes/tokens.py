"""Routes tokens et PDF proxy (API)."""

from flask import Blueprint, jsonify, Response, send_file
from routes.auth import require_auth
import sys
import os
import io

# Ajouter le dossier parent pour importer workflows
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

tokens_bp = Blueprint('tokens', __name__, url_prefix='/api')


@tokens_bp.route('/tokens/pdf', methods=['POST'])
@require_auth
def generate_pdf_token():
    """Generer un token PDF securise pour un impaye."""
    from flask import request
    
    data = request.get_json() or {}
    impaye_id = data.get('impaye_id')
    
    if not impaye_id:
        return jsonify({'success': False, 'error': {'message': 'impaye_id requis'}}), 400
    
    # Importer et executer le workflow
    from workflows.generate_pdf_url import generate_pdf_url
    
    result = generate_pdf_url(impaye_id)
    
    if not result['success']:
        status_code = 404 if 'non trouve' in result['error'].get('message', '') else 500
        return jsonify(result), status_code
    
    return jsonify(result), 200


@tokens_bp.route('/pdf/<token>', methods=['GET'])
def serve_pdf(token):
    """Servir un PDF depuis le SFTP en utilisant un token."""
    print(f"[API.PDF.SERVE] START: token={token[:8]}...")
    
    # Importer le workflow pour recuperer le fichier
    from workflows.generate_pdf_url import get_pdf_from_sftp
    
    success, content, filename = get_pdf_from_sftp(token)
    
    if not success:
        print(f"[API.PDF.SERVE] ERROR: {filename}")
        return jsonify({'success': False, 'error': {'message': filename}}), 404
    
    print(f"[API.PDF.SERVE] SUCCESS: Serving {filename} ({len(content)} bytes)")
    
    # Retourner le fichier en stream
    return Response(
        content,
        mimetype='application/pdf',
        headers={
            'Content-Disposition': f'inline; filename="{filename}"',
            'Content-Length': len(content)
        }
    )
