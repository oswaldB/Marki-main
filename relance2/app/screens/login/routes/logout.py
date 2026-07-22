from flask import jsonify, redirect, url_for
from .. import bp

@bp.route('/logout', methods=['POST'])
def logout():
    return jsonify({'message': 'Déconnecté'})
