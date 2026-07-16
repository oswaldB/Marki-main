# Règles de Développement Frontend

## Stack Technique

- **Framework JS**: Alpine.js uniquement (pas de React, Vue, ou vanilla JS)
- **Templating**: **Jinja2 via Flask** - les pages sont des templates server-side rendus
- **Architecture**: Templates Flask avec Alpine.js initialisé via includes

## Architecture par Page

### Structure d'une page

```
app/templates/
└── <nom-page>/
    ├── index.html              # Template principal (structure HTML)
    ├── alpinejs.html           # Initialisation Alpine.js avec includes workflows
    └── workflows/
        ├── workflow-init.html    # Fonction init() + état initial
        ├── workflow-1.html       # Mega-function workflow 1
        ├── workflow-2.html       # Mega-function workflow 2
        └── ...
```

### Principe

Les workflows sont des **mega-functions** définies dans des templates Jinja2, incluses dans un seul objet Alpine.js.

## Pattern Alpine.js avec Jinja2

### 1. index.html - Structure de la page

```html
<!-- templates/nom-page/index.html -->
<!DOCTYPE html>
<html>
<head>
    <title>Ma Page</title>
    <!-- Tailwind CSS ou autre -->
    <link rel="stylesheet" href="/static/css/app.css">
</head>
<body>
    <!-- Contenu HTML avec directives Alpine -->
    <div x-data="nomPage" x-init="init()">
        <h1 x-text="title"></h1>
        
        <!-- Bouton qui appelle un workflow -->
        <button @click="workflow1()" :disabled="loading">
            Action 1
        </button>
        
        <button @click="workflow2()" :disabled="loading">
            Action 2
        </button>
        
        <!-- Affichage état -->
        <div x-show="loading">Chargement...</div>
        <div x-show="error" x-text="error" class="text-red-500"></div>
    </div>
    
    <!-- ✅ Alpine.js À LA FIN DU BODY -->
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    
    <!-- Inclusion de l'initialisation -->
    {% include 'nom-page/alpinejs.html' %}
</body>
</html>
```

### 2. alpinejs.html - Initialisation avec includes

```html
<!-- templates/nom-page/alpinejs.html -->
<script>
    document.addEventListener('alpine:init', () => {
        Alpine.data('nomPage', () => ({
            // État initial (depuis workflow-init.html)
            {% include 'nom-page/workflows/workflow-init.html' %},
            
            // Workflows (mega-functions)
            {% include 'nom-page/workflows/workflow-1.html' %},
            {% include 'nom-page/workflows/workflow-2.html' %},
            {% include 'nom-page/workflows/workflow-3.html' %}
        }));
    });
</script>
```

### 3. workflows/workflow-init.html - État initial

```html
<!-- templates/nom-page/workflows/workflow-init.html -->
// État initial du composant
init: function() {
    log.info('PAGE_INIT', { page: 'nomPage' });
    this.loadInitialData();
},

// Propriétés réactives
title: 'Ma Page',
loading: false,
error: null,
data: [],

// Getter
get itemCount() {
    return this.data.length;
},

// Méthode utilitaire pour charger les données initiales
loadInitialData: async function() {
    this.loading = true;
    try {
        const response = await fetch('/api/data');
        this.data = await response.json();
        log.info('DATA_LOADED', { count: this.data.length });
    } catch (err) {
        this.error = err.message;
        log.error('DATA_LOAD_ERROR', { error: err.message });
    } finally {
        this.loading = false;
    }
}
```

### 4. workflows/workflow-1.html - Mega-function workflow

```html
<!-- templates/nom-page/workflows/workflow-1.html -->
// Mega-function: Workflow de sauvegarde
workflow1: async function() {
    const workflowId = crypto.randomUUID();
    
    log.info('WORKFLOW_START', { 
        workflowId,
        workflow: 'workflow1',
        page: 'nomPage'
    });
    
    this.loading = true;
    this.error = null;
    
    try {
        // Étape 1: Validation
        log.debug('VALIDATION_START');
        if (!this.data || this.data.length === 0) {
            throw new Error('Aucune donnée à sauvegarder');
        }
        log.debug('VALIDATION_SUCCESS');
        
        // Étape 2: Préparation
        log.debug('PREPARATION_START', { itemCount: this.data.length });
        const payload = this.preparePayload();
        log.debug('PREPARATION_COMPLETE', { payload });
        
        // Étape 3: Appel API
        log.debug('API_CALL_START', { endpoint: '/api/save', method: 'POST' });
        const response = await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        log.debug('API_CALL_COMPLETE', { status: response.status });
        
        // Étape 4: Traitement réponse
        log.debug('RESPONSE_PROCESSING_START');
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP ${response.status}`);
        }
        const result = await response.json();
        log.debug('RESPONSE_PROCESSING_COMPLETE', { result });
        
        // Étape 5: Mise à jour état
        log.debug('STATE_UPDATE_START');
        this.data = result.data || this.data;
        this.title = 'Sauvegardé !';
        log.debug('STATE_UPDATE_COMPLETE');
        
        log.info('WORKFLOW_SUCCESS', { 
            workflowId,
            duration: Date.now() - startTime 
        });
        
    } catch (error) {
        this.error = error.message;
        log.error('WORKFLOW_ERROR', {
            workflowId,
            error: error.message,
            stack: error.stack
        });
    } finally {
        this.loading = false;
    }
},

// Méthode utilitaire pour ce workflow
preparePayload: function() {
    return {
        items: this.data,
        timestamp: Date.now()
    };
}
```

### 5. workflows/workflow-2.html - Autre exemple

```html
<!-- templates/nom-page/workflows/workflow-2.html -->
// Mega-function: Workflow de suppression
workflow2: async function(itemId) {
    const workflowId = crypto.randomUUID();
    
    log.info('WORKFLOW_START', { 
        workflowId,
        workflow: 'workflow2',
        itemId 
    });
    
    if (!confirm('Confirmer la suppression ?')) {
        log.info('WORKFLOW_CANCELLED', { workflowId, reason: 'user_cancel' });
        return;
    }
    
    this.loading = true;
    
    try {
        log.debug('DELETE_START', { itemId });
        const response = await fetch(`/api/items/${itemId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error(`Échec suppression: ${response.status}`);
        }
        
        // Mise à jour locale
        this.data = this.data.filter(item => item.id !== itemId);
        
        log.info('WORKFLOW_SUCCESS', { workflowId, itemId });
        
    } catch (error) {
        this.error = error.message;
        log.error('WORKFLOW_ERROR', { workflowId, error: error.message });
    } finally {
        this.loading = false;
    }
}
```

## Route Flask correspondante

```python
# app/routes/nom_page.py
from flask import Blueprint, render_template

bp = Blueprint('nom_page', __name__)

@bp.route('/nom-page')
def nom_page():
    return render_template('nom-page/index.html')
```

```python
# app/app.py
from flask import Flask
from routes import nom_page

app = Flask(__name__)
app.register_blueprint(nom_page.bp)
```

## Génération Exhaustive des Logs

### Logger intégré dans chaque page

```html
<!-- Dans alpinejs.html, avant l'initialisation -->
<script>
    // Logger global pour la page
    const log = {
        debug: (event, data) => console.log(`[DEBUG][${event}]`, JSON.stringify(data)),
        info: (event, data) => console.log(`[INFO][${event}]`, JSON.stringify(data)),
        warn: (event, data) => console.warn(`[WARN][${event}]`, JSON.stringify(data)),
        error: (event, data) => console.error(`[ERROR][${event}]`, JSON.stringify(data))
    };
</script>
```

### Événements à logger obligatoirement

Dans chaque workflow :
- `WORKFLOW_START` - Début avec contexte
- `VALIDATION_START/COMPLETE/ERROR` - Validation données
- `API_CALL_START/COMPLETE` - Appels HTTP
- `STATE_UPDATE_START/COMPLETE` - Modification état Alpine
- `WORKFLOW_SUCCESS/ERROR` - Fin avec résultat

## Checklist avant commit

- [ ] Structure `templates/nom-page/index.html` + `alpinejs.html` + `workflows/` respectée
- [ ] Alpine.js chargé à la **fin du body** avec `defer`
- [ ] `alpinejs.html` inclus après Alpine.js
- [ ] Chaque workflow est une **mega-function** complète dans son template
- [ ] Le workflow `workflow-init.html` contient `init()` et l'état initial
- [ ] Les logs couvrent toutes les étapes du workflow
- [ ] Pas de JavaScript inline dans `index.html` (tout est dans les workflows)

## Anti-patterns Interdits

❌ **Pas de JavaScript inline dans index.html**:
```html
<!-- INTERDIT -->
<button @click="fetch('/api').then(...)">Go</button>
```

❌ **Pas de scripts en dehors des templates workflows**:
```html
<!-- INTERDIT -->
<script src="./custom-script.js"></script>
```

❌ **Pas de x-data sans init()**:
```html
<!-- INTERDIT -->
<div x-data="{ items: [] }">  <!-- Doit passer par alpinejs.html -->
```

❌ **Alpine.js dans le head**:
```html
<head>
  <!-- INTERDIT -->
  <script src="alpinejs"></script>
</head>
```
