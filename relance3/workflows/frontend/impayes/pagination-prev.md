# Workflow : Page précédente

## Écran
`impayes.html`

## Élément déclencheur
Bouton avec `@click="prevPage()"`

## Action
Naviguer vers la page précédente du tableau

## Description
- Décrémente le numéro de page (`currentPage`)
- **Affiche la tranche précédente des données PouchDB déjà chargées**
- Désactivé si première page (page 1)

## Data Model

**Page Function:** `impayesPage()`

**Données (depuis PouchDB):**
- `allImpayes` - tous les impayés chargés depuis PouchDB (filtrés côté client)
- `impayes` - liste paginée affichée
- `currentPage` - numéro de page courant
- `perPage` - nombre d'éléments par page (25)

**États UI:**
- `loading`
- `error`

## State Changes

**Modifications:**
- `currentPage` ← `currentPage - 1`
- `impayes` ← tranche de `allImpayes` pour la page précédente

## PouchDB Calls

**Aucun** - La pagination est effectuée **côté client** sur les données déjà chargées depuis PouchDB par `initial-load`.

Les données complètes sont filtrées et paginées en mémoire.



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
  // Implementation avec pagination côté client
}
```

## Implementation (Pagination côté client)

```javascript
// Tous les impayés sont déjà chargés depuis PouchDB
// La pagination est faite en mémoire avec slice()

async prevPage() {
  if (this.currentPage <= 1) return;
  
  this.currentPage--;
  this.updatePaginatedData();
}

// Mettre à jour les données affichées selon la page courante
updatePaginatedData() {
  const start = (this.currentPage - 1) * this.perPage;
  const end = start + this.perPage;
  
  // Paginer les données filtrées en mémoire
  this.impayes = this.filteredImpayes.slice(start, end);
}

// Données filtrées (computed property)
get filteredImpayes() {
  // Filtrage côté client sur allImpayes (chargé depuis PouchDB)
  let result = this.allImpayes;
  
  // Filtres actifs
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

// Computed: désactiver le bouton si première page
get isFirstPage() {
  return this.currentPage <= 1;
}
```

## Flow complet

```javascript
// 1. Navigation page précédente
prevPage() {
  if (this.isFirstPage) return;
  this.currentPage--;
  this.updatePaginatedData(); // slice() sur les données en mémoire
}

// 2. Le calcul du skip utilise (page - 1) * limit comme pour nextPage
// Mais ici on décrémente simplement la page et on recalcule la slice()
```

## Cohérence avec pagination-next

| Aspect | pagination-next | pagination-prev |
|--------|-----------------|-----------------|
| Direction | Page + 1 | Page - 1 |
| Limite | `isLastPage` | `isFirstPage` |
| Calcul | `(currentPage - 1) * perPage` | `(currentPage - 1) * perPage` |
| Données | `slice(start, end)` | `slice(start, end)` |
| Source | PouchDB (mémoire) | PouchDB (mémoire) |

## Avantages de la pagination côté client

| Aspect | API (ancien) | PouchDB (nouveau) |
|--------|--------------|-------------------|
| Latence | ~100-300ms par page | ~0-5ms (instantané) |
| Requêtes réseau | Une par page | Aucune (après chargement initial) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
| Performance globale | Dépend du réseau | Ultra-rapide en mémoire |

## Notes

- Le calcul du `skip` utilise `(page - 1) * limit` comme pour nextPage
- Les filtres actifs sont conservés lors du changement de page
- Cohérent avec `pagination-next.md` (même logique de pagination côté client)
