# Workflow : Page suivante

## Écran
`impayes.html`

## Élément déclencheur
Bouton avec `@click="nextPage()"`

## Action
Naviguer vers la page suivante du tableau

## Description
- Incrémente le numéro de page (`currentPage`)
- Appelle l'API pour charger les impayés de la page suivante
- Désactivé si dernière page atteinte

## Data Model

**Page Function:** `impayesPage()`

**Données:**
- `impayes` - liste des impayés affichés
- `currentPage` - numéro de page courant
- `perPage` - nombre d'éléments par page (25)
- `totalPages` - nombre total de pages (calculé)

**États UI:**
- `loading`
- `error`

## State Changes

**Modifications:**
- `currentPage` ← `currentPage + 1`
- `impayes` ← données de la nouvelle page

## API Calls

**Endpoint:** `GET /api/impayes?facture_soldee=0&statut=impaye

**Query Params:**
- `skip` = `(currentPage - 1) * 25` (offset)
- `limit` = `25` (fixe)
- Filtres actifs (optionnels): `is_blacklisted`, `payer_id`, etc.

**Table:** `impayes`

**Response:** `ApiResponse<Impaye[]>`

## Organisation des fichiers

```
frontend/
└── app/
    └── impayes/
        ├── index.html
        └── js/
            └── pagination-next.js
```

### Fichier workflow
- **JS** : `frontend/app/impayes/js/pagination-next.js`

```javascript
// frontend/app/impayes/js/pagination-next.js
export function paginationNext() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async nextPage() {
  if (this.currentPage >= this.totalPages) return;
  
  this.currentPage++;
  await this.loadPage(this.currentPage);
}

async loadPage(page) {
  this.loading = true;
  this.error = null;
  
  try {
    const skip = (page - 1) * this.perPage;
    
    // Construire l'URL avec les filtres actifs
    const params = new URLSearchParams();
    params.append('facture_soldee', 'false');
    params.append('skip', skip.toString());
    params.append('limit', this.perPage.toString());
    
    // Ajouter les filtres actifs si présents
    if (this.filterStatut) params.append('statut', this.filterStatut);
    if (this.filterSuspended) params.append('is_suspended', this.filterSuspended);
    if (this.searchQuery) params.append('search', this.searchQuery);
    
    const response = await fetch(`/api/impayes?${params.toString()}`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.message);
    }
    
    this.impayes = data.data;
    
    // Recalculer totalPages si le backend retourne un count
    if (data.meta?.total) {
      this.totalPages = Math.ceil(data.meta.total / this.perPage);
    }
    
  } catch (error) {
    this.error = error.message;
    Alpine.store('ui').addToast(error.message, 'error');
  } finally {
    this.loading = false;
  }
}

// Computed: désactiver le bouton si dernière page
get isLastPage() {
  return this.currentPage >= this.totalPages;
}
```

## Notes

- La limite de 25 est fixée et identique à `initial-load.md`
- Le `skip` est calculé comme `(page - 1) * limit`
- Les filtres actifs doivent être conservés lors du changement de page
- Le total des pages peut être recalculé à chaque chargement pour être à jour

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.impayes-pagination-next] START: Navigation vers la page suivante, currentPage =', this.currentPage)` |
| `page-incremented` | `console.log('[WORKFLOW.impayes-pagination-next] STEP: currentPage incrémenté à', this.currentPage, '/', this.totalPages)` |
| `data-fetched` | `console.log('[WORKFLOW.impayes-pagination-next] DATA: Page', page, 'chargée,', data.data.length, 'impayés reçus, total =', data.meta?.total)` |
| `table-rerendered` | `console.log('[WORKFLOW.impayes-pagination-next] STEP: Tableau ré-affiché avec', this.impayes.length, 'lignes, totalPages =', this.totalPages)` |
| `end` | `console.log('[WORKFLOW.impayes-pagination-next] SUCCESS: Page', this.currentPage, 'affichée en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.impayes-pagination-next] ERROR:', error.message)` |
