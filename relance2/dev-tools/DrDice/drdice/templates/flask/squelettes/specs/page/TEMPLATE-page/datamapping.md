# Data Mapping - Page {cell_name}

Document de mapping des données pour la page {cell_name} (Flask + SQLite + Alpine.js).

> **🌐 URL de test** : `https://dev2.markidiags.com/{cell_name}`
> 
> **URL locale** : `http://localhost:5000` (développement local)

---

## Architecture des Flux de Données (Blueprint par Cell)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    STRUCTURE BLUEPRINT FLASK                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  app/                                                                   │
│  ├── __init__.py              ← Enregistre les blueprints              │
│  ├── screens/                                                           │
│  │   └── {cell_name}/          ← CHAQUE CELL = 1 DOSSIER               │
│  │       ├── __init__.py       ← Blueprint: {cell_name}_bp             │
│  │       ├── routes.py         ← Routes API liées au blueprint         │
│  │       ├── models.py         ← Modèles SQLAlchemy                  │
│  │       ├── templates/                                                   │
│  │       │   └── {cell_name}/                                               │
│  │       │       └── index.html                                            │
│  │       └── static/                                                      │
│  │           └── js/main.js                                               │
│  └── templates/                                                           │
│      └── base.html           ← Template global                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Flux de données dans le Blueprint:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Browser    │────▶│   Alpine.js  │────▶│   Blueprint  │
│   (User)     │◄────│   (main.js)  │◄────│   routes.py  │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                                                  ▼
                                         ┌──────────────┐
                                         │   SQLAlchemy │
                                         │   models.py  │
                                         └──────┬───────┘
                                                │
                                                ▼
                                         ┌──────────────┐
                                         │   SQLite DB  │
                                         └──────────────┘
```

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          PAGE {CELL_NAME}                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌──────────────┐      ┌──────────────┐      ┌──────────────┐       │
│   │    User      │      │   Alpine.js  │      │  Flask API   │       │
│   │   (Browser)  │◄────►│    State     │◄────►│   (Python)   │       │
│   └──────────────┘      └──────┬───────┘      └──────┬───────┘       │
│                                │                     │               │
│                                │     ┌──────────────┐│               │
│                                │     │  Workflows   ││               │
│                                │     │   (fetch)    ││               │
│                                │     └──────────────┘│               │
│                                │                     │               │
│                                ▼                     ▼               │
│                         ┌──────────────────────────────────┐        │
│                         │          SQLite DB               │        │
│                         │   (Table: {cell_name}s)            │        │
│                         └──────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Table de Data Mapping

### Flux : Chargement Initial

| Couche | Champ | Type | Source | Destination | Transformation | Notes |
|--------|-------|------|--------|-------------|----------------|-------|
| HTML | `input` | string | User | Alpine `form.*` | `x-model` | Binding bi-directionnel |
| Alpine | `form.*` | Object | State | Workflow params | Passage direct | - |
| Workflow | `params.*` | Object | Alpine | API Request | `JSON.stringify()` | POST/PUT |
| API | `request.json` | JSON | HTTP Body | SQLAlchemy | Validation | WTForms/marshmallow |
| SQLAlchemy | `Model.*` | Types SQL | Python | SQLite | ORM Mapping | Colonnes DB |
| SQLite | `table.*` | SQL | SQLAlchemy | Disk | Persistence | Index si besoin |
| API | `model.to_dict()` | dict | SQLAlchemy | JSON Response | Sérialisation | `jsonify()` |
| Workflow | `result.data` | JSON | API | Alpine State | `response.json()` | Parsing |
| Alpine | `items[]` | Array | Workflow | Template | `x-for` | Rendu liste |
| HTML | `{{ item.* }}` | string | Alpine | DOM | Interpolation | Affichage |

---

## Mapping Détaillé par Entité

### Entité : {CellName}

#### Modèle SQLAlchemy (Backend)
```python
class {CellName}(db.Model):
    __tablename__ = '{cell_name}s'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    # ... autres champs
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            # ...
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
```

#### Mapping Colonnes

| Colonne SQLite | Type SQL | Type Python | Type JSON | Validation | Notes |
|----------------|----------|-------------|-----------|------------|-------|
| `id` | INTEGER | int | number | Auto-incrément | PK |
| `name` | VARCHAR(100) | str | string | `nullable=False` | Index ? |
| `created_at` | TIMESTAMP | datetime | string (ISO) | `default=utcnow` | Format ISO |

#### Réponse API Standard
```json
// GET /api/{cell_name}s
{
  "data": [
    {
      "id": 1,
      "name": "...",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 10,
  "pages": 2
}

// GET /api/{cell_name}s/1
{
  "data": {
    "id": 1,
    "name": "...",
    "created_at": "2024-01-15T10:30:00Z"
  }
}

// Erreur 400
{
  "error": "Validation failed",
  "field_errors": {
    "name": "Ce champ est obligatoire"
  }
}
```

---

## State Alpine.js (Frontend)

### État Global de la Page
```javascript
// Dans main.js - Alpine.data('{cell_name}Page')
{
    // Données
    items: [],           // Liste des {cell_name}s
    currentItem: null,   // Item en cours d'édition
    form: {              // Formulaire
        name: '',
        // ...
    },
    
    // UI State
    isLoading: false,    // Chargement en cours
    error: null,         // Message d'erreur
    fieldErrors: {},     // Erreurs par champ
    
    // Pagination (si applicable)
    pagination: {
        page: 1,
        perPage: 10,
        total: 0
    }
}
```

### Mapping State ↔ Template
| State Alpine | Binding | Template |
|--------------|---------|----------|
| `items` | `x-for="item in items"` | Liste/galerie |
| `isLoading` | `x-show="isLoading"` | Spinner/skeleton |
| `error` | `x-text="error"` | Alert error |
| `form.name` | `x-model="form.name"` | Input text |
| `currentItem.id` | `:class` conditionnel | État édition |

---

## Workflows et Flux

### Workflow : initial-load
```
Alpine.init() 
    → runWorkflow('initial-load')
    → fetch GET /api/{cell_name}s
    → SQLAlchemy query.all()
    → JSON response
    → items = result.data
    → x-for rendering
```

### Workflow : save
```
User submit form
    → Validation Alpine (optionnel)
    → runWorkflow('save', {data: form, id: editingId})
    → fetch POST/PUT /api/{cell_name}s
    → SQLAlchemy session.add()/commit()
    → JSON response
    → loadInitialData() (refresh)
    → items updated
```

---

## Gestion des Erreurs

| Erreur | Source | Code HTTP | Mapping Frontend |
|--------|--------|-----------|------------------|
| Validation | Flask/WTF | 400 | `fieldErrors = result.field_errors` |
| Not Found | SQLAlchemy | 404 | `error = "Élément non trouvé"` |
| Auth | Flask-Login | 401 | Redirect `/login` |
| Permission | Decorator | 403 | `error = "Permission refusée"` |
| Server | Exception | 500 | `error = "Erreur serveur"` |

---

## Diagramme de Flux Complet

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │ Saisie formulaire
       ▼
┌─────────────┐
│   Alpine    │◄──────────────────┐
│    State    │                   │
└──────┬──────┘                   │
       │ x-model                   │
       ▼                          │
┌─────────────┐                   │
│   Workflow  │                   │
│   execute() │                   │
└──────┬──────┘                   │
       │ fetch()                  │
       ▼                          │
┌─────────────┐                   │
│   Flask     │                   │
│    Route    │                   │
└──────┬──────┘                   │
       │                        │
       ▼                        │
┌─────────────┐   Erreur       │
│  Validation │───────────────►│
└──────┬──────┘                │
       │ OK                    │
       ▼                     │
┌─────────────┐                │
│ SQLAlchemy  │                │
│   CRUD      │                │
└──────┬──────┘                │
       │                        │
       ▼                        │
┌─────────────┐                │
│   SQLite    │                │
└─────────────┘                │
       │                        │
       ▼                        │
┌─────────────┐                │
│  Response   │────────────────┘
│    JSON     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Alpine    │
│   Update    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    DOM      │
│  Rendered   │
└─────────────┘
```

---

## Optimisations et Bonnes Pratiques

| Optimisation | Où | Comment |
|--------------|-----|---------|
| Lazy loading | Alpine | `x-intersect` pour charger au scroll |
| Debounce | Workflow | Délai sur la saisie recherche |
| Cache | localStorage | Stockage temporaire des données |
| Pagination | API | `?page=1&per_page=10` |
| Index DB | SQLite | Index sur colonnes filtrées |

---

## Fichiers Concernés (Structure Blueprint)

| Couche | Fichier | Description |
|--------|---------|-------------|
| **Blueprint** | `app/screens/{cell_name}/__init__.py` | Blueprint: `{cell_name}_bp` |
| **Routes** | `app/screens/{cell_name}/routes.py` | Routes API liées au blueprint |
| **Modèles** | `app/screens/{cell_name}/models.py` | SQLAlchemy models (table: `{cell_name}s`) |
| **Template** | `app/screens/{cell_name}/templates/{cell_name}/index.html` | Jinja2 template |
| **Main JS** | `app/screens/{cell_name}/static/js/main.js` | Alpine.js app |
| **Workflows** | `app/screens/{cell_name}/workflows/*.js` | Business logic workflows |
| **Global** | `app/templates/base.html` | Template de base hérité |
| **Test** | `https://dev2.markidiags.com/{cell_name}` | URL de test |

### Enregistrement du Blueprint

Dans `app/__init__.py`, le blueprint est automatiquement chargé:

```python
from app.screens.{cell_name} import {cell_name}_bp
app.register_blueprint({cell_name}_bp)
```

### URLs générées

| Route Flask | URL |
|-------------|-----|
| `@{cell_name}_bp.route("/")` | `/{cell_name}/` |
| `@{cell_name}_bp.route("/api/{cell_name}s")` | `/{cell_name}/api/{cell_name}s` |
| `@{cell_name}_bp.route("/api/{cell_name}s/<id>")` | `/{cell_name}/api/{cell_name}s/<id>` |
