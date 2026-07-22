from flask import render_template, jsonify, request
from .. import bp
from ..models.prenom import Prenom

@bp.route('/')
def index():
    prenom = Prenom.get_current()
    return render_template('index.html', prenom=prenom)

@bp.route('/api/prenom', methods=['GET', 'POST'])
def api_prenom():
    if request.method == 'POST':
        data = request.get_json()
        Prenom.set_current(data.get('prenom'))
        return jsonify({'success': True, 'prenom': data.get('prenom')})
    return jsonify({'prenom': Prenom.get_current()})
