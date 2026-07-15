# Workflow : Filtrer séquences relance

## Écran
`sequences.html`

## Élément déclencheur
Bouton avec `@click="filterType = 'relance'"`

## Action
Afficher uniquement les séquences de relance

## Description
- Filtre sur type = relance
- Masque les séquences de suivi

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
            └── filter-relance.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/sequences/js/filter-relance.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences/js/filter-relance.js
export function filterRelance() {
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
| `start` | `console.log('[WORKFLOW.sequences-filter-relance] START: Application du filtre type=relance')` |
| `filter-applied` | `console.log('[WORKFLOW.sequences-filter-relance] STEP: filterType = relance appliqué')` |
| `list-rerendered` | `console.log('[WORKFLOW.sequences-filter-relance] DATA: Liste re-rendue, nombre de séquences visibles:', filteredData.length)` |
| `end` | `console.log('[WORKFLOW.sequences-filter-relance] SUCCESS: Filtre relance appliqué en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.sequences-filter-relance] ERROR:', error)` |