# Workflow : Filtrer séquences suivi

## Écran
`sequences.html`

## Élément déclencheur
Bouton avec `@click="filterType = 'suivi'"`

## Action
Afficher uniquement les séquences de suivi

## Description
- Filtre sur type = suivi
- Masque les séquences de relance

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
            └── filter-suivi.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/sequences/js/filter-suivi.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences/js/filter-suivi.js
export function filterSuivi() {
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