# Workflow : Trier par payeur

## Écran
`impayes.html`

## Élément déclencheur
Colonne avec `@click="sortBy('payeur_nom')"`

## Action
Trier le tableau par nom de payeur

## Description
- Met à jour la colonne et la direction de tri
- Trie les données **côté client** sur les données PouchDB déjà chargées
- Alterne entre ordre alphabétique A-Z/Z-A

## Data Model

**Page Function:** `impayesPage()`

**Données (depuis PouchDB):**
- `allImpayes` - tous les impayés chargés depuis PouchDB (en mémoire)
- `impayes` - liste paginée affichée après tri
- `sortColumn` - colonne de tri active (`payeur_nom`)
- `sortDirection` - direction (`asc` ou `desc`)
- `currentPage` - réinitialisé à 1 lors du changement de tri

**États UI:**
- `loading`
- `error`

## State Changes

**Modifications:**
- `sortColumn` ← `'payeur_nom'`
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
            └── sort-by-payeur.js
```

### Fichier workflow
- **JS** : `frontend/app/impayes/js/sort-by-payeur.js`

```javascript
// frontend/app/impayes/js/sort-by-payeur.js
export function sortByPayeur() {
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
    // 2. New column, default to asc (A-Z)
    this.sortColumn = column;
    this.sortDirection = 'asc';
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
  
  // Tri côté client - pour les noms de payeur (string avec localeCompare)
  const direction = this.sortDirection === 'asc' ? 1 : -1;
  
  sorted.sort((a, b) => {
    const valA = a[this.sortColumn] || '';
    const valB = b[this.sortColumn] || '';
    
    // Tri alphabétique avec localeCompare pour les strings (insensible à la casse)
    return direction * valA.localeCompare(valB, 'fr', { sensitivity: 'base' });
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
  this.sortDirection = 'asc';
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

- **Tri alphabétique** sur le champ dénormalisé `payeur_nom`
- **Avec PouchDB, le tri se fait côté client** - on trie toutes les données filtrées en mémoire
- Le tri est instantané car fait avec `sort()` JavaScript
- Le tri reset toujours à la page 1 (logique UX)

---

## Migration depuis l'ancienne API

| Aspect | Avant (API) | Après (PouchDB) |
|--------|-------------|-----------------|
| Endpoint | `GET /api/impayes?sort=payeur_nom&order=xxx` | Tri côté client avec `sort()` |
| Paramètres | `sort`, `order` | Variables locales |
| Backend | SQLite `simplesort()` | JavaScript `Array.sort()` avec `localeCompare` |
| Pagination | Skip/limit backend | Slice après tri |
| Latence | ~100-300ms | ~0-5ms (instantané) |
