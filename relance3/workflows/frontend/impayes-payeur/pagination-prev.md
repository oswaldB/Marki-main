# Workflow : Page précédente payeur

## Écran
`impayes-payeur.html`

## Élément déclencheur
Bouton avec `@click="currentPage--"`

## Action
Naviguer vers la page précédente

## Description
- Décrémente le numéro de page
- Affiche la tranche précédente des payeurs depuis les données PouchDB déjà chargées
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
- `currentPage` ← `currentPage - 1`
- `payeurs` ← tranche de `allPayers` pour la page précédente

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
            └── pagination-prev.js
```

### Fichier principal
- **HTML** : `frontend/app/impayes-payeur/index.html`
- **Point d'entrée** : Initialise la page Alpine.js avec PouchDB

### Fichier workflow
- **JS** : `frontend/app/impayes-payeur/js/pagination-prev.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/impayes-payeur/js/pagination-prev.js
export function paginationPrev() {
  // Implementation avec pagination côté client
}
```

## Implementation (Pagination côté client)

```javascript
// Previous page
prevPage() {
  if (this.currentPage <= 1) return;
  
  this.currentPage--;
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

// Nombre total de pages (computed)
get totalPages() {
  return Math.ceil(this.filteredPayers.length / this.perPage);
}

// Computed: désactiver le bouton si première page
get isFirstPage() {
  return this.currentPage <= 1;
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
