# Workflow : Trier par reste à payer

## Écran
`impayes.html`

## Élément déclencheur
Colonne avec `@click="sortBy('reste_a_payer')"`

## Action
Trier le tableau par reste à payer

## Description
- Met à jour la colonne et la direction de tri
- Trie les données **côté client** sur les données PouchDB déjà chargées
- Alterne entre ordre croissant/décroissant

## Data Model

**Page Function:** `impayesPage()`

**Données (depuis PouchDB):**
- `allImpayes` - tous les impayés chargés depuis PouchDB (en mémoire)
- `impayes` - liste paginée affichée après tri
- `sortColumn` - colonne de tri active (`reste_a_payer`)
- `sortDirection` - direction (`asc` ou `desc`)
- `currentPage` - réinitialisé à 1 lors du changement de tri

**États UI:**
- `loading`
- `error`

## State Changes

**Modifications:**
- `sortColumn` ← `'reste_a_payer'`
- `sortDirection` ← toggle `asc`/`desc`
- `currentPage` ← `1` (reset)
- `impayes` ← données triées et paginées depuis `allImpayes`

## PouchDB Calls

**Aucun** - Le tri est effectué **côté client** avec `sort()` JavaScript sur les données déjà chargées depuis PouchDB par `initial-load`.



## Organisation des fichiers

```
frontend/
└── app/
    └── impayes/
        ├── index.html
        └── js/
            └── sort-by-reste.js
```

### Fichier workflow
- **JS** : `frontend/app/impayes/js/sort-by-reste.js`

```javascript
// frontend/app/impayes/js/sort-by-reste.js
export function sortByReste() {
  // Implementation avec tri côté client
}
```

## Implementation (Tri côté client)

```javascript
sortBy(column) {
  // 1. Toggle direction if same column
  if (this.sortColumn === column) {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    // 2. New column, default to desc (plus gros reste en premier)
    this.sortColumn = column;
    this.sortDirection = 'desc';
  }
  
  // 3. Reset to first page when sorting changes
  this.currentPage = 1;
  
  // 4. Appliquer le tri côté client sur allImpayes
  this.applySortAndPagination();
}

// Fonction de tri et pagination
applySortAndPagination() {
  // Copier les données filtrées
  let sorted = [...this.filteredImpayes];
  
  // Tri côté client - pour les montants (number)
  const direction = this.sortDirection === 'asc' ? 1 : -1;
  
  sorted.sort((a, b) => {
    const valA = parseFloat(a[this.sortColumn]) || 0;
    const valB = parseFloat(b[this.sortColumn]) || 0;
    return direction * (valA - valB);
  });
  
  // Stocker les données triées
  this.sortedImpayes = sorted;
  
  // Pagination
  const start = (this.currentPage - 1) * this.perPage;
  const end = start + this.perPage;
  this.impayes = sorted.slice(start, end);
}

// Données filtrées (computed)
get filteredImpayes() {
  let result = this.allImpayes || [];
  
  // Appliquer les filtres actifs
  if (this.filterStatut) {
    result = result.filter(i => i.statut === this.filterStatut);
  }
  
  if (this.filterSuspended) {
    result = result.filter(i => i.is_suspended === (this.filterSuspended === 'true'));
  }
  
  if (this.searchQuery) {
    const q = this.searchQuery.toLowerCase();
    result = result.filter(i => 
      i.nfacture?.toLowerCase().includes(q) ||
      i.payeur_nom?.toLowerCase().includes(q)
    );
  }
  
  return result;
}

// Réinitialiser quand les filtres changent
resetSortAndPagination() {
  this.currentPage = 1;
  this.sortColumn = null;
  this.sortDirection = 'desc';
  this.applySortAndPagination();
}
```

## Avantages du tri côté client

| Aspect | API (ancien) | PouchDB (nouveau) |
|--------|--------------|-------------------|
| Requête | Une par tri (`sort`/`order` params) | Aucune |
| Latence | ~100-300ms | ~0-5ms (instantané) |
| Performance globale | Dépend du réseau | Ultra-rapide en mémoire |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
| Tri complet | Sur toutes les données | Sur toutes les données filtrées |

## Notes

- **Tri par défaut décroissant** pour les restes (plus gros impayés en premier)
- **Avec PouchDB, le tri se fait côté client** - on trie toutes les données filtrées en mémoire
- Le tri est instantané car fait avec `sort()` JavaScript
- Le tri reset toujours à la page 1 (logique UX)

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Endpoint | `GET /api/impayes?sort=reste_a_payer&order=xxx` | Tri côté client avec `sort()` |
| Paramètres | `sort`, `order` | Variables locales |
| Backend | SQLite `simplesort()` | JavaScript `Array.sort()` |
| Pagination | Skip/limit backend | Slice après tri |
| Latence | ~100-300ms | ~0-5ms (instantané) |
