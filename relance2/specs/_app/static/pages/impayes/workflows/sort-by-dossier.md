# Workflow : Trier par numéro de dossier

## Écran
`impayes.html`

## Élément déclencheur
Colonne avec `@click="sortBy('numero_dossier')"`

## Action
Trier le tableau par numéro de dossier

## Description
- Met à jour la colonne et la direction de tri
- Recharge les données depuis l'API avec le tri appliqué côté backend
- Alterne entre ordre croissant/décroissant

## Data Model

**Page Function:** `impayesPage()`

**Données:**
- `impayes` - liste des impayés affichés
- `sortColumn` - colonne de tri active (`numero_dossier`)
- `sortDirection` - direction (`asc` ou `desc`)
- `currentPage` - réinitialisé à 1 lors du changement de tri

**États UI:**
- `loading`
- `error`

## State Changes

**Modifications:**
- `sortColumn` ← `'numero_dossier'`
- `sortDirection` ← toggle `asc`/`desc`
- `currentPage` ← `1` (reset)
- `impayes` ← données triées depuis l'API

## API Calls

**Endpoint:** `GET /api/impayes?facture_soldee=0&statut=impaye

**Query Params:**
- `sort` = nom de la colonne à trier (`numero_dossier`, `montant_total`, `reste_a_payer`, `date_echeance`, etc.)
- `order` = `asc` ou `desc`
- `limit` = `25`
- `skip` = `0` (reset à la première page)
- Filtres actifs si présents

**Table:** `impayes`

**Backend (SQLite):**
```javascript
db.query('impayes')
  .where({ facture_soldee: false })
  .simplesort('numero_dossier', { desc: false })
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
            └── sort-by-dossier.js
```

### Fichier workflow
- **JS** : `frontend/app/impayes/js/sort-by-dossier.js`

```javascript
// frontend/app/impayes/js/sort-by-dossier.js
export function sortByDossier() {
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

## Colonnes triables

| Colonne | Champ backend | Type |
|---------|---------------|------|
| Numéro de dossier | `numero_dossier` | string |
| Numéro de facture | `nfacture` | string/number |
| Montant total | `montant_total` | number |
| Reste à payer | `reste_a_payer` | number |
| Date d'échéance | `date_echeance` | ISO date |
| Nom du payeur | `payeur_nom` | string |

## Notes

- **Avec pagination, le tri doit se faire côté backend** - sinon on ne trie que les 25 éléments affichés
- SQLite supporte le tri via `simplesort()`
- Le tri reset toujours à la page 1 (logique UX)
- Voir aussi `sort-by-montant.md`, `sort-by-numero.md`, `sort-by-payeur.md`, `sort-by-reste.md`

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.impayes-sort-by-dossier] START: Tri par numero_dossier demandé')` |
| `sort-applied` | `console.log('[WORKFLOW.impayes-sort-by-dossier] STEP: Tri appliqué', {sortColumn, sortDirection})` |
| `table-rerendered` | `console.log('[WORKFLOW.impayes-sort-by-dossier] STEP: Tableau ré-rendu avec', this.impayes.length, 'lignes')` |
| `end` | `console.log('[WORKFLOW.impayes-sort-by-dossier] SUCCESS: Tri terminé en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.impayes-sort-by-dossier] ERROR:', error)` |
