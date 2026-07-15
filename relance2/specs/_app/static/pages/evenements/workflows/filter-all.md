# Workflow : Filtrer tous événements

## Écran
`evenements.html`

## Élément déclencheur
Bouton avec `@click="filterType = 'all'"`

## Action
Afficher tous les événements

## Description
- Sans filtre sur le type
- Tous les événements

## Data Model
**Page Function:** `evenementsPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `evenements`
- `searchQuery`
- `filterType`
- `filterDateStart`
- `filterDateEnd`
- `filterUser`
- `page`
- `perPage`

**États UI:**
- `loading`
- `loadingMore`
- `error`
- `selectedEvent`
- `showDetailModal`

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
    └── evenements/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── filter-all.js
```

### Fichier principal
- **HTML** : `frontend/app/evenements/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/evenements/js/filter-all.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/evenements/js/filter-all.js
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
| `start` | `console.log('[WORKFLOW.evenements-filter-all] START: Début du filtrage pour afficher tous les événements')` |
| `filter-applied` | `console.log('[WORKFLOW.evenements-filter-all] STEP: filterType = \'all\' appliqué')` |
| `list-rerendered` | `console.log('[WORKFLOW.evenements-filter-all] DATA: Liste re-rendue,', result.length, 'événements affichés')` |
| `end` | `console.log('[WORKFLOW.evenements-filter-all] SUCCESS: Filtrage tous événements effectué en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.evenements-filter-all] ERROR:', error)` |