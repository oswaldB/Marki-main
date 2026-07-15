# Workflow : Page précédente

## Écran
`impayes.html`

## Élément déclencheur
Bouton avec `@click="prevPage()"`

## Action
Naviguer vers la page précédente du tableau

## Description
- Décrémente le numéro de page (`currentPage`)
- Appelle l'API pour charger les impayés de la page précédente
- Désactivé si première page (page 1)

## Data Model

**Page Function:** `impayesPage()`

**Données:**
- `impayes` - liste des impayés affichés
- `currentPage` - numéro de page courant
- `perPage` - nombre d'éléments par page (25)

**États UI:**
- `loading`
- `error`

## State Changes

**Modifications:**
- `currentPage` ← `currentPage - 1`
- `impayes` ← données de la page précédente

## API Calls

**Endpoint:** `GET /api/impayes?facture_soldee=0&statut=impaye

**Query Params:**
- `skip` = `(currentPage - 2) * 25` (offset, car on recule d'une page)
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
            └── pagination-prev.js
```

### Fichier workflow
- **JS** : `frontend/app/impayes/js/pagination-prev.js`

```javascript
// frontend/app/impayes/js/pagination-prev.js
export function paginationPrev() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async prevPage() {
  if (this.currentPage <= 1) return;
  
  this.currentPage--;
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
    
  } catch (error) {
    this.error = error.message;
    Alpine.store('ui').addToast(error.message, 'error');
  } finally {
    this.loading = false;
  }
}

// Computed: désactiver le bouton si première page
get isFirstPage() {
  return this.currentPage <= 1;
}
```

## Notes

- Le calcul du `skip` utilise `(page - 1) * limit` comme pour nextPage
- Les filtres actifs doivent être conservés lors du changement de page
- Cohérent avec `pagination-next.md` (même logique de chargement)

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.impayes-pagination-prev] START: Navigation vers la page précédente depuis page', this.currentPage + 1)` |
| `page-decremented` | `console.log('[WORKFLOW.impayes-pagination-prev] STEP: currentPage décrémenté →', this.currentPage, '(skip =', skip, ')')` |
| `data-fetched` | `console.log('[WORKFLOW.impayes-pagination-prev] DATA: Données page précédente chargées →', this.impayes.length, 'impayés')` |
| `table-rerendered` | `console.log('[WORKFLOW.impayes-pagination-prev] STEP: Tableau re-rendu (Alpine x-for mis à jour)')` |
| `end` | `console.log('[WORKFLOW.impayes-pagination-prev] SUCCESS: Page précédente', this.currentPage, 'affichée en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.impayes-pagination-prev] ERROR:', error.message)` |
