# Templates de Specs DrDice - Flask/SQLite

## Templates de Data Mapping

### 1. Screens (`templates/flask/squelettes/screens/data-mapping.md`)
Structure complète pour les pages Flask:
- **Workflows Frontend** : Mapping boutons → workflows
- **Routes API** : Endpoints utilisés par les workflows
- **Routes HTML** : Routes pour l'affichage des pages
- **Modèles SQLite** : Tables et champs de la base
- **Data Mapping Alpine.js** : Props ↔️ HTML ↔️ DB
- **Relations entre tables** : FK, JOIN
- **Checklist de validation**

### 2. Backend (`templates/flask/squelettes/backend/data-mapping.md`)
Pour les workflows backend:
- **Workflows Backend** : Liste des workflows API
- **Modèles de données** : Tables métier
- **Schéma SQL complet** : Types, contraintes, indexes
- **Mapping API ↔️ DB** : Transformations de données
- **Points d'entrée API** : Endpoints et méthodes

### 3. Cron (`templates/flask/squelettes/cron/data-mapping.md`)
Pour les jobs planifiés:
- **Configuration APScheduler** : Intervalle, trigger
- **Logique métier** : Étapes du traitement
- **Tables d'historisation** : runs, logs
- **Relations 1:N** : run → logs
- **Indexes recommandés** : Pour les requêtes de monitoring
- **Flux de données** : Schéma complet du workflow

## Templates de Conformité

### Screens (`templates/flask/squelettes/screens/conformite.md`)
Checklist de vérification IA:
- Structure Blueprint Flask
- Routes (url_for, render_template)
- Modèles (PascalCase, CRUD, sqlite3)
- Templates HTML (layouts, blocs Jinja2)
- Workflows Frontend (logger, try/catch)
- Workflows Backend (WorkflowContext, WorkflowResult)
- Assets statiques
- Boutons (IDs uniques, @click)

### Backend (`templates/flask/squelettes/backend/conformite.md`)
Checklist pour workflows API:
- Blueprint sans template_folder
- Routes API (@bp.route, jsonify)
- Pattern Workflow (Context, Result, Logger)
- Gestion des erreurs
- Imports et dépendances
- Validations
- Base de données (sqlite3, paramètres)

### Cron (`templates/flask/squelettes/cron/conformite.md`)
Checklist pour jobs planifiés:
- Blueprint cron_{name}
- Configuration APScheduler (@scheduler.task)
- Pattern Workflow Cron (CRON_START, CRON_SUCCESS)
- Gestion des erreurs
- Accès aux données
- Contexte Flask (app_context)

## Templates de Squelettes de Code

### Screens
- `blueprint.py` : Blueprint Flask avec template_folder
- `route.py` : Routes Flask avec render_template
- `model.py` : Dataclass + méthodes CRUD sqlite3
- `template_main.html` : HTML avec Jinja2 + Alpine.js
- `template_alpine.html` : Initialisation Alpine.js
- `workflow_frontend.html` : Pattern workflow avec logger
- `workflow_init.html` : Fonction init() Alpine

### Backend
- `blueprint.py` : Blueprint sans template_folder
- `workflow_backend.py` : Pattern complet WorkflowContext/Result/Logger

### Cron
- `blueprint.py` : Blueprint avec APScheduler
- `cron_job.py` : Job cron avec logging

## Règles Globales (specs-global/rules/)

Les specs globales sont dans `relance2/specs-global/rules/`:
- `cellsmvc.md` : Architecture Cell-Based MVC (54KB)
- `dev-backend.md` : Règles développement backend (18KB)
- `dev-frontend.md` : Règles développement frontend (11KB)

Ces règles définissent:
- Structure des cells (screens/, backend_wf/, cron/)
- Pattern MVC avec Flask
- Conventions de nommage
- Gestion des templates (layouts/, ChoiceLoader)
- Workflows frontend/backend
- SQLite sans ORM

## Utilisation

Les templates sont utilisés automatiquement par `drdice dev3`:

1. **Étape 5** : Génère `page-specs.md` depuis le template
2. **Étape 6** : Génère `data-mapping-page.md` depuis le template
3. **Étape 8** : Génère les squelettes de code depuis les templates
4. **Étape 12** : Vérifie la conformité avec les checklists

Tous les templates utilisent des variables comme `{cell_name}`, `{name}`, `{date}` qui sont remplacées automatiquement lors de la génération.
