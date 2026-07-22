# Règles de Développement - Cell-Based MVC

> Document extrait de `specs-global/rules/cellsmvc.md`
> Version condensée des règles essentielles pour le développement.

---

## 🎯 RÈGLES D'OR

### RÈGLE D'OR 1 : Processus de Développement (2 Phases)

**Phase 1 : Spécifications (Obligatoire)**
- Pas de développement en dehors de `specs/` sans fichier **`valide.md`** présent
- Toutes les specs dans `specs/` uniquement des fichiers `.md` sauf `mockups/` (HTML)

**Phase 2 : Développement**
- Une fois `valide.md` présent : développer routes, modèles, templates, workflows

### RÈGLE D'OR 2 : Typage des fichiers dans specs/

| Dossier | Extension autorisée | Interdit |
|---------|---------------------|----------|
| `specs/` | `.md` | Tout autre format |
| `specs/LIRE_EN_PREMIER/` | `.md`, `.sql` | - |
| `specs/mockups/` | `.html` | `.md`, `.js`, `.css` |
| `specs/wf-frontend/` | `.md` | `.html`, `.js` |
| `specs/wf-backend/` | `.md` | `.html`, `.js` |
| `specs/models/` | `.md` | Tout autre format |
| `specs/routes/` | `.md` | Tout autre format |

### RÈGLE D'OR 3 : Pas d'ORM

**PAS D'ORM.** Utiliser uniquement `sqlite3` du standard library Python avec des requêtes SQL brutes.

### RÈGLE D'OR 4 : Mockups PIXELS PERFECT

**LES MOCKUPS SONT PIXELS PERFECT. PAS D'IMPROVISATION.**

- Les mockups HTML dans `specs/mockups/` doivent correspondre EXACTEMENT aux specs visuelles
- Pas de modification arbitraire des couleurs, tailles, espacements, ou typographie
- Pas d'ajout de fonctionnalités non prévues dans les specs
- Respect strict du styleguide (couleurs Tailwind, tailles de police, marges)
- Les états des mockups doivent être fidèles aux workflows définis

### RÈGLE D'OR 5 : Pas d'Installation de Composants Externes

**LE `requirements.txt` NE BOUGE PAS.**

- **Interdiction stricte** d'ajouter de nouvelles dépendances Python
- Pas de `pip install`, pas de modification du `requirements.txt`
- Pas de nouvelles librairies externes (sauf mention contraire explicite)
- Utiliser **uniquement** les dépendances existantes du projet
- Si une fonctionnalité nécessite une librairie externe → la réimplémenter en interne ou utiliser la stdlib

### RÈGLE D'OR 6 : Pas de Flask-CORS

**PAS DE FLASK-CORS.** Le projet n'utilise pas et n'accepte pas l'extension Flask-CORS.

- **Interdiction stricte** d'ajouter `flask-cors` aux dépendances
- Pas de `CORS(app)` ou de configuration CORS via cette librairie
- Gérer les headers CORS manuellement si nécessaire, ou s'assurer que frontend et backend sont sur la même origine
- Cette règle renforce la RÈGLE D'OR 5 (pas de composants externes)

---

## 📁 Structure d'une Cell

### Types de Cells

| Type | Définition | Dossier |
|------|------------|---------|
| **Cell Écran** | Page web complète avec UI | `app/screens/<nom>/` |
| **Cell Backend** | API endpoint sans UI | `app/backend-wf/<nom>/` |
| **Cell Cron** | Tâche planifiée | `app/cron/<nom>/` |

### Structure Commune

```
app/<type>/<nom_cell>/
├── __init__.py
├── routes/                     # 1 fichier par route ET workflow backend
│   ├── __init__.py
│   ├── index.py
│   └── wf_<nom>.py
├── models/                     # 1 fichier par modèle
│   ├── __init__.py
│   └── <modele>.py
├── logs/                       # Logs de test
└── specs/
    ├── valide.md               # REQUIS pour passer au dev
    ├── LIRE_EN_PREMIER/
    │   ├── schema.sql          # Schéma marki.db
    │   └── rules.md            # Règles spécifiques
    ├── models/                 # Specs modèles
    ├── routes/                 # Specs routes
    └── wf-backend/             # Specs workflows backend

# UNIQUEMENT pour les ÉCRANS :
├── templates/                  # STRUCTURE PLATE
│   ├── index.html
│   ├── alpinejs.html
│   └── workflows/
└── specs/
    ├── mockups/                # HTML uniquement
    └── wf-frontend/              # Markdown uniquement
```

---

## 💻 Technologies

| Couche | Technologie | Interdit |
|--------|-------------|----------|
| Backend | Flask + Python | Django, FastAPI |
| Frontend JS | Alpine.js 3.x | React, Vue, Angular, Vanilla JS |
| Templating | Jinja2 | React JSX, Vue SFC |
| Styling | Tailwind CSS | Bootstrap, Material UI |
| Database | SQLite3 (stdlib) | PostgreSQL, MySQL, **SQLAlchemy**, **Tout ORM** |
| HTTP Client | Fetch API | Axios, jQuery |

---

## 🏗️ Conventions de Nommage

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
- Fichiers mockup : `etat-descriptif.html`

### Modèles Python
- Classe : `PascalCase`, ex: `class Contact:`
- Méthodes : `snake_case`, ex: `def get_by_id():`
- Fichiers : `snake_case.py`, ex: `contact.py`

---

## 🗄️ Base de Données (sqlite3 pur)

### SEUL LIEN PARTAGÉ entre cells

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

### Pattern Modèle (sans ORM)

```python
# models/contact.py
from typing import Optional, List
from app.data import get_db


class Contact:
    """Modèle Contact - sqlite3 pur."""
    
    def __init__(self, id: str, nom: str, email: str, ...):
        self.id = id
        self.nom = nom
        self.email = email
        # ...
    
    @classmethod
    def from_row(cls, row: tuple) -> Optional['Contact']:
        """Crée un Contact depuis une ligne sqlite3."""
        if not row:
            return None
        return cls(*row)
    
    @classmethod
    def get_by_id(cls, contact_id: str) -> Optional['Contact']:
        """Récupère un contact par ID."""
        db = get_db()
        cursor = db.execute(
            "SELECT id, nom, email, ... FROM contacts WHERE id = ?",
            (contact_id,)
        )
        return cls.from_row(cursor.fetchone())
    
    @classmethod
    def create(cls, nom: str, email: str, ...) -> 'Contact':
        """Crée un nouveau contact."""
        contact_id = generate_id()  # UUID ou autre
        db = get_db()
        db.execute(
            "INSERT INTO contacts (id, nom, email, ...) VALUES (?, ?, ?, ...)",
            (contact_id, nom, email, ...)
        )
        db.commit()
        return cls.get_by_id(contact_id)
    
    def to_dict(self) -> dict:
        """Convertit en dict pour JSON."""
        return {
            'id': self.id,
            'nom': self.nom,
            'email': self.email,
            # ...
        }
```

### Pattern Modèle AuthModel (pour l'authentification)

Quand le modèle nécessite des opérations complexes (auth, validation, tokens), on sépare la dataclass `User` de la classe `AuthModel` qui contient la logique métier :

```python
# models/auth.py
import sqlite3
from flask import current_app

class AuthError(Exception):
    """Exception pour les erreurs d'auth."""
    pass

class User:
    """Dataclass simple."""
    def __init__(self, user_id, username, email, role='user'):
        self.id = user_id
        self.username = username
        self.email = email
        self.role = role
    
    def to_dict(self):
        return {'id': self.id, 'username': self.username, 'email': self.email, 'role': self.role}

class AuthModel:
    """Logique métier d'authentification."""
    
    @staticmethod
    def get_db():
        db_path = current_app.config['DATABASE']
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    @classmethod
    def authenticate(cls, username, password):
        """Retourne {'user': User, 'token': str} ou lève AuthError."""
        db = cls.get_db()
        row = db.execute(
            "SELECT * FROM users WHERE username = ? AND is_active = 1",
            (username,)
        ).fetchone()
        db.close()
        
        if not row or row['password'] != password:
            raise AuthError("Identifiants invalides")
        
        user = User(row['id'], row['username'], row.get('email'), row.get('role', 'user'))
        token = generate_token(user.id, user.username, user.role)
        return {'user': user, 'token': token}
```

---

## 🎨 Templates (Vue)

### Structure PLATE (pas de sous-dossier `<nom-cell>/`)

```
templates/
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

### Template Alpine.js Standard

```html
<!-- templates/alpinejs.html -->
<script>
    // Logger global
    const log = {
        debug: (event, data) => console.log(`[DEBUG][${event}]`, JSON.stringify(data)),
        info: (event, data) => console.log(`[INFO][${event}]`, JSON.stringify(data)),
        warn: (event, data) => console.warn(`[WARN][${event}]`, JSON.stringify(data)),
        error: (event, data) => console.error(`[ERROR][${event}]`, JSON.stringify(data))
    };

    document.addEventListener("alpine:init", () => {
        Alpine.data("cellName", () => ({
            // 1. PROPS RÉACTIVES
            loading: false,
            saving: false,
            error: null,
            data: [],
            selected: null,

            // Helpers
            formatDate(dateStr) {
                if (!dateStr) return "-";
                return new Date(dateStr).toLocaleDateString("fr-FR");
            },

            // 2. INIT (depuis workflow-init.html)
            {% include "workflows/workflow-init.html" %},

            // 3. WORKFLOWS MÉTIER
            // {% include "workflows/load-data.html" %},
        }));
    });
</script>
```

---

## 🔌 Routes (Controller)

### Structure minimale

```python
# __init__.py
from flask import Blueprint

bp = Blueprint('<nom_cell>', __name__, template_folder='templates')

from .routes import index, wf_<nom>
from .models import <Modele>
```

```python
# routes/index.py
from flask import render_template
from .. import bp

@bp.route('/<nom_cell>')
def index():
    """Rend la page principale."""
    return render_template('index.html')
```

```python
# routes/wf_<nom>.py
from flask import jsonify, request
from .. import bp
from ..models.<modele> import <Modele>

@bp.route('/api/<action>', methods=['POST'])
def wf_<nom>():
    """Workflow backend."""
    data = request.get_json()
    
    # Logique métier
    result = <Modele>.<action>(data)
    
    return jsonify(result)
```

---

## ✅ Checklist de Création d'une Nouvelle Cell

### 1. Déterminer le type
- [ ] **Écran** → `app/screens/<nom_cell>/`
- [ ] **Workflow Backend** → `app/backend-wf/<nom_cell>/`
- [ ] **Cron** → `app/cron/<nom_cell>/`

### 2. Créer la structure
- [ ] `__init__.py`, `routes/` (1 fichier par route ET workflow backend)
- [ ] `models/` (1 fichier par modèle)
- [ ] `logs/` (dossier pour les logs de test)
- [ ] **Écrans uniquement** : `templates/` (structure PLATE)

### 3. Créer le dossier `specs/`
- [ ] `valide.md` (OBLIGATOIRE pour passer au dev)
- [ ] `LIRE_EN_PREMIER/schema.sql` (copie du schéma global)
- [ ] `LIRE_EN_PREMIER/rules.md` (copie des règles)
- [ ] `wf-backend/` (Markdown)
- [ ] `models/` (spécifications)
- [ ] `routes/` (spécifications)
- [ ] **Écrans uniquement** : `mockups/` (HTML) + `wf-frontend/` (Markdown)

### 4. Développement
- [ ] Enregistrer le blueprint dans `app/__init__.py`
- [ ] Vérifier que la DB est accessible via `get_db()`
- [ ] Tester l'endpoint racine du blueprint
- [ ] Créer `devok.md` quand c'est fini

---

## 🔄 Autonomie des Cells

### Chaque blueprint est TOTATEMENT AUTONOME pour :

1. **Ses routes** : Définies dans `routes/`
2. **Ses modèles** : Définis dans `models/`
3. **Ses templates** : Dans `templates/` (structure plate)
4. **Ses workflows frontend** : Dans `templates/workflows/`
5. **Ses workflows backend** : Dans `routes/` + `specs/wf-backend/`
6. **Ses spécifications** : Dans `specs/`

### SEUL LIEN PARTAGÉ :

```python
from app.data import get_db
```

---

## 📝 Exemple Complet Minimal

### Écran "contact_list"

```python
# app/screens/contact_list/__init__.py
from flask import Blueprint

bp = Blueprint('contact_list', __name__, template_folder='templates')

from .routes import index, api_contacts
from .models.contact import Contact
```

```python
# app/screens/contact_list/routes/index.py
from flask import render_template
from .. import bp

@bp.route('/contact-list')
def index():
    return render_template('index.html')
```

```python
# app/screens/contact_list/routes/api_contacts.py
from flask import jsonify
from .. import bp
from ..models.contact import Contact

@bp.route('/api/contacts')
def api_contacts():
    contacts = Contact.get_all()
    return jsonify([c.to_dict() for c in contacts])
```

```python
# app/screens/contact_list/models/contact.py
from typing import Optional, List
from app.data import get_db


class Contact:
    def __init__(self, id: str, nom: str, email: str):
        self.id = id
        self.nom = nom
        self.email = email
    
    @classmethod
    def from_row(cls, row: tuple) -> Optional['Contact']:
        if not row:
            return None
        return cls(row[0], row[1], row[2])
    
    @classmethod
    def get_all(cls) -> List['Contact']:
        db = get_db()
        cursor = db.execute("SELECT id, nom, email FROM contacts")
        return [cls.from_row(row) for row in cursor.fetchall()]
    
    def to_dict(self) -> dict:
        return {'id': self.id, 'nom': self.nom, 'email': self.email}
```

```html
<!-- templates/index.html -->
<!DOCTYPE html>
<html>
<head>
    <title>Contacts</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
</head>
<body x-data="contactList" x-init="init()">
    <h1>Contacts</h1>
    <ul>
        <template x-for="contact in contacts" :key="contact.id">
            <li x-text="contact.nom"></li>
        </template>
    </ul>
    {% include 'alpinejs.html' %}
</body>
</html>
```

```html
<!-- templates/alpinejs.html -->
<script>
document.addEventListener('alpine:init', () => {
    Alpine.data('contactList', () => ({
        contacts: [],
        
        async init() {
            const response = await fetch('/contact-list/api/contacts');
            this.contacts = await response.json();
        }
    }));
});
</script>
```

---

*Pour les détails complets des workflows, voir `specs-global/rules/cellsmvc.md`*
