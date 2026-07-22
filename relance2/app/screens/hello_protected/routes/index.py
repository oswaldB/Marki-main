from flask import render_template, g, jsonify
from .. import bp
from app.middleware.auth.decorators import require_auth

@bp.route('/')
@require_auth
def index():
    """Écran protégé - nécessite authentification."""
    return render_template('index.html', user=g.user)

@bp.route('/api/user')
@require_auth
def api_user():
    """API protégée - retourne l'utilisateur connecté."""
    return jsonify({'user': g.user})
