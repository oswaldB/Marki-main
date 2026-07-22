# Workflow : Page suivante payeur

## Écran
`impayes-payeur.html`

## Élément déclencheur
Bouton avec `@click="currentPage++"`

## Action
Naviguer vers la page suivante

## Description
- Incrémente le numéro de page
- Affiche la tranche suivante des payeurs depuis les données PouchDB déjà chargées
- **Pagination côté client** sur les données en mémoire

## Data Model
**Page Function:** `impayesPayeurPage()`

**Stores Alpine.js:**
- $store.ui

**Données (depuis PouchDB):**
- `allPayers` - tous les payeurs chargés depuis PouchDB (en mémoire)
- `payeurs` - liste paginée affichée
- `currentPage` - numéro de page courant
- `perPage` - nombre d'éléments par page
- `totalPages` - calculé côté client

**États UI:**
- `loading`
- `error`
- `expandedPayeur`

## State Changes

**Modifications:**
- `currentPage` ← `currentPage + 1`
- `payeurs` ← tranche de `allPayers` pour la nouvelle page

## PouchDB Calls

**Aucun** - La pagination est effectuée **côté client** avec `slice()` sur les données déjà chargées depuis PouchDB par `initial-load`.

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
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/impayes-payeur/js/pagination-next.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/impayes-payeur/js/pagination-next.js
export function paginationNext() {
  // Implementation avec pagination côté client
}
```

## Implementation (Pagination côté client)

```javascript
// Next page
nextPage() {
  if (this.currentPage >= this.totalPages) return;
  
  this.currentPage++;
  this.updatePaginatedData();
}

// Mettre à jour les données affichées selon la page courante
updatePaginatedData() {
  const start = (this.currentPage - 1) * this.perPage;
  const end = start + this.perPage;
  
  // Paginer les données filtrées en mémoire
  this.payers = this.filteredPayers.slice(start, end);
}

// Données filtrées (computed)
get filteredPayers() {
  let result = this.allPayers || [];
  
  // Appliquer les filtres actifs
  if (this.filterStatut) {
    result = result.filter(p => p.statut === this.filterStatut);
  }
  
  if (this.searchQuery) {
    const q = this.searchQuery.toLowerCase();
    result = result.filter(p => 
      p.payerName?.toLowerCase().includes(q)
    );
  }
  
  // Trier si nécessaire
  if (this.sortBy === 'montant') {
    result.sort((a, b) => this.sortDirection === 'asc' 
      ? a.montantTotal - b.montantTotal 
      : b.montantTotal - a.montantTotal
    );
  }
  
  return result;
}

// Previous page
prevPage() {
  if (this.currentPage <= 1) return;
  
  this.currentPage--;
  this.updatePaginatedData();
}

// Change per page
setPerPage(count) {
  this.perPage = count;
  this.currentPage = 1; // Reset to first page
  this.updatePaginatedData();
}

// Nombre total de pages (computed)
get totalPages() {
  return Math.ceil(this.filteredPayers.length / this.perPage);
}

// Computed: désactiver le bouton si dernière page
get isLastPage() {
  return this.currentPage >= this.totalPages;
}
```

---

## Migration PouchDB

Ce workflow **ne nécessite pas de migration** car il utilise la pagination côté client.

| Aspect | Implémentation |
|--------|----------------|
| Source de données | PouchDB (via `initial-load`) |
| Pagination | Côté client avec `slice()` |
| Appels réseau | Aucun |
| Latence | Instantanée (~0-5ms) |
| Offline | ✅ Fonctionne offline |
