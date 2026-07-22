from flask import render_template, request, jsonify, redirect, url_for, make_response
from .. import bp
from ..models.auth import AuthModel, AuthError
from app.middleware.auth.jwt_utils import TEST_TOKEN

@bp.route('/', methods=['GET', 'POST'])
def index():
    """Page de login et génération de token."""
    if request.method == 'POST':
        # Vérifier le type de contenu avant de parser
        if request.is_json:
            data = request.get_json()
        else:
            data = request.form
        
        username = data.get('username', '').strip() or data.get('email', '').strip()
        password = data.get('password', '')
        
        # Authentification via AuthModel
        try:
            result = AuthModel.authenticate(username, password)
            token = result['token']
            user = result['user']
            
            if request.is_json:
                return jsonify({
                    'token': token, 
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'role': user.role
                    }
                })
            
            # Redirection vers hello_protected avec le token dans un cookie
            response = make_response(redirect('/hello-protected'))
            response.set_cookie('access_token', token, httponly=True, max_age=86400)
            return response
            
        except AuthError:
            # Échec d'authentification
            if request.is_json:
                return jsonify({'error': 'Identifiants invalides'}), 401
            
            return render_template('login.html', token=None, test_token=TEST_TOKEN, 
                                   error='Identifiants invalides', username=username)
    
    return render_template('login.html', token=None, test_token=TEST_TOKEN)
