# Workflow : Scénario impayés courtier

## Écran
`sequences-relance-detail.html`

## Élément déclencheur
Onglet avec `@click="email.activeScenario = 'impayes_broker'"`

## Action
Sélectionner le scénario "impayés courtier"

## Description
- Pour les impayés chez un courtier
- Mentionne le courtier et ses clients

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
            └── select-scenario-impayes-broker.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-relance-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/sequences-relance-detail/js/select-scenario-impayes-broker.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-relance-detail/js/select-scenario-impayes-broker.js
export function selectScenarioImpayesBroker() {
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