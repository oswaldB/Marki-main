# Structure des Specs - Relance2 (Flask)

Ce dossier `.specs/` contient toutes les spécifications du projet Relance2 (architecture Flask + SQLite + Alpine.js avec **Blueprints par Cell**).

> **🌐 URL de test** : `https://dev2.markidiags.com`
> 
> Toutes les pages développées sont déployées sur cette URL pour validation.

## 🏗️ Architecture Blueprint par Cell

**Principe fondamental** : Chaque cell est un **Blueprint Flask autonome** avec ses propres routes, modèles et templates.

```
app/
├── __init__.py              ← Enregistre les blueprints des cells
├── templates/
│   └── base.html           ← Template global hérité
│
└── screens/                 ← Pages frontend (type: page)
    └── {cell_name}/         ← CHAQUE CELL = 1 DOSSIER = 1 BLUEPRINT
        ├── __init__.py       ← Définit: {cell_name}_bp = Blueprint(...)
        ├── routes.py         ← Routes liées au blueprint
        ├── models.py         ← Modèles SQLAlchemy
        ├── templates/
        │   └── {cell_name}/
        │       └── index.html
        ├── static/
        │   └── js/
        │       └── main.js
        └── workflows/
            └── *.js
```

### Pourquoi cette architecture ?

- **Isolation** : Chaque cell est indépendante
- **Modularité** : Facile à ajouter/supprimer
- **URL automatique** : `/login/`, `/dashboard/` via `url_prefix`
- **Ressources encapsulées** : Templates et static dans la cell

### Structure du Blueprint

```python
# app/screens/login/__init__.py
from flask import Blueprint

login_bp = Blueprint(
    "login",
    __name__,
    template_folder="templates",
    static_folder="static",
    url_prefix="/login"  # Toutes les routes commencent par /login/
)

# app/screens/login/routes.py
from . import login_bp

@login_bp.route("/")  # URL: /login/
def index():
    return render_template("login/index.html")

@login_bp.route("/api/login", methods=["POST"])  # URL: /login/api/login
def api_login():
    ...
```

## 📁 Organisation par Type de Cellule

### Différence entre `screens/`, `backend_wf/` et `cron.py`

| Type | Emplacement | Description | Exemple |
|------|-------------|-------------|---------|
| **Page (Frontend)** | `screens/` | Pages HTML avec Alpine.js | `/login/`, `/dashboard/` |
| **Workflow (Backend)** | `backend_wf/` | API-only, pas de template HTML | `/wf/notify/`, `/wf/export/` |
| **Cron** | `cron.py` | Fichier unique qui appelle les APIs des workflows | `python -m app.cron` |

### Structure complète

```
.specs/
├── README.md                           # Ce fichier
│
├── page/                               # 📄 Type: page (écrans/interfaces)
│   └── login/
│       ├── page-specs.md
│       ├── datamapping.md
│       └── mockups/
│
└── wf-backend/                         # ⚙️ Type: wf-backend (workflows)
    └── notify/
        └── process.md                  # Doc workflow

app/                                    # Implémentation
├── screens/                            # ← Pages frontend (Blueprints)
│   └── login/
│       ├── __init__.py
│       ├── routes.py
│       └── templates/
│
├── backend_wf/                         # ← Workflows backend (Blueprints)
│   └── notify/
│       ├── __init__.py
│       └── routes.py
│
└── cron.py                             # ← Cron (fichier unique)
    # Appelle les APIs des workflows backend via HTTP
```

## 🎯 Règles de Structure

### Pour les Pages (`page/{cell}/`) - Frontend

Chaque page DOIT contenir dans `.specs/`:

| Fichier/Dossier | Obligatoire | Description |
|-----------------|-------------|-------------|
| `page-specs.md` | ✅ Oui | Use cases Gherkin, composants UI, dépendances |
| `datamapping.md` | ✅ Oui | Flux de données (Blueprint → API → Alpine) |
| `valide.md` | ✅ Oui | État de validation, bugs connus, notes |
| `mockups/` | ✅ Oui | Maquettes HTML statiques de référence |
| `wf-frontend/` | ✅ Oui | Workflows frontend (Alpine.js) spécifiques |

**Et génère dans `app/screens/{cell}/`:**

| Fichier | Chemin | Description |
|-----------|--------|-------------|
| Blueprint | `app/screens/{cell}/__init__.py` | `{cell}_bp = Blueprint(...)` |
| Routes | `app/screens/{cell}/routes.py` | `@cell_bp.route(...)` |
| Modèles | `app/screens/{cell}/models.py` | `class Cell(db.Model)` |
| Template | `app/screens/{cell}/templates/{cell}/index.html` | Template Jinja2 |
| JS | `app/screens/{cell}/static/js/main.js` | Alpine.js app |

### Pour les Workflows Backend (`wf-backend/{cell}/`)

Workflows API-only (pas d'interface HTML) :

| Fichier/Dossier | Obligatoire | Description |
|-----------------|-------------|-------------|
| `{action}.md` | ✅ Oui | Doc du workflow (ex: `process.md`, `send-email.md`) |
| `datamapping.md` | ✅ Oui | Mapping entrées/sorties de l'API |

**Génère dans `app/backend_wf/{cell}/`:**

| Fichier | Description |
|-----------|-------------|
| `__init__.py` | Blueprint: `{cell}_bp = Blueprint(..., url_prefix="/wf/{cell}")` |
| `routes.py` | Routes API sans template |
| `models.py` | Modèles pour logs/état (optionnel) |

**Différences clés avec les pages :**
- ❌ Pas de dossier `templates/` (API only)
- ❌ Pas de dossier `static/js/` (pas de Alpine.js)
- ✅ Routes retournent toujours `jsonify()` (JSON)
- ✅ URL prefix: `/wf/{cell}/` au lieu de `/{cell}/`

## 🔄 Relation entre les Specs

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FLUX DE DÉVELOPPEMENT                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   .specs/page/login/                                                │
│   ┌───────────────┐                                                  │
│   │ page-specs.md │──Use cases, UI──┐                               │
│   └───────┬───────┘                 │                                │
│           │                         │                                │
│   ┌───────▼───────┐                 │                                │
│   │ datamapping.md│──Data flow──────┼──┐                            │
│   └───────┬───────┘                 │  │                            │
│           │                         │  │                            │
│   ┌───────▼───────┐                 │  │     .specs/wf-backend/      │
│   │ wf-frontend/  │                 │  │     ┌─────────────┐       │
│   │  initial-load │◄────────────────┘  └────▶│ auth/login.md │       │
│   │  form-submit  │                         └─────────────┘       │
│   └───────┬───────┘                          ▲                     │
│           │                                    │                     │
└───────────┼────────────────────────────────────┼─────────────────────┘
            │                                    │
            ▼                                    ▼
   ┌─────────────────────┐          ┌─────────────────────────────┐
   │  app/screens/       │          │  app/backend_wf/          │
   │  login/             │          │  auth/                    │
   │  ├── __init__.py    │          │  ├── __init__.py          │
   │  │   (blueprint)     │          │  │   (blueprint)          │
   │  ├── routes.py      │          │  ├── routes.py            │
   │  ├── models.py      │          │  └── models.py            │
   │  ├── templates/     │          └─────────────────────────────┘
   │  ├── static/js/     │
   │  └── workflows/     │
   │     └── *.js        │
   └─────────────────────┘
```

## 📝 Conventions de Nommage

### Pages
- **Type**: `page/{cell-name}/` (kebab-case)
- **Exemples**: `page/login/`, `page/company-list/`, `page/user-profile/`

### Workflows Frontend
- **Fichier**: `{action}.md` ou `{action}.js` (kebab-case)
- **Exemples**: `initial-load.md`, `form-submit.md`, `delete-confirm.md`

### Workflows Backend
- **Fichier**: `.specs/wf-backend/{domain}/{action}.md`
- **Exemples**: `auth/login.md`, `companies/create.md`, `users/update.md`

## 🏗️ Architecture Flask Récapitulatif (Blueprints par Cell)

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLASK STACK - BLUEPRINTS                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  app/__init__.py                                                │
│  └─ register_cell_blueprints()                                  │
│       │                                                          │
│       ├──▶ app/screens/{cell}/                                  │
│       │    ├── __init__.py  ← {cell}_bp = Blueprint()            │
│       │    ├── routes.py    ← @{cell}_bp.route("/")              │
│       │    ├── models.py    ← class {Cell}(db.Model)             │
│       │    └── templates/                                         │
│       │                                                         │
│       └──▶ app/backend_wf/{wf}/                                 │
│            └── ... (même structure)                             │
│                                                                  │
│  ┌──────────────────────────┐                                   │
│  │  app/cron.py             │                                   │
│  │  # Appelle les APIs      │                                   │
│  │  # des workflows backend  │                                   │
│  └──────────────────────────┘                                   │
│                                                                  │
│  URLs générées:                                                  │
│  - /{cell}/        → Template HTML                               │
│  - /{cell}/api/... → Routes API                                  │
│  - /wf/{cell}/...  → Workflows Backend                           │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Démarrage Rapide

Après avoir lancé `drdice dev4`, la structure suivante est créée automatiquement :

```
app/
├── screens/hello/              ← Exemple de page frontend
│   ├── __init__.py             # Blueprint hello_bp (url_prefix="/hello")
│   ├── routes.py               # Routes HTML + API
│   └── templates/hello/
│       └── index.html
│
├── backend_wf/hello-wf/        ← Exemple de workflow backend
│   ├── __init__.py             # Blueprint hello_wf_bp (url_prefix="/wf/hello")
│   └── routes.py               # API only (JSON)
│
└── cron.py                       ← Fichier cron (appelle les APIs)
    # Contient les tâches planifiées qui appellent les workflows backend
```

### Tester la structure

```bash
# 1. Démarrer Flask
cd /home/ubuntu/marki/relance2
python -c "from app import create_app; app = create_app(); app.run(debug=True)"

# 2. Tester les URLs dans un autre terminal:
curl http://localhost:5000/hello/           # Page HTML
curl http://localhost:5000/hello/api/hello  # API JSON
curl http://localhost:5000/wf/hello/        # Workflow API

# 3. Tester le cron (appelle les workflows backend via HTTP):
python -m app.cron
```

### Fonctionnement du Cron

Le fichier `cron.py` n'est **pas un Blueprint**. C'est un script qui :
- Appelle les APIs des workflows backend via HTTP (`requests`)
- Peut être exécuté manuellement: `python -m app.cron`
- Peut être mis dans un vrai cron système: `* * * * * python -m app.cron`

Exemple dans `cron.py`:
```python
def scheduled_hello():
    """Appelle le workflow hello-wf via API."""
    result = call_backend_workflow(
        workflow_name="hello",
        endpoint="/",
        method="POST",
        data={"name": "Cron", "source": "scheduled_task"}
    )
    return result
```

---

## 📋 Checklist de Création d'une Page

1. **Créer le dossier**: `.specs/page/{cell-name}/`
2. **Créer les specs**:
   - `page-specs.md` - Use cases et UI
   - `datamapping.md` - Flux de données
   - `valide.md` - Validation
3. **Créer les mockups**: `mockups/{cell}.html`
4. **Créer les workflows frontend**: `wf-frontend/*.md`
5. **Créer les workflows backend** (si besoin): `.specs/wf-backend/{domain}/*.md`
6. **Implémenter**:
   - `app/models/{cell}.py`
   - `app/routes/{cell}.py`
   - `app/templates/{cell}/index.html`
   - `app/static/js/pages/{cell}/main.js` + `workflows/*.js`

## 🔄 Différences avec Relance3 (Static-Stack)

| Aspect | Relance3 (CouchDB) | Relance2 (Flask) |
|--------|-------------------|------------------|
| **Structure specs** | `cells/{cell}/.specs/` | `.specs/{type}/{cell}/` |
| **Types de cell** | Toutes dans `cells/` | Séparés: `page/`, `wf-backend/` |
| **Workflows** | Tous dans `wf-frontend/` | Séparés: `wf-frontend/` (par page) et `wf-backend/` |
| **Data Mapping** | PouchDB ↔ CouchDB | SQLite ↔ Flask API ↔ Alpine |
| **Sync** | Live bidirectionnelle | Manuelle `fetch()` |

## 🚀 Commandes Rapides

```bash
# Créer une nouvelle page
cp -r .specs/page/TEMPLATE-page .specs/page/ma-page

# Créer un workflow backend
cp .specs/wf-backend/TEMPLATE-workflow.md .specs/wf-backend/mon-domaine/mon-workflow.md
```

## 📚 Documentation par Fichier

| Fichier | À lire pour... |
|---------|-----------------|
| `page/TEMPLATE-page/page-specs.md` | Structure d'une spec de page |
| `page/login/datamapping.md` | Exemple de data mapping |
| `wf-backend/TEMPLATE-workflow.md` | Structure d'un workflow backend |
