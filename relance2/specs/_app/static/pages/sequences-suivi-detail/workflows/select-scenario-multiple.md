# Workflow : Scénario suivi multiple

## Écran
`sequences-suivi-detail.html`

## Élément déclencheur
Onglet avec `@click="email.activeScenario = 'multiple'"`

## Action
Scénario pour missions multiples

## Description
- Suivi de plusieurs missions
- Liste consolidée

## Data Model
**Page Function:** `sequencesSuiviDetailPage()`

**Stores Alpine.js:**
- $store.ui

**Données:**
- `sequence`
- `etapes`
- `typeRelanceOptions`
- `selectedType`

**États UI:**
- `loading`
- `error`
- `saving`

## State Changes

**Modifications:** États UI spécifiques selon implémentation

## API Calls

**Pas d'appel API** - Action côté client uniquement



## Organisation des fichiers

```
frontend/
└── app/
    └── sequences-suivi-detail/
        ├── index.html
        ├── components/
        │   └── (composants partagés)
        └── js/
            └── select-scenario-multiple.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-suivi-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/sequences-suivi-detail/js/select-scenario-multiple.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-suivi-detail/js/select-scenario-multiple.js
export function selectScenarioMultiple() {
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
```

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.sequences-suivi-detail-select-scenario-multiple] START: Sélection du scénario suivi multiple')` |
| `scenario-selected` | `console.log('[WORKFLOW.sequences-suivi-detail-select-scenario-multiple] STEP: activeScenario = multiple')` |
| `state-updated` | `console.log('[WORKFLOW.sequences-suivi-detail-select-scenario-multiple] DATA: État après sélection:', {activeScenario, selectedItems, filteredData})` |
| `end` | `console.log('[WORKFLOW.sequences-suivi-detail-select-scenario-multiple] SUCCESS: Scénario multiple appliqué en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.sequences-suivi-detail-select-scenario-multiple] ERROR:', error)` |