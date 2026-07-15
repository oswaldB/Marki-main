# Workflow : Sélectionner une relance

## Écran
`relances-validation.html`

## Élément déclencheur
Ligne avec `@click="selectRelance(relance)"`

## Action
Sélectionner une relance pour action

## Description
- Met en évidence la relance
- Affiche les actions possibles
- Charge le détail à droite

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

**Modifications:** États UI spécifiques selon implémentation

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
            └── select-relance.js
```

### Fichier principal
- **HTML** : `frontend/app/relances-validation/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/relances-validation/js/select-relance.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances-validation/js/select-relance.js
export function selectRelance() {
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
| `start` | `console.log('[WORKFLOW.relances-validation-select-relance] START: Sélection d\'une relance pour action')` |
| `state-changed` | `console.log('[WORKFLOW.relances-validation-select-relance] STEP: État UI mis à jour (highlight + actions affichées)')` |
| `panel-shown` | `console.log('[WORKFLOW.relances-validation-select-relance] STEP: Panneau de détail chargé à droite')` |
| `data-loaded` | `console.log('[WORKFLOW.relances-validation-select-relance] STEP: Détail de la relance chargé en mémoire')` |
| `state-applied` | `console.log('[WORKFLOW.relances-validation-select-relance] DATA: État après sélection:', {selectedRelances, previewMode, previewRelance})` |
| `end` | `console.log('[WORKFLOW.relances-validation-select-relance] SUCCESS: Relance sélectionnée en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.relances-validation-select-relance] ERROR:', error)` |