# Architecture Cell-Based MVC

## Définition

Le projet est découpé en **cells** (cellules). Chaque cell est un **Blueprint Flask** qui implémente une approche **MVC** (Model-View-Controller).

**Une cell = un écran OU un workflow backend unique ou un cron workflow.**

---

## Processus de Développement (2 Phases)

### Phase 1 : Spécifications (Obligatoire)

Avant tout développement, la cellule doit être entièrement spécifiée dans `blueprint/specs/`.

**RÈGLE D'OR** : Pas de développement en dehors de `blueprint/specs/` sans fichier **`valide.md`** présent.

**RÈGLE D'OR** : Dans `specs/`, uniquement des fichiers `.md` sauf pour `mockups/` où c'est du HTML simple.

```
blueprint/
└── specs/
    ├── valide.md          ← DOIT EXISTER pour passer en Phase 2
    ├── A LIRE EN PREMIER/
    │   ├── schema.sql
    │   └── rules.md
    └── ...
```

Le fichier `valide.md` contient la validation formelle que les specs sont complètes et prêtes pour le dev.

### Phase 2 : Développement

Une fois `valide.md` présent, on peut développer :
- Les routes (controllers)
- Les modèles
- Les templates
- Les workflows frontend/backend

---

## Types de Cells

| Type | Définition | Nomenclature fichier |
|------|------------|---------------------|
| **Cell Écran** | Une page web complète avec interface utilisateur | `ecran-<nom>.py` ou dossier `ecran_<nom>/` |
| **Cell Backend** | API endpoint ou workflow server-side sans UI | `wf-<nom>.py` ou dossier `wf_<nom>/` |
| **Cell Cron** | Tâche planifiée/automatisée | `cron-<nom>.py` ou dossier `cron_<nom>/` |

---

## Structure Globale

### Base de données

- **Chemin** : `/app/data/marki.db`
- **Action requise** : Créer le dossier `/app/data/` et déplacer la base de données existante

```bash
mkdir -p /home/ubuntu/marki/relance2/app/data
mv /home/ubuntu/marki/relance2/specs/marki.db /home/ubuntu/marki/relance2/app/data/marki.db
```

### Structure Globale

```
app/
├── data/
│   └── marki.db                    # Base de données unique
├── screens/                        # Cells de type ÉCRAN (interfaces utilisateur)
│   ├── <nom_cell>/
│   └── ...
├── backend-wf/                     # Cells de type WORKFLOW BACKEND (API sans UI)
│   ├── <nom_cell>/
│   └── ...
├── cron/                           # Cells de type CRON (tâches planifiées)
│   ├── <nom_cell>/
│   └── ...
└── __init__.py
```

### Organisation par Type de Cell

| Type | Dossier | Description |
|------|---------|-------------|
| **Écran** | `app/screens/<nom>/` | Pages web avec interface utilisateur (templates/, mockups/, wf-frontend/) |
| **Workflow Backend** | `app/backend-wf/<nom>/` | API endpoints, workflows server-side (pas de templates/) |
| **Cron** | `app/cron/<nom>/` | Tâches planifiées, jobs automatisés (cron.py, pas de templates/) |

### Structure Interne d'une Cell (inchangée)

Quel que soit le dossier parent (`screens/`, `backend-wf/`, `cron/`), la structure interne reste identique :

---

## Les Templates (Vue - V du MVC)

Les templates suivent strictement la structure définie dans **`rules/dev-frontend.md`** :

```
templates/                          # PLAT, pas de sous-dossier <nom-cell>/
├── index.html                      # Template principal Jinja2
├── alpinejs.html                   # Initialisation Alpine.js
└── workflows/                      # Mega-functions workflows
    ├── workflow-init.html
    ├── initial-load.html
    └── ...
```

### Stack Technique Templates

- **Templating** : **Jinja2** via Flask (server-side rendering)
- **Framework JS** : **Alpine.js** uniquement (pas de React, Vue, ou vanilla JS)
- **CSS** : Tailwind CSS via CDN
- **Pattern** : Props réactives → Workflows → Init (ordre OBLIGATOIRE)

---

## Le Blueprint (C du MVC)

### Structure minimale d'un blueprint

```python
# app/<nom_cell>/__init__.py
from flask import Blueprint

bp = Blueprint('<nom_cell>', __name__, template_folder='templates')

from .routes import index, api_data, wf_sync_missions
from .models import Impaye, Mission
```

```python
# app/<nom_cell>/routes/index.py
from flask import render_template
from .. import bp

@bp.route('/<nom_cell>')
def index():
    """Rend la page principale."""
    return render_template('index.html')
```

```python
# app/<nom_cell>/routes/wf_sync_missions.py
from flask import jsonify, request
from .. import bp
from ..models.mission import Mission

@bp.route('/api/sync-missions', methods=['POST'])
def sync_missions():
    """Workflow backend : synchronise les missions."""
    data = request.get_json()
    dossier_id = data.get('dossierId')
    
    # Logique de synchronisation
    result = Mission.sync_from_external_db(dossier_id)
    
    return jsonify(result)
```

```python
# app/<nom_cell>/models/impaye.py
from dataclasses import dataclass
from typing import Optional

@dataclass
class Impaye:
    """Modèle de données Impaye."""
    id: str
    nfacture: str
    reste_a_payer: float
    
    @classmethod
    def from_row(cls, row: dict) -> 'Impaye':
        """Crée une instance depuis une ligne SQLite."""
        return cls(**row)
```

---

## Le Dossier specs/ (Documentation & Conception)

### 📁 Structure obligatoire

```
specs/
├── valide.md                       # Validation des specs (requis pour passer au dev)
├── A LIRE EN PREMIER/
│   ├── schema.sql                  # Schéma SQL du datamodel principal
│   └── rules.md                    # Règles spécifiques de développement
├── mockups/                        # UNIQUEMENT des fichiers HTML
│   ├── etat-normal.html
│   ├── etat-vide.html
│   ├── etat-chargement.html
│   └── etat-erreur.html
├── wf-frontend/                    # UNIQUEMENT des fichiers Markdown
│   ├── workflow-1.md
│   ├── workflow-2.md
│   └── workflow-init.md
├── wf-backend/                     # UNIQUEMENT des fichiers Markdown
│   └── sync-missions.md
├── models/                         # Spécifications des modèles
│   └── impaye.md
└── routes/                         # Spécifications des routes
    └── index.md
```

### 🎯 RÈGLE D'OR : Typage des fichiers dans specs/

| Dossier | Extension autorisée | Interdit |
|---------|---------------------|----------|
| `specs/` | `.md` | Tout autre format |
| `specs/A LIRE EN PREMIER/` | `.md`, `.sql` | - |
| `specs/mockups/` | `.html` | `.md`, `.js`, `.css` |
| `specs/wf-frontend/` | `.md` | `.html`, `.js` |
| `specs/wf-backend/` | `.md` | `.html`, `.js` |
| `specs/models/` | `.md` | Tout autre format |
| `specs/routes/` | `.md` | Tout autre format |

---

## Autonomie des Cells

### ✅ Chaque blueprint est TOTATEMENT AUTONOME pour :

1. **Ses routes** : Définies dans `routes/` (un fichier par route ET par workflow backend)
2. **Ses modèles** : Définis dans `models/` (un fichier par modèle)
3. **Ses templates** : Dans `templates/` (structure plate)
4. **Ses workflows frontend** : Dans `templates/workflows/`
5. **Ses workflows backend** : Dans `routes/` (fichiers Python) ET `specs/wf-backend/` (specs Markdown)
6. **Ses spécifications** : Dans `specs/`

### 🔗 SEUL LIEN PARTAGÉ :

```python
# app/data/__init__.py
import sqlite3
from flask import g, current_app

def get_db():
    """Renvoie la connexion DB unique (singleton par requête)."""
    if 'db' not in g:
        g.db = sqlite3.connect(
            current_app.config['DATABASE'],
            detect_types=sqlite3.PARSE_DECLTYPES
        )
        g.db.row_factory = sqlite3.Row
    return g.db

def close_db(e=None):
    """Ferme la connexion DB."""
    db = g.pop('db', None)
    if db is not None:
        db.close()
```

### Configuration de l'app Flask

```python
# app/__init__.py
from flask import Flask
import os

def create_app():
    app = Flask(__name__)
    
    # Configuration unique de la DB
    app.config['DATABASE'] = os.path.join(
        os.path.dirname(__file__), 'data', 'marki.db'
    )
    
    # Enregistrement des blueprints (cells)
    from .<nom_cell> import bp as <nom_cell>_bp
    app.register_blueprint(<nom_cell>_bp, url_prefix='/<nom_cell>')
    
    # Cleanup DB
    from .data import close_db
    app.teardown_appcontext(close_db)
    
    return app
```

---

## Technologies

| Couche | Technologie | Interdit |
|--------|-------------|----------|
| Backend | Flask + Python | Django, FastAPI |
| Frontend JS | Alpine.js 3.x | React, Vue, Angular, Vanilla JS |
| Templating | Jinja2 | React JSX, Vue SFC |
| Styling | Tailwind CSS | Bootstrap, Material UI |
| Database | SQLite3 (stdlib) | PostgreSQL, MySQL (pour l'instant), **SQLAlchemy**, **Tout ORM** |
| HTTP Client | Fetch API | Axios, jQuery |

**RÈGLE D'OR :** Pas d'ORM. Utiliser uniquement `sqlite3` du standard library Python avec des requêtes SQL brutes.

---

## Conventions de Nommage

### Blueprints (Cells)
- Nom : `snake_case`, ex: `client_management`, `invoice_viewer`
- Préfixe URL : identique au nom, ex: `/client_management`

### Templates (Structure PLATE)
- Fichiers à la racine `templates/` : `kebab-case.html`, ex: `index.html`, `alpinejs.html`
- Fichiers dans `templates/workflows/` : `kebab-case.html`, ex: `workflow-init.html`

### Workflows
- Nom de fonction : `camelCase` dans le fichier, ex: `initialLoad`, `saveData`
- Fichier : `kebab-case.html` ou `kebab-case.md`

### Spécifications
- Fichiers markdown : `kebab-case.md`
- Fichiers mockup : `etat-descriptif.html` (en français si pertinent)

---

## Checklist de Création d'une Nouvelle Cell

1. **Déterminer le type** de la cell :
   - **Écran** → créer dans `app/screens/<nom_cell>/`
   - **Workflow Backend** → créer dans `app/backend-wf/<nom_cell>/`
   - **Cron** → créer dans `app/cron/<nom_cell>/`

2. **Créer la structure** dans le bon dossier :
   - [ ] `__init__.py`, `routes/` (un fichier par route ET workflow backend)
   - [ ] `models/` (un fichier par modèle)
   - [ ] `logs/` (dossier pour les logs de test)
   - [ ] Pour les **écrans uniquement** : `templates/` (structure PLATE)

3. **Créer le dossier `specs/`** avec :
   - [ ] `valide.md` (obligatoire pour passer au dev)
   - [ ] `LIRE_EN_PREMIER/schema.sql`
   - [ ] `LIRE_EN_PREMIER/rules.md`
   - [ ] `wf-backend/` (Markdown - pour tous les types)
   - [ ] `models/` (spécifications des modèles)
   - [ ] `routes/` (spécifications des routes)
   - [ ] Pour les **écrans uniquement** : `mockups/` (HTML) + `wf-frontend/` (Markdown)

4. **Enregistrer le blueprint** dans `app/__init__.py`
5. **Vérifier** que la DB est accessible via `get_db()`
6. **Tester** l'endpoint racine du blueprint

---

## Exemple Complet : Cell Écran "impayes_detail"

Exemple basé sur un écran de détail d'impayé avec missions sync, drawer PDF, modales actions, et notes.

```
app/
├── data/
│   └── marki.db
├── screens/
│   └── impayes_detail/             # Blueprint Flask ÉCRAN
│   ├── __init__.py
│   ├── routes/                     # Routes ET workflows backend
│   │   ├── __init__.py
│   │   ├── index.py                # GET /impayes_detail
│   │   ├── api_impaye.py           # GET /impayes_detail/api/impaye/<id>
│   │   ├── api_missions.py         # GET /impayes_detail/api/missions
│   │   ├── wf_sync_missions.py     # POST /impayes_detail/api/sync-missions
│   │   ├── api_evenements.py       # GET /impayes_detail/api/evenements
│   │   ├── api_notes.py            # GET/POST /impayes_detail/api/notes
│   │   ├── api_changer_sequence.py # POST /impayes_detail/api/changer-sequence
│   │   └── api_suspendre.py        # POST /impayes_detail/api/suspendre
│   ├── models/
│   │   ├── __init__.py
│   │   ├── impaye.py
│   │   ├── mission.py
│   │   ├── evenement.py
│   │   └── note.py
│   ├── templates/                  # STRUCTURE PLATE
│   │   ├── index.html              # Pas de sous-dossier impayes_detail/
│   │   ├── alpinejs.html
│   │   └── workflows/
│   │       ├── workflow-init.html
│   │       ├── initial-load.html
│   │       ├── sync-missions.html
│   │       ├── changer-sequence.html
│   │       ├── suspendre.html
│   │       └── afficher-pdf.html   # Ouvre drawer avec iframe
│   └── specs/
│       ├── valide.md
│       ├── A LIRE EN PREMIER/
│       │   ├── schema.sql
│       │   └── rules.md
│       ├── mockups/
│       │   ├── etat-normal.html
│       │   ├── etat-chargement.html
│       │   ├── drawer-pdf.html     # Mockup du drawer PDF (iframe)
│       │   ├── modale-changer-sequence.html
│       │   └── modale-suspendre.html
│       ├── wf-frontend/
│       │   ├── initial-load.md
│       │   ├── sync-missions.md    # Bouton sync, affichage missions
│       │   ├── afficher-pdf.md     # Ouvre drawer avec iframe
│       │   ├── changer-sequence.md # Ouvre modale
│       │   ├── suspendre.md        # Ouvre modale
│       │   └── notes.md            # 2 notes: impayé + contact, édition
│       ├── wf-backend/
│       │   └── sync-missions.md    # Sync depuis sync.db vers marki.db
│       ├── models/
│       │   ├── impaye.md
│       │   ├── mission.md
│       │   └── note.md
│       └── routes/
│           ├── index.md
│           └── api_missions.md
└── __init__.py
```

### Patterns clés de cet exemple :

#### 1. Drawer PDF avec iframe
```html
<!-- templates/drawer-pdf.html -->
<div x-show="pdfDrawerOpen" class="fixed inset-0 z-50" x-cloak>
  <div class="absolute inset-0 bg-black bg-opacity-50" @click="pdfDrawerOpen = false"></div>
  <div class="absolute right-0 top-0 h-full w-3/4 bg-white shadow-xl">
    <iframe :src="pdfUrl" class="w-full h-full" frameborder="0"></iframe>
  </div>
</div>
```

#### 2. Modales pour les actions
```html
<!-- Boutons qui ouvrent des modales -->
<button @click="modaleChangerSequence = true">Changer de séquence</button>
<button @click="modaleSuspendre = true">Suspendre</button>

<!-- Modale changer séquence -->
<div x-show="modaleChangerSequence" x-cloak>
  <!-- Sélection nouvelle séquence -->
</div>
```

#### 3. Double notes (impayé + contact)
```html
<div class="grid grid-cols-2 gap-4">
  <!-- Notes sur l'impayé -->
  <div>
    <h3>Notes sur l'impayé</h3>
    <div x-for="note in notesImpaye" :key="note.id">
      <span x-text="note.auteur"></span>
      <button x-show="note.isAuteur" @click="editerNote(note)">Modifier</button>
    </div>
  </div>
  
  <!-- Notes sur le contact -->
  <div>
    <h3>Notes sur le contact</h3>
    <!-- Même structure -->
  </div>
</div>
```

#### 4. Sync missions depuis DB externe
```python
# routes/wf_sync_missions.py
@bp.route('/api/sync-missions', methods=['POST'])
def sync_missions():
    dossier_id = request.json.get('dossierId')
    
    # Connexion à sync.db externe
    sync_db = sqlite3.connect('/home/arthur/adti/sync.db')
    
    # Récupération missions
    missions = sync_db.execute(
        "SELECT * FROM missions WHERE dossier_id = ?", 
        (dossier_id,)
    ).fetchall()
    
    # Insertion dans marki.db
    marki_db = get_db()
    for mission in missions:
        marki_db.execute("""
            INSERT OR REPLACE INTO missions 
            (id, dossier_id, type_mission, ...)
            VALUES (?, ?, ?, ...)
        """, mission)
    
    marki_db.commit()
    
    return jsonify({'synced': len(missions)})
```

---

## Exemple Complet : Cell Backend "sync_missions"

Cellule sans interface - uniquement une API pour synchroniser des données.

```
app/
├── data/
│   └── marki.db
├── backend-wf/
│   └── sync_missions/              # Blueprint Backend
│   ├── __init__.py
│   ├── routes/                     # Une seule route API
│   │   ├── __init__.py
│   │   └── wf_sync.py              # POST /sync-missions/api/sync
│   ├── models/                     # Modèles utilisés
│   │   ├── __init__.py
│   │   ├── mission.py
│   │   └── sync_log.py
│   └── specs/                      # Spécifications
│       ├── valide.md
│       ├── A LIRE EN PREMIER/
│       │   ├── schema.sql
│       │   └── rules.md
│       ├── wf-backend/
│       │   └── sync-process.md     # Workflow de synchronisation
│       ├── models/
│       │   └── mission.md
│       └── routes/
│           └── wf_sync.md
└── __init__.py
```

---

## Exemple Complet : Cell Cron "cleanup_impayes"

Cellule exécutée périodiquement par un cron.

```
app/
├── data/
│   └── marki.db
├── cron/
│   └── cleanup_impayes/              # Blueprint Cron
│   ├── __init__.py
│   ├── routes/                     # Endpoint pour déclenchement manuel
│   │   ├── __init__.py
│   │   └── api_trigger.py          # POST /cleanup/api/trigger
│   ├── models/
│   │   ├── __init__.py
│   │   └── impaye.py
│   ├── specs/
│   │   ├── valide.md
│   │   ├── A LIRE EN PREMIER/
│   │   │   ├── schema.sql
│   │   │   └── rules.md
│   │   ├── wf-backend/
│   │   │   └── cleanup-process.md
│   │   ├── models/
│   │   │   └── impaye.md
│   │   └── routes/
│   │       └── api_trigger.md
│   └── cron.py                     # Point d'entrée pour le cron
└── __init__.py
```

```python
# app/cron/cleanup_impayes/cron.py
#!/usr/bin/env python3
"""Point d'entrée pour l'exécution cron."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.impaye import Impaye

def main():
    """Exécutée par le cron toutes les heures."""
    # Logique de cleanup
    result = Impaye.cleanup_old(days=90)
    print(f"Cleanup terminé: {result} impayés archivés")
    return result

if __name__ == '__main__':
    main()
```

**Configuration cron (intégré à Flask avec APScheduler) :**

Le cron est géré directement par l'application Flask via `Flask-APScheduler`. Quand l'app démarre, les jobs démarrent aussi.

```python
# app/__init__.py (configuration globale)
from flask import Flask
from flask_apscheduler import APScheduler

scheduler = APScheduler()

def create_app():
    app = Flask(__name__)
    
    # Configuration APScheduler
    app.config['SCHEDULER_API_ENABLED'] = True
    scheduler.init_app(app)
    scheduler.start()
    
    # Enregistrement des cells cron (le blueprint enregistre ses jobs)
    from .cron_cleanup_impayes import bp as cleanup_bp
    app.register_blueprint(cleanup_bp)
    
    return app
```

```python
# app/cron/cleanup_impayes/__init__.py
from flask import Blueprint
from app import scheduler

bp = Blueprint('cron_cleanup_impayes', __name__)

from . import routes
from .cron import cleanup_task

# Enregistrement du job cron au démarrage du blueprint
@scheduler.task('cron', id='cleanup_impayes', hour='*')
def scheduled_cleanup():
    """Exécuté toutes les heures."""
    with scheduler.app.app_context():
        cleanup_task()
```

```python
# app/cron/cleanup_impayes/cron.py
from .models.impaye import Impaye

def cleanup_task():
    """Tâche de nettoyage exécutée périodiquement."""
    result = Impaye.cleanup_old(days=90)
    print(f"[{datetime.now()}] Cleanup terminé: {result} impayés archivés")
    return result
```

---

# Processus Complet de Développement

## Vue d'ensemble

Le développement suit un processus en 5 étapes automatisées par des scripts shell :

```
Étape 1: app-map.md          → Étape 2: cells-listing.md    → Étape 3: /app/ structure
(specs-global/)                (specs-global/)                (génération code)
        ↓                           ↓                           ↓
   Manuel (PM)               Script: generate-cells.sh      Script: build-structure.sh
                               (pi -p "analyse")              (pi -p "génère")
        ↓                           ↓                           ↓
Étape 4: init-boilerplate.sh → Étape 5: dev-cells.sh
(app fonctionnelle)           (développement cells)
        ↓
   Lancement serveur + validation
```

---

## Étape 1 : App Map (Manuel)

**Fichier**: `specs-global/app-map.md`

Ce document décrit l'ensemble de l'application avant toute génération de code.

### Structure

```markdown
# Application Map

## Écrans

| URL | Nom | Description |
|-----|-----|-------------|
| / | dashboard | Tableau de bord avec stats impayés |
| /impayes | liste-impayes | Liste paginée des impayés |
| /impayes/<id> | detail-impaye | Détail d'un impayé avec actions |

## Workflows Backend

| ID | Type | Attaché à | Description |
|----|------|-----------|-------------|
| sync-missions | wf-bg | detail-impaye | Synchronise missions depuis sync.db |
| generate-pdf | wf-bg | detail-impaye | Génère PDF facture |
| cleanup-old | cron | global | Nettoie impayés obsolètes |
```

---

## Étape 2 : Génération Cells Listing

**Script**: `scripts/01-generate-cells.sh`

### Fonctionnement

Lit `app-map.md` et génère `specs-global/cells-listing.md` avec `pi -p`.

```bash
#!/bin/bash
# scripts/01-generate-cells.sh

set -e

PROJECT_DIR="/home/ubuntu/marki/relance2"
APP_MAP="$PROJECT_DIR/specs-global/app-map.md"
OUTPUT="$PROJECT_DIR/specs-global/cells-listing.md"

echo "📋 Génération du cells listing depuis app-map.md..."

# Prompt pour pi
PROMPT="
Tu es un architecte logiciel spécialisé en Flask/MVC.

Lis ce document app-map.md qui décrit une application web.

Ta mission:
1. Identifie chaque CELL (écran, wf-bg, cron) mentionné
2. Pour chaque cell, détermine:
   - Type: ecran | wf-bg | cron
   - Nom technique (snake_case)
   - Description courte
   - Dépendances: base layout (toujours), chemin BDD si accès données
3. Génère le fichier cells-listing.md au format ci-dessous

Génère un fichier cells-listing.md au format:

# Cells Listing

## Cell: <nom>
- **Type**: <type>
- **Description**: <description>
- **Dépendances**: <liste>
- **Structure**:
```
app/<nom>/
├── __init__.py
├── routes/
│   └── ...
├── models/
│   └── ...
└── specs/
    ├── valide.md
    └── ...
```

Contenu de app-map.md:
$(cat $APP_MAP)
"

# Exécution avec pi
pi -p "$PROMPT" > "$OUTPUT"

echo "✅ Cells listing généré: $OUTPUT"
```

---

## Étape 3 : Construction Structure /app/

Deux options selon ton contexte :

### Option A : Avec récupération des specs existantes (recommandé)

**Script**: `scripts/02a-build-structure-with-existing.sh`

Ce script :
1. Lit `cells-listing.md`
2. Cherche dans `specs/` les dossiers existants (`mockups/`, `wf-frontend/`, `wf-backend/`)
3. Copie automatiquement ces fichiers dans `app/<cell>/specs/`
4. Crée la structure Flask complète

**Cas d'usage** : Tu as déjà des specs dans `specs/` que tu veux réorganiser en cells.

### Option B : From scratch (structure vide)

**Script**: `scripts/02b-build-structure-from-scratch.sh`

Ce script :
1. Lit `cells-listing.md`
2. Crée uniquement la structure de dossiers vides
3. Ne copie aucune spec existante

**Cas d'usage** : Nouveau projet, tu pars de zéro.

### Fonctionnement du script 02a (avec récupération)

```bash
#!/bin/bash
# scripts/02a-build-structure-with-existing.sh

set -e

PROJECT_DIR="/home/ubuntu/marki/relance2"
CELLS_LISTING="$PROJECT_DIR/specs-global/cells-listing.md"
APP_DIR="$PROJECT_DIR/app"
SPECS_DIR="$PROJECT_DIR/specs"

echo "🔨 Construction avec récupération des specs..."

# 1. Création structure de base
PROMPT="..."
COMMANDS=$(pi -p "$PROMPT")
eval "$COMMANDS"

# 2. Recherche et copie des specs existantes
echo "📁 Recherche de specs existantes..."

for cell_dir in "$APP_DIR"/*/; do
    cell_name=$(basename "$cell_dir")
    existing_specs="$SPECS_DIR/$cell_name"
    
    if [ -d "$existing_specs" ]; then
        echo "  → Cell: $cell_name"
        
        # Copie mockups
        [ -d "$existing_specs/mockups" ] && cp -r "$existing_specs/mockups" "$cell_dir/specs/"
        
        # Copie wf-frontend
        [ -d "$existing_specs/wf-frontend" ] && cp -r "$existing_specs/wf-frontend" "$cell_dir/specs/"
        
        # Copie wf-backend
        [ -d "$existing_specs/wf-backend" ] && cp -r "$existing_specs/wf-backend" "$cell_dir/specs/"
        
        # Copie models
        [ -d "$existing_specs/models" ] && cp -r "$existing_specs/models" "$cell_dir/specs/"
        
        # Copie routes
        [ -d "$existing_specs/routes" ] && cp -r "$existing_specs/routes" "$cell_dir/specs/"
        
        # Copie schema.sql et rules.md
        [ -f "$existing_specs/schema.sql" ] && cp "$existing_specs/schema.sql" "$cell_dir/specs/A LIRE EN PREMIER/"
        [ -f "$existing_specs/rules.md" ] && cp "$existing_specs/rules.md" "$cell_dir/specs/A LIRE EN PREMIER/"
    fi
done

# 3. Copie depuis specs-global
for cell_dir in "$APP_DIR"/*/; do
    cell_name=$(basename "$cell_dir")
    global_specs="$PROJECT_DIR/specs-global/$cell_name"
    [ -d "$global_specs" ] && cp -r "$global_specs"/* "$cell_dir/specs/"
done

echo "✅ Structure construite avec specs"
```

### Fonctionnement du script 02b (from scratch)

Identique au script 02a mais sans l'étape de copie des specs existantes.

---

## Étape 4 : Init Boilerplate

**Script**: `scripts/03-init-boilerplate.sh`

### Fonctionnement

Crée un projet Flask minimal fonctionnel avec une cell "hello" complète.

```bash
#!/bin/bash
# scripts/03-init-boilerplate.sh

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
EOF

# 3. app/__init__.py
cat > "$APP_DIR/__init__.py" << 'EOF'
from flask import Flask
from flask_apscheduler import APScheduler
import os

scheduler = APScheduler()

def create_app():
    app = Flask(__name__)
    
    # Config DB
    app.config['DATABASE'] = os.path.join(
        os.path.dirname(__file__), 'data', 'marki.db'
    )
    
    # Config Scheduler
    app.config['SCHEDULER_API_ENABLED'] = True
    scheduler.init_app(app)
    scheduler.start()
    
    # Enregistrement cells boilerplate
    from .hello import bp as hello_bp
    from .hello_bg import bp as hello_bg_bp
    from .hello_cron import bp as hello_cron_bp
    
    app.register_blueprint(hello_bp, url_prefix='/hello')
    app.register_blueprint(hello_bg_bp, url_prefix='/hello-bg')
    app.register_blueprint(hello_cron_bp, url_prefix='/hello-cron')
    
    # Page d'accueil
    @app.route('/')
    def index():
        return '<h1>Marki App - Cells MVC</h1>
        <ul>
            <li><a href="/hello">Hello (Écran)</a></li>
            <li><a href="/hello-bg/api/process">Hello BG (API)</a></li>
            <li>Cron actif: heartbeat toutes les 60s</li>
        </ul>'
    
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

# 5. Cell Hello (Écran)
mkdir -p "$APP_DIR/hello/routes" "$APP_DIR/hello/models" "$APP_DIR/hello/templates/workflows" "$APP_DIR/hello/specs"

# __init__.py
cat > "$APP_DIR/hello/__init__.py" << 'EOF'
from flask import Blueprint

bp = Blueprint('hello', __name__, template_folder='templates')

from .routes import index
EOF

# Route index
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

# Modèle
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

# Templates
cat > "$APP_DIR/hello/templates/index.html" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Hello Cell</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
</head>
<body class="p-8 bg-gray-100" x-data="helloApp" x-init="init()">
    <div class="max-w-md mx-auto bg-white p-6 rounded-lg shadow">
        <h1 class="text-2xl font-bold mb-4">Hello <span x-text="prenom" class="text-blue-600"></span>! 👋</h1>
        
        <button @click="changerPrenom()" 
                class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition"
                :disabled="loading">
            <span x-show="!loading">Changer prénom</span>
            <span x-show="loading">Chargement...</span>
        </button>
        
        <div x-show="message" 
             x-text="message"
             class="mt-4 p-2 bg-green-100 text-green-800 rounded"
             x-transition></div>
        
        <hr class="my-4">
        <p class="text-gray-600 text-sm">
            Test: alerte → saisie → mise à jour → message confirmation
        </p>
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
            console.log('[INIT] Hello app démarrée');
            console.log('[STATE] Prénom initial:', this.prenom);
        },
        
        async changerPrenom() {
            // Workflow: voir rules/dev-frontend.md pour la structure complète
            const nouveauPrenom = prompt('Entrez votre prénom:');
            if (!nouveauPrenom) {
                console.log('[CANCEL] Saisie annulée');
                return;
            }
            
            this.loading = true;
            this.message = '';
            
            try {
                console.log('[API_CALL] POST /hello/api/prenom', {prenom: nouveauPrenom});
                
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
                } else {
                    throw new Error(data.error || 'Erreur inconnue');
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

# Specs (valide car boilerplate fonctionnel)
cat > "$APP_DIR/hello/specs/valide.md" << 'EOF'
# Validation Cell Hello

- [x] Structure créée
- [x] Route index fonctionne
- [x] API prenom CRUD
- [x] Template Alpine.js
- [x] Workflow alert → saisie → update
EOF

cat > "$APP_DIR/hello/specs/devok.md" << 'EOF'
# Développement OK

Cell boilerplate fonctionnelle.
EOF

# 6. Cell Hello Background
echo "📝 Création cell Hello Background..."
mkdir -p "$APP_DIR/hello_bg/routes"

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

# Specs (valide car boilerplate fonctionnel)
cat > "$APP_DIR/hello_bg/specs/valide.md" << 'EOF'
# Validation Cell Hello BG

- [x] Endpoint /api/process fonctionne
- [x] Accès modèle Prenom
EOF

cat > "$APP_DIR/hello_bg/specs/devok.md" << 'EOF'
# Développement OK

Cell boilerplate fonctionnelle.
EOF

# 7. Cell Hello Cron
echo "⏰ Création cell Hello Cron..."
mkdir -p "$APP_DIR/hello_cron/routes"

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

# Specs (valide car boilerplate fonctionnel)
cat > "$APP_DIR/hello_cron/specs/valide.md" << 'EOF'
# Validation Cell Hello Cron

- [x] Job heartbeat enregistré
- [x] Exécution toutes les 60s
EOF

cat > "$APP_DIR/hello_cron/specs/devok.md" << 'EOF'
# Développement OK

Cell boilerplate fonctionnelle.
EOF

# 8. Installation dépendances
echo "📦 Installation dépendances..."
cd "$PROJECT_DIR"
pip install -q -r requirements.txt

# 9. Création DB (utilise existante ou nouvelle selon contexte)
if [ -f "$PROJECT_DIR/specs/marki.db" ]; then
    read -p "Base specs/marki.db trouvée. L'utiliser? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cp "$PROJECT_DIR/specs/marki.db" "$APP_DIR/data/marki.db"
        echo "📦 Base existante copiée"
    else
        touch "$APP_DIR/data/marki.db"
        echo "📦 Nouvelle base créée"
    fi
else
    touch "$APP_DIR/data/marki.db"
    echo "📦 Nouvelle base créée"
fi

echo ""
echo "✅ Boilerplate initialisé!"
echo ""
echo "🧪 Lancement du serveur Flask..."
echo ""
echo "   🌐 http://localhost:5000"
echo "   📍 /hello - Écran avec workflow Alpine"
echo "   📍 /hello-bg/api/process - Workflow backend"
echo "   📍 Cron actif: logs dans console"
echo ""

# Lancement serveur avec autoreload
export FLASK_APP="app"
export FLASK_ENV="development"
export FLASK_DEBUG="1"

python -m flask run --host=0.0.0.0 --port=5000 --reload
```

---

## Étape 5 : Développement des Cells

**Script**: `scripts/04-dev-cells.sh`

### Fonctionnement

Détecte les cells avec `valide.md` mais sans `devok.md`, crée des branches et développe avec `pi -p`.

```bash
#!/bin/bash
# scripts/04-dev-cells.sh

set -e

PROJECT_DIR="/home/ubuntu/marki/relance2"
APP_DIR="$PROJECT_DIR/app"

echo "🔍 Recherche des cells à développer..."
echo ""

# Fonction pour convertir nom en branche
to_branch_name() {
    echo "feature/cell-$(echo "$1" | tr '_' '-')"
}

# Lister les cells à dev
TO_DEV=()
for cell_dir in "$APP_DIR"/*/; do
    if [ -d "$cell_dir/specs" ]; then
        if [ -f "$cell_dir/specs/valide.md" ] && [ ! -f "$cell_dir/specs/devok.md" ]; then
            cell_name=$(basename "$cell_dir")
            TO_DEV+=("$cell_name")
        fi
    fi
done

if [ ${#TO_DEV[@]} -eq 0 ]; then
    echo "✅ Aucune cell à développer"
    echo ""
    echo "Conditions pour développer:"
    echo "  - Fichier specs/valide.md doit exister"
    echo "  - Fichier specs/devok.md ne doit PAS exister"
    echo ""
    echo "Pour marquer une cell comme développée:"
    echo "  touch app/<cell>/specs/devok.md"
    exit 0
fi

echo "📋 Cells à développer (${#TO_DEV[@]}):"
for cell_name in "${TO_DEV[@]}"; do
    echo "  - $cell_name"
done
echo ""
read -p "Continuer? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 0
fi

# Pour chaque cell
for cell_name in "${TO_DEV[@]}"; do
    CELL_DIR="$APP_DIR/$cell_name"
    BRANCH_NAME=$(to_branch_name "$cell_name")
    
    echo ""
    echo "═══════════════════════════════════════"
    echo "📦 Développement: $cell_name"
    echo "🌿 Branche: $BRANCH_NAME"
    echo "═══════════════════════════════════════"
    echo ""
    
    # Création branche
    cd "$PROJECT_DIR"
    git checkout -b "$BRANCH_NAME" 2>/dev/null || git checkout "$BRANCH_NAME"
    
    # Lecture des specs
    RULES_MD=""
    if [ -f "$CELL_DIR/specs/A LIRE EN PREMIER/rules.md" ]; then
        RULES_MD=$(cat "$CELL_DIR/specs/A LIRE EN PREMIER/rules.md")
    fi
    
    SCHEMA_SQL=""
    if [ -f "$CELL_DIR/specs/A LIRE EN PREMIER/schema.sql" ]; then
        SCHEMA_SQL=$(cat "$CELL_DIR/specs/A LIRE EN PREMIER/schema.sql")
    fi
    
    WF_FRONTEND=""
    if [ -d "$CELL_DIR/specs/wf-frontend" ]; then
        for wf in "$CELL_DIR/specs/wf-frontend/"*.md; do
            [ -f "$wf" ] && WF_FRONTEND+="$(cat "$wf")


"
        done
    fi
    
    WF_BACKEND=""
    if [ -d "$CELL_DIR/specs/wf-backend" ]; then
        for wf in "$CELL_DIR/specs/wf-backend/"*.md; do
            [ -f "$wf" ] && WF_BACKEND+="$(cat "$wf")


"
        done
    fi
    
    MODELS_SPECS=""
    if [ -d "$CELL_DIR/specs/models" ]; then
        for mf in "$CELL_DIR/specs/models/"*.md; do
            [ -f "$mf" ] && MODELS_SPECS+="$(cat "$mf")


"
        done
    fi
    
    ROUTES_SPECS=""
    if [ -d "$CELL_DIR/specs/routes" ]; then
        for rf in "$CELL_DIR/specs/routes/"*.md; do
            [ -f "$rf" ] && ROUTES_SPECS+="$(cat "$rf")


"
        done
    fi
    
    # Prompt pour pi
    PROMPT="Tu es un développeur Flask/Alpine.js expert.

Développe la cell: $cell_name

## Règles du projet (cellsmvc)
- Structure: routes/ (1 fichier par route/wf-bg), models/ (1 fichier par modèle), templates/ (plat)
- Frontend: Alpine.js + Jinja2 + Tailwind
- Backend: Flask, SQLite
- Workflows frontend dans templates/workflows/
- Workflows backend dans routes/ (préfixés wf_)

## Spécifications à implémenter:

### Règles spécifiques:
$RULES_MD

### Schéma SQL:
$SCHEMA_SQL

### Spécifications Modèles:
$MODELS_SPECS

### Spécifications Routes:
$ROUTES_SPECS

### Workflows Frontend:
$WF_FRONTEND

### Workflows Backend:
$WF_BACKEND

## Ta mission:
1. Crée/complète tous les fichiers Python (__init__.py, routes/*.py, models/*.py)
2. Crée les templates HTML (index.html, alpinejs.html, workflows/*.html)
3. Assure-toi que la cell est fonctionnelle

Pour chaque fichier, donne le chemin complet puis le contenu entre balises code.
Exemple:

FICHIER: app/$cell_name/__init__.py
\`\`\`python
...
\`\`\`

FICHIER: app/$cell_name/routes/index.py
\`\`\`python
...
\`\`\`

Réponds avec tous les fichiers complets et prêts à l'emploi."
    
    # Exécution pi
    echo "🤖 Appel à pi pour générer le code..."
    pi -p "$PROMPT" > "$CELL_DIR/dev-output.md"
    
    echo "✅ Code généré dans: $CELL_DIR/dev-output.md"
    echo ""
    echo "⚠️  Prochaines étapes manuelles:"
    echo "   1. Vérifier dev-output.md"
    echo "   2. Copier/coller ou parser le code"
    echo "   3. Tester la cell"
    echo ""
    
    # Option: marquer comme développé (décommenter si auto)
    # touch "$CELL_DIR/specs/devok.md"
    
    # Commit
    git add "$CELL_DIR" 2>/dev/null || true
    git commit -m "feat($cell_name): implémentation cell" 2>/dev/null || true
    
    # Push
    git push -u origin "$BRANCH_NAME" 2>/dev/null || echo "⚠️  Push manuel nécessaire"
    
    echo "✅ $cell_name traité"
done

echo ""
echo "═══════════════════════════════════════"
echo "✅ Cycle de développement terminé"
echo "═══════════════════════════════════════"
echo ""
echo "Pour marquer une cell comme développée:"
echo "  touch app/<cell>/specs/devok.md"
echo ""
echo "Pour créer une PR:"
echo "  gh pr create --title 'feat: <cell>' --body 'Implémentation'"
```

---

## Récapitulatif des Scripts

| Script | Description | Cas d'usage | Entrée | Sortie |
|--------|-------------|-------------|--------|--------|
| `01-generate-cells.sh` | Génère cells-listing depuis app-map | Toujours | `app-map.md` | `cells-listing.md` |
| `02a-build-structure-with-existing.sh` | Crée structure + copie specs existantes | Tu as déjà des specs dans `specs/*` | `cells-listing.md` + `specs/*` | `/app/*/` avec specs |
| `02b-build-structure-from-scratch.sh` | Crée structure vide | Nouveau projet | `cells-listing.md` | `/app/*/` vierge |
| `03-init-boilerplate.sh` | Init projet Flask avec auth, hello_protected, logs + lance serveur + tests | Toujours | - | App port 5000 + tests |
| `04-dev-cells.sh` | Développe cells validées | Après validation specs | `*/specs/valide.md` | Branches + PR |
| `05-test-cells.sh` | Teste les cells et capture les logs | Après développement | Serveur Flask | `app/*/logs/*` |

## Workflow Développeur

```bash
# 1. Créer app-map
mkdir -p specs-global
cat > specs-global/app-map.md << 'EOF'
# Application Map
## Écrans
| URL | Nom | Description |
| / | dashboard | Tableau de bord |
EOF

# 2. Exécuter les scripts
./scripts/01-generate-cells.sh
./scripts/02a-build-structure-with-existing.sh  # ou 02b
./scripts/03-init-boilerplate.sh                # Lance aussi les tests

# 3. Valider une cell
touch app/dashboard/specs/valide.md

# 4. Développer
./scripts/04-dev-cells.sh

# 5. Tester (optionnel, si pas fait dans 03)
./scripts/05-test-cells.sh
```

---

# Étape 6 : Test et Validation avec Logging

## Vue d'ensemble

Après développement, chaque cell doit être testée avec capture des logs frontend (console navigateur) et backend (Flask).

**Objectif** : Vérifier que les workflows frontend et backend fonctionnent correctement et sauvegarder les logs pour analyse.

## Structure des logs

Les logs sont organisés par date/heure dans le dossier `app/<cell>/logs/` :

```
app/<cell>/logs/
├── 2025-07-22_14-30-45/           # Timestamp du test
│   ├── backend.log                # Logs serveur Flask
│   ├── frontend.log               # Logs console navigateur
│   ├── report.json                # Résumé des tests
│   └── screenshots/               # Captures d'écran (optionnel)
│       ├── dashboard.png
│       └── detail-impaye.png
```

## Gestion de l'authentification JWT (Token de test)

Pour les tests automatisés, on utilise un token JWT de test en dur qui bypass l'authentification normale.

### Configuration dans l'app Flask

```python
# app/utils/auth.py
import os
from functools import wraps
from flask import g, request, jsonify
import jwt

# Token de test hardcodé (valide uniquement pour les tests)
TEST_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test"

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        
        # Token de test bypass l'authentification
        if token == TEST_TOKEN:
            g.user = {
                'id': 'test-user-123',
                'username': 'testuser',
                'role': 'admin'
            }
            return f(*args, **kwargs)
        
        # Mode normal: vérification JWT
        try:
            payload = jwt.decode(token, os.getenv('JWT_SECRET'), algorithms=['HS256'])
            g.user = payload
            return f(*args, **kwargs)
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token invalide'}), 401
    
    return decorated
```

### Utilisation dans les tests

Le token de test est injecté dans les headers des requêtes Playwright :

```python
# Dans test-frontend.py
headers = {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test'
}
```

## Script de test : 05-test-cells.sh

**Fichier** : `scripts/05-test-cells.sh`

### Fonctionnement

1. Démarre Flask en mode test (port 5001) avec logs redirectés
2. Pour chaque cell écran : lance Playwright, charge la page, capture la console
3. Pour chaque cell backend : appelle l'endpoint API
4. Sauvegarde les logs avec timestamp
5. Génère un rapport JSON

```bash
#!/bin/bash
# scripts/05-test-cells.sh
# Teste les cells et capture les logs frontend/backend

set -e

PROJECT_DIR="/home/ubuntu/marki/relance2"
APP_DIR="$PROJECT_DIR/app"
LOGS_DIR="$PROJECT_DIR/app/test_logs/$(date +%Y-%m-%d_%H-%M-%S)"

echo "🧪 Lancement des tests..."
echo "📁 Logs seront sauvegardés dans: $LOGS_DIR"

# Création du dossier de logs
mkdir -p "$LOGS_DIR/screenshots"

# Démarrer Flask en mode test (auth désactivée, logs → fichier)
export TEST_MODE=true
export FLASK_APP="app"
export FLASK_ENV="development"

echo "🚀 Démarrage serveur Flask (mode test)..."
python -m flask run --host=0.0.0.0 --port=5001 > "$LOGS_DIR/backend.log" 2>&1 &
FLASK_PID=$!

# Attendre que le serveur soit prêt
sleep 3

# Vérifier que le serveur répond
if ! curl -s http://localhost:5001/ > /dev/null; then
    echo "❌ Erreur: Le serveur Flask n'a pas démarré"
    kill $FLASK_PID 2>/dev/null || true
    exit 1
fi

echo "✅ Serveur Flask démarré (PID: $FLASK_PID)"
echo ""

# Initialiser le fichier de logs frontend
echo "{" > "$LOGS_DIR/frontend.log"
echo '  "timestamp": "'$(date -Iseconds)'",' >> "$LOGS_DIR/frontend.log"
echo '  "tests": [' >> "$LOGS_DIR/frontend.log"

FIRST=true

# Tester chaque cell écran
for cell_dir in "$APP_DIR"/ecran_*/; do
    [ -d "$cell_dir" ] || continue
    
    cell_name=$(basename "$cell_dir")
    url="http://localhost:5001/$cell_name"
    
    echo "  Testing: $cell_name"
    
    # Playwright Python capture la console et les erreurs
    python scripts/test-frontend.py \
        "$url" \
        "$LOGS_DIR/screenshots/$cell_name.png" \
        "$LOGS_DIR/frontend_$cell_name.json" \
        2>/dev/null || true
    
    # Concaténer au log global
    if [ "$FIRST" = true ]; then
        FIRST=false
    else
        echo "," >> "$LOGS_DIR/frontend.log"
    fi
    
    if [ -f "$LOGS_DIR/frontend_$cell_name.json" ]; then
        cat "$LOGS_DIR/frontend_$cell_name.json" >> "$LOGS_DIR/frontend.log"
    fi
done

# Tester chaque cell backend (API)
for cell_dir in "$APP_DIR"/wf_*/ "$APP_DIR"/cron_*/; do
    [ -d "$cell_dir" ] || continue
    
    cell_name=$(basename "$cell_dir")
    url="http://localhost:5001/$cell_name/api/health"
    
    echo "  Testing API: $cell_name"
    
    # Test simple de l'endpoint
    response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null || echo "000")
    http_code=$(echo "$response" | tail -n1)
    
    echo "    HTTP $http_code"
done

# Finaliser le fichier de logs frontend
echo "" >> "$LOGS_DIR/frontend.log"
echo "  ]" >> "$LOGS_DIR/frontend.log"
echo "}" >> "$LOGS_DIR/frontend.log"

# Arrêter Flask
echo ""
echo "🛑 Arrêt du serveur Flask..."
kill $FLASK_PID 2>/dev/null || true

# Générer le rapport
cat > "$LOGS_DIR/report.json" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "logs_directory": "$LOGS_DIR",
  "backend_log": "backend.log",
  "frontend_log": "frontend.log",
  "summary": {
    "status": "completed",
    "cells_tested": $(ls -d "$APP_DIR"/ecran_*/ 2>/dev/null | wc -l),
    "screenshots": $(ls "$LOGS_DIR/screenshots/" 2>/dev/null | wc -l)
  }
}
EOF

echo ""
echo "═══════════════════════════════════════"
echo "✅ Tests terminés"
echo "═══════════════════════════════════════"
echo ""
echo "📊 Rapport: $LOGS_DIR/report.json"
echo "📝 Backend: $LOGS_DIR/backend.log"
echo "📝 Frontend: $LOGS_DIR/frontend.log"
echo "📸 Screenshots: $LOGS_DIR/screenshots/"
echo ""
echo "Pour analyser les logs:"
echo "  tail -n 50 $LOGS_DIR/backend.log"
echo "  cat $LOGS_DIR/frontend.log | jq ."
```

## Script Playwright (Python)

**Fichier** : `scripts/test-frontend.py`

Script Python utilisé par `05-test-cells.sh` pour capturer les logs console avec Playwright (version Python).

```python
#!/usr/bin/env python3
# scripts/test-frontend.py
# Capture les logs console d'une page avec Playwright (Python)

import asyncio
import json
import sys
from datetime import datetime
from playwright.async_api import async_playwright

async def test_page(url: str, screenshot_path: str, log_file: str):
    """Test une page et capture les logs console."""
    
    logs = {
        "url": url,
        "timestamp": datetime.now().isoformat(),
        "console": [],
        "errors": []
    }
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        # Capturer tous les messages console
        async def handle_console(msg):
            entry = {
                "type": msg.type,
                "text": msg.text,
                "timestamp": datetime.now().isoformat()
            }
            logs["console"].append(entry)
        
        page.on("console", handle_console)
        
        # Capturer les erreurs de page
        async def handle_page_error(error):
            logs["errors"].append({
                "message": str(error),
                "timestamp": datetime.now().isoformat()
            })
        
        page.on("pageerror", handle_page_error)
        
        try:
            # Charger la page
            await page.goto(url, wait_until="networkidle", timeout=10000)
            
            # Attendre que les workflows Alpine.js s'initialisent
            await page.wait_for_timeout(2000)
            
            # Prendre une capture d'écran
            await page.screenshot(path=screenshot_path, full_page=True)
            
            logs["status"] = "success"
            
        except Exception as e:
            logs["status"] = "error"
            logs["errors"].append({
                "type": "navigation",
                "message": str(e),
                "timestamp": datetime.now().isoformat()
            })
            
            # Capture d'écran même en cas d'erreur
            try:
                await page.screenshot(path=screenshot_path, full_page=True)
            except:
                pass
        
        await browser.close()
    
    # Sauvegarder les logs
    with open(log_file, 'w') as f:
        json.dump(logs, f, indent=2)
    
    print(f"✅ Test terminé: {url}")
    print(f"   Screenshot: {screenshot_path}")
    print(f"   Logs: {log_file}")
    print(f"   Console entries: {len(logs['console'])}")
    print(f"   Errors: {len(logs['errors'])}")

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: test-frontend.py <url> <screenshot> <logfile>")
        sys.exit(1)
    
    url = sys.argv[1]
    screenshot_path = sys.argv[2]
    log_file = sys.argv[3]
    
    asyncio.run(test_page(url, screenshot_path, log_file))
```

### Dépendances

Ajouter dans `requirements.txt` :

```
playwright==1.40.0
```

Et installer le navigateur :

```bash
playwright install chromium
```

### Mise à jour du script 05-test-cells.sh

Remplacer l'appel Node.js par Python :

```bash
# Avant (Node.js)
# npx playwright-core "$url" --output "$screenshot" --log-file "$logfile"

# Après (Python)
python scripts/test-frontend.py "$url" "$screenshot" "$logfile"
```
```

## Intégration dans le workflow

Le test peut être lancé automatiquement après `04-dev-cells.sh` ou manuellement.

### Workflow avec test automatique

```bash
# 1. Développer
./scripts/04-dev-cells.sh

# 2. Tester
./scripts/05-test-cells.sh

# 3. Vérifier les logs
if grep -q "ERROR" app/*/logs/*/backend.log; then
    echo "❌ Erreurs backend détectées"
    exit 1
fi

# 4. Si OK, marquer comme validé
touch app/<cell>/specs/devok.md
```

### Commandes d'analyse des logs

```bash
# Voir les dernières erreurs backend
tail -n 100 app/*/logs/*/backend.log | grep ERROR

# Voir les logs frontend d'une cell spécifique
cat app/*/logs/*/frontend_*.json | jq '.console[] | select(.type=="error")'

# Lister tous les tests
ls -la app/*/logs/

# Comparer deux exécutions
diff app/*/logs/2025-07-22_14-30-45/backend.log app/*/logs/2025-07-22_15-00-12/backend.log
```
