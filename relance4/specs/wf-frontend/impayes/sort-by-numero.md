# Workflow : Trier par numéro de facture

## Écran
`impayes.html`

## Élément déclencheur
Colonne avec `@click="sortBy('nfacture')"`

## Action
Trier le tableau par numéro de facture

## Description
- Met à jour la colonne et la direction de tri
- Recharge les données depuis l'API avec le tri appliqué côté backend
- Alterne entre ordre croissant/décroissant

## Data Model

**Page Function:** `impayesPage()`

**Données:**
- `impayes` - liste des impayés affichés
- `sortColumn` - colonne de tri active (`nfacture`)
- `sortDirection` - direction (`asc` ou `desc`)
- `currentPage` - réinitialisé à 1 lors du changement de tri

**États UI:**
- `loading`
- `error`

## State Changes

**Modifications:**
- `sortColumn` ← `'nfacture'`
- `sortDirection` ← toggle `asc`/`desc`
- `currentPage` ← `1` (reset)
- `impayes` ← données triées depuis l'API

## API Calls

**Endpoint:** `GET /api/impayes?facture_soldee=0&statut=impaye

**Query Params:**
- `sort` = `nfacture`
- `order` = `asc` ou `desc`
- `limit` = `25`
- `skip` = `0` (reset à la première page)
- Filtres actifs si présents

**Table:** `impayes`

**Backend (SQLite):**
```javascript
db.query('impayes')
  .where({ facture_soldee: false })
  .simplesort('nfacture', { desc: false })
  .limit(25)
  .offset(0)
  .data();
```

**Response:** `ApiResponse<Impaye[]>`

## Organisation des fichiers

```
frontend/
└── app/
    └── impayes/
        ├── index.html
        └── js/
            └── sort-by-numero.js
```

### Fichier workflow
- **JS** : `frontend/app/impayes/js/sort-by-numero.js`

```javascript
// frontend/app/impayes/js/sort-by-numero.js
export function sortByNumero() {
  // Implementation du workflow
}
```

## Implementation

```javascript
async sortBy(column) {
  // 1. Toggle direction if same column
  if (this.sortColumn === column) {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    // 2. New column, default to asc
    this.sortColumn = column;
    this.sortDirection = 'asc';
  }
  
  // 3. Reset to first page when sorting changes
  this.currentPage = 1;
  
  // 4. Reload data from API with sort params
  await this.loadData();
}

async loadData() {
  this.loading = true;
  this.error = null;
  
  try {
    const skip = (this.currentPage - 1) * this.perPage;
    
    const params = new URLSearchParams();
    params.append('facture_soldee', 'false');
    params.append('skip', skip.toString());
    params.append('limit', this.perPage.toString());
    
    // Ajouter les paramètres de tri
    if (this.sortColumn) {
      params.append('sort', this.sortColumn);
      params.append('order', this.sortDirection);
    }
    
    // Ajouter les filtres actifs
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
```

## Notes

- **Tri par défaut croissant** pour les numéros (plus petit en premier)
- **Avec pagination, le tri doit se faire côté backend** - sinon on ne trie que les 25 éléments affichés
- SQLite supporte le tri via `simplesort()`
- Le tri reset toujours à la page 1 (logique UX)
