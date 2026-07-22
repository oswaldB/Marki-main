from flask import jsonify
from .. import bp


@bp.route('/logout', methods=['POST'])
def logout():
    """Logout endpoint - clears session/token on client side."""
    return jsonify({'message': 'Déconnecté'})
