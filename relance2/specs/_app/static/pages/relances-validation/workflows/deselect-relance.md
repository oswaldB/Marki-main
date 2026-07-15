# Workflow : Désélectionner

## Écran
`relances-validation.html`

## Élément déclencheur
Bouton avec `@click="selectedRelance = null"`

## Action
Désélectionner la relance active

## Description
- Efface la sélection
- Masque le panneau d'action

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
            └── deselect-relance.js
```

### Fichier principal
- **HTML** : `frontend/app/relances-validation/index.html`
- **Point d'entrée** : Initialise la page Alpine.js

### Fichier workflow
- **JS** : `frontend/app/relances-validation/js/deselect-relance.js`
- **Export** : Fonction utilisable dans `index.html`

```javascript
// frontend/app/relances-validation/js/deselect-relance.js
export function deselectRelance() {
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

## Logs (console.log) - OBLIGATOIRE

Chaque étape du workflow doit être loguée avec `console.log()`:

| Checkpoint | Instruction console.log |
|------------|------------------------|
| `start` | `console.log('[WORKFLOW.relances-validation-deselect-relance] START: Désélection de la relance active')` |
| `state-changed` | `console.log('[WORKFLOW.relances-validation-deselect-relance] STEP: selectedRelance = null (panneau d\'action masqué)')` |
| `list-rerendered` | `console.log('[WORKFLOW.relances-validation-deselect-relance] STEP: Liste ré-affichée sans surbrillance de sélection')` |
| `data-snapshot` | `console.log('[WORKFLOW.relances-validation-deselect-relance] DATA: État après désélection:', {selectedRelance, selectedRelances, selectAll})` |
| `end` | `console.log('[WORKFLOW.relances-validation-deselect-relance] SUCCESS: Relance désélectionnée en', duree, 'ms')` |
| `error` | `console.error('[WORKFLOW.relances-validation-deselect-relance] ERROR:', error)` |