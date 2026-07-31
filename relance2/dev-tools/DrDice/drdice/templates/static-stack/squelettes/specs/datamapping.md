# Instructions IA - Génération de Data Mapping

> **Pour l'IA**: Ce document est un guide pour générer des fichiers `datamapping.md` spécifiques à chaque page.
> 
> **Objectif**: Créer un document de mapping des données entre SQLite (backend) et Alpine.js (frontend) via Flask API.
> 
> **🌐 URL de test** : `https://dev2.markidiags.com` - Environnement de validation pour toutes les pages développées.

---

## 🎯 Mission

Générer un fichier `datamapping.md` dans le dossier `.specs/page/{cell_name}/` qui documente le flux complet des données:

```
SQLite ←→ SQLAlchemy ←→ Flask API ←→ Alpine.js (State) ←→ DOM
```

---

## 📋 Sources à Analyser

Avant de générer le datamapping, lire:

1. **`.specs/page/{cell_name}/page-specs.md`** - Comprendre les use cases et workflows
2. **`models/{cell_name}.py`** - Structure SQLAlchemy (si existe)
3. **`routes/{cell_name}.py`** - Endpoints API (si existe)
4. **`.specs/page/{cell_name}/mockups/*.html`** - Structure UI et bindings Alpine

---

## 🏗️ Structure du Document à Générer

Le fichier généré doit suivre cette structure exacte:

```markdown
# Data Mapping - Page {cell_name}

## Architecture des Flux de Données
[Diagramme ASCII de la page spécifique]

## Table de Data Mapping Global
[Tableau avec toutes les couches]

## Mapping Détaillé par Entité
### Entité: {NomEntite}
[Code SQLAlchemy + tableaux de mapping]

## State Alpine.js
[Structure du state avec types]

## Workflows et Flux
[Diagrammes séquentiels des workflows]

## Gestion des Erreurs
[Tableau mapping erreurs HTTP → UI]

## Optimisations
[Si applicable]

## Fichiers Concernés
[Liens vers les vrais fichiers du projet]
```

---

## 📊 Tableau de Data Mapping Obligatoire

Générer ce tableau avec les vraies données du projet:

| Couche | Champ | Type | Source | Destination | Transformation | Notes |
|--------|-------|------|--------|-------------|----------------|-------|
| HTML | `input[name=X]` | string | User | Alpine `form.X` | `x-model` | Binding bidirectionnel |
| Alpine | `form.X` | Object | State | Workflow params | Passage direct | - |
| Workflow | `params.X` | Object | Alpine | API Request | `JSON.stringify()` | Méthode HTTP |
| API | `request.json[X]` | JSON | HTTP Body | SQLAlchemy | Validation | WTForms/marshmallow |
| SQLAlchemy | `Model.X` | Type SQL | Python | SQLite | ORM Mapping | Contraintes DB |
| SQLite | `table.column` | SQL | SQLAlchemy | Disk | Persistence | Index/Foreign Key |
| API | `model.to_dict()` | dict | SQLAlchemy | JSON Response | Sérialisation | `jsonify()` |
| Workflow | `result.data` | JSON | API | Alpine State | Parsing | `response.json()` |
| Alpine | `items[]` | Array | Workflow | Template | `x-for` | Rendu liste |
| HTML | `{{item.X}}` | string | Alpine | DOM | Interpolation | Affichage final |

---

## 🔍 Sections Détaillées à Générer

### 1. Architecture des Flux

Créer un diagramme ASCII montrant:
- Les flux entrants (création, modification)
- Les flux sortants (affichage, listes)
- Les points de transformation

```
Exemple:
┌──────────┐     ┌──────────┐     ┌──────────┐
│  User    │────▶│  Alpine  │────▶│  Flask   │
│  Input   │     │  State   │     │  API     │
└──────────┘     └──────────┘     └────┬─────┘
                                         │
                                         ▼
                                    ┌──────────┐
                                    │  SQLite  │
                                    └──────────┘
```

### 2. Mapping par Entité

Pour chaque entité SQLAlchemy utilisée:

**a) Code du modèle (extrait de models/):**
```python
class NomModele(db.Model):
    __tablename__ = 'nom_table'
    id = db.Column(db.Integer, primary_key=True)
    # ... autres champs
```

**b) Tableau de mapping colonnes:**

| Colonne SQLite | Type SQL | Type Python | Type JSON | Validation | Notes |
|----------------|----------|-------------|-----------|------------|-------|
| `id` | INTEGER | int | number | PrimaryKey | Auto-incrément |
| `name` | VARCHAR(100) | str | string | nullable=False | Unique? Index? |
| `created_at` | TIMESTAMP | datetime | string ISO | default=utcnow | Format ISO8601 |

**c) Structure réponse API:**
```json
{
  "data": {
    "id": 1,
    "name": "...",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

### 3. State Alpine.js

Documenter la structure exacte:

```javascript
// Alpine.data('{cell_name}Page', () => ({
{
    // Données
    items: [],              // Array<Modele>
    currentItem: null,      // Modele | null
    form: {                 // Pour création/édition
        name: '',
        email: '',
        // ... champs du modèle
    },
    
    // UI State
    isLoading: false,       // boolean
    error: null,           // string | null
    fieldErrors: {},       // { [field]: string }
    
    // Pagination (si applicable)
    pagination: {
        page: 1,
        perPage: 10,
        total: 0,
        pages: 0
    }
}
```

**Mapping State ↔ Template:**

| State Alpine | Binding | Template |
|--------------|---------|----------|
| `items` | `x-for="item in items"` | Liste/grid |
| `isLoading` | `x-show="isLoading"` | Spinner/skeleton |
| `error` | `x-text="error"` | Alert error |
| `form.name` | `x-model="form.name"` | Input text |
| `fieldErrors.name` | `:class` conditionnel | Style erreur |

### 4. Workflows et Flux Séquentiels

Pour chaque workflow identifié dans page-specs.md, créer un diagramme:

**Workflow: {nom-workflow}**
```
Déclencheur (ex: @click="save()")
    │
    ▼
runWorkflow('{nom-workflow}', params)
    │
    ▼
fetch METHOD /api/endpoint
    │
    ▼
Flask Route → Validation → SQLAlchemy CRUD → SQLite
    │
    ▼
JSON Response
    │
    ▼
Mise à jour Alpine State
    │
    ▼
Re-render DOM (x-for, x-show, etc.)
```

### 5. Gestion des Erreurs

Tableau obligatoire:

| Erreur | Code HTTP | Source | Mapping Alpine | Affichage UI |
|--------|-----------|--------|----------------|--------------|
| Validation | 400 | WTForms | `fieldErrors = result.field_errors` | Rouge sous champs |
| Not Found | 404 | SQLAlchemy | `error = "Élément non trouvé"` | Toast/Alert |
| Auth | 401 | Flask-Login | Redirection `/login` | - |
| Permission | 403 | Décorateur | `error = "Accès refusé"` | Alert |
| Server | 500 | Exception | `error = "Erreur serveur"` | Alert + retry |

### 6. Fichiers Concernés (Structure Blueprint par Cell)

**⚠️ IMPORTANT**: Chaque cell est un Blueprint Flask autonome. Les fichiers sont organisés DANS le dossier de la cell, pas à la racine de `app/`.

Lister les chemins réels avec structure Blueprint:

| Couche | Chemin | Description |
|--------|--------|-------------|
| **Blueprint** | `app/screens/{cell_name}/__init__.py` | Blueprint: `{cell_name}_bp` |
| **Routes API** | `app/screens/{cell_name}/routes.py` | Routes liées au blueprint |
| **Modèles** | `app/screens/{cell_name}/models.py` | SQLAlchemy (table: `{cell_name}s`) |
| **Template** | `app/screens/{cell_name}/templates/{cell_name}/index.html` | Jinja2 template |
| **Main JS** | `app/screens/{cell_name}/static/js/main.js` | Alpine app |
| **Workflows** | `app/screens/{cell_name}/workflows/*.js` | Logique métier |
| **Global** | `app/templates/base.html` | Template de base hérité |

### Structure du Blueprint

```
app/screens/{cell_name}/
├── __init__.py              # Définit le Blueprint
├── routes.py                # Routes @blueprint.route()
├── models.py                # Modèles SQLAlchemy
├── templates/
│   └── {cell_name}/
│       └── index.html       # Template spécifique
├── static/
│   └── js/
│       └── main.js          # Alpine.js
└── workflows/
    └── *.js                 # Workflows frontend
```

### Enregistrement du Blueprint

Dans `app/__init__.py`, les blueprints sont chargés automatiquement:

```python
from app.screens.{cell_name} import {cell_name}_bp
app.register_blueprint({cell_name}_bp)
```

### URLs générées

| Route | URL |
|-------|-----|
| `@{cell_name}_bp.route("/")` | `/{cell_name}/` |
| `@{cell_name}_bp.route("/api/{cell_name}s")` | `/{cell_name}/api/{cell_name}s` |
| `@{cell_name}_bp.route("/api/{cell_name}s/<id>")` | `/{cell_name}/api/{cell_name}s/<id>` |

---

## ✅ Checklist de Validation

Avant de finaliser le datamapping.md généré, vérifier:

- [ ] Tous les champs du modèle SQLAlchemy sont documentés
- [ ] Chaque workflow a son flux séquentiel
- [ ] Les erreurs HTTP sont mappées à des états UI
- [ ] Les transformations (dates, formats) sont explicitées
- [ ] Les types sont cohérents (SQL ↔ Python ↔ JSON)
- [ ] Les fichiers réels sont référencés avec bons chemins
- [ ] Les bindings Alpine.js (x-model, x-for) sont documentés

---

## 📝 Exemple de Rendu Attendu

Voir: `page/TEMPLATE-page/datamapping.md` pour la structure cible.

---

## 🚫 Interdictions

- **PAS de PouchDB/CouchDB** - Ce projet utilise SQLite + Flask API
- **PAS de "sync live"** - Tout passe par fetch() explicite
- **PAS de références au old stack** - Focus sur Flask uniquement

---

**Note pour l'IA**: Générer un document concret, spécifique à la page analysée, pas un template générique. Remplacer tous les placeholders par les vraies valeurs du projet.
