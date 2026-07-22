# Workflow : Scénario impayé unique

## Écran
`sequences-relance-detail.html`

## Élément déclencheur
Onglet avec `@click="email.activeScenario = 'single'"`

## Action
Sélectionner le scénario "impayé unique"

## Description
- Pour un seul impayé
- Contenu personnalisé simple

## Data Model
**Page Function:** `sequencesRelanceDetailPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `sequence`
- `etapes`
- `modeles`
- `activeTab`
- `draggingEtape`
- `editingEtape`
- `editorInstance`

**États UI:**
- `loading`
- `error`
- `saving`
- `hasChanges`
- `showEtapeModal`
- `showModeleModal`
- `showDeleteEtapeModal`

## State Changes

**Modifications:** États UI spécifiques selon implémentation

## API Calls

**Pas d'appel API** - Action côté client uniquement



## Organisation des fichiers

```
frontend/
└── app/
    └── sequences-relance-detail/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── select-scenario-single.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-relance-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/sequences-relance-detail/js/select-scenario-single.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-relance-detail/js/select-scenario-single.js
export function selectScenarioSingle() {
  // Implementation du workflow
}
```

## Implementation

```javascript
// Single select
selectItem(item) {
  this.selectedItem = item;
}

// Multi-select
toggleSelection(id) {
  const index = this.selectedItems.indexOf(id);
  if (index === -1) {
    this.selectedItems.push(id);
  } else {
    this.selectedItems.splice(index, 1);
  }
}

selectAll(checked) {
  if (checked) {
    this.selectedItems = this.filteredData.map(item => item.id);
  } else {
    this.selectedItems = [];
  }
}
``