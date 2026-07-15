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
```

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.sequences-relance-detail-select-scenario-impayes-broker] START: Sélection du scénario impayés courtier')` |
| `scenario-selected` | `console.log('[WORKFLOW.sequences-relance-detail-select-scenario-impayes-broker] STEP: activeScenario = impayes_broker')` |
| `state-updated` | `console.log('[WORKFLOW.sequences-relance-detail-select-scenario-impayes-broker] DATA: État après sélection:', {activeScenario, activeTab, hasChanges})` |
| `end` | `console.log('[WORKFLOW.sequences-relance-detail-select-scenario-impayes-broker] SUCCESS: Scénario impayés courtier sélectionné en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.sequences-relance-detail-select-scenario-impayes-broker] ERROR:', error)` |