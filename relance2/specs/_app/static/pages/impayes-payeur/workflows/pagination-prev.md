# Workflow : Page précédente payeur

## Écran
`impayes-payeur.html`

## Élément déclencheur
Bouton avec `@click="currentPage--"`

## Action
Naviguer vers la page précédente

## Description
- Décrémente le numéro de page
- Charge les données de la page précédente

## Data Model
**Page Function:** `impayesPayeurPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `payeurs`
- `searchQuery`
- `filterStatut`
- `sortBy`
- `sortDirection`

**États UI:**
- `loading`
- `error`
- `expandedPayeur`

## State Changes

**Modifications:**
- `page` modifié

## API Calls

**Pas d'appel API** - Action côté client uniquement



## Organisation des fichiers

```
frontend/
└── app/
    └── impayes-payeur/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── pagination-prev.js
```

### Fichier principal
- **HTML** : `frontend/app/impayes-payeur/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/impayes-payeur/js/pagination-prev.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/impayes-payeur/js/pagination-prev.js
export function paginationPrev() {
  // Implementation du workflow
}
```

## Implementation

```javascript
// Next page
nextPage() {
  if (this.page < this.totalPages) {
    this.page++;
    this.loadData();
  }
}

// Previous page
prevPage() {
  if (this.page > 1) {
    this.page--;
    this.loadData();
  }
}

// Change per page
setPerPage(count) {
  this.perPage = count;
  this.page = 1; // Reset to first page
  this.loadData();
}
```

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.impayes-payeur-pagination-prev] START: Navigation vers la page précédente')` |
| `page-decremented` | `console.log('[WORKFLOW.impayes-payeur-pagination-prev] STEP: page décrémentée à', this.page)` |
| `data-fetched` | `console.log('[WORKFLOW.impayes-payeur-pagination-prev] DATA: Données de la page', this.page, 'chargées (', payeurs.length, 'payeurs)')` |
| `table-rerendered` | `console.log('[WORKFLOW.impayes-payeur-pagination-prev] STEP: Tableau ré-affiché avec les nouveaux payeurs')` |
| `end` | `console.log('[WORKFLOW.impayes-payeur-pagination-prev] SUCCESS: Page précédente affichée en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.impayes-payeur-pagination-prev] ERROR:', error)` |