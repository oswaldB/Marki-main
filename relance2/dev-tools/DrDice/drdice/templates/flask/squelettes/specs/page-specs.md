# Page Specs - {cell_name} (Modèle Flask)

> **DOCUMENT DE RÉFÉRENCE PRIORITAIRE - MODÈLE À ADAPTER**
> 
> Ce fichier est un **MODÈLE (template)** à copier et adapter pour chaque page.
> **LIRE EN PRIORITÉ ABSOLUE** avant toute modification de code.
> 
> Remplacer `{cell_name}` par le nom de la page (ex: `users`, `dashboard`, `orders`).

---

## Partie 1 : Use Cases (Gherkin)

> **À identifier par l'IA** : Les use cases doivent être extraits automatiquement des fichiers `wf-workflows/` et `mockups/` présents dans le squelette de la page. L'IA doit générer les scénarios Gherkin pertinents basés sur les workflows et interactions UI décrites.

```gherkin
Feature: {cell_name} Page
  En tant qu'utilisateur
  Je veux pouvoir interagir avec la page {cell_name}
  Afin de réaliser mes tâches

  Scenario: Chargement initial de la page
    Given je suis sur la page {cell_name}
    When la page se charge
    Then les données initiales sont chargées via l'API Flask "GET /api/{cell_name}"
    And l'interface est prête à l'emploi

  Scenario: Interaction utilisateur - Création
    Given je suis sur la page {cell_name}
    When je remplis le formulaire et soumets
    Then une requête "POST /api/{cell_name}" est envoyée à Flask
    And les données sont persistées dans SQLite
    And la liste est rafraîchie

  Scenario: Interaction utilisateur - Modification
    Given je suis sur la page {cell_name}
    And un élément existe
    When je modifie l'élément et sauvegarde
    Then une requête "PUT /api/{cell_name}/<id>" est envoyée à Flask
    And les données sont mises à jour dans SQLite

  Scenario: Interaction utilisateur - Suppression
    Given je suis sur la page {cell_name}
    And un élément existe
    When je clique sur supprimer
    Then une requête "DELETE /api/{cell_name}/<id>" est envoyée à Flask
    And l'élément est supprimé de SQLite
```

---

## Partie 2 : Choix Techniques et Règles du Projet (Flask)

### Stack Technique
- **Backend** : Flask (Python) + Flask-SQLAlchemy
- **Database** : SQLite (via SQLAlchemy ORM)
- **Frontend** : Alpine.js 3 + Jinja2 Templates
- **Communication** : API REST (JSON) via `fetch()`
- **Style** : TailwindCSS (via CDN ou build)
- **Architecture** : MVC - Modèles (SQLAlchemy), Vues (Jinja2), Contrôleurs (Routes Flask)

### Règles Absolues (Pas d'Exception)

1. **Structure Flask** :
   - **Modèles** : Définis dans `models/{cell_name}.py` (SQLAlchemy)
   - **Routes API** : Définies dans `routes/{cell_name}.py` (Blueprint recommandé)
   - **Templates** : `templates/{cell_name}/index.html` (Jinja2)
   - **Static JS** : `static/js/pages/{cell_name}/main.js` (Alpine.js) + `static/js/pages/{cell_name}/workflows/` (workflows)

2. **Organisation par Cellule (RÈGLE ABSOLUE)** :
   ```
   static/js/pages/
   ├── {cell_name}/
   │   ├── main.js              # 🎨 Alpine.js de la page (obligatoire)
   │   └── workflows/
   │       ├── index.js         # 📋 Registre des workflows de cette page
   │       ├── api-client.js    # 🔌 Client HTTP (peut être un symlink vers shared)
   │       └── *.js             # 🎯 Workflows spécifiques à cette page
   └── autre-cell/
       ├── main.js
       └── workflows/
   ```
   - **PAS de fichiers JS à la racine de `static/js/`**
   - **PAS de `static/js/workflows/` global**
   - Chaque cell est **autosuffisante** : sa logique est dans son dossier

3. **Workflows Globaux INTERDITS (RÈGLE ABSOLUE)** :
   - **INTERDICTION** d'avoir des workflows partagés entre pages dans `static/js/workflows/`
   - **EXCEPTION** : Uniquement si explicitement documenté dans les specs et justifié métier
   - Si un workflow est identique entre 2 pages : **DUPLIQUER** le fichier (pas de DRY forcé)
   - Rationale : Isolation totale, suppression d'une page = suppression de tout son code
   - Client HTTP partagé autorisé uniquement via `static/js/shared/` (si créé)

4. **Passage de paramètres URL** : Utiliser les **query params standard** (`?`) ou **route params**
   - Exemple query : `/users?page=1&search=john`
   - Exemple route : `/users/<int:user_id>`
   - **PAS de hash params** (`#userId=123`) - réservé au frontend

5. **Structure des Routes API Flask** :
   ```python
   # GET    /api/{cell_name}       → Liste (avec pagination/filtres)
   # GET    /api/{cell_name}/<id>  → Détail
   # POST   /api/{cell_name}       → Création
   # PUT    /api/{cell_name}/<id>  → Mise à jour complète
   # PATCH  /api/{cell_name}/<id>  → Mise à jour partielle
   # DELETE /api/{cell_name}/<id>  → Suppression
   ```

6. **Structure Alpine.js (comme static-stack)** :
   - **PAS de fonction exportée** : utiliser `Alpine.data('{cell_name}Page', () => ({...}))`
   - **PAS d'exposition sur window** : pas de `window.{cell_name}Page = ...`
   - Dans le template : `x-data="{cell_name}Page"` **SANS parenthèses**
   - Les workflows sont importés en ESM et stockés dans `window.workflows`
   - `Alpine.start()` à la fin de main.js

7. **Sérialisation JSON** :
   - Chaque modèle SQLAlchemy DOIT avoir une méthode `to_dict()` :
   ```python
   def to_dict(self):
       return {
           'id': self.id,
           'name': self.name,
           'created_at': self.created_at.isoformat() if self.created_at else None
       }
   ```
   - Les routes retournent toujours `jsonify()` avec structure standardisée :
   ```python
   # Succès
   return jsonify({'data': item.to_dict()}), 200
   # Liste
   return jsonify({'data': [i.to_dict() for i in items], 'total': total}), 200
   # Erreur
   return jsonify({'error': 'Message d\'erreur'}), 400
   ```

8. **Séparation des Concerns** :
   - **Modèle** (`models/{cell_name}.py`) : Schéma SQLAlchemy, relations, validations
   - **Routes API** (`routes/{cell_name}.py`) : Endpoints REST, logique HTTP
   - **Template Jinja2** (`templates/{cell_name}/index.html`) : Structure HTML, bindings Alpine
   - **JS Frontend** (`static/js/pages/{cell_name}/main.js`) : Logique Alpine + workflows
   - **Data Mapping** : Voir fichier `datamapping.md` dans chaque page (SQLite → API → Alpine)

9. **IDs des Boutons** : Chaque bouton DOIT avoir un ID unique au format `btn-{action}`
   - Exemple : `id="btn-submit"`, `id="btn-cancel"`, `id="btn-refresh"`
   - Jamais d'ID vide ou dupliqué
   - Format obligatoire : commence toujours par `btn-`

10. **Validation des Données** :
    - **Backend** : WTForms ou marshmallow pour validation
    - **Frontend** : Validation basique avant envoi API
    - Toujours retourner des erreurs structurées : `{'error': '...', 'field_errors: {...}}`

11. **Gestion des Erreurs API** :
    - Codes HTTP standard : 200, 201, 400, 404, 500
    - Alpine.js doit gérer les erreurs avec `try/catch` sur les workflows

12. **Pixel Perfect sur les Mockups** :
    - Organisation HTML : Respecter la structure du DOM des mockups
    - Classes CSS : Utiliser les mêmes classes Tailwind que dans les mockups
    - Spacing et Layout : Reproduire pixel par pixel les marges, paddings, grids
    - **Assets** : `static/assets/` (images, fonts)
    - **Composants communs** : `templates/components/` (menu, header, etc.)

---

## Partie 3 : Implémentation des Specs Fonctionnelles

### Comment implémenter les specs en respectant les contraintes Flask :

#### 1. Modèle SQLAlchemy (`models/{cell_name}.py`)
```python
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class {CellName}(db.Model):
    __tablename__ = '{cell_name}s'  # ou '{cell_name}' selon convention
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
```

#### 2. Routes API (`routes/{cell_name}.py`)
```python
from flask import Blueprint, request, jsonify
from models.{cell_name} import {CellName}, db

{cell_name}_bp = Blueprint('{cell_name}', __name__, url_prefix='/api/{cell_name}s')

@{cell_name}_bp.route('/', methods=['GET'])
def get_{cell_name}s():
    """Liste avec pagination et filtres optionnels"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    query = {CellName}.query
    
    # Filtres optionnels
    if search := request.args.get('search'):
        query = query.filter({CellName}.name.ilike(f'%{search}%'))
    
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'data': [item.to_dict() for item in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    })

@{cell_name}_bp.route('/<int:id>', methods=['GET'])
def get_{cell_name}(id):
    """Détail d'un élément"""
    item = {CellName}.query.get_or_404(id)
    return jsonify({'data': item.to_dict()})

@{cell_name}_bp.route('/', methods=['POST'])
def create_{cell_name}():
    """Création"""
    data = request.get_json()
    
    # Validation
    if not data.get('name'):
        return jsonify({'error': 'Le nom est requis'}), 400
    
    item = {CellName}(name=data['name'])
    db.session.add(item)
    db.session.commit()
    
    return jsonify({'data': item.to_dict()}), 201

@{cell_name}_bp.route('/<int:id>', methods=['PUT'])
def update_{cell_name}(id):
    """Mise à jour"""
    item = {CellName}.query.get_or_404(id)
    data = request.get_json()
    
    item.name = data.get('name', item.name)
    db.session.commit()
    
    return jsonify({'data': item.to_dict()})

@{cell_name}_bp.route('/<int:id>', methods=['DELETE'])
def delete_{cell_name}(id):
    """Suppression"""
    item = {CellName}.query.get_or_404(id)
    db.session.delete(item)
    db.session.commit()
    
    return jsonify({'message': 'Supprimé avec succès'}), 200
```

#### 3. Main.js Alpine.js (`static/js/pages/{cell_name}/main.js`)

```javascript
/*
 * INSTRUCTIONS IA - main.js pour {cell_name}
 * =================================================
 * Structure identique au static-stack, adaptée pour Flask API
 * PRIORITÉ ABSOLUE: LIRE .specs/page-specs.md AVANT TOUTE MODIFICATION
 *
 * 1. FONCTION PRINCIPALE OBLIGATOIRE:
 *    - Utiliser UNIQUEMENT: Alpine.data('{cell_name}Page', () => ({...}))
 *    - NE PAS utiliser: function {cell_name}Page() ou window.{cell_name}Page
 *    - Dans HTML: x-data="{cell_name}Page" (SANS parenthèses)
 *
 * 2. WORKFLOWS:
 *    - Les workflows sont importés et stockés dans window.workflows
 *    - Chaque workflow exporte: execute(context, params) => { success, data, error }
 *
 * 3. API CLIENT: window.apiClient est initialisé ci-dessous
 *    - Remplace PouchDB du static-stack
 *    - Fournit: get(), post(), put(), delete()
 *
 * 4. DÉMARRAGE: Garder Alpine.start() à la fin
 */

// ═══════════════════════════════════════════════════════════════
// IMPORTS DES WORKFLOWS (modules ES)
// ═══════════════════════════════════════════════════════════════
import { execute as initialLoadExecute } from './workflows/initial-load.js';
import { execute as saveExecute } from './workflows/save.js';
import { execute as deleteExecute } from './workflows/delete.js';

// ═══════════════════════════════════════════════════════════════
// IMPORT ALPINE.JS (ESM via CDN)
// ═══════════════════════════════════════════════════════════════
import Alpine from 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/module.esm.js';

console.log('{cell_name}/main.js loaded');

// ═══════════════════════════════════════════════════════════════
// ENREGISTREMENT DES WORKFLOWS DANS window
// ═══════════════════════════════════════════════════════════════
window.workflows = {
    'initial-load': { execute: initialLoadExecute },
    'save': { execute: saveExecute },
    'delete': { execute: deleteExecute },
};

// ═══════════════════════════════════════════════════════════════
// API CLIENT pour les workflows (remplace PouchDB du static-stack)
// ═══════════════════════════════════════════════════════════════
window.apiClient = {
    async request(endpoint, options = {}) {
        const config = {
            headers: { 'Content-Type': 'application/json', ...options.headers },
            ...options
        };
        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }
        try {
            const response = await fetch(endpoint, config);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    get(endpoint) { return this.request(endpoint, { method: 'GET' }); },
    post(endpoint, body) { return this.request(endpoint, { method: 'POST', body }); },
    put(endpoint, body) { return this.request(endpoint, { method: 'PUT', body }); },
    delete(endpoint) { return this.request(endpoint, { method: 'DELETE' }); }
};

// ═══════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE - ENREGISTREMENT ALPINE
// Utilise Alpine.data() - PAS de fonction globale, PAS d'exposition sur window
// Dans HTML: x-data="{cell_name}Page" (sans parenthèses)
// ═══════════════════════════════════════════════════════════════
Alpine.data('{cell_name}Page', () => ({
    // ───────────────────────────────────────────────────────
    // ÉTAT DE LA PAGE
    // ───────────────────────────────────────────────────────
    isLoading: false,
    error: null,
    data: {},
    items: [],
    form: { name: '' },
    editingId: null,

    // ───────────────────────────────────────────────────────
    // INITIALISATION (appelée automatiquement par Alpine)
    // ───────────────────────────────────────────────────────
    init() {
        console.log('{cell_name}Page initialized');
        this.loadInitialData();
    },

    // ───────────────────────────────────────────────────────
    // MÉTHODES
    // ───────────────────────────────────────────────────────

    /**
     * Charge les données initiales via le workflow initial-load
     */
    async loadInitialData() {
        this.isLoading = true;
        this.error = null;

        try {
            const result = await this.runWorkflow('initial-load');
            if (result.success) {
                this.items = result.data || [];
            } else {
                this.error = result.error || 'Erreur lors du chargement';
            }
        } catch (err) {
            this.error = err.message;
        } finally {
            this.isLoading = false;
        }
    },

    /**
     * Exécute un workflow avec les paramètres donnés
     * @param {string} workflowName - Nom du workflow
     * @param {Object} params - Paramètres à passer
     * @returns {Promise<Object>} Résultat { success, data, error }
     */
    async runWorkflow(workflowName, params = {}) {
        console.log(`Running workflow: ${workflowName}`, params);
        this.isLoading = true;
        this.error = null;

        try {
            if (!window.workflows || !window.workflows[workflowName]) {
                throw new Error(`Workflow "${workflowName}" non trouvé`);
            }

            // Contexte Flask: apiClient au lieu de localDB/remoteDB
            const context = {
                api: window.apiClient,
                baseUrl: '/api/{cell_name}s'
            };

            const result = await window.workflows[workflowName].execute(context, params);

            if (!result.success) {
                this.error = result.error || `Erreur dans le workflow ${workflowName}`;
            }

            return result;
        } catch (err) {
            this.error = err.message;
            return { success: false, error: err.message };
        } finally {
            this.isLoading = false;
        }
    },

    /**
     * Récupère un paramètre depuis l'URL (query params pour Flask)
     * @param {string} key - Nom du paramètre
     * @returns {string|null} Valeur du paramètre
     */
    getUrlParam(key) {
        const params = new URLSearchParams(window.location.search);
        return params.get(key);
    },

    /**
     * Action: Sauvegarder (création ou modification)
     */
    async saveItem() {
        const result = await this.runWorkflow('save', {
            data: this.form,
            id: this.editingId
        });
        if (result.success) {
            this.form = { name: '' };
            this.editingId = null;
            await this.loadInitialData();
        }
    },

    /**
     * Action: Éditer un item
     */
    editItem(item) {
        this.form = { name: item.name };
        this.editingId = item.id;
    },

    /**
     * Action: Supprimer
     */
    async deleteItem(id) {
        if (!confirm('Confirmer la suppression ?')) return;
        const result = await this.runWorkflow('delete', { id });
        if (result.success) await this.loadInitialData();
    },

    /**
     * Efface le message d'erreur
     */
    clearError() {
        this.error = null;
    }
}));

// ═══════════════════════════════════════════════════════════════
// DÉMARRAGE D'ALPINE
// ═══════════════════════════════════════════════════════════════
Alpine.start();
```

#### 4. Workflow (`static/js/pages/{cell_name}/workflows/initial-load.js`)

```javascript
/*
INSTRUCTIONS IA:
================
1. NOM DU WORKFLOW: initial-load
2. Export nommé execute(context, params) qui retourne { success, data, error }
3. Utilise context.api (apiClient) pour appeler l'API Flask
*/

console.log('{cell_name}/workflows/initial-load.js loaded');

/**
 * Workflow: Chargement initial de la liste
 * @param {Object} context - Contexte avec api (apiClient), baseUrl
 * @param {Object} params - Paramètres du workflow
 * @returns {Promise<Object>} Résultat { success, data, error }
 */
export async function execute(context, params = {}) {
    console.log('initial-load workflow executing', params);
    
    try {
        const result = await context.api.get(context.baseUrl);
        return { 
            success: true, 
            data: result.data.data // La liste des items
        };
    } catch (err) {
        console.error('initial-load error:', err);
        return { success: false, error: err.message };
    }
}
```

#### 5. Workflow (`static/js/pages/{cell_name}/workflows/save.js`)

```javascript
console.log('{cell_name}/workflows/save.js loaded');

/**
 * Workflow: Création ou modification
 * @param {Object} context - Contexte avec api, baseUrl
 * @param {Object} params - { data, id }
 */
export async function execute(context, params = {}) {
    console.log('save workflow executing', params);
    
    try {
        const { data, id } = params;
        let result;
        
        if (id) {
            // Modification
            result = await context.api.put(`${context.baseUrl}/${id}`, data);
        } else {
            // Création
            result = await context.api.post(context.baseUrl, data);
        }
        
        return { success: true, data: result.data };
    } catch (err) {
        console.error('save error:', err);
        return { success: false, error: err.message };
    }
}
```

#### 6. Workflow (`static/js/pages/{cell_name}/workflows/delete.js`)

```javascript
console.log('{cell_name}/workflows/delete.js loaded');

/**
 * Workflow: Suppression
 * @param {Object} context - Contexte avec api, baseUrl
 * @param {Object} params - { id }
 */
export async function execute(context, params = {}) {
    console.log('delete workflow executing', params);
    
    try {
        const { id } = params;
        await context.api.delete(`${context.baseUrl}/${id}`);
        return { success: true };
    } catch (err) {
        console.error('delete error:', err);
        return { success: false, error: err.message };
    }
}
```

#### 7. Template Jinja2 (`templates/{cell_name}/index.html`)

```html
{% extends "base.html" %}

{% block content %}
<!--
INSTRUCTIONS IA:
================
1. x-data="{cell_name}Page" - SANS parenthèses!
2. PAS de defer sur Alpine CDN (déjà importé via ESM dans main.js)
3. Import UNIQUEMENT via: <script type="module" src=".../main.js"></script>
4. PAS de x-init="init()", init() est appelé automatiquement par Alpine
-->

<div id="app" x-data="{cell_name}Page" class="container mx-auto p-4">
    
    <!-- Chargement -->
    <div x-show="isLoading" class="text-center py-4">
        Chargement...
    </div>
    
    <!-- Erreur -->
    <div x-show="error" x-text="error" 
         class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
    </div>

    <!-- Liste -->
    <div x-show="!isLoading" class="space-y-4">
        <template x-for="item in items" :key="item.id">
            <div class="flex justify-between items-center p-4 border rounded">
                <span x-text="item.name"></span>
                <div class="space-x-2">
                    <button id="btn-edit" @click="editItem(item)" 
                            class="px-3 py-1 bg-blue-500 text-white rounded">
                        Modifier
                    </button>
                    <button id="btn-delete" @click="deleteItem(item.id)" 
                            class="px-3 py-1 bg-red-500 text-white rounded">
                        Supprimer
                    </button>
                </div>
            </div>
        </template>
    </div>

    <!-- Formulaire -->
    <form @submit.prevent="saveItem()" class="mt-6 space-y-4">
        <h3 x-text="editingId ? 'Modifier' : 'Nouveau'" class="text-lg font-bold"></h3>
        
        <input x-model="form.name" type="text" placeholder="Nom" 
               class="w-full p-2 border rounded" required>
        
        <div class="flex space-x-2">
            <button id="btn-submit" type="submit" 
                    class="px-4 py-2 bg-green-500 text-white rounded"
                    x-text="editingId ? 'Mettre à jour' : 'Créer'">
            </button>
            <button id="btn-cancel" type="button" @click="form = {name:''}; editingId=null" 
                    class="px-4 py-2 bg-gray-500 text-white rounded">
                Annuler
            </button>
        </div>
    </form>
</div>

<!-- Import ES Module - UNIQUEMENT cette ligne pour Alpine -->
<script type="module" src="{{ url_for('static', filename='js/pages/{cell_name}/main.js') }}"></script>
{% endblock %}
```

#### 8. Enregistrement du Blueprint (`app.py` ou `__init__.py`)
```python
from flask import Flask
from routes.{cell_name} import {cell_name}_bp

app = Flask(__name__)
app.register_blueprint({cell_name}_bp)
```

---

## Partie 4 : Checklist d'Implémentation

Avant de marquer une page comme terminée, vérifier :

- [ ] **Modèle SQLAlchemy** créé avec `to_dict()`
- [ ] **Routes API** complètes (GET, POST, PUT, DELETE)
- [ ] **Structure dossier** respectée : `static/js/pages/{cell}/` avec `main.js` + `workflows/`
- [ ] **Fichier `datamapping.md`** créé documentant le flux SQLite → API → Alpine
- [ ] **Main.js** utilise `Alpine.data('{cell_name}Page', ...)` et PAS d'export
- [ ] **Workflows** créés avec `export async function execute(context, params)`
- [ ] **Template HTML** utilise `x-data="{cell_name}Page"` **SANS parenthèses**
- [ ] **Template HTML** importe main.js via `<script type="module" src="...">`
- [ ] **PAS de `window.{cell_name}Page`** exposé
- [ ] **Validation** côté backend (WTForms/marshmallow)
- [ ] **Gestion des erreurs** (try/catch + affichage UI)
- [ ] **IDs des boutons** au format `btn-{action}`
- [ ] **Tests manuels** de chaque endpoint avec curl/Postman
- [ ] **Conformité aux mockups** (pixel perfect)

---

## Partie 5 : Différences Clés avec l'Architecture Static-Stack

| Aspect | Static-Stack (CouchDB/PouchDB) | Flask-Stack (SQLite/SQLAlchemy) |
|--------|-------------------------------|----------------------------------|
| **Backend** | Aucun (PouchDB direct) | Flask + SQLite obligatoire |
| **Sync** | Live bidirectionnelle automatique | Manuelle via appels API |
| **Paramètres URL** | Hash params (`#id=123`) | Query/Route params (`?id=123` ou `/123`) |
| **Data persistence** | PouchDB local + CouchDB | SQLite via SQLAlchemy |
| **Requêtes** | `db.find()`, `db.put()` | `fetch('/api/...')` via workflows |
| **Templates** | HTML statique pur | Jinja2 avec héritage (`{% extends %}`) |
| **Routes** | Aucune (fichiers statiques) | Flask `@app.route()` ou Blueprints |
| **Structure JS** | Identique : `pages/{cell}/main.js` + `workflows/*.js` | Identique |
| **main.js** | `Alpine.data('...', () => ({...}))` | Identique |
| **Workflows** | `execute(context, params)` avec `localDB/remoteDB` | `execute(context, params)` avec `apiClient` |
| **x-data** | `x-data="{cell_name}Page"` (sans parenthèses) | Identique |
| **Offline support** | Natif avec PouchDB | À implémenter (localStorage) |

---

## Partie 6 : Commandes de Test Rapide

### Environnement de Test

**URL de test** : `https://dev2.markidiags.com`

**URL locale** : `http://localhost:5000` (développement local)

### Tester l'API avec curl

```bash
# Variables
BASE_URL="https://dev2.markidiags.com"  # ou http://localhost:5000 en local
API_URL="$BASE_URL/api/{cell_name}s"

# Liste
curl $API_URL

# Création
curl -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{"name": "Test"}'

# Modification
curl -X PUT $API_URL/1 \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Modifié"}'

# Suppression
curl -X DELETE $API_URL/1
```

### Test avec authentification (JWT)

```bash
# Stocker le token après login
TOKEN=$(curl -s -X POST https://dev2.markidiags.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "***"}' | jq -r '.data.token')

# Requêtes authentifiées
curl -H "Authorization: Bearer $TOKEN" $API_URL
```

---

**Note pour les développeurs** : Ce document est un **modèle générique**. Pour chaque page, créer une copie nommée `page-specs-{cell_name}.md` et remplacer toutes les occurrences de `{cell_name}` par le nom réel de la page.
