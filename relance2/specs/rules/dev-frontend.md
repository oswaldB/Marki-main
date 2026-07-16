# Règles de Développement Frontend

## Stack Technique

- **Framework JS**: Alpine.js uniquement (pas de React, Vue, ou vanilla JS)
- **Templating**: Pas de Jinja2 - uniquement HTML statique
- **Web Components**: Light shadow DOM uniquement, avec Alpine.js à l'intérieur

## Architecture par Page

### Structure d'une page

```
app/static/pages/
└── <page-name>/
    ├── index.html          # Page HTML statique
    ├── store/
    │   └── store.js        # Store Alpine.js dédié
    └── workflows/
        ├── initial-load.js
        ├── action-1.js
        └── action-2.js
```

### Store Pattern

Chaque page DOIT avoir son propre store Alpine.js dans `store/store.js`:

```javascript
// store/store.js
export function createStore() {
  return {
    // État
    data: [],
    loading: false,
    error: null,
    
    // Getters
    get itemCount() {
      return this.data.length;
    },
    
    // Actions
    async loadData() {
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
  };
}
```

Initialisation dans la page HTML:

```html
<script type="module">
  import { createStore } from './store/store.js';
  
  document.addEventListener('alpine:init', () => {
    Alpine.data('pageStore', createStore);
  });
</script>

<div x-data="pageStore">
  ...
</div>
```

## Workflows Frontend

### Principe

**Chaque bouton/interaction est associé à un workflow frontend dédié.**

Les workflows sont dans le dossier `workflows/` de chaque page.

### Structure d'un workflow

```javascript
// workflows/save-data.js
export async function saveDataWorkflow(store, payload) {
  log.info('WORKFLOW_START', { 
    workflow: 'save-data',
    payload: sanitizePayload(payload) 
  });
  
  try {
    // Étape 1: Validation
    log.debug('VALIDATION_START', { payload });
    validatePayload(payload);
    log.debug('VALIDATION_SUCCESS');
    
    // Étape 2: API call
    log.debug('API_CALL_START', { endpoint: '/api/save' });
    const response = await fetch('/api/save', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    log.debug('API_CALL_COMPLETE', { status: response.status });
    
    // Étape 3: Mise à jour du store
    log.debug('STORE_UPDATE_START');
    store.updateData(await response.json());
    log.debug('STORE_UPDATE_COMPLETE');
    
    log.info('WORKFLOW_SUCCESS', { workflow: 'save-data' });
    return { success: true };
    
  } catch (error) {
    log.error('WORKFLOW_ERROR', { 
      workflow: 'save-data',
      error: error.message,
      stack: error.stack 
    });
    throw error;
  }
}
```

### Binding HTML

```html
<!-- Bouton avec workflow -->
<button 
  @click="async () => {
    const { saveDataWorkflow } = await import('./workflows/save-data.js');
    await saveDataWorkflow($store, { id: 123 });
  }"
  :disabled="loading"
>
  Sauvegarder
</button>
```

## Web Components

### Règles strictes

1. **Light Shadow DOM uniquement** - pas de shadow DOM fermé
2. **Pas de template externe** - le HTML est dans le return
3. **Alpine.js obligatoire** à l'intérieur du composant

### Pattern Web Component

```javascript
// components/my-component.js
class MyComponent extends HTMLElement {
  constructor() {
    super();
    // Light shadow uniquement
    this.attachShadow({ mode: 'open' });
  }
  
  connectedCallback() {
    const data = this.getAttribute('data') || '{}';
    
    // HTML + Alpine.js inline
    this.shadowRoot.innerHTML = `
      <div x-data="{ 
        items: ${data},
        selected: null,
        get selectedLabel() {
          return this.selected?.label || 'Aucune sélection'
        }
      }">
        <!-- Template directement dans le HTML -->
        <template x-for="item in items" :key="item.id">
          <div 
            @click="selected = item; log.info('ITEM_SELECTED', { id: item.id })"
            :class="{ 'selected': selected?.id === item.id }"
          >
            <span x-text="item.label"></span>
          </div>
        </template>
        
        <div class="selection-info">
          <span x-text="selectedLabel"></span>
        </div>
        
        <script>
          // Logs exhaustifs obligatoires
          console.log('[MyComponent] Mounted', { itemCount: items.length });
        </script>
      </div>
    `;
    
    // Ré-exécuter Alpine sur le shadow DOM
    if (window.Alpine) {
      Alpine.initTree(this.shadowRoot);
    }
  }
}

customElements.define('my-component', MyComponent);
```

### Utilisation

```html
<script type="module" src="./components/my-component.js"></script>

<my-component data='[{"id":1,"label":"A"},{"id":2,"label":"B"}]'></my-component>
```

## Génération Exhaustive des Logs

### Obligatoire sur chaque page et workflow

```javascript
// Logger dédié frontend
const log = {
  debug: (event, data) => console.log(`[DEBUG][${event}]`, data),
  info: (event, data) => console.log(`[INFO][${event}]`, JSON.stringify(data)),
  warn: (event, data) => console.warn(`[WARN][${event}]`, data),
  error: (event, data) => console.error(`[ERROR][${event}]`, data)
};

// Événements à logger obligatoirement:
// - Initialisation du store
// - Démarrage d'un workflow
// - Chaque étape du workflow
// - Appels API (requête + réponse)
// - Modifications du DOM
// - Erreurs (avec stack trace)
// - Fin de workflow (succès/échec)
```

### Pattern de log dans chaque workflow

```javascript
export async function workflowName(store, params) {
  const workflowId = crypto.randomUUID();
  
  log.info('WORKFLOW_INIT', {
    workflowId,
    workflow: 'workflowName',
    timestamp: Date.now(),
    params: sanitizeForLog(params)
  });
  
  try {
    // ... étapes du workflow avec log à chaque étape ...
    
    log.info('WORKFLOW_COMPLETE', {
      workflowId,
      duration: Date.now() - startTime,
      result: 'success'
    });
    
  } catch (error) {
    log.error('WORKFLOW_FAILED', {
      workflowId,
      error: error.message,
      stack: error.stack,
      context: { /* état actuel */ }
    });
    throw error;
  }
}
```

## Anti-patterns Interdits

❌ **Jamais de Jinja2 côté client**:
```html
<!-- INTERDIT -->
<div>{{ server_data.value }}</div>
```

❌ **Jamais de vanilla JS pour la réactivité**:
```javascript
// INTERDIT
document.getElementById('btn').addEventListener('click', ...);
```

❌ **Jamais de shadow DOM fermé**:
```javascript
// INTERDIT
this.attachShadow({ mode: 'closed' });
```

❌ **Jamais de template externe pour les web components**:
```javascript
// INTERDIT - pas de fetch de template HTML
const template = await fetch('/templates/comp.html');
```

## Checklist avant commit

- [ ] Chaque page a son store.js dédié
- [ ] Chaque bouton a son workflow associé
- [ ] Pas de Jinja2 dans les fichiers frontend
- [ ] Les web components utilisent light shadow
- [ ] Les logs couvrent tous les workflows et étapes
- [ ] Les imports de workflows sont dynamiques (lazy loading)
