#!/bin/bash
# Fiche d'implémentation: Boilerplate Flask Hello World
# Description: App Flask avec frontend Alpine.js, backend megafunctions, et cronjob
#
# SPECS DE RÉFÉRENCE:
# - Frontend: workflows/frontend/hello/demander-prenom.md
# - Backend: workflows/backend/hello-cron.md
# - Mockup: mockups/hello.html

# ==============================================================================
# ÉTAPE 1: Structure de base de l'app Flask
# ==============================================================================

pi -p "Crée UNIQUEMENT le fichier wsgi.py à la racine du projet qui configure l'application Flask principale. Ne fais rien d'autre. Pas de prise d'initiative. Juste ce fichier.

VARIABLES ET FICHIERS EXISTANTS:
- Ce fichier est le point d'entrée WSGI de l'application (à la racine, pas dans app/)
- Il importera le blueprint 'hello_bp' depuis app.routes.hello (créé à l'étape 2)
- Il utilisera le create_app() depuis app

Le fichier doit:
- Importer create_app depuis app
- Configurer le logging de base vers stdout
- Enregistrer le blueprint hello_bp
- Exposer la variable 'app' pour flask run et gunicorn
- Avoir un bloc if __name__ == '__main__' pour python wsgi.py

Respecte les règles de dev-backend définies dans rules/dev-backend.md:
- Point d'entrée à la racine, pas dans app/
- Configuration logging au démarrage
- L'app expose un endpoint /hello qui affiche la page"

git add wsgi.py
git commit -m "feat: ajoute wsgi.py - point d'entrée Flask"

# ==============================================================================
# ÉTAPE 2: Route Hello (Backend)
# ==============================================================================

pi -p "Crée UNIQUEMENT le fichier app/routes/hello.py avec le blueprint Flask pour la route /hello. Ne fais rien d'autre. Pas de prise d'initiative. Juste ce fichier.

VARIABLES ET FICHIERS EXISTANTS:
- L'app principale app.py existe et importera ce blueprint comme hello_bp
- Les templates seront dans templates/hello/index.html (créé à l'étape 3)
- Le blueprint doit être nommé 'hello_bp' pour correspondre à l'import dans app.py

Le fichier doit:
- Définir un Blueprint 'hello_bp'
- Avoir une route GET /hello qui retourne render_template('hello/index.html')
- Respecter les règles dev-backend: utiliser un blueprint, séparer la logique

Respecte rules/dev-backend.md:
- Structure Blueprint Flask
- Les routes appellent les templates Jinja2"

git add app/routes/hello.py
git commit -m "feat: ajoute routes/hello.py - blueprint endpoint /hello"

# ==============================================================================
# ÉTAPE 3: Template principal hello/index.html (Frontend)
# Mockup: mockups/hello.html
# ==============================================================================

pi -p "Crée UNIQUEMENT le fichier app/templates/hello/index.html - Template principal de la page Hello. Ne fais rien d'autre. Pas de prise d'initiative. Juste ce fichier.

VARIABLES ET FICHIERS EXISTANTS:
- La route hello_bp dans routes/hello.py appelle ce template via render_template('hello/index.html')
- Le fichier alpinejs.html sera inclus à la fin (créé à l'étape 4)
- Le data Alpine.js s'appelle 'helloPage' avec x-init='init()'

MOCKUP DE RÉFÉRENCE: mockups/hello.html

RÈGLES STRICTES:
- Ne RIEN inventer qui n'est pas dans le mockup
- Respecter scrupuleusement le mockups/hello.html
- Faire du PIXEL PERFECT sur le mockup (même structure, mêmes classes Tailwind, même comportement)

Le fichier doit contenir:
- Structure HTML5 complète
- Afficher 'Hello World' dans un h1
- Un bouton 'Demander prénom' avec Alpine.js @click
- Une section conditionnelle x-show qui affiche 'Hello {prenom}' après saisie
- Inclure Tailwind CSS via CDN
- Inclure Alpine.js via CDN à la fin du body
- Inclure le fichier d'initialisation hello/alpinejs.html

Respecte rules/dev-frontend.md:
- Structure: templates/hello/index.html
- Alpine.js chargé à la fin du body avec defer
- x-data='helloPage' x-init='init()'
- Pas de JS inline dans le template"

git add app/templates/hello/index.html
git commit -m "feat: ajoute templates/hello/index.html - template principal"

# ==============================================================================
# ÉTAPE 4: Initialisation Alpine.js (Frontend)
# ==============================================================================

pi -p "Crée UNIQUEMENT le fichier app/templates/hello/alpinejs.html - Initialisation Alpine.js. Ne fais rien d'autre. Pas de prise d'initiative. Juste ce fichier.

VARIABLES ET FICHIERS EXISTANTS:
- Ce fichier est inclus dans templates/hello/index.html à la fin du body
- Les workflows seront dans templates/hello/workflows/ (créés aux étapes 5 et 6)
- Le data s'appelle 'helloPage' et est utilisé dans index.html avec x-data='helloPage'

Le fichier doit:
- Définir le logger global avec log.debug/info/warn/error
- Créer Alpine.data('helloPage') avec:
  1. D'ABORD les props réactives: prenom (initialement null), showPopup (false), inputValue ('')
  2. ENSUITE les workflows: demanderPrenom, validerPrenom, afficherMessage
  3. ENFIN workflow-init.html avec la fonction init()
- Utiliser {% include %} pour inclure les workflows depuis hello/workflows/

Respecte rules/dev-frontend.md:
- ORDRE OBLIGATOIRE: Props → Workflows → workflow-init
- Logger global avant Alpine.data
- Props réactives définies dans alpinejs.html (pas dans workflow-init)"

git add app/templates/hello/alpinejs.html
git commit -m "feat: ajoute templates/hello/alpinejs.html - initialisation Alpine.js"

# ==============================================================================
# ÉTAPE 5: Workflow init (Frontend)
# ==============================================================================

pi -p "Crée UNIQUEMENT le fichier app/templates/hello/workflows/workflow-init.html - Fonction init(). Ne fais rien d'autre. Pas de prise d'initiative. Juste ce fichier.

VARIABLES ET FICHIERS EXISTANTS:
- Ce fichier est inclus dans alpinejs.html via {% include %}
- Les props réactives (prenom, loading) sont définies dans alpinejs.html
- Ce fichier ne contient QUE la fonction init(), pas de props

Le fichier doit contenir UNIQUEMENT:
- La fonction init: function() qui log 'PAGE_INIT' avec log.info
- Pas de propriétés réactives (elles sont dans alpinejs.html)

Respecte rules/dev-frontend.md:
- workflow-init.html ne contient que init() et méthodes utilitaires
- Log 'PAGE_INIT' au démarrage"

git add app/templates/hello/workflows/workflow-init.html
git commit -m "feat: ajoute workflow-init.html - fonction d'initialisation"

# ==============================================================================
# ÉTAPE 6: Workflow demanderPrenom (Frontend)
# Spec: workflows/frontend/hello/demander-prenom.md
# ==============================================================================

pi -p "Crée UNIQUEMENT le fichier app/templates/hello/workflows/demander-prenom.html - Workflow pour demander le prénom. Ne fais rien d'autre. Pas de prise d'initiative. Juste ce fichier.

VARIABLES ET FICHIERS EXISTANTS:
- Ce fichier est inclus dans alpinejs.html via {% include %}
- Il utilise la prop 'prenom' définie dans alpinejs.html (this.prenom)
- Le logger 'log' est défini dans alpinejs.html et est global

SPEC DE RÉFÉRENCE: workflows/frontend/hello/demander-prenom.md

RÈGLES STRICTES:
- Ne RIEN inventer qui n'est pas dans la spec
- Respecter scrupuleusement workflows/frontend/hello/demander-prenom.md
- Implémenter EXACTEMENT les logs, props et comportements décrits dans la spec

Le fichier doit contenir une mega-function:
- demanderPrenom: async function() qui:
  1. Génère un workflowId avec crypto.randomUUID()
  2. Log 'WORKFLOW_START' avec workflowId et workflow: 'demanderPrenom'
  3. Affiche une popup prompt() demandant 'Quel est votre prénom ?'
  4. Si l'utilisateur clique OK et a saisi un prénom:
     - Met à jour this.prenom avec la valeur saisie
     - Log 'STATE_UPDATE' avec la nouvelle valeur
  5. Si l'utilisateur annule:
     - Log 'WORKFLOW_CANCELLED'
  6. Log 'WORKFLOW_SUCCESS' à la fin

Respecte rules/dev-frontend.md:
- Pattern mega-function avec workflowId unique
- Logs exhaustifs: WORKFLOW_START, STATE_UPDATE, WORKFLOW_SUCCESS
- Utilise les props définies dans alpinejs.html"

git add app/templates/hello/workflows/demander-prenom.html
git commit -m "feat: ajoute demander-prenom.html - workflow popup prénom"

# ==============================================================================
# ÉTAPE 7: Workflow backend hello_cron (Backend)
# Spec: workflows/backend/hello-cron.md
# ==============================================================================

pi -p "Crée UNIQUEMENT le fichier app/workflows/hello_cron.py - Megafunction pour le cronjob. Ne fais rien d'autre. Pas de prise d'initiative. Juste ce fichier.

VARIABLES ET FICHIERS EXISTANTS:
- Ce fichier est appelé par app/cron/run_hello.py (créé à l'étape 8)
- Il expose la fonction execute(**kwargs) qui sera importée par run_hello.py
- Les classes WorkflowContext, WorkflowResult, WorkflowLogger suivent le pattern standard

SPEC DE RÉFÉRENCE: workflows/backend/hello-cron.md

RÈGLES STRICTES:
- Ne RIEN inventer qui n'est pas dans la spec
- Respecter scrupuleusement workflows/backend/hello-cron.md
- Implémenter EXACTEMENT les classes WorkflowContext, WorkflowResult, WorkflowLogger et la fonction execute() décrites dans la spec

Le fichier doit:
- Définir WorkflowContext et WorkflowResult comme dataclasses
- Définir WorkflowLogger avec méthodes debug/info/error
- Exposer la fonction execute(**kwargs) -> dict qui:
  1. Crée un context avec workflow_id=uuid4(), started_at=datetime.utcnow()
  2. Log 'WORKFLOW_START' avec context
  3. Log 'HELLO_WORLD' dans un fichier /var/log/hello-cron.log
  4. Retourne WorkflowResult avec success=True, data={'message': 'hello world'}, logs
- Gérer les erreurs et retourner WorkflowResult avec success=False si échec

Respecte rules/dev-backend.md:
- Signature: execute(**kwargs) -> Dict[str, Any]
- WorkflowContext, WorkflowResult, WorkflowLogger obligatoires
- Logs exhaustifs: WORKFLOW_START, WORKFLOW_SUCCESS, WORKFLOW_FAILED
- Import local des dépendances (open() pour le fichier log)"

git add app/workflows/hello_cron.py
git commit -m "feat: ajoute workflows/hello_cron.py - megafunction cronjob"

# ==============================================================================
# ÉTAPE 8: Script d'appel du cron
# ==============================================================================

pi -p "Crée UNIQUEMENT le fichier app/cron/run_hello.py - Script pour exécuter le cronjob. Ne fais rien d'autre. Pas de prise d'initiative. Juste ce fichier.

VARIABLES ET FICHIERS EXISTANTS:
- Ce script importe execute depuis workflows.hello_cron
- La megafunction hello_cron.py existe avec la fonction execute(**kwargs)
- Ce script sera appelé par le cron toutes les minutes via crontab

Le fichier doit:
- Importer sys pour ajouter le parent au path
- Importer execute depuis workflows.hello_cron
- Appeler execute() et afficher le résultat
- Être exécutable comme script Python depuis la ligne de commande

Ce script sera appelé par le cron toutes les minutes."

git add app/cron/run_hello.py
git commit -m "feat: ajoute cron/run_hello.py - script d'appel cronjob"

# ==============================================================================
# ÉTAPE 9: Configuration cron
# ==============================================================================

pi -p "Crée UNIQUEMENT le fichier app/cron/crontab.txt - Configuration du cronjob. Ne fais rien d'autre. Pas de prise d'initiative. Juste ce fichier.

VARIABLES ET FICHIERS EXISTANTS:
- Le script à exécuter est app/cron/run_hello.py
- Ce fichier sera utilisé avec la commande: crontab app/cron/crontab.txt

Le fichier doit contenir:
- Une ligne crontab qui exécute le script toutes les minutes
- Utiliser le chemin absolu vers python et vers app/cron/run_hello.py
- Rediriger les erreurs vers un fichier log

Format: * * * * * /usr/bin/python3 /chemin/absolu/app/cron/run_hello.py >> /var/log/hello-cron.log 2>&1"

git add app/cron/crontab.txt
git commit -m "feat: ajoute cron/crontab.txt - configuration cronjob"

# ==============================================================================
# ÉTAPE 10: __init__.py pour les packages
# ==============================================================================

pi -p "Crée UNIQUEMENT les fichiers __init__.py nécessaires listés ci-dessous. Ne fais rien d'autre. Pas de prise d'initiative. Juste ces fichiers.

VARIABLES ET FICHIERS EXISTANTS:
- Ces fichiers permettent les imports Python entre les modules
- Les modules app, routes, workflows, cron existent et ont besoin de ces __init__.py

Liste des fichiers à créer (tous vides):
- app/__init__.py
- app/routes/__init__.py
- app/workflows/__init__.py
- app/cron/__init__.py
- app/templates/__init__.py
- app/templates/hello/__init__.py
- app/templates/hello/workflows/__init__.py

Ces fichiers permettent d'importer les modules Python."

git add app/__init__.py app/routes/__init__.py app/workflows/__init__.py app/cron/__init__.py app/templates/__init__.py app/templates/hello/__init__.py app/templates/hello/workflows/__init__.py
git commit -m "feat: ajoute __init__.py - packages Python"

# ==============================================================================
# ÉTAPE 11: Requirements.txt
# ==============================================================================

pi -p "Crée UNIQUEMENT le fichier app/requirements.txt avec les dépendances Flask. Ne fais rien d'autre. Pas de prise d'initiative. Juste ce fichier.

VARIABLES ET FICHIERS EXISTANTS:
- Ce fichier liste les dépendances pour pip install -r requirements.txt
- L'app utilise Flask comme framework web

Contenu:
flask>=2.3.0

Version minimale pour avoir les fonctionnalités modernes de Flask."

git add app/requirements.txt
git commit -m "feat: ajoute requirements.txt - dependances Flask"
