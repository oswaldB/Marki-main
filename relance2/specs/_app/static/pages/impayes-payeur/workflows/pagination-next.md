# Workflow : Page suivante payeur

## Écran
`impayes-payeur.html`

## Élément déclencheur
Bouton avec `@click="currentPage++"`

## Action
Naviguer vers la page suivante

## Description
- Incrémente le numéro de page
- Charge les données de la page suivante

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
            └── pagination-next.js
```

### Fichier principal
- **HTML** : `frontend/app/impayes-payeur/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/impayes-payeur/js/pagination-next.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/impayes-payeur/js/pagination-next.js
export function paginationNext() {
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
``

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.impayes-payeur-pagination-next] START: Navigation vers la page suivante, page courante =', this.page)` |
| `page-incremented` | `console.log('[WORKFLOW.impayes-payeur-pagination-next] STEP: page incrémentée, nouvelle valeur =', this.page)` |
| `data-fetched` | `console.log('[WORKFLOW.impayes-payeur-pagination-next] DATA: Données chargées pour la page', this.page, '-', data.length, 'payeurs récupérés')` |
| `table-rerendered` | `console.log('[WORKFLOW.impayes-payeur-pagination-next] STEP: Tableau ré-affiché avec', payeurs.length, 'lignes')` |
| `end` | `console.log('[WORKFLOW.impayes-payeur-pagination-next] SUCCESS: Page suivante affichée en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.impayes-payeur-pagination-next] ERROR:', error)` |