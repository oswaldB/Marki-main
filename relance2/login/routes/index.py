from flask import render_template, request, jsonify, redirect, url_for, make_response
from .. import bp
from app.middleware.auth.jwt_utils import generate_token, TEST_TOKEN

@bp.route('/', methods=['GET', 'POST'])
def index():
    """Page de login et génération de token."""
    if request.method == 'POST':
        # Vérifier le type de contenu avant de parser
        if request.is_json:
            data = request.get_json()
        else:
            data = request.form
        
        username = data.get('username', 'anonymous')
        password = data.get('password', '')
        
        # Vérification identifiants admin/admin
        if username == 'admin' and password == 'admin':
            token = generate_token('user-123', username, 'admin')
            
            if request.is_json:
                return jsonify({'token': token, 'user': username})
            
            # Redirection vers hello_protected avec le token dans un cookie
            response = make_response(redirect('/hello-protected'))
            response.set_cookie('access_token', token, httponly=True, max_age=86400)
            return response
        else:
            # Échec d'authentification
            if request.is_json:
                return jsonify({'error': 'Identifiants invalides'}), 401
            
            return render_template('login.html', token=None, test_token=TEST_TOKEN, 
                                   error='Identifiants invalides', username=username)
    
    return render_template('login.html', token=None, test_token=TEST_TOKEN)
