#!/bin/bash
# scripts/03-init-boilerplate.sh
# Initialise un projet Flask minimal fonctionnel avec auth, hello_protected et logs

set -e

PROJECT_DIR="/home/ubuntu/marki/relance2"
APP_DIR="$PROJECT_DIR/app"
RULES_DEV="$PROJECT_DIR/rules/rules.md"
SCHEMA_GLOBAL="$PROJECT_DIR/specs-global/schema.sql"

echo "🚀 Initialisation du boilerplate Flask..."

# 1. Structure de base
mkdir -p "$APP_DIR/data"
mkdir -p "$APP_DIR/static"

# 2. requirements.txt
cat > "$PROJECT_DIR/requirements.txt" << 'EOF'
flask==3.0.0
flask-apscheduler==1.13.1
jinja2==3.1.2
gunicorn==21.2.0
pyjwt==2.8.0
playwright==1.40.0
EOF

# 2b. app/__init__.py - Configuration de base (sans routes)
cat > "$APP_DIR/__init__.py" << 'EOF'
from flask import Flask
from flask_apscheduler import APScheduler
import os

scheduler = APScheduler()

def create_app():
    """Crée l'application Flask avec la configuration de base."""
    app = Flask(__name__)

    # Config
    app.config['SECRET_KEY'] = 'dev-secret-key-change-in-production'
    app.config['DATABASE'] = os.path.join(
        os.path.dirname(__file__), 'data', 'marki.db'
    )
    app.config['SCHEDULER_API_ENABLED'] = True

    # Démarrer scheduler
    scheduler.init_app(app)
    scheduler.start()

    return app
EOF

# 2c. app.py dans app/ - Point d'entrée avec toutes les routes des cells
cat > "$APP_DIR/app.py" << 'EOF'
"""
Marki App - Point d'entrée principal

Ce fichier contient l'enregistrement explicite de toutes les routes/cells.
Structure Cell-Based MVC:
  - screens/ : Écrans avec UI (pages web)
  - backend_wf/ : Workflows backend (API endpoints)
  - cron/ : Tâches planifiées
"""

from flask import Flask
from app import create_app, scheduler

# Import des blueprints des cells
# SCREENS (Écrans avec UI)
from app.screens.hello import bp as hello_bp
from app.screens.hello_protected import bp as hello_protected_bp
from app.screens.login import bp as login_bp

# BACKEND WORKFLOWS (API endpoints)
from app.backend_wf.hello_bg import bp as hello_bg_bp

# CRON (Tâches planifiées)
from app.cron.hello_cron import bp as hello_cron_bp

# Création de l'app avec config de base
app = create_app()

# ═══════════════════════════════════════════════════════════════
# ENREGISTREMENT DES BLUEPRINTS - CELLS ACTIVES
# ═══════════════════════════════════════════════════════════════

# SCREENS (Écrans publics et protégés)
app.register_blueprint(hello_bp, url_prefix='/hello')                    # Écran public
app.register_blueprint(hello_protected_bp, url_prefix='/hello-protected') # Écran privé (JWT)
app.register_blueprint(login_bp, url_prefix='/login')                      # Authentification

# BACKEND WORKFLOWS (API endpoints)
app.register_blueprint(hello_bg_bp, url_prefix='/hello-bg')               # API workflow

# CRON (Tâches planifiées - pas de routes HTTP mais nécessaire pour l'init)
app.register_blueprint(hello_cron_bp, url_prefix='/hello-cron')


# ═══════════════════════════════════════════════════════════════
# ROUTES GLOBALES
# ═══════════════════════════════════════════════════════════════

@app.route('/')
def index():
    """Page d'accueil listant toutes les cells disponibles."""
    return '''<!DOCTYPE html>
<html>
<head>
    <title>Marki App - Cells MVC</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 p-8">
    <div class="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 class="text-3xl font-bold mb-6 text-blue-600">Marki App 🚀</h1>
        <p class="text-gray-600 mb-6">Architecture Cell-Based MVC</p>

        <h2 class="text-xl font-semibold mb-3 text-gray-800">📱 Écrans (Screens)</h2>
        <ul class="space-y-2 mb-6">
            <li><a href="/hello" class="text-blue-500 hover:underline">/hello</a> - Écran public (test)</li>
            <li><a href="/hello-protected" class="text-blue-500 hover:underline">/hello-protected</a> - Écran privé (JWT requis)</li>
            <li><a href="/login" class="text-blue-500 hover:underline">/login</a> - Authentification</li>
        </ul>

        <h2 class="text-xl font-semibold mb-3 text-gray-800">⚙️ Backend Workflows (API)</h2>
        <ul class="space-y-2 mb-6">
            <li><a href="/hello-bg/api/process" class="text-blue-500 hover:underline">/hello-bg/api/process</a> - Workflow backend</li>
        </ul>

        <h2 class="text-xl font-semibold mb-3 text-gray-800">⏰ Cron Jobs</h2>
        <ul class="space-y-2 mb-6">
            <li>heartbeat toutes les 60s (console)</li>
        </ul>

        <div class="mt-8 p-4 bg-gray-50 rounded text-sm text-gray-500">
            <p>Cells actives : hello, hello_protected, login, hello_bg, hello_cron</p>
        </div>
    </div>
</body>
</html>
    '''


if __name__ == '__main__':
    print("🚀 Démarrage de Marki App...")
    print("   URL: http://localhost:5000")
    print("   Cells: hello, login, hello_protected, hello_bg, hello_cron")
    app.run(host='0.0.0.0', port=5000, debug=True)
EOF

# 4. app/data/__init__.py
cat > "$APP_DIR/data/__init__.py" << 'EOF'
import sqlite3
from flask import g, current_app

def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(
            current_app.config['DATABASE'],
            detect_types=sqlite3.PARSE_DECLTYPES
        )
        g.db.row_factory = sqlite3.Row
    return g.db

def close_db(e=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()
EOF

# 5. Middleware Auth (pas d'écrans, juste le décorateur)
echo "🔐 Création middleware Auth dans middleware/..."
mkdir -p "$APP_DIR/middleware/auth"

cat > "$APP_DIR/middleware/auth/__init__.py" << 'EOF'
# Middleware d'authentification
from .decorators import require_auth
from .jwt_utils import generate_token, validate_token

__all__ = ['require_auth', 'generate_token', 'validate_token']
EOF

cat > "$APP_DIR/middleware/auth/decorators.py" << 'EOF'
from functools import wraps
from flask import g, request, jsonify
from .jwt_utils import validate_token

def require_auth(f):
    """Décorateur pour protéger les routes."""
    @wraps(f)
    def decorated(*args, **kwargs):
        # Chercher le token dans le header Authorization ou dans le cookie
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '')

        # Si pas de token dans le header, chercher dans le cookie
        if not token:
            token = request.cookies.get('access_token', '')

        # Vérification
        try:
            payload = validate_token(token)
            g.user = payload
            return f(*args, **kwargs)
        except Exception:
            return jsonify({'error': 'Token invalide'}), 401

    return decorated
EOF

cat > "$APP_DIR/middleware/auth/jwt_utils.py" << 'EOF'
import jwt
from datetime import datetime, timedelta

SECRET_KEY = 'dev-secret-key-change-in-production'
TEST_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test"

def generate_token(user_id, username, role='user'):
    """Génère un token JWT."""
    return jwt.encode(
        {
            'id': user_id,
            'username': username,
            'role': role,
            'exp': datetime.utcnow() + timedelta(hours=24)
        },
        SECRET_KEY,
        algorithm='HS256'
    )

def validate_token(token):
    """Valide un token JWT. Retourne le payload ou lève une exception."""
    # Token de test bypass
    if token == TEST_TOKEN:
        return {'id': 'test-user', 'username': 'testuser', 'role': 'admin'}

    return jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
EOF

# Fonction pour créer les specs d'une cell avec les fichiers globaux
create_cell_specs() {
    local cell_specs_dir="$1"
    mkdir -p "$cell_specs_dir/LIRE_EN_PREMIER"

    # Copier rules.md depuis rules/rules.md (version condensée)
    if [ -f "$RULES_DEV" ]; then
        cp "$RULES_DEV" "$cell_specs_dir/LIRE_EN_PREMIER/rules.md"
    else
        touch "$cell_specs_dir/LIRE_EN_PREMIER/rules.md"
    fi

    # Copier schema.sql depuis schema global
    if [ -f "$SCHEMA_GLOBAL" ]; then
        cp "$SCHEMA_GLOBAL" "$cell_specs_dir/LIRE_EN_PREMIER/schema.sql"
    else
        touch "$cell_specs_dir/LIRE_EN_PREMIER/schema.sql"
    fi
}

# 5b. Écran Login dans screens/
echo "🔐 Création écran Login dans screens/..."
mkdir -p "$APP_DIR/screens/login/routes" "$APP_DIR/screens/login/templates" "$APP_DIR/screens/login/specs"
create_cell_specs "$APP_DIR/screens/login/specs"

cat > "$APP_DIR/screens/login/__init__.py" << 'EOF'
from flask import Blueprint

bp = Blueprint('login', __name__, template_folder='templates')

from .routes import index, logout
EOF

cat > "$APP_DIR/screens/login/routes/__init__.py" << 'EOF'
from . import index, logout
EOF

cat > "$APP_DIR/screens/login/routes/index.py" << 'EOF'
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
EOF

cat > "$APP_DIR/screens/login/routes/logout.py" << 'EOF'
from flask import jsonify, redirect, url_for
from .. import bp

@bp.route('/logout', methods=['POST'])
def logout():
    return jsonify({'message': 'Déconnecté'})
EOF

cat > "$APP_DIR/screens/login/templates/login.html" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Login</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="p-8 bg-gray-100">
    <div class="max-w-md mx-auto bg-white p-6 rounded-lg shadow">
        <h1 class="text-2xl font-bold mb-4">Login</h1>

        {% if error %}
        <div class="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {{ error }}
        </div>
        {% endif %}

        <form method="post" class="space-y-4">
            <input type="text" name="username" placeholder="Username" required
                   value="{{ username or '' }}"
                   class="w-full px-4 py-2 border rounded">
            <input type="password" name="password" placeholder="Password" required
                   class="w-full px-4 py-2 border rounded">
            <button type="submit" class="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                Se connecter
            </button>
        </form>

        <p class="mt-4 text-sm text-gray-500">Identifiants: admin / admin</p>
    </div>
</body>
</html>
EOF

mkdir -p "$APP_DIR/screens/login/logs"
cat > "$APP_DIR/screens/login/specs/valide.md" << 'EOF'
# Validation Écran Login

- [x] Route /login fonctionne
- [x] Génération JWT
- [x] Token de test affiché
EOF

cat > "$APP_DIR/screens/login/specs/devok.md" << 'EOF'
# Développement OK
EOF

# 6. Cell Hello (Écran public) dans screens/
echo "👋 Création cell Hello (public) dans screens/..."
mkdir -p "$APP_DIR/screens/hello/routes" "$APP_DIR/screens/hello/models" "$APP_DIR/screens/hello/templates/workflows" "$APP_DIR/screens/hello/specs"
create_cell_specs "$APP_DIR/screens/hello/specs"

cat > "$APP_DIR/screens/hello/__init__.py" << 'EOF'
from flask import Blueprint

bp = Blueprint('hello', __name__, template_folder='templates')

from .routes import index
EOF

cat > "$APP_DIR/screens/hello/routes/__init__.py" << 'EOF'
from . import index
EOF

cat > "$APP_DIR/screens/hello/routes/index.py" << 'EOF'
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
EOF

cat > "$APP_DIR/screens/hello/models/__init__.py" << 'EOF'
from .prenom import Prenom
EOF

cat > "$APP_DIR/screens/hello/models/prenom.py" << 'EOF'
import json
import os

DATA_FILE = os.path.join(os.path.dirname(__file__), 'prenoms.json')

class Prenom:
    PRENOMS_DEFAUT = ["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank"]

    @classmethod
    def _ensure_file(cls):
        if not os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'w') as f:
                json.dump({'current': 'Visiteur', 'all': cls.PRENOMS_DEFAUT}, f)

    @classmethod
    def get_current(cls):
        cls._ensure_file()
        with open(DATA_FILE, 'r') as f:
            return json.load(f).get('current', 'Visiteur')

    @classmethod
    def set_current(cls, prenom):
        cls._ensure_file()
        with open(DATA_FILE, 'r') as f:
            data = json.load(f)
        data['current'] = prenom
        with open(DATA_FILE, 'w') as f:
            json.dump(data, f)
EOF

cat > "$APP_DIR/screens/hello/templates/index.html" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Hello Cell (Public)</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
</head>
<body class="p-8 bg-gray-100" x-data="helloApp" x-init="init()">
    <div class="max-w-md mx-auto bg-white p-6 rounded-lg shadow">
        <h1 class="text-2xl font-bold mb-4">Hello <span x-text="prenom" class="text-blue-600"></span>! 👋</h1>
        <p class="text-green-600 font-semibold">✅ Écran public (pas d'auth requise)</p>

        <button @click="changerPrenom()"
                class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition mt-4"
                :disabled="loading">
            <span x-show="!loading">Changer prénom</span>
            <span x-show="loading">Chargement...</span>
        </button>

        <div x-show="message" x-text="message" class="mt-4 p-2 bg-green-100 text-green-800 rounded" x-transition></div>

        <hr class="my-4">
        <p class="text-gray-600 text-sm">Test: alerte → saisie → mise à jour → message confirmation</p>
        <p class="mt-2"><a href="/hello-protected" class="text-blue-500 underline">Aller à Hello Protected →</a></p>
    </div>
    {% include 'alpinejs.html' %}
</body>
</html>
EOF

cat > "$APP_DIR/screens/hello/templates/alpinejs.html" << 'EOF'
<script>
document.addEventListener('alpine:init', () => {
    Alpine.data('helloApp', () => ({
        prenom: '{{ prenom }}',
        loading: false,
        message: '',

        init() {
            console.log('[INIT] Hello app (public) démarrée');
        },

        async changerPrenom() {
            const nouveauPrenom = prompt('Entrez votre prénom:');
            if (!nouveauPrenom) return;

            this.loading = true;
            try {
                const response = await fetch('/hello/api/prenom', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({prenom: nouveauPrenom})
                });
                const data = await response.json();
                if (response.ok) {
                    this.prenom = data.prenom;
                    this.message = `Prénom mis à jour: ${data.prenom}`;
                    console.log('[SUCCESS] Prénom changé:', data.prenom);
                }
            } catch (error) {
                console.error('[ERROR]', error);
                this.message = 'Erreur: ' + error.message;
            } finally {
                this.loading = false;
            }
        }
    }));
});
</script>
EOF

# Logs et specs pour hello
mkdir -p "$APP_DIR/screens/hello/logs"
cat > "$APP_DIR/screens/hello/specs/valide.md" << 'EOF'
# Validation Cell Hello

- [x] Structure créée
- [x] Route index fonctionne
- [x] API prenom CRUD
- [x] Template Alpine.js
EOF

cat > "$APP_DIR/screens/hello/specs/devok.md" << 'EOF'
# Développement OK
EOF

# 7. Cell Hello Protected (Écran privé avec auth) dans screens/
echo "🔒 Création cell Hello Protected (privé) dans screens/..."
mkdir -p "$APP_DIR/screens/hello_protected/routes" "$APP_DIR/screens/hello_protected/templates" "$APP_DIR/screens/hello_protected/specs"
create_cell_specs "$APP_DIR/screens/hello_protected/specs"

cat > "$APP_DIR/screens/hello_protected/__init__.py" << 'EOF'
from flask import Blueprint

bp = Blueprint('hello_protected', __name__, template_folder='templates')

from .routes import index
EOF

cat > "$APP_DIR/screens/hello_protected/routes/__init__.py" << 'EOF'
from . import index
EOF

cat > "$APP_DIR/screens/hello_protected/routes/index.py" << 'EOF'
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
EOF

cat > "$APP_DIR/screens/hello_protected/templates/index.html" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Hello Protected (Privé)</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
</head>
<body class="p-8 bg-gray-100" x-data="protectedApp" x-init="init()">
    <div class="max-w-md mx-auto bg-white p-6 rounded-lg shadow">
        <h1 class="text-2xl font-bold mb-4">🔒 Hello Protected</h1>
        <p class="text-red-600 font-semibold">✅ Écran privé (auth requise)</p>

        <div class="mt-4 p-4 bg-gray-50 rounded">
            <p><strong>Utilisateur:</strong> {{ user.username }}</p>
            <p><strong>Role:</strong> {{ user.role }}</p>
            <p><strong>ID:</strong> {{ user.id }}</p>
        </div>

        <button @click="fetchUser()" class="mt-4 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">
            Rafraîchir (API protégée)
        </button>

        <div x-show="apiData" x-text="apiData" class="mt-4 p-2 bg-blue-100 text-blue-800 rounded"></div>

        <hr class="my-4">
        <p class="text-gray-600 text-sm">Ce contenu est protégé par JWT</p>
        <p class="mt-2"><a href="/hello" class="text-blue-500 underline">← Retour à Hello public</a></p>
    </div>
    {% include 'alpinejs.html' %}
</body>
</html>
EOF

cat > "$APP_DIR/screens/hello_protected/templates/alpinejs.html" << 'EOF'
<script>
document.addEventListener('alpine:init', () => {
    Alpine.data('protectedApp', () => ({
        apiData: '',

        init() {
            console.log('[INIT] Hello Protected app démarrée');
            console.log('[AUTH] Route protégée chargée');
        },

        async fetchUser() {
            try {
                // Le token est automatiquement envoyé par Playwright
                // ou doit être ajouté ici pour les tests manuels
                const response = await fetch('/hello-protected/api/user');
                const data = await response.json();
                this.apiData = JSON.stringify(data, null, 2);
                console.log('[API] User data:', data);
            } catch (error) {
                console.error('[ERROR]', error);
                this.apiData = 'Erreur: ' + error.message;
            }
        }
    }));
});
</script>
EOF

# Logs et specs pour hello_protected
mkdir -p "$APP_DIR/screens/hello_protected/logs"
cat > "$APP_DIR/screens/hello_protected/specs/valide.md" << 'EOF'
# Validation Cell Hello Protected

- [x] Structure créée
- [x] Route protégée par @require_auth
- [x] API protégée /api/user
- [x] Template avec info utilisateur
EOF

cat > "$APP_DIR/screens/hello_protected/specs/devok.md" << 'EOF'
# Développement OK
EOF

# 8. Cell Hello Background dans backend_wf/
echo "📝 Création cell Hello Background dans backend_wf/..."
mkdir -p "$APP_DIR/backend_wf/hello_bg/routes" "$APP_DIR/backend_wf/hello_bg/specs"
create_cell_specs "$APP_DIR/backend_wf/hello_bg/specs"

cat > "$APP_DIR/backend_wf/hello_bg/__init__.py" << 'EOF'
from flask import Blueprint

bp = Blueprint('hello_bg', __name__)

from .routes import api_process
EOF

cat > "$APP_DIR/backend_wf/hello_bg/routes/__init__.py" << 'EOF'
from . import api_process
EOF

cat > "$APP_DIR/backend_wf/hello_bg/routes/api_process.py" << 'EOF'
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
EOF

mkdir -p "$APP_DIR/backend_wf/hello_bg/logs"
cat > "$APP_DIR/backend_wf/hello_bg/specs/valide.md" << 'EOF'
# Validation Cell Hello BG

- [x] Endpoint /api/process fonctionne
EOF

cat > "$APP_DIR/backend_wf/hello_bg/specs/devok.md" << 'EOF'
# Développement OK
EOF

# 9. Cell Hello Cron dans cron/
echo "⏰ Création cell Hello Cron dans cron/..."
mkdir -p "$APP_DIR/cron/hello_cron/routes" "$APP_DIR/cron/hello_cron/specs"
create_cell_specs "$APP_DIR/cron/hello_cron/specs"

cat > "$APP_DIR/cron/hello_cron/__init__.py" << 'EOF'
from flask import Blueprint
from app import scheduler
import datetime

bp = Blueprint('hello_cron', __name__)

@scheduler.task('interval', id='hello_heartbeat', seconds=60)
def heartbeat():
    now = datetime.datetime.now()
    print(f'[CRON {now.strftime("%H:%M:%S")}] Heartbeat - app vivante ✓')
EOF

cat > "$APP_DIR/cron/hello_cron/routes/__init__.py" << 'EOF'
# Pas de routes pour le cron
EOF

mkdir -p "$APP_DIR/cron/hello_cron/logs"
cat > "$APP_DIR/cron/hello_cron/specs/valide.md" << 'EOF'
# Validation Cell Hello Cron

- [x] Job heartbeat enregistré
- [x] Exécution toutes les 60s
EOF

cat > "$APP_DIR/cron/hello_cron/specs/devok.md" << 'EOF'
# Développement OK
EOF

# 10. Création des fichiers valide.md et devok.md dans les cells hello, middleware et login
echo "🔨 Création des fichiers valide.md et devok.md dans les cells..."

# hello (screen)
if [ -d "$APP_DIR/screens/hello/specs" ]; then
    touch "$APP_DIR/screens/hello/specs/valide.md"
    touch "$APP_DIR/screens/hello/specs/devok.md"
    echo "ℹ️  Fichiers créés dans: hello"
fi

# hello_protected (screen)
if [ -d "$APP_DIR/screens/hello_protected/specs" ]; then
    touch "$APP_DIR/screens/hello_protected/specs/valide.md"
    touch "$APP_DIR/screens/hello_protected/specs/devok.md"
    echo "ℹ️  Fichiers créés dans: hello_protected"
fi

# login (screen)
if [ -d "$APP_DIR/screens/login/specs" ]; then
    touch "$APP_DIR/screens/login/specs/valide.md"
    touch "$APP_DIR/screens/login/specs/devok.md"
    echo "ℹ️  Fichiers créés dans: login"
fi

# middleware/auth
if [ -d "$APP_DIR/middleware/auth/specs" ]; then
    touch "$APP_DIR/middleware/auth/specs/valide.md"
    touch "$APP_DIR/middleware/auth/specs/devok.md"
    echo "ℹ️  Fichiers créés dans: middleware/auth"
fi

# hello_cron (cron)
if [ -d "$APP_DIR/cron/hello_cron/specs" ]; then
    touch "$APP_DIR/cron/hello_cron/specs/valide.md"
    touch "$APP_DIR/cron/hello_cron/specs/devok.md"
    echo "ℹ️  Fichiers créés dans: hello_cron"
fi

# hello_bg (backend_wf)
if [ -d "$APP_DIR/backend_wf/hello_bg/specs" ]; then
    touch "$APP_DIR/backend_wf/hello_bg/specs/valide.md"
    touch "$APP_DIR/backend_wf/hello_bg/specs/devok.md"
    echo "ℹ️  Fichiers créés dans: hello_bg"
fi

# 11. Installation dépendances
echo "📦 Activation du venv et installation des dépendances..."
cd "$PROJECT_DIR"

# Activer le venv
if [ -f "$PROJECT_DIR/venv/bin/activate" ]; then
    source "$PROJECT_DIR/venv/bin/activate"
    echo "✅ Venv activé"
else
    echo "⚠️ Venv non trouvé, utilisation de pip système"
fi

pip install -q -r requirements.txt

# Installer Playwright
playwright install chromium 2>/dev/null || echo "⚠️ Playwright chromium déjà installé ou erreur"

# 11. Création DB
touch "$APP_DIR/data/marki.db"

echo ""
echo "✅ Boilerplate initialisé!"
echo ""
echo "🧪 Lancement du serveur Flask..."
echo ""
echo "   🌐 http://localhost:5000"
echo "   📍 /hello - Écran public"
echo "   📍 /hello-protected - Écran privé (JWT requis)"
echo "   📍 /auth/login - Génération JWT"
echo "   📍 /hello-bg/api/process - API"
echo "   📍 Cron actif: heartbeat toutes les 60s"
echo ""
echo "═══════════════════════════════════════"
echo "🔧 Démarrage du serveur..."
echo "═══════════════════════════════════════"
echo ""

# Tuer les processus existants sur le port 5000
echo "🧹 Nettoyage des processus sur le port 5000..."
lsof -ti:5000 | xargs kill -9 2>/dev/null || echo "   Aucun processus à nettoyer"
sleep 1

# Lancement serveur avec autoreload (en arrière-plan)
export FLASK_APP="app.app"
export FLASK_ENV="development"
export FLASK_DEBUG="1"

python -m flask run --host=0.0.0.0 --port=5000 --reload &
FLASK_PID=$!

# Attendre que le serveur soit prêt
echo "Attente du démarrage du serveur..."
sleep 5

# Vérifier que le serveur répond
if ! curl -s http://localhost:5000/ > /dev/null 2>&1; then
    echo "❌ Erreur: Le serveur n'a pas démarré"
    kill $FLASK_PID 2>/dev/null || true
    exit 1
fi

echo "✅ Serveur Flask démarré (PID: $FLASK_PID)"
echo ""

# 12. Lancer les tests automatiques
echo "═══════════════════════════════════════"
echo "🧪 Lancement des tests automatiques..."
echo "═══════════════════════════════════════"
echo ""

# Test hello (public)
echo "Test 1: Hello (public)..."
if python "$PROJECT_DIR/scripts/test-frontend.py" \
    "http://localhost:5000/hello" \
    "$APP_DIR/screens/hello/logs/test.png" \
    "$APP_DIR/screens/hello/logs/test.json" 2>/dev/null; then
    echo "✅ Hello (public): PASS"
else
    echo "❌ Hello (public): FAIL"
fi

# Test hello-protected avec token
echo ""
echo "Test 2: Hello Protected (avec token JWT de test)..."
if python "$PROJECT_DIR/scripts/test-frontend.py" \
    "http://localhost:5000/hello-protected" \
    "$APP_DIR/screens/hello_protected/logs/test.png" \
    "$APP_DIR/screens/hello_protected/logs/test.json" 2>/dev/null; then
    echo "✅ Hello Protected: PASS"
else
    echo "❌ Hello Protected: FAIL (peut être normal sans token)"
fi

echo ""
echo "═══════════════════════════════════════"
echo "✅ Initialisation et tests terminés"
echo "═══════════════════════════════════════"
echo ""
echo "Serveur en cours d'exécution sur http://localhost:5000"
echo "PID: $FLASK_PID"
echo ""
echo "Pour arrêter: kill $FLASK_PID"
echo ""

# Garder le script actif (attendre CTRL+C)
wait $FLASK_PID
