"""Route pour la déconnexion (redirect)."""
from flask import redirect, url_for
from .. import bp


@bp.route('/logout', methods=['GET'])
def logout():
    """Déconnecte l'utilisateur et redirige vers la page de login."""
    return redirect(url_for('login.index'))