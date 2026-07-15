# Workflow : Scénario impayés multiples

## Écran
`sequences-relance-detail.html`

## Élément déclencheur
Onglet avec `@click="email.activeScenario = 'multiple'"`

## Action
Sélectionner le scénario "impayés multiples"

## Description
- Pour plusieurs impayés du même payeur
- Liste consolidée

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
            └── select-scenario-multiple.js
```

### Fichier principal
- **HTML** : `frontend/app/sequences-relance-detail/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/sequences-relance-detail/js/select-scenario-multiple.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/sequences-relance-detail/js/select-scenario-multiple.js
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
| `start` | `console.log('[WORKFLOW.sequences-relance-detail-select-scenario-multiple] START: Sélection du scénario impayés multiples')` |
| `scenario-selected` | `console.log('[WORKFLOW.sequences-relance-detail-select-scenario-multiple] STEP: activeScenario = \'multiple\'')` |
| `state-updated` | `console.log('[WORKFLOW.sequences-relance-detail-select-scenario-multiple] STEP: selectedItems mis à jour (toggle/selectAll appliqué)')` |
| `state-applied` | `console.log('[WORKFLOW.sequences-relance-detail-select-scenario-multiple] DATA: État après sélection:', {activeScenario, selectedItems})` |
| `end` | `console.log('[WORKFLOW.sequences-relance-detail-select-scenario-multiple] SUCCESS: Scénario impayés multiples activé en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.sequences-relance-detail-select-scenario-multiple] ERROR:', error)` |