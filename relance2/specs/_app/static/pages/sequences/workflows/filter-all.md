# Workflow : Filtrer toutes séquences

## Écran
`sequences.html`

## Élément déclencheur
Bouton avec `@click="filterType = 'all'"`

## Action
Afficher toutes les séquences

## Description
- Affiche relances et suivis
- Pas de filtre sur le type

## Data Model
**Page Function:** `sequencesPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `sequences`
- `searchQuery`
- `filterType`
- `newSequence`

**États UI:**
- `loading`
- `error`
- `showNewSequenceModal`
- `showEditSequenceModal`
- `showDeleteModal`
- `editingSequence`
- `deletingSequence`

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
    └── sequences/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── filter-all.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/sequences/js/filter-all.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences/js/filter-all.js
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
``
## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.sequences-filter-all] START: Filtrage de toutes les séquences (filterType = all)')` |
| `filter-applied` | `console.log('[WORKFLOW.sequences-filter-all] STEP: filterType = all appliqué')` |
| `list-rerendered` | `console.log('[WORKFLOW.sequences-filter-all] STEP: Liste des séquences re-rendue (relances + suivis affichés)')` |
| `state-applied` | `console.log('[WORKFLOW.sequences-filter-all] DATA: État après filtrage:', {filterType, count: filteredData.length})` |
| `end` | `console.log('[WORKFLOW.sequences-filter-all] SUCCESS: Filtre "all" appliqué en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.sequences-filter-all] ERROR:', error)` |