# Workflow : Page suivante

## Écran
`impayes.html`

## Élément déclencheur
Bouton avec `@click="nextPage()"`

## Action
Naviguer vers la page suivante du tableau

## Description
- Incrémente le numéro de page (`currentPage`)
- **Affiche la tranche suivante des données PouchDB déjà chargées**
- Désactivé si dernière page atteinte

## Data Model

**Page Function:** `impayesPage()`

**Données (depuis PouchDB):**
- `allImpayes` - tous les impayés chargés depuis PouchDB (filtrés côté client)
- `impayes` - liste paginée affichée
- `currentPage` - numéro de page courant
- `perPage` - nombre d'éléments par page (25)
- `totalPages` - nombre total de pages (calculé côté client)

**États UI:**
- `loading`
- `error`

## State Changes

**Modifications:**
- `currentPage` ← `currentPage + 1`
- `impayes` ← tranche de `allImpayes` pour la nouvelle page

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
            └── pagination-next.js
```

### Fichier workflow
- **JS** : `frontend/app/impayes/js/pagination-next.js`

```javascript
// frontend/app/impayes/js/pagination-next.js
export function paginationNext() {
  // Implementation avec pagination côté client
}
```

## Implementation (Pagination côté client)

```javascript
// Tous les impayés sont déjà chargés depuis PouchDB
// La pagination est faite en mémoire avec slice()

async nextPage() {
  if (this.currentPage >= this.totalPages) return;
  
  this.currentPage++;
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

// Nombre total de pages (computed)
get totalPages() {
  return Math.ceil(this.filteredImpayes.length / this.perPage);
}

// Computed: désactiver le bouton si dernière page
get isLastPage() {
  return this.currentPage >= this.totalPages;
}

// Retourner à la première page si les filtres changent
resetPagination() {
  this.currentPage = 1;
  this.updatePaginatedData();
}
```

## Flow complet

```javascript
// 1. Chargement initial (depuis PouchDB)
async initialLoad() {
  const result = await db.allDocs({
    startkey: 'facture:',
    endkey: 'facture:\ufff0',
    include_docs: true
  });
  
  // Stocker toutes les données
  this.allImpayes = result.rows
    .map(row => row.doc)
    .filter(f => f.reste_a_payer > 0 && f.statut === 'impaye');
  
  // Afficher la première page
  this.currentPage = 1;
  this.updatePaginatedData();
}

// 2. Navigation page suivante
nextPage() {
  if (this.isLastPage) return;
  this.currentPage++;
  this.updatePaginatedData(); // slice() sur les données en mémoire
}

// 3. Application d'un filtre
applyFilter(filter) {
  this.filterStatut = filter;
  this.resetPagination(); // Retour page 1 + mise à jour affichage
}
```

## Avantages de la pagination côté client

| Aspect | API (ancien) | PouchDB (nouveau) |
|--------|--------------|-------------------|
| Latence | ~100-300ms par page | ~0-5ms (instantané) |
| Requêtes réseau | Une par page | Aucune (après chargement initial) |
| Offline | ❌ Impossible | ✅ Fonctionne offline |
| Performance globale | Dépend du réseau | Ultra-rapide en mémoire |

## Notes

- La limite de 25 est fixée et identique à `initial-load.md`
- La pagination est instantanée car faite en mémoire (`slice()`)
- Les filtres actifs sont conservés lors du changement de page
- Le `totalPages` est recalculé automatiquement quand les filtres changent
- `allImpayes` contient toutes les données PouchDB (filtrées selon les critères)
