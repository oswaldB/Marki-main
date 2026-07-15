# Workflow : Filtrer aujourd'hui

## Écran
`relances-validation.html`

## Élément déclencheur
Bouton avec `@click="filterToday = true"`

## Action
Afficher uniquement les relances du jour

## Description
- Filtre sur la date du jour
- Combine avec le type sélectionné

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
            └── filter-today.js
```

### Fichier principal
- **HTML** : `frontend/app/relances-validation/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/relances-validation/js/filter-today.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances-validation/js/filter-today.js
export function filterToday() {
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
``

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.relances-validation-filter-today] START: Filtrage des relances sur la date du jour')` |
| `filter-applied` | `console.log('[WORKFLOW.relances-validation-filter-today] STEP: filterToday = true appliqué')` |
| `combined-with-type` | `console.log('[WORKFLOW.relances-validation-filter-today] STEP: Combinaison avec filterType actif:', filterType)` |
| `list-rerendered` | `console.log('[WORKFLOW.relances-validation-filter-today] DATA: Liste filtrée:', {total: filteredData.length, filterToday, filterType})` |
| `selection-reset` | `console.log('[WORKFLOW.relances-validation-filter-today] STEP: selectedRelances et selectAll réinitialisés')` |
| `end` | `console.log('[WORKFLOW.relances-validation-filter-today] SUCCESS: Filtre "Aujourd\'hui" appliqué en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.relances-validation-filter-today] ERROR:', error)` |
