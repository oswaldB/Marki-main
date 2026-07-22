from flask import jsonify
from .. import bp

@bp.route('/api/process', methods=['GET', 'POST'])
def process():
    """Workflow backend simple."""
    from app.screens.hello.models.prenom import Prenom
    prenom = Prenom.get_current()
    return jsonify({
        'processed': True,
        'message': f'Traitement pour {prenom}',
        'timestamp': __import__('datetime').datetime.now().isoformat()
    })
