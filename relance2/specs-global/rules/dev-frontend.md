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
    ├── alpinejs.html           # Initialisation Alpine.js - DÉFINIR PROPS PUIS WORKFLOWS
    └── workflows/
        ├── workflow-init.html    # Fonction init() + méthodes utilitaires UNIQUEMENT
        ├── workflow-1.html       # Mega-function workflow 1
        ├── workflow-2.html       # Mega-function workflow 2
        └── ...
```

### NOUVEAU Pattern Alpine.js avec Jinja2

**RÈGLE CRITIQUE**: L'ordre d'inclusion dans `alpinejs.html` est **OBLIGATOIRE**:

1. **D'ABORD** toutes les propriétés réactives (state)
2. **ENSUITE** les workflows (mega-functions)
3. **ENFIN** `workflow-init.html` (car `init()` dépend des props et workflows)

#### 1. index.html - Structure de la page

```html
<!-- templates/nom-page/index.html -->
<!DOCTYPE html>
<html>
<head>
    <title>Ma Page</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
    <!-- Contenu HTML avec directives Alpine -->
    <div x-data="nomPage" x-init="init()">
        <h1 x-text="title"></h1>
        
        <!-- Boutons qui appellent les workflows -->
        <button @click="workflow1()" :disabled="loading">
            Action 1
        </button>
        
        <div x-show="loading">Chargement...</div>
        <div x-show="error" x-text="error"></div>
    </div>
    
    <!-- ✅ Alpine.js À LA FIN DU BODY -->
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    
    <!-- Inclusion de l'initialisation -->
    {% include 'nom-page/alpinejs.html' %}
</body>
</html>
```

#### 2. alpinejs.html - Initialisation CORRECTE

```html
<!-- templates/nom-page/alpinejs.html -->
<script>
    // Logger global pour la page
    const log = {
        debug: (event, data) => console.log(`[DEBUG][${event}]`, JSON.stringify(data)),
        info: (event, data) => console.log(`[INFO][${event}]`, JSON.stringify(data)),
        warn: (event, data) => console.warn(`[WARN][${event}]`, JSON.stringify(data)),
        error: (event, data) => console.error(`[ERROR][${event}]`, JSON.stringify(data))
    };

    document.addEventListener('alpine:init', () => {
        Alpine.data('nomPage', () => ({
            // =====================================================
            // 1. DÉFINIR D'ABORD TOUTES LES PROPS RÉACTIVES (STATE)
            // =====================================================
            
            // UI State
            loading: false,
            saving: false,
            error: null,
            
            // Data
            items: [],
            selectedItem: null,
            filters: {
                search: '',
                status: ''
            },
            
            // Pagination
            currentPage: 1,
            itemsPerPage: 20,
            
            // Getters calculés
            get filteredItems() {
                return this.items.filter(item => {
                    if (this.filters.search && !item.name?.includes(this.filters.search)) return false;
                    if (this.filters.status && item.status !== this.filters.status) return false;
                    return true;
                });
            },
            
            get totalPages() {
                return Math.ceil(this.filteredItems.length / this.itemsPerPage) || 1;
            },
            
            get paginatedItems() {
                const start = (this.currentPage - 1) * this.itemsPerPage;
                return this.filteredItems.slice(start, start + this.itemsPerPage);
            },
            
            // Helpers
            formatMoney(amount) {
                return new Intl.NumberFormat('fr-FR', { 
                    style: 'currency', 
                    currency: 'EUR' 
                }).format(amount);
            },
            
            formatDate(dateStr) {
                if (!dateStr) return '-';
                return new Date(dateStr).toLocaleDateString('fr-FR');
            },
            
            // =====================================================
            // 2. ENSUITE LES WORKFLOWS (ils utilisent les props ci-dessus)
            // =====================================================
            {% include 'nom-page/workflows/initial-load.html' %},
            {% include 'nom-page/workflows/pagination-next.html' %},
            {% include 'nom-page/workflows/pagination-prev.html' %},
            {% include 'nom-page/workflows/save-data.html' %},
            {% include 'nom-page/workflows/delete-item.html' %},
            
            // =====================================================
            // 3. ENFIN WORKFLOW-INIT (init() dépend des props + workflows)
            // =====================================================
            {% include 'nom-page/workflows/workflow-init.html' %}
        }));
    });
</script>
```

#### 3. workflows/workflow-init.html - Uniquement init() et méthodes utilitaires

**IMPORTANT**: Ce fichier ne contient PLUS les propriétés réactives !
Seulement la fonction `init()` et les méthodes utilitaires qui en dépendent.

```html
<!-- templates/nom-page/workflows/workflow-init.html -->
// Fonction d'initialiation (doit être en dernier dans Alpine.data)
init: function() {
    log.info('PAGE_INIT', { 
        page: 'nomPage',
        timestamp: Date.now()
    });
    
    // Vérifier auth
    const token = localStorage.getItem('token');
    if (!token) {
        log.warn('AUTH_MISSING');
        window.location.href = '/login';
        return;
    }
    
    // Lancer le chargement initial
    this.initialLoad();
}

// PAS DE PROPS ICI ! Les props sont dans alpinejs.html
```

#### 4. workflows/initial-load.html - Exemple de workflow

```html
<!-- templates/nom-page/workflows/initial-load.html -->
// Mega-function: Chargement initial des données
initialLoad: async function() {
    const workflowId = crypto.randomUUID();
    const startTime = Date.now();
    
    log.info('WORKFLOW_START', { 
        workflowId,
        workflow: 'initialLoad',
        page: 'nomPage'
    });
    
    // Utilise les props définies dans alpinejs.html
    this.loading = true;
    this.error = null;
    
    try {
        const token = localStorage.getItem('token');
        
        log.debug('API_CALL_START', { endpoint: '/api/items' });
        
        const response = await fetch('/api/items', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        log.debug('API_RESPONSE_RECEIVED', { status: response.status });
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // Met à jour les props définies dans alpinejs.html
        this.items = data;
        this.currentPage = 1;
        
        log.debug('DATA_LOADED', { count: this.items.length });
        
        log.info('WORKFLOW_SUCCESS', { 
            workflowId,
            duration: Date.now() - startTime,
            count: this.items.length
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
}
```

#### 5. Autres workflows - Pattern standard

```html
<!-- templates/nom-page/workflows/pagination-next.html -->
// Mega-function: Page suivante
paginationNext: async function() {
    const workflowId = crypto.randomUUID();
    log.info('WORKFLOW_START', { workflowId, workflow: 'paginationNext' });
    
    // Accède aux props définies dans alpinejs.html
    if (this.currentPage < this.totalPages) {
        this.currentPage++;
        log.debug('PAGE_CHANGED', { newPage: this.currentPage });
    }
    
    log.info('WORKFLOW_SUCCESS', { workflowId });
}
```

## Génération Exhaustive des Logs

### Logger global (dans alpinejs.html avant Alpine.data)

```javascript
const log = {
    debug: (event, data) => console.log(`[DEBUG][${event}]`, JSON.stringify(data)),
    info: (event, data) => console.log(`[INFO][${event}]`, JSON.stringify(data)),
    warn: (event, data) => console.warn(`[WARN][${event}]`, JSON.stringify(data)),
    error: (event, data) => console.error(`[ERROR][${event}]`, JSON.stringify(data))
};
```

### Événements à logger obligatoirement

- `WORKFLOW_START` - Début avec contexte
- `VALIDATION_START/COMPLETE/ERROR` - Validation
- `API_CALL_START/COMPLETE/ERROR` - Appels HTTP
- `STATE_UPDATE` - Modification état
- `WORKFLOW_SUCCESS/ERROR` - Fin

## Checklist avant commit

- [ ] **ORDRE OBLIGATOIRE** dans `alpinejs.html`: Props → Workflows → workflow-init
- [ ] Les **props réactives** sont définies directement dans `alpinejs.html` (pas dans workflow-init)
- [ ] `workflow-init.html` ne contient que `init()` et méthodes utilitaires
- [ ] Les **getters** (`get xxx()`) sont dans `alpinejs.html` avec les props
- [ ] Les **helpers** (`formatXxx`) sont dans `alpinejs.html` avec les props
- [ ] Alpine.js chargé à la fin du body
- [ ] Pas de JS inline dans `index.html`

## Anti-patterns INTERDITS

❌ **Définir des props dans workflow-init.html**:
```html
<!-- INTERDIT - Les props doivent être dans alpinejs.html -->
// Dans workflow-init.html:
loading: false,  // ❌ NON !
error: null       // ❌ NON !
```

❌ **Mauvais ordre d'inclusion**:
```javascript
// INTERDIT - init avant les props
Alpine.data('page', () => ({
    {% include 'workflows/workflow-init.html' %},  // ❌ NE PAS METTRE EN PREMIER
    loading: false,
    ...
}));
```

❌ **Props sans getters dans alpinejs.html**:
```javascript
// INTERDIT - les getters doivent être avec les props
Alpine.data('page', () => ({
    items: [],
    // ❌ Le getter filteredItems doit être ici aussi !
}));
```

## Récapitulatif du pattern CORRECT

```javascript
// alpinejs.html - Ordre correct:
Alpine.data('nomPage', () => ({
    // 1. PROPS + GETTERS + HELPERS
    loading: false,
    items: [],
    get filteredItems() { ... },
    formatDate(date) { ... },
    
    // 2. WORKFLOWS
    {% include 'workflows/workflow-1.html' %},
    {% include 'workflows/workflow-2.html' %},
    
    // 3. INIT (en dernier !)
    {% include 'workflows/workflow-init.html' %}
}));
```
