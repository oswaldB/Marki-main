#!/bin/bash
# Fiche d'implémentation: Login et Authentification
# Description: Page de login avec authentification JWT et redirection
#
# SPECS DE RÉFÉRENCE:
# - Frontend initial-load: workflows/frontend/login/initial-load.md
# - Frontend auth-submit: workflows/frontend/login/auth-submit.md
# - Backend: workflows/backend/auth-login.md
# - Mockup: mockups/login.html

# ==============================================================================
# ÉTAPE 1: Megafunction auth_login (Backend)
# Note: La base de données existe déjà dans app/data/marki.db
# ==============================================================================

pi -p "Crée UNIQUEMENT le fichier app/workflows/auth_login.py - Megafunction d'authentification.
Ne fais rien d'autre. Pas de prise d'initiative. Juste ce fichier.

VARIABLES ET FICHIERS EXISTANTS:
- La base de données SQLite existe déjà dans app/data/marki.db avec les tables users et sessions déjà créées
- Ce fichier expose la fonction execute(email, password, **kwargs) qui sera appelée par routes/auth.py
- Les classes WorkflowContext, WorkflowResult, WorkflowLogger suivent le pattern standard des megafunctions

SPEC DE RÉFÉRENCE: workflows/backend/auth-login.md

RÈGLES STRICTES:
- Ne RIEN inventer qui n'est pas dans la spec
- Respecter scrupuleusement workflows/backend/auth-login.md
- Implémenter EXACTEMENT les classes WorkflowContext, WorkflowResult, WorkflowLogger et la fonction execute() décrites dans la spec
- Suivre LE MÊME PATTERN que workflows/backend/hello-cron.md

Le fichier doit:
- Définir WorkflowContext, WorkflowResult comme dataclasses
- Définir WorkflowLogger avec méthodes debug/info/error
- Exposer execute(email, password, **kwargs) -> dict qui:
  1. Crée un context avec workflow_id=uuid4()
  2. Log 'WORKFLOW_START' avec context
  3. Se connecte à la DB existante app/data/marki.db (import local sqlite3)
  4. Récupère l'utilisateur par email via requête SQL sur la table users
  5. Vérifie le mot de passe avec bcrypt (import local)
  6. Génère un token JWT avec pyjwt (import local)
  7. Crée une session en DB dans la table sessions
  8. Retourne WorkflowResult avec token et user
- Logs obligatoires: AUTH_START, USER_FOUND, PASSWORD_CHECK, TOKEN_GENERATED, SESSION_CREATED, WORKFLOW_SUCCESS/FAILED

Respecte rules/dev-backend.md:
- Signature: execute(**kwargs) -> Dict[str, Any]
- WorkflowContext, WorkflowResult, WorkflowLogger obligatoires
- Import local de sqlite3, bcrypt et jwt"

git add app/workflows/auth_login.py
git commit -m "feat: ajoute workflows/auth_login.py - megafunction authentification JWT"

# ==============================================================================
# ÉTAPE 2: Route API Auth (Backend)
# ==============================================================================

pi -p "Crée UNIQUEMENT le fichier app/routes/auth.py - Blueprint API d'authentification.
Ne fais rien d'autre. Pas de prise d'initiative. Juste ce fichier.

VARIABLES ET FICHIERS EXISTANTS:
- Ce blueprint sera importé dans app.py comme auth_bp
- La megafunction execute(email, password) existe dans workflows/auth_login.py
- Les endpoints seront sous /api/auth/*

SPEC DE RÉFÉRENCE: workflows/backend/auth-login.md (section Route API)

RÈGLES STRICTES:
- Ne RIEN inventer qui n'est pas dans la spec
- Respecter scrupuleusement les endpoints décrits

Le fichier doit:
- Définir un Blueprint 'auth_bp'
- Route POST /api/auth/login qui:
  1. Récupère email et password du JSON request
  2. Appelle workflows.auth_login.execute(email, password)
  3. Retourne 200 avec {token, user} en cas de succès
  4. Retourne 401 avec {error} en cas d'échec
- Route GET /api/auth/me qui vérifie le token Bearer et retourne l'utilisateur

Respecte rules/dev-backend.md:
- Structure Blueprint Flask
- Gestion des erreurs HTTP appropriée"

git add app/routes/auth.py
git commit -m "feat: ajoute routes/auth.py - endpoints API auth/login et auth/me"

# ==============================================================================
# ÉTAPE 3: Route Login (Frontend)
# ==============================================================================

pi -p "Crée UNIQUEMENT le fichier app/routes/login.py - Blueprint page login.
Ne fais rien d'autre. Pas de prise d'initiative. Juste ce fichier.

VARIABLES ET FICHIERS EXISTANTS:
- Ce blueprint sera importé dans app.py comme login_bp
- Le template render_template('login/index.html') sera créé à l'étape 4
- La route sera accessible sur /login

SPEC DE RÉFÉRENCE: workflows/frontend/login/initial-load.md

RÈGLES STRICTES:
- Ne RIEN inventer qui n'est pas dans la spec
- Respecter scrupuleusement les routes décrites

Le fichier doit:
- Définir un Blueprint 'login_bp'
- Route GET /login qui retourne render_template('login/index.html')

Respecte rules/dev-backend.md:
- Structure Blueprint Flask
- Les routes appellent les templates Jinja2"

git add app/routes/login.py
git commit -m "feat: ajoute routes/login.py - blueprint page login"

# ==============================================================================
# ÉTAPE 4: Template principal login/index.html (Frontend)
# Mockup: mockups/login.html
# ==============================================================================

pi -p "Crée UNIQUEMENT le fichier app/templates/login/index.html - Template principal de la page Login.
Ne fais rien d'autre. Pas de prise d'initiative. Juste ce fichier.

VARIABLES ET FICHIERS EXISTANTS:
- La route login.py appelle ce template via render_template('login/index.html')
- Le fichier alpinejs.html sera inclus à la fin du body (créé à l'étape 5)
- Le data Alpine.js s'appelle 'loginPage' avec x-data='loginPage' x-init='init()'
- Les props utilisées: form (email, password), loading, error

MOCKUP DE RÉFÉRENCE: mockups/login.html

RÈGLES STRICTES:
- Ne RIEN inventer qui n'est pas dans le mockup
- Respecter scrupuleusement le mockups/login.html
- Faire du PIXEL PERFECT sur le mockup (même structure, mêmes classes Tailwind, même comportement)

Le fichier doit contenir:
- Structure HTML5 complète avec fond sombre/gradient centré
- Formulaire de login avec:
  - Logo ou titre 'Marki'
  - Champ email (type=email, placeholder='Email')
  - Champ password (type=password, placeholder='Mot de passe')
  - Bouton submit 'Se connecter' avec x-bind:disabled="loading"
  - Message d'erreur x-show="error" x-text="error" en rouge
- Alpine.js: x-data="loginPage" x-init="init()" sur le container principal
- Inclure Tailwind CSS via CDN
- Inclure Alpine.js via CDN à la fin du body
- Inclure le fichier d'initialisation login/alpinejs.html

Respecte rules/dev-frontend.md:
- Structure: templates/login/index.html
- Alpine.js chargé à la fin du body avec defer
- x-data='loginPage' x-init='init()'
- Pas de JS inline dans le template"

git add app/templates/login/index.html
git commit -m "feat: ajoute templates/login/index.html - page login"

# ==============================================================================
# ÉTAPE 5: Initialisation Alpine.js (Frontend)
# ==============================================================================

pi -p "Crée UNIQUEMENT le fichier app/templates/login/alpinejs.html - Initialisation Alpine.js.
Ne fais rien d'autre. Pas de prise d'initiative. Juste ce fichier.

VARIABLES ET FICHIERS EXISTANTS:
- Ce fichier est inclus dans templates/login/index.html à la fin du body
- Les workflows seront dans templates/login/workflows/ (créés aux étapes 6, 7, 8)
- Le data s'appelle 'loginPage' et est utilisé dans index.html avec x-data='loginPage'
- Les workflows inclus: initial-load.html, auth-submit.html
- Le workflow-init.html contient la fonction init()

SPECS DE RÉFÉRENCE:
- workflows/frontend/login/initial-load.md (Data Model)
- workflows/frontend/login/auth-submit.md (Data Model)

RÈGLES STRICTES:
- Ne RIEN inventer qui n'est pas dans les specs
- Respecter scrupuleusement la structure de données décrite

Le fichier doit:
- Définir le logger global avec log.debug/info/warn/error
- Créer Alpine.data('loginPage', () => ({...})) avec ORDRE OBLIGATOIRE:
  1. D'ABORD les props réactives:
     - form: { email: '', password: '' }
     - loading: false
     - error: null
  2. ENSUITE les workflows (via {% include %}):
     - {% include 'login/workflows/initial-load.html' %}
     - {% include 'login/workflows/auth-submit.html' %}
  3. ENFIN l'init:
     - {% include 'login/workflows/workflow-init.html' %}
- Utiliser x-effect ou watchers si nécessaire pour réagir aux changements

Respecte rules/dev-frontend.md:
- ORDRE OBLIGATOIRE: Props → Workflows → workflow-init
- Logger global avant Alpine.data
- Props réactives définies dans alpinejs.html (pas dans workflow-init)"

git add app/templates/login/alpinejs.html
git commit -m "feat: ajoute templates/login/alpinejs.html - initialisation Alpine.js"

# ==============================================================================
# ÉTAPE 6: Workflow init (Frontend)
# ==============================================================================

pi -p "Crée UNIQUEMENT le fichier app/templates/login/workflows/workflow-init.html - Fonction init().
Ne fais rien d'autre. Pas de prise d'initiative. Juste ce fichier.

VARIABLES ET FICHIERS EXISTANTS:
- Ce fichier est inclus dans alpinejs.html via {% include %}
- Les props réactives (form, loading, error) sont définies dans alpinejs.html
- Ce fichier ne contient QUE la fonction init(), pas de props
- Appelle GET /api/auth/me avec header Authorization: Bearer token
- Redirige vers /dashboard si session valide

SPEC DE RÉFÉRENCE: workflows/frontend/login/initial-load.md (section Étapes)

RÈGLES STRICTES:
- Ne RIEN inventer qui n'est pas dans la spec
- Respecter scrupuleusement les étapes décrites

Le fichier doit contenir UNIQUEMENT:
- La fonction init: function() qui:
  1. Log 'PAGE_INIT' avec log.info
  2. Vérifie la présence d'un token dans localStorage
  3. Si token présent, appelle GET /api/auth/me avec header Authorization: Bearer
  4. Si session valide, redirige vers /dashboard
  5. Sinon, affiche le formulaire (form-ready)

Respecte rules/dev-frontend.md:
- workflow-init.html ne contient que init() et méthodes utilitaires
- Log 'PAGE_INIT' au démarrage
- Les props réactives sont définies dans alpinejs.html"

git add app/templates/login/workflows/workflow-init.html
git commit -m "feat: ajoute workflow-init.html - verification session existante"

# ==============================================================================
# ÉTAPE 7: Workflow initial-load (Frontend)
# ==============================================================================

pi -p "Crée UNIQUEMENT le fichier app/templates/login/workflows/initial-load.html - Workflow de chargement initial.
Ne fais rien d'autre. Pas de prise d'initiative. Juste ce fichier.

VARIABLES ET FICHIERS EXISTANTS:
- Ce fichier est inclus dans alpinejs.html via {% include %}
- Il utilise les props form, loading, error définies dans alpinejs.html
- Le logger 'log' est défini dans alpinejs.html et est global
- Appelé par init() dans workflow-init.html
- API endpoint: GET /api/auth/me avec header Authorization: Bearer token

SPEC DE RÉFÉRENCE: workflows/frontend/login/initial-load.md

RÈGLES STRICTES:
- Ne RIEN inventer qui n'est pas dans la spec
- Respecter scrupuleusement workflows/frontend/login/initial-load.md
- Implémenter EXACTEMENT les logs, props et comportements décrits dans la spec

Le fichier doit contenir une mega-function:
- initialLoad: async function() qui:
  1. Génère un workflowId avec crypto.randomUUID()
  2. Log 'WORKFLOW_START' avec workflowId et workflow: 'initialLoad'
  3. Vérifie si token existe dans localStorage
  4. Si token présent:
     - Log 'TOKEN_FOUND'
     - Appelle GET /api/auth/me avec header Authorization: Bearer token
     - Log 'API_CALL_START/COMPLETE'
     - Si réponse OK: log 'SESSION_VALID', redirige vers /dashboard
     - Si échec: log 'SESSION_INVALID', supprime token, continue
  5. Log 'FORM_READY'
  6. Log 'WORKFLOW_SUCCESS'

Respecte rules/dev-frontend.md:
- Pattern mega-function avec workflowId unique
- Logs exhaustifs: WORKFLOW_START, TOKEN_FOUND, SESSION_VALID/INVALID, FORM_READY, WORKFLOW_SUCCESS
- Utilise les props définies dans alpinejs.html"

git add app/templates/login/workflows/initial-load.html
git commit -m "feat: ajoute initial-load.html - verification token et redirection"

# ==============================================================================
# ÉTAPE 8: Workflow auth-submit (Frontend)
# ==============================================================================

pi -p "Crée UNIQUEMENT le fichier app/templates/login/workflows/auth-submit.html - Workflow de soumission auth.
Ne fais rien d'autre. Pas de prise d'initiative. Juste ce fichier.

VARIABLES ET FICHIERS EXISTANTS:
- Ce fichier est inclus dans alpinejs.html via {% include %}
- Il utilise les props form (email, password), loading, error définies dans alpinejs.html
- Le logger 'log' est défini dans alpinejs.html et est global
- Appelé par @submit.prevent sur le formulaire dans index.html
- API endpoint: POST /api/auth/login avec JSON {email, password}
- Redirige vers /dashboard en cas de succès

SPEC DE RÉFÉRENCE: workflows/frontend/login/auth-submit.md

RÈGLES STRICTES:
- Ne RIEN inventer qui n'est pas dans la spec
- Respecter scrupuleusement workflows/frontend/login/auth-submit.md
- Implémenter EXACTEMENT les logs, props et comportements décrits dans la spec

Le fichier doit contenir une mega-function:
- authSubmit: async function() qui:
  1. Génère un workflowId avec crypto.randomUUID()
  2. Log 'WORKFLOW_START' avec workflowId
  3. Valide que form.email et form.password sont non vides
     - Si vide: log 'VALIDATION_ERROR', set error message, return
  4. Set loading = true, error = null
  5. Log 'API_CALL_START' POST /api/auth/login
  6. Appelle fetch POST /api/auth/login avec JSON {email, password}
  7. Log 'API_CALL_COMPLETE' avec status
  8. Si réponse OK:
     - Parse JSON {token, user}
     - Log 'AUTH_SUCCESS'
     - Stock token dans localStorage
     - Log 'STATE_UPDATE' token stored
     - Redirige vers /dashboard
  9. Si erreur:
     - Parse error JSON
     - Log 'AUTH_FAILED'
     - Set this.error = error.message
  10. Finally: loading = false
  11. Log 'WORKFLOW_SUCCESS' ou 'WORKFLOW_ERROR'

Respecte rules/dev-frontend.md:
- Pattern mega-function avec workflowId unique
- Logs exhaustifs: WORKFLOW_START, VALIDATION_ERROR, API_CALL_START/COMPLETE, AUTH_SUCCESS/FAILED, STATE_UPDATE, WORKFLOW_SUCCESS/ERROR
- Appelé par @submit.prevent sur le formulaire"

git add app/templates/login/workflows/auth-submit.html
git commit -m "feat: ajoute auth-submit.html - soumission formulaire login"

# ==============================================================================
# ÉTAPE 9: App Flask principale
# ==============================================================================

pi -p "Crée UNIQUEMENT le fichier app/app.py qui configure l'application Flask principale.
Ne fais rien d'autre. Pas de prise d'initiative. Juste ce fichier.

VARIABLES ET FICHIERS EXISTANTS:
- Ce fichier importe et enregistre les blueprints:
  - login_bp depuis routes/login.py (créé à l'étape 3)
  - auth_bp depuis routes/auth.py (créé à l'étape 2)
  - hello_bp depuis routes/hello.py (si existe déjà)
- Les templates sont dans le dossier templates/
- La DB est dans app/data/marki.db (existante)

Le fichier doit:
- Importer Flask
- Configurer le logging de base vers stdout
- Importer et enregistrer les blueprints:
  - from routes.login import bp as login_bp
  - from routes.auth import bp as auth_bp
  - from routes.hello import bp as hello_bp (si existe déjà)
- Démarrer le serveur sur le port 5000 avec app.run(port=5000, debug=True)
- Configurer SECRET_KEY pour JWT (via environnement ou valeur par défaut dev)

Respecte rules/dev-backend.md:
- Structure avec blueprints
- Configuration logging au démarrage
- Gestion des erreurs globales"

git add app/app.py
git commit -m "feat: ajoute app.py - configuration Flask avec blueprints auth et login"

# ==============================================================================
# ÉTAPE 10: __init__.py pour les packages
# ==============================================================================

pi -p "Crée UNIQUEMENT les fichiers __init__.py nécessaires listés ci-dessous.
Ne fais rien d'autre. Pas de prise d'initiative. Juste ces fichiers.

VARIABLES ET FICHIERS EXISTANTS:
- Ces fichiers permettent les imports Python entre les modules
- Les modules app, routes, workflows existent et ont besoin de ces __init__.py
- Les templates login/workflows/ ont besoin de __init__.py pour les includes Jinja2

Liste des fichiers à créer (tous vides):
- app/__init__.py
- app/routes/__init__.py
- app/workflows/__init__.py
- app/templates/__init__.py
- app/templates/login/__init__.py
- app/templates/login/workflows/__init__.py

Ces fichiers permettent d'importer les modules Python."

git add app/__init__.py app/routes/__init__.py app/workflows/__init__.py app/templates/__init__.py app/templates/login/__init__.py app/templates/login/workflows/__init__.py
git commit -m "feat: ajoute __init__.py - packages Python"

# ==============================================================================
# ÉTAPE 11: Requirements.txt
# ==============================================================================

pi -p "Crée UNIQUEMENT le fichier app/requirements.txt avec les dépendances.
Ne fais rien d'autre. Pas de prise d'initiative. Juste ce fichier.

VARIABLES ET FICHIERS EXISTANTS:
- Ce fichier liste les dépendances pour pip install -r requirements.txt
- L'app utilise Flask comme framework web
- La megafunction auth_login utilise pyjwt pour les tokens JWT
- La vérification de mot de passe utilise bcrypt

Contenu exact:
flask>=2.3.0
pyjwt>=2.8.0
bcrypt>=4.1.0
python-dotenv>=1.0.0

Respecte les versions pour compatibilité."

git add app/requirements.txt
git commit -m "feat: ajoute requirements.txt - dependances Flask, JWT, bcrypt"
