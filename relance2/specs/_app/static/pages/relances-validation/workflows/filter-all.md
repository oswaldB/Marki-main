# Workflow : Filtrer tout

## Écran
`relances-validation.html`

## Élément déclencheur
Bouton avec `@click="filterType = 'all'; filterToday = false"`

## Action
Afficher toutes les relances à valider

## Description
- Réinitialise les filtres
- Affiche email et courrier
- Désactive le filtre "aujourd'hui"

## Data Model
**Page Function:** `relancesValidationPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `relancesAValider`
- `selectedRelances`
- `selectAll`

**États UI:**
- `loading`
- `error`
- `previewMode`
- `previewRelance`
- `processing`

## State Changes

**Modifications:**
- `page` modifié
- `searchQuery` modifié
- `filter*` modifié
## API Calls

**Pas d'appel API** - Action côté client uniquement



## Organisation des fichiers

```
frontend/
└── app/
    └── relances-validation/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── filter-all.js
```

### Fichier principal
- **HTML** : `frontend/app/relances-validation/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/relances-validation/js/filter-all.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances-validation/js/filter-all.js
export function filterAll() {
  // Implementation du workflow
}
```

## Implementation

```javascript
// Filter properties are bound to inputs via x-model
// Computed property handles filtering:

get filteredData() {
  let result = this.data;
  
  // 1. Search filter
  if (this.searchQuery) {
    const query = this.searchQuery.toLowerCase();
    result = result.filter(item => 
      item.name.toLowerCase().includes(query) ||
      item.email.toLowerCase().includes(query)
    );
  }
  
  // 2. Status filter
  if (this.filterStatut) {
    result = result.filter(item => item.statut === this.filterStatut);
  }
  
  // 3. Sort
  result = this.sortData(result);
  
  return result;
}
```

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.relances-validation-filter-all] START: Réinitialisation des filtres - affichage de toutes les relances')` |
| `filter-applied` | `console.log('[WORKFLOW.relances-validation-filter-all] STEP: filterType = "all" et filterToday = false appliqués')` |
| `search-cleared` | `console.log('[WORKFLOW.relances-validation-filter-all] STEP: searchQuery réinitialisé à ""')` |
| `list-rerendered` | `console.log('[WORKFLOW.relances-validation-filter-all] DATA: filteredRelances recalculé, count =', filteredRelances.length)` |
| `end` | `console.log('[WORKFLOW.relances-validation-filter-all] SUCCESS: Filtre "tout" appliqué en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.relances-validation-filter-all] ERROR:', error)` |
