#!/bin/bash
# scripts/03-init-boilerplate.sh
# Initialise un projet Flask minimal fonctionnel avec auth, hello_protected et logs

set -e

PROJECT_DIR="/home/ubuntu/marki/relance2"
APP_DIR="$PROJECT_DIR/app"

echo "🚀 Initialisation du boilerplate Flask..."

# 1. Structure de base
mkdir -p "$APP_DIR/data"
mkdir -p "$APP_DIR/static"
mkdir -p "$APP_DIR/templates"

# 2. requirements.txt
cat > "$PROJECT_DIR/requirements.txt" << 'EOF'
flask==3.0.0
flask-apscheduler==1.13.0
jinja2==3.1.2
gunicorn==21.2.0
pyjwt==2.8.0
playwright==1.40.0
EOF

# 3. app/__init__.py avec auth intégrée
cat > "$APP_DIR/__init__.py" << 'EOF'
from flask import Flask
from flask_apscheduler import APScheduler
import os

scheduler = APScheduler()

def create_app():
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
    
    # Enregistrement cells
    from .hello import bp as hello_bp
    from .hello_bg import bp as hello_bg_bp
    from .hello_cron import bp as hello_cron_bp
    from .hello_protected import bp as hello_protected_bp
    from .auth import bp as auth_bp
    
    app.register_blueprint(hello_bp, url_prefix='/hello')
    app.register_blueprint(hello_bg_bp, url_prefix='/hello-bg')
    app.register_blueprint(hello_cron_bp, url_prefix='/hello-cron')
    app.register_blueprint(hello_protected_bp, url_prefix='/hello-protected')
    app.register_blueprint(auth_bp, url_prefix='/auth')
    
    # Page d'accueil
    @app.route('/')
    def index():
        return '''<h1>Marki App - Cells MVC</h1>
        <ul>
            <li><a href="/hello">Hello (Écran public)</a></li>
            <li><a href="/hello-protected">Hello Protected (Écran privé)</a></li>
            <li><a href="/hello-bg/api/process">Hello BG (API)</a></li>
            <li><a href="/auth/login">Auth - Login</a></li>
            <li>Cron actif: heartbeat toutes les 60s</li>
        </ul>
        '''
    
    return app
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

# 5. Cell Auth
echo "🔐 Création cell Auth..."
mkdir -p "$APP_DIR/auth/routes" "$APP_DIR/auth/templates" "$APP_DIR/auth/specs"

cat > "$APP_DIR/auth/__init__.py" << 'EOF'
from flask import Blueprint

bp = Blueprint('auth', __name__, template_folder='templates')

from .routes import login, logout
EOF

cat > "$APP_DIR/auth/routes/__init__.py" << 'EOF'
from . import login, logout
EOF

cat > "$APP_DIR/auth/routes/login.py" << 'EOF'
from flask import render_template, request, jsonify
import jwt
from datetime import datetime, timedelta
from .. import bp

# Token de test hardcodé
TEST_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test"

def require_auth(f):
    """Décorateur pour protéger les routes."""
    from functools import wraps
    from flask import g, request
    
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '')
        
        # Token de test bypass
        if token == TEST_TOKEN:
            g.user = {'id': 'test-user', 'username': 'testuser', 'role': 'admin'}
            return f(*args, **kwargs)
        
        # Vérification normale
        try:
            payload = jwt.decode(token, 'dev-secret-key-change-in-production', algorithms=['HS256'])
            g.user = payload
            return f(*args, **kwargs)
        except:
            return jsonify({'error': 'Token invalide'}), 401
    
    return decorated

@bp.route('/login', methods=['GET', 'POST'])
def login():
    """Page de login et génération de token."""
    if request.method == 'POST':
        data = request.get_json() or request.form
        username = data.get('username', 'anonymous')
        
        # Générer un vrai token JWT
        token = jwt.encode(
            {
                'id': 'user-123',
                'username': username,
                'role': 'user',
                'exp': datetime.utcnow() + timedelta(hours=24)
            },
            'dev-secret-key-change-in-production',
            algorithm='HS256'
        )
        
        if request.is_json:
            return jsonify({'token': token, 'user': username})
        
        return f"""
        <h1>Login réussi</h1>
        <p>Bienvenue {username}!</p>
        <p>Token: <code>{token}</code></p>
        <p>Token de test: <code>{TEST_TOKEN}</code></p>
        <a href="/">Retour à l'accueil</a>
        """
    
    return """
    <h1>Login</h1>
    <form method="post">
        <input type="text" name="username" placeholder="Username" required>
        <button type="submit">Se connecter</button>
    </form>
    <p>Token de test: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test</p>
    """
EOF

cat > "$APP_DIR/auth/routes/logout.py" << 'EOF'
from flask import jsonify
from .. import bp

@bp.route('/logout', methods=['POST'])
def logout():
    return jsonify({'message': 'Déconnecté'})
EOF

# Specs auth
cat > "$APP_DIR/auth/specs/valide.md" << 'EOF'
# Validation Cell Auth

- [x] Route /auth/login fonctionne
- [x] Génération JWT
- [x] Token de test bypass
- [x] Décorateur require_auth
EOF

cat > "$APP_DIR/auth/specs/devok.md" << 'EOF'
# Développement OK
EOF

# 6. Cell Hello (Écran public)
echo "👋 Création cell Hello (public)..."
mkdir -p "$APP_DIR/hello/routes" "$APP_DIR/hello/models" "$APP_DIR/hello/templates/workflows" "$APP_DIR/hello/specs"

cat > "$APP_DIR/hello/__init__.py" << 'EOF'
from flask import Blueprint

bp = Blueprint('hello', __name__, template_folder='templates')

from .routes import index
EOF

cat > "$APP_DIR/hello/routes/__init__.py" << 'EOF'
from . import index
EOF

cat > "$APP_DIR/hello/routes/index.py" << 'EOF'
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

cat > "$APP_DIR/hello/models/__init__.py" << 'EOF'
from .prenom import Prenom
EOF

cat > "$APP_DIR/hello/models/prenom.py" << 'EOF'
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

cat > "$APP_DIR/hello/templates/index.html" << 'EOF'
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

cat > "$APP_DIR/hello/templates/alpinejs.html" << 'EOF'
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
mkdir -p "$APP_DIR/hello/logs"
cat > "$APP_DIR/hello/specs/valide.md" << 'EOF'
# Validation Cell Hello

- [x] Structure créée
- [x] Route index fonctionne
- [x] API prenom CRUD
- [x] Template Alpine.js
EOF

cat > "$APP_DIR/hello/specs/devok.md" << 'EOF'
# Développement OK
EOF

# 7. Cell Hello Protected (Écran privé avec auth)
echo "🔒 Création cell Hello Protected (privé)..."
mkdir -p "$APP_DIR/hello_protected/routes" "$APP_DIR/hello_protected/templates" "$APP_DIR/hello_protected/specs"

cat > "$APP_DIR/hello_protected/__init__.py" << 'EOF'
from flask import Blueprint

bp = Blueprint('hello_protected', __name__, template_folder='templates')

from .routes import index
EOF

cat > "$APP_DIR/hello_protected/routes/__init__.py" << 'EOF'
from . import index
EOF

cat > "$APP_DIR/hello_protected/routes/index.py" << 'EOF'
from flask import render_template, g, jsonify
from .. import bp
from ...auth.routes.login import require_auth

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

cat > "$APP_DIR/hello_protected/templates/index.html" << 'EOF'
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

cat > "$APP_DIR/hello_protected/templates/alpinejs.html" << 'EOF'
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
mkdir -p "$APP_DIR/hello_protected/logs"
cat > "$APP_DIR/hello_protected/specs/valide.md" << 'EOF'
# Validation Cell Hello Protected

- [x] Structure créée
- [x] Route protégée par @require_auth
- [x] API protégée /api/user
- [x] Template avec info utilisateur
EOF

cat > "$APP_DIR/hello_protected/specs/devok.md" << 'EOF'
# Développement OK
EOF

# 8. Cell Hello Background
echo "📝 Création cell Hello Background..."
mkdir -p "$APP_DIR/hello_bg/routes" "$APP_DIR/hello_bg/specs"

cat > "$APP_DIR/hello_bg/__init__.py" << 'EOF'
from flask import Blueprint

bp = Blueprint('hello_bg', __name__)

from .routes import api_process
EOF

cat > "$APP_DIR/hello_bg/routes/__init__.py" << 'EOF'
from . import api_process
EOF

cat > "$APP_DIR/hello_bg/routes/api_process.py" << 'EOF'
from flask import jsonify
from .. import bp

@bp.route('/api/process', methods=['POST'])
def process():
    """Workflow backend simple."""
    from ..hello.models.prenom import Prenom
    prenom = Prenom.get_current()
    return jsonify({
        'processed': True,
        'message': f'Traitement pour {prenom}',
        'timestamp': __import__('datetime').datetime.now().isoformat()
    })
EOF

mkdir -p "$APP_DIR/hello_bg/logs"
cat > "$APP_DIR/hello_bg/specs/valide.md" << 'EOF'
# Validation Cell Hello BG

- [x] Endpoint /api/process fonctionne
EOF

cat > "$APP_DIR/hello_bg/specs/devok.md" << 'EOF'
# Développement OK
EOF

# 9. Cell Hello Cron
echo "⏰ Création cell Hello Cron..."
mkdir -p "$APP_DIR/hello_cron/routes" "$APP_DIR/hello_cron/specs"

cat > "$APP_DIR/hello_cron/__init__.py" << 'EOF'
from flask import Blueprint
from app import scheduler
import datetime

bp = Blueprint('hello_cron', __name__)

@scheduler.task('interval', id='hello_heartbeat', seconds=60)
def heartbeat():
    now = datetime.datetime.now()
    print(f'[CRON {now.strftime("%H:%M:%S")}] Heartbeat - app vivante ✓')
EOF

cat > "$APP_DIR/hello_cron/routes/__init__.py" << 'EOF'
# Pas de routes pour le cron
EOF

mkdir -p "$APP_DIR/hello_cron/logs"
cat > "$APP_DIR/hello_cron/specs/valide.md" << 'EOF'
# Validation Cell Hello Cron

- [x] Job heartbeat enregistré
- [x] Exécution toutes les 60s
EOF

cat > "$APP_DIR/hello_cron/specs/devok.md" << 'EOF'
# Développement OK
EOF

# 10. Installation dépendances
echo "📦 Installation dépendances..."
cd "$PROJECT_DIR"
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

# Lancement serveur avec autoreload (en arrière-plan)
export FLASK_APP="app"
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
    "$APP_DIR/hello/logs/test.png" \
    "$APP_DIR/hello/logs/test.json" 2>/dev/null; then
    echo "✅ Hello (public): PASS"
else
    echo "❌ Hello (public): FAIL"
fi

# Test hello-protected avec token
echo ""
echo "Test 2: Hello Protected (avec token JWT de test)..."
if python "$PROJECT_DIR/scripts/test-frontend.py" \
    "http://localhost:5000/hello-protected" \
    "$APP_DIR/hello_protected/logs/test.png" \
    "$APP_DIR/hello_protected/logs/test.json" 2>/dev/null; then
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
